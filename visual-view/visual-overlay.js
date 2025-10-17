const STATUS_COLORS = {
    'In Range': '#30c48d',
    'Out of Range': '#f77070',
    'Improving': '#f7b267',
    'Unknown': '#a0a4b8'
};

const VisualOverlay = {
    container: null,
    canvas: null,
    insights: null,
    statusBar: null,
    dataCache: null,

    open(payload) {
        if (!payload || !payload.dataset) {
            console.warn('[FH Visual View] Missing payload for overlay');
            return;
        }
        this.dataCache = payload;
        this.ensureOverlay();
        this.render();
        requestAnimationFrame(() => {
            this.container.classList.add('fh-visual-overlay--open');
            this.container.focus({ preventScroll: true });
        });
        document.body.classList.add('fh-visual-no-scroll');
    },

    ensureOverlay() {
        if (this.container) return;

        injectStyles();

        const overlay = document.createElement('div');
        overlay.className = 'fh-visual-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.tabIndex = -1;
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                this.close();
            }
        });

        const panel = document.createElement('div');
        panel.className = 'fh-visual-panel';

        const header = document.createElement('header');
        header.className = 'fh-visual-header';

        const title = document.createElement('h2');
        title.textContent = 'Biomarker Trends';

        const statusBar = document.createElement('div');
        statusBar.className = 'fh-visual-status';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'fh-visual-close';
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Close visual results view');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.close());

        header.appendChild(title);
        header.appendChild(statusBar);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        const body = document.createElement('div');
        body.className = 'fh-visual-body';

        const canvas = document.createElement('div');
        canvas.className = 'fh-visual-canvas';

        const insights = document.createElement('aside');
        insights.className = 'fh-visual-insights';

        body.appendChild(canvas);
        body.appendChild(insights);
        panel.appendChild(body);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        document.addEventListener('keydown', this.handleKeydown);

        this.container = overlay;
        this.canvas = canvas;
        this.insights = insights;
        this.statusBar = statusBar;
    },

    render() {
        if (!this.dataCache || !this.container) return;
        const { dataset, filtersApplied, latestOnly } = this.dataCache;
        this.renderStatusBar(dataset, filtersApplied, latestOnly);
        this.renderInsights(dataset);
        this.renderCanvas(dataset);
    },

    renderStatusBar(dataset, filtersApplied, latestOnly) {
        if (!this.statusBar) return;
        this.statusBar.innerHTML = '';
        const tokens = [
            `${Object.keys(dataset.categories).length} categories`,
            `${dataset.summary?.total ?? 0} biomarkers`,
            filtersApplied ? 'Filters active' : 'All data',
            latestOnly ? 'Latest only' : 'Full history'
        ];
        tokens.forEach((text) => {
            const chip = document.createElement('span');
            chip.className = 'fh-chip';
            chip.textContent = text;
            this.statusBar.appendChild(chip);
        });
    },

    renderInsights(dataset) {
        if (!this.insights) return;
        this.insights.innerHTML = '';

        const heading = document.createElement('h3');
        heading.textContent = 'Categories';
        this.insights.appendChild(heading);

        const list = document.createElement('ul');
        list.className = 'fh-category-list';

        Object.entries(dataset.categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([name, category]) => {
                const item = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = `${name} (${category.biomarkers.length})`;
                button.addEventListener('click', () => {
                    const anchor = this.canvas?.querySelector(`[data-category="${cssEscape(name)}"]`);
                    if (anchor) {
                        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
                item.appendChild(button);
                list.appendChild(item);
            });

        this.insights.appendChild(list);
    },

    renderCanvas(dataset) {
        if (!this.canvas) return;
        this.canvas.innerHTML = '';

        Object.entries(dataset.categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([categoryName, category]) => {
                if (!Array.isArray(category?.biomarkers) || category.biomarkers.length === 0) {
                    return;
                }

                const section = document.createElement('section');
                section.className = 'fh-visual-section';
                section.dataset.category = categoryName;

                const header = document.createElement('header');
                header.className = 'fh-visual-section-header';

                const title = document.createElement('h3');
                title.textContent = categoryName;

                const meta = document.createElement('span');
                meta.textContent = `${category.biomarkers.length} biomarkers`;

                header.appendChild(title);
                header.appendChild(meta);
                section.appendChild(header);

                const list = document.createElement('div');
                list.className = 'fh-visual-biomarker-list';

                category.biomarkers
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .forEach((biomarker) => {
                        const card = createBiomarkerCard(biomarker);
                        list.appendChild(card);
                    });

                section.appendChild(list);
                this.canvas.appendChild(section);
            });
    },

    close() {
        if (!this.container) return;
        this.container.classList.remove('fh-visual-overlay--open');
        setTimeout(() => {
            if (this.container && !this.container.classList.contains('fh-visual-overlay--open')) {
                this.container.remove();
                this.container = null;
                this.canvas = null;
                this.insights = null;
                this.statusBar = null;
                document.removeEventListener('keydown', this.handleKeydown);
                document.body.classList.remove('fh-visual-no-scroll');
            }
        }, 250);
    },

    handleKeydown(event) {
        if (event.key === 'Escape' && VisualOverlay.container?.classList.contains('fh-visual-overlay--open')) {
            event.stopPropagation();
            VisualOverlay.close();
        }
    }
};

function createBiomarkerCard(biomarker) {
    const card = document.createElement('article');
    card.className = 'fh-bio-card';

    const header = document.createElement('div');
    header.className = 'fh-bio-card-header';

    const name = document.createElement('h4');
    name.textContent = biomarker.name;

    const latest = getMostRecentEntry(biomarker);
    const badge = document.createElement('span');
    badge.className = `fh-status-badge fh-status-${normalizeStatus(latest?.status)}`;
    badge.textContent = latest?.status ?? 'Unknown';

    header.appendChild(name);
    header.appendChild(badge);

    const timeline = document.createElement('div');
    timeline.className = 'fh-bio-timeline';

    const events = buildTimelineEvents(biomarker);
    events.forEach((event, index) => {
        const node = document.createElement('div');
        node.className = 'fh-timeline-node';

        if (index > 0) {
            const connector = document.createElement('div');
            connector.className = 'fh-timeline-connector';
            node.appendChild(connector);
        }

        const dot = document.createElement('div');
        dot.className = 'fh-timeline-dot';
        dot.style.background = STATUS_COLORS[event.status] || STATUS_COLORS.Unknown;
        dot.title = `${formatDisplayDate(event.date)}\n${event.status} • ${formatValue(event.value, event.unit)}`;

        const value = document.createElement('div');
        value.className = 'fh-timeline-value';
        value.textContent = formatValue(event.value, event.unit);

        const date = document.createElement('div');
        date.className = 'fh-timeline-date';
        date.textContent = formatDisplayDate(event.date);

        node.appendChild(dot);
        node.appendChild(value);
        node.appendChild(date);
        timeline.appendChild(node);
    });

    if (events.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'fh-timeline-empty';
        empty.textContent = 'No test results available';
        timeline.appendChild(empty);
    }

    card.appendChild(header);
    card.appendChild(timeline);
    return card;
}

function buildTimelineEvents(biomarker) {
    const entries = [];
    if (Array.isArray(biomarker.historicalValues)) {
        biomarker.historicalValues.forEach((record) => {
            if (!record?.date) return;
            entries.push({
                date: record.date,
                value: record.value ?? biomarker.value ?? '',
                unit: record.unit ?? biomarker.unit ?? '',
                status: record.status ?? biomarker.status ?? 'Unknown'
            });
        });
    }

    if (biomarker.date && !entries.some((entry) => entry.date === biomarker.date)) {
        entries.push({
            date: biomarker.date,
            value: biomarker.value ?? '',
            unit: biomarker.unit ?? '',
            status: biomarker.status ?? 'Unknown'
        });
    }

    return entries
        .filter((entry) => entry.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getMostRecentEntry(biomarker) {
    const events = buildTimelineEvents(biomarker);
    return events[events.length - 1];
}

function normalizeStatus(status) {
    if (!status) return 'unknown';
    return status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function formatValue(value, unit) {
    if (value === null || value === undefined || value === '') return '—';
    return unit ? `${value} ${unit}` : String(value);
}

function formatDisplayDate(dateString) {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function injectStyles() {
    if (document.getElementById('fh-visual-styles')) return;
    const style = document.createElement('style');
    style.id = 'fh-visual-styles';
    style.textContent = `
        .fh-visual-no-scroll {
            overflow: hidden !important;
        }

        .fh-visual-overlay {
            position: fixed;
            inset: 0;
            background: rgba(20, 24, 33, 0.72);
            backdrop-filter: blur(8px);
            z-index: 2147483646;
            display: none;
            align-items: center;
            justify-content: center;
            padding: clamp(12px, 4vw, 28px);
        }

        .fh-visual-overlay--open {
            display: flex;
            animation: fhOverlayFade 0.2s ease;
        }

        .fh-visual-panel {
            width: min(1100px, 96vw);
            max-height: 92vh;
            background: #f6f7fb;
            border-radius: 20px;
            box-shadow: 0 30px 60px rgba(15, 23, 42, 0.35);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid rgba(102, 126, 234, 0.2);
        }

        .fh-visual-header {
            display: flex;
            align-items: center;
            padding: 20px 24px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.16), rgba(118, 75, 162, 0.12));
            border-bottom: 1px solid rgba(102, 126, 234, 0.25);
        }

        .fh-visual-header h2 {
            margin: 0;
            font-size: 22px;
            color: #1f2a44;
            font-weight: 700;
        }

        .fh-visual-status {
            margin-left: auto;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .fh-chip {
            background: rgba(102, 126, 234, 0.18);
            color: #4a55a2;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .fh-visual-close {
            margin-left: 16px;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.78);
            color: #4a55a2;
            font-size: 26px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease;
        }

        .fh-visual-close:hover {
            background: #ffffff;
        }

        .fh-visual-body {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 310px;
            gap: 18px;
            padding: 18px 24px 24px;
            overflow: hidden;
            position: relative;
        }

        .fh-visual-canvas {
            overflow-y: auto;
            padding-right: 6px;
        }

        .fh-visual-insights {
            background: rgba(255, 255, 255, 0.88);
            border-radius: 16px;
            padding: 16px;
            box-shadow: inset 0 0 0 1px rgba(102, 126, 234, 0.15);
            overflow-y: auto;
        }

        .fh-visual-insights h3 {
            margin: 0 0 12px;
            font-size: 15px;
            color: #364360;
            font-weight: 700;
        }

        .fh-category-list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: grid;
            gap: 8px;
        }

        .fh-category-list li button {
            width: 100%;
            padding: 8px 12px;
            border-radius: 10px;
            border: 1px solid rgba(102, 126, 234, 0.2);
            background: rgba(102, 126, 234, 0.08);
            color: #505c8a;
            font-size: 13px;
            cursor: pointer;
            text-align: left;
            transition: background 0.2s ease, transform 0.2s ease;
        }

        .fh-category-list li button:hover {
            background: rgba(102, 126, 234, 0.16);
            transform: translateX(3px);
        }

        .fh-visual-section {
            margin-bottom: 28px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 18px 40px rgba(102, 126, 234, 0.12);
            padding: 18px;
            border: 1px solid rgba(102, 126, 234, 0.15);
        }

        .fh-visual-section-header {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 16px;
        }

        .fh-visual-section-header h3 {
            margin: 0;
            font-size: 18px;
            color: #2f3756;
        }

        .fh-visual-section-header span {
            font-size: 13px;
            color: #6e7591;
        }

        .fh-visual-biomarker-list {
            display: grid;
            gap: 14px;
        }

        .fh-bio-card {
            border-radius: 14px;
            background: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(246, 247, 251, 0.96));
            padding: 14px 16px;
            box-shadow: 0 12px 32px rgba(47, 56, 96, 0.08);
        }

        .fh-bio-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 10px;
        }

        .fh-bio-card-header h4 {
            margin: 0;
            font-size: 16px;
            color: #2e3a59;
            font-weight: 700;
        }

        .fh-status-badge {
            padding: 5px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .fh-status-in-range { background: #30c48d; }
        .fh-status-out-of-range { background: #f77070; }
        .fh-status-improving { background: #f7b267; }
        .fh-status-unknown { background: #94a0be; }

        .fh-bio-timeline {
            display: flex;
            gap: 18px;
            overflow-x: auto;
            padding-bottom: 6px;
        }

        .fh-timeline-node {
            display: grid;
            grid-template-rows: auto auto auto;
            gap: 6px;
            align-items: start;
            justify-items: center;
            position: relative;
            min-width: 92px;
        }

        .fh-timeline-connector {
            position: absolute;
            left: 50%;
            top: 8px;
            width: 120px;
            height: 2px;
            background: linear-gradient(90deg, rgba(102, 126, 234, 0.16), rgba(102, 126, 234, 0.5));
            transform: translateX(-50%);
        }

        .fh-timeline-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.18);
        }

        .fh-timeline-value {
            font-size: 14px;
            font-weight: 600;
            color: #2d334c;
        }

        .fh-timeline-date {
            font-size: 12px;
            color: #6c748c;
        }

        .fh-timeline-empty {
            font-size: 13px;
            color: #7a829c;
            font-style: italic;
        }

        @keyframes fhOverlayFade {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @media (max-width: 1024px) {
            .fh-visual-body {
                grid-template-columns: 1fr;
            }

            .fh-visual-insights {
                max-height: 220px;
                order: -1;
            }
        }
    `;
    document.head.appendChild(style);
}

function cssEscape(value) {
    if (window.CSS && CSS.escape) {
        return CSS.escape(value);
    }
    return value.replace(/[^a-zA-Z0-9\-]/g, '_');
}

export default VisualOverlay;
