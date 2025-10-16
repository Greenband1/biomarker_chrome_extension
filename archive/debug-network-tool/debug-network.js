// DEBUG / TESTING ONLY: Injected via popup toggle for API discovery
// This script must never ship in production builds.

(function () {
    if (window.__FH_DEBUG_NETWORK_SCRIPT_LOADED) {
        if (typeof window.__FHDebugNetworkControl === 'function') {
            window.__FHDebugNetworkControl({ command: 'enable' });
        }
        return;
    }

    window.__FH_DEBUG_NETWORK_SCRIPT_LOADED = true;

    const state = {
        active: false,
        records: [],
        originalFetch: window.fetch,
        originalXHR: {
            open: XMLHttpRequest.prototype.open,
            send: XMLHttpRequest.prototype.send,
            setRequestHeader: XMLHttpRequest.prototype.setRequestHeader
        }
    };

    window.__FHDebugNetworkRequests = state.records;

    function shouldCapture(url) {
        try {
            const absolute = new URL(url, window.location.origin);
            return absolute.hostname.includes('functionhealth') || absolute.pathname.includes('/api/');
        } catch (error) {
            console.warn('[FH DEBUG] Failed to parse URL for capture check:', url, error);
            return true;
        }
    }

    function captureFetch() {
        if (state.fetchPatched) return;
        state.fetchPatched = true;

        window.fetch = async function debugFetch(input, init) {
            const request = new Request(input, init);
            const entry = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                type: 'fetch',
                timestamp: new Date().toISOString(),
                method: request.method,
                url: request.url,
                requestHeaders: {},
                requestBody: null,
                responseHeaders: {},
                status: null,
                durationMs: null,
                error: null
            };

            if (!shouldCapture(request.url)) {
                return state.originalFetch(request);
            }

            request.headers.forEach((value, key) => {
                entry.requestHeaders[key] = value;
            });

            if (request.bodyUsed) {
                entry.requestBody = '[body already consumed]';
            } else if (init && init.body !== undefined) {
                entry.requestBody = normalizeBody(init.body);
            }

            const start = performance.now();
            try {
                const response = await state.originalFetch(request);
                entry.durationMs = Math.round(performance.now() - start);
                entry.status = response.status;
                response.headers.forEach((value, key) => {
                    entry.responseHeaders[key] = value;
                });

                const cloned = response.clone();
                const text = await safeReadBody(cloned);
                entry.responseBody = text;
                state.records.push(entry);
                console.info('[FH DEBUG][fetch]', entry.method, entry.url, entry.status, entry);
                return response;
            } catch (error) {
                entry.durationMs = Math.round(performance.now() - start);
                entry.error = error?.message || String(error);
                state.records.push(entry);
                console.error('[FH DEBUG][fetch] error', entry.method, entry.url, entry.error);
                throw error;
            }
        };
    }

    function captureXHR() {
        if (state.xhrPatched) return;
        state.xhrPatched = true;

        XMLHttpRequest.prototype.open = function debugOpen(method, url, async, user, password) {
            this.__fhDebugEntry = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                type: 'xhr',
                timestamp: new Date().toISOString(),
                method,
                url,
                async: async !== false,
                requestHeaders: {},
                requestBody: null,
                responseHeaders: null,
                status: null,
                durationMs: null,
                error: null
            };

            return state.originalXHR.open.apply(this, arguments);
        };

        XMLHttpRequest.prototype.setRequestHeader = function debugSetRequestHeader(header, value) {
            if (this.__fhDebugEntry) {
                this.__fhDebugEntry.requestHeaders[header] = value;
            }
            return state.originalXHR.setRequestHeader.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function debugSend(body) {
            const entry = this.__fhDebugEntry;
            if (!entry || !shouldCapture(entry.url)) {
                return state.originalXHR.send.apply(this, arguments);
            }

            entry.requestBody = normalizeBody(body);
            const start = performance.now();

            const finalize = () => {
                entry.durationMs = Math.round(performance.now() - start);
                entry.status = this.status;
                entry.responseHeaders = parseResponseHeaders(this.getAllResponseHeaders());
                entry.responseBody = safeReadXHRBody(this);
                state.records.push(entry);
                console.info('[FH DEBUG][xhr]', entry.method, entry.url, entry.status, entry);
            };

            this.addEventListener('loadend', finalize, { once: true });
            this.addEventListener('error', () => {
                entry.durationMs = Math.round(performance.now() - start);
                entry.error = 'Network error';
                state.records.push(entry);
                console.error('[FH DEBUG][xhr] error', entry.method, entry.url, entry);
            }, { once: true });

            return state.originalXHR.send.apply(this, arguments);
        };
    }

    function normalizeBody(body) {
        if (body === undefined || body === null) return null;
        if (typeof body === 'string') {
            return truncate(body);
        }
        if (body instanceof URLSearchParams) {
            return truncate(body.toString());
        }
        if (body instanceof Blob) {
            return `[blob ${body.type || 'unknown'} size=${body.size}]`;
        }
        if (body instanceof FormData) {
            const obj = {};
            for (const [key, value] of body.entries()) {
                obj[key] = typeof value === 'string' ? value : `[file ${value.name || 'unknown'}]`;
            }
            return obj;
        }
        if (typeof body === 'object') {
            try {
                return JSON.parse(JSON.stringify(body));
            } catch (error) {
                return String(body);
            }
        }
        return String(body);
    }

    function parseResponseHeaders(raw) {
        if (!raw) return {};
        return raw.trim().split(/\r?\n/).reduce((acc, line) => {
            const [key, ...rest] = line.split(':');
            if (!key) return acc;
            acc[key.trim().toLowerCase()] = rest.join(':').trim();
            return acc;
        }, {});
    }

    async function safeReadBody(response) {
        try {
            const text = await response.text();
            return truncate(text);
        } catch (error) {
            return `[unreadable body: ${error.message}]`;
        }
    }

    function safeReadXHRBody(xhr) {
        try {
            return truncate(xhr.responseText || '');
        } catch (error) {
            return `[unreadable body: ${error.message}]`;
        }
    }

    function truncate(value, limit = 5000) {
        if (typeof value !== 'string') return value;
        if (value.length <= limit) return value;
        return `${value.slice(0, limit)}… [truncated ${value.length - limit} chars]`;
    }

    function startCapture() {
        if (state.active) return;
        captureFetch();
        captureXHR();
        state.active = true;
        window.__FH_DEBUG_NETWORK_CAPTURE_ACTIVE = true;
        console.info('[FH DEBUG] Network capture ENABLED (testing only).');
    }

    function stopCapture() {
        if (!state.active) return;
        if (state.fetchPatched) {
            window.fetch = state.originalFetch;
            state.fetchPatched = false;
        }
        if (state.xhrPatched) {
            XMLHttpRequest.prototype.open = state.originalXHR.open;
            XMLHttpRequest.prototype.send = state.originalXHR.send;
            XMLHttpRequest.prototype.setRequestHeader = state.originalXHR.setRequestHeader;
            state.xhrPatched = false;
        }
        state.active = false;
        window.__FH_DEBUG_NETWORK_CAPTURE_ACTIVE = false;
        console.info('[FH DEBUG] Network capture DISABLED.');
    }

    window.__FHDebugNetworkControl = function handleDebugNetworkCommand(message) {
        const command = message?.command;
        switch (command) {
            case 'enable':
                startCapture();
                break;
            case 'disable':
                stopCapture();
                break;
            case 'clear':
                state.records.splice(0, state.records.length);
                console.info('[FH DEBUG] Cleared captured requests.');
                break;
            case 'dump':
                console.info('[FH DEBUG] Captured requests:', state.records);
                break;
            default:
                console.warn('[FH DEBUG] Unknown control command:', command);
        }
        return { active: state.active, records: state.records.length };
    };
})();

