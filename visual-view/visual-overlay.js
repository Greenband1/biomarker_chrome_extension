const STATUS_COLORS = {
    'In Range': '#30c48d',
    'Out of Range': '#f77070',
    'Improving': '#f7b267',
    'Unknown': '#a0a4b8'
};

const BAND_COLORS = {
    above: 'rgba(247, 112, 112, 0.09)',
    inRange: 'rgba(48, 196, 141, 0.12)',
    below: 'rgba(247, 178, 103, 0.09)'
};

const VisualOverlay = {
    container: null,
    content: null,
    statusBar: null,
    dataCache: null,
    toolbar: null,
    dropdown: null,
    selectedCategories: null,
    dropdownOpen: false,

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

        const content = document.createElement('div');
        content.className = 'fh-visual-content';

        body.appendChild(content);
        panel.appendChild(body);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        document.addEventListener('keydown', this.handleKeydown);
        document.addEventListener('click', (event) => {
            if (this.dropdownOpen && this.dropdown && !this.dropdown.contains(event.target) && !this.toolbar?.contains(event.target)) {
                this.closeDropdown();
            }
        });

        this.container = overlay;
        this.content = content;
        this.statusBar = statusBar;
    },

    render() {
        if (!this.dataCache || !this.content) return;
        const { dataset, filtersApplied, latestOnly } = this.dataCache;

        if (!this.selectedCategories) {
            this.selectedCategories = new Set(Object.keys(dataset.categories));
        }

        this.renderStatusBar(dataset, filtersApplied, latestOnly);
        this.renderToolbar(dataset);
        this.renderCards(dataset);
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

    renderToolbar(dataset) {
        if (!this.content) return;
        if (!this.toolbar) {
            const toolbar = document.createElement('div');
            toolbar.className = 'fh-visual-toolbar fh-toolbar-inline';

            const categoryControl = document.createElement('div');
            categoryControl.className = 'fh-toolbar-control';

            const label = document.createElement('span');
            label.textContent = 'Categories';

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'fh-select-button';
            button.textContent = 'All categories';
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.toggleDropdown(dataset, button);
            });

            categoryControl.appendChild(label);
            categoryControl.appendChild(button);
            toolbar.appendChild(categoryControl);

            this.content.innerHTML = '';
            this.content.appendChild(toolbar);
            this.toolbar = toolbar;
            this.selectButton = button;
        }

        this.updateCategorySelection(dataset);
    },

    toggleDropdown(dataset, anchorButton) {
        if (this.dropdownOpen) {
            this.closeDropdown();
            return;
        }
        const dropdown = document.createElement('div');
        dropdown.className = 'fh-select-dropdown';

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search categories';
        searchInput.className = 'fh-select-search';

        const list = document.createElement('div');
        list.className = 'fh-select-list';

        const categories = Object.keys(dataset.categories).sort((a, b) => a.localeCompare(b));

        const buildList = (query = '') => {
            list.innerHTML = '';
            categories
                .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
                .forEach((name) => {
                    const item = document.createElement('label');
                    item.className = 'fh-select-item';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = this.selectedCategories.has(name);
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) {
                            this.selectedCategories.add(name);
                        } else {
                            this.selectedCategories.delete(name);
                            if (this.selectedCategories.size === 0) {
                                categories.forEach((cat) => this.selectedCategories.add(cat));
                            }
                        }
                        this.updateCategorySelection(dataset);
                        this.renderCards(dataset);
                    });

                    item.appendChild(checkbox);
                    const span = document.createElement('span');
                    span.textContent = name;
                    item.appendChild(span);
                    list.appendChild(item);
                });
        };

        searchInput.addEventListener('input', () => buildList(searchInput.value));

        const actions = document.createElement('div');
        actions.className = 'fh-select-actions';

        const selectAllBtn = document.createElement('button');
        selectAllBtn.type = 'button';
        selectAllBtn.textContent = 'Select all';
        selectAllBtn.addEventListener('click', () => {
            categories.forEach((cat) => this.selectedCategories.add(cat));
            this.updateCategorySelection(dataset);
            this.renderCards(dataset);
            buildList(searchInput.value);
        });

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = 'Clear';
        clearBtn.addEventListener('click', () => {
            this.selectedCategories.clear();
            categories.forEach((cat) => this.selectedCategories.add(cat));
            this.updateCategorySelection(dataset);
            this.renderCards(dataset);
            buildList(searchInput.value);
        });

        actions.appendChild(selectAllBtn);
        actions.appendChild(clearBtn);

        dropdown.appendChild(searchInput);
        dropdown.appendChild(actions);
        dropdown.appendChild(list);

        anchorButton.parentElement.appendChild(dropdown);
        this.dropdown = dropdown;
        this.dropdownOpen = true;
        buildList();
        searchInput.focus({ preventScroll: true });
    },

    closeDropdown() {
        if (!this.dropdown) return;
        this.dropdown.remove();
        this.dropdown = null;
        this.dropdownOpen = false;
    },

    updateCategorySelection(dataset) {
        const categories = Object.keys(dataset.categories).sort((a, b) => a.localeCompare(b));
        if (!this.selectedCategories || this.selectedCategories.size === 0) {
            this.selectedCategories = new Set(categories);
        }

        if (this.selectButton) {
            const label = this.selectedCategories.size === categories.length
                ? 'All categories'
                : `${this.selectedCategories.size} selected`;
            this.selectButton.textContent = label;
        }
    },

    renderCards(dataset) {
        if (!this.content) return;
        const existingList = this.content.querySelector('.fh-bio-grid');
        if (existingList) {
            existingList.remove();
        }

        const list = document.createElement('div');
        list.className = 'fh-bio-grid';

        Object.entries(dataset.categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([categoryName, category]) => {
                if (!this.selectedCategories.has(categoryName)) return;
                if (!Array.isArray(category?.biomarkers) || category.biomarkers.length === 0) return;

                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'fh-category-header';
                categoryHeader.dataset.category = categoryName;

                const title = document.createElement('h3');
                title.textContent = categoryName;

                const meta = document.createElement('span');
                meta.textContent = `${category.biomarkers.length} biomarkers`;

                categoryHeader.appendChild(title);
                categoryHeader.appendChild(meta);
                list.appendChild(categoryHeader);

                category.biomarkers
                    .slice()
                    .sort((a, b) => {
                        const aOutOfRange = isOutOfRange(a);
                        const bOutOfRange = isOutOfRange(b);
                        if (aOutOfRange && !bOutOfRange) return -1;
                        if (!aOutOfRange && bOutOfRange) return 1;
                        return a.name.localeCompare(b.name);
                    })
                    .forEach((biomarker) => {
                        const card = createBiomarkerCard(biomarker);
                        list.appendChild(card);
                    });
            });

        this.content.appendChild(list);
    },

    close() {
        if (!this.container) return;
        this.container.classList.remove('fh-visual-overlay--open');
        setTimeout(() => {
            if (this.container && !this.container.classList.contains('fh-visual-overlay--open')) {
                this.container.remove();
                this.container = null;
                this.content = null;
                this.statusBar = null;
                this.toolbar = null;
                this.dropdown = null;
                this.dropdownOpen = false;
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

// ===== BIOMARKER TYPE DETECTION =====

function detectBiomarkerType(biomarker) {
    const events = buildTimelineEvents(biomarker);
    
    if (events.length === 0) {
        return 'static';
    }

    if (events.length === 1) {
        const value = String(events[0].value || '').trim();
        if (isNonNumericValue(value)) {
            return 'static';
        }
    }

    const values = events.map(e => String(e.value || '').trim());
    const numericCount = values.filter(v => isNumericValue(v)).length;
    const categoricalCount = values.filter(v => isNonNumericValue(v)).length;

    if (categoricalCount > numericCount) {
        return 'categorical';
    }

    const hasThresholdOperator = values.some(v => /^[<>]/.test(v));
    if (hasThresholdOperator) {
        return 'threshold';
    }

    return 'numeric-band';
}

function isNumericValue(value) {
    if (!value) return false;
    const cleaned = String(value).replace(/[<>≤≥]/g, '').replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    return !Number.isNaN(parsed);
}

function isNonNumericValue(value) {
    if (!value) return true;
    const str = String(value).trim().toUpperCase();
    const categorical = ['NEGATIVE', 'POSITIVE', 'NON-REACTIVE', 'REACTIVE', 'NOT DETECTED', 'DETECTED', 
                        'CLEAR', 'YELLOW', 'NONE SEEN', 'NEG', 'NORMAL', 'ABNORMAL'];
    return categorical.some(cat => str.includes(cat));
}

function extractNumericValue(value) {
    if (!value) return null;
    const str = String(value).replace(/,/g, '');
    
    // Handle titer format (1:320 → 320)
    const titerMatch = str.match(/1\s*:\s*(\d+)/);
    if (titerMatch) {
        return parseFloat(titerMatch[1]);
    }
    
    // Remove operators and parse
    const cleaned = str.replace(/[<>≤≥]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
}

// ===== BIOMARKER CARD CREATION =====

function createBiomarkerCard(biomarker) {
    const events = buildTimelineEvents(biomarker);
    const type = detectBiomarkerType(biomarker);
    const latestEntry = events[events.length - 1] || {};
    
    const card = document.createElement('article');
    card.className = `fh-bio-card fh-bio-card--${type}`;

    // HEADER
    const header = document.createElement('div');
    header.className = 'fh-bio-header';

    const titleRow = document.createElement('div');
    titleRow.className = 'fh-bio-title-row';

    const name = document.createElement('h4');
    name.textContent = biomarker.name;

    const status = determineBiomarkerStatus(events);
    const badge = document.createElement('span');
    badge.className = `fh-status-badge fh-status-${normalizeStatus(status)}`;
    badge.textContent = status;

    titleRow.appendChild(name);
    titleRow.appendChild(badge);
    header.appendChild(titleRow);

    const refInfo = document.createElement('div');
    refInfo.className = 'fh-reference-info';
    refInfo.textContent = formatReferenceInfo(type, latestEntry);
    header.appendChild(refInfo);

    // HERO METRICS
    const hero = document.createElement('div');
    hero.className = 'fh-bio-hero';

    const valueBlock = document.createElement('div');
    valueBlock.className = 'fh-hero-value-block';

    const valueEl = document.createElement('div');
    valueEl.className = 'fh-hero-value';
    valueEl.textContent = formatValue(latestEntry.value, latestEntry.unit);

    const dateEl = document.createElement('div');
    dateEl.className = 'fh-hero-date';
    dateEl.textContent = formatDisplayDate(latestEntry.date);

    valueBlock.appendChild(valueEl);
    valueBlock.appendChild(dateEl);
    hero.appendChild(valueBlock);

    if (events.length > 1) {
        const direction = getDirectionBadge(events);
        if (direction) {
            hero.appendChild(direction);
        }
    }

    header.appendChild(hero);
    card.appendChild(header);

    // VISUALIZATION
    if (type === 'numeric-band' && events.length > 1) {
        const chart = createBandChart(events);
        card.appendChild(chart);
    } else if (type === 'threshold' && events.length > 1) {
        const chart = createThresholdChart(events);
        card.appendChild(chart);
    } else if (type === 'categorical') {
        const timeline = createCategoricalTimeline(events);
        card.appendChild(timeline);
    } else if (type === 'static') {
        // No chart for static single-value tests
    } else {
        // Fallback simple sparkline
        const chart = createSimpleSparkline(events);
        card.appendChild(chart);
    }

    // FOOTER (history chips)
    if (events.length > 1 || type === 'categorical') {
        const footer = createHistoryFooter(events, type);
        card.appendChild(footer);
    }

    return card;
}

// ===== CHART RENDERERS =====

function createBandChart(events) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container';

    const width = 600;
    const height = 200;
    const padding = { top: 20, right: 40, bottom: 40, left: 80 };

    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);

    if (numericEvents.length === 0) {
        container.textContent = 'Unable to parse numeric values';
        return container;
    }

    const values = numericEvents.map(e => e.numericValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    // Estimate reference bands (simplified - in production, parse from API)
    const bandLow = min - range * 0.2;
    const bandHigh = max + range * 0.2;
    const chartMin = bandLow;
    const chartMax = bandHigh;
    const chartRange = chartMax - chartMin;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-band-chart');

    // Draw bands
    const bandHeight = (height - padding.top - padding.bottom) / 3;
    
    // Above range band (top)
    const aboveRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    aboveRect.setAttribute('x', padding.left);
    aboveRect.setAttribute('y', padding.top);
    aboveRect.setAttribute('width', width - padding.left - padding.right);
    aboveRect.setAttribute('height', bandHeight);
    aboveRect.setAttribute('fill', BAND_COLORS.above);
    svg.appendChild(aboveRect);

    // In range band (middle)
    const inRangeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    inRangeRect.setAttribute('x', padding.left);
    inRangeRect.setAttribute('y', padding.top + bandHeight);
    inRangeRect.setAttribute('width', width - padding.left - padding.right);
    inRangeRect.setAttribute('height', bandHeight);
    inRangeRect.setAttribute('fill', BAND_COLORS.inRange);
    svg.appendChild(inRangeRect);

    // Below range band (bottom)
    const belowRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    belowRect.setAttribute('x', padding.left);
    belowRect.setAttribute('y', padding.top + 2 * bandHeight);
    belowRect.setAttribute('width', width - padding.left - padding.right);
    belowRect.setAttribute('height', bandHeight);
    belowRect.setAttribute('fill', BAND_COLORS.below);
    svg.appendChild(belowRect);

    // Band labels
    const aboveLabel = createSVGText('Above Range', padding.left - 5, padding.top + bandHeight / 2, 'end', 10, '#8e5b5b');
    const inRangeLabel = createSVGText('In Range', padding.left - 5, padding.top + 1.5 * bandHeight, 'end', 10, '#2a7d5f');
    const belowLabel = createSVGText('Below Range', padding.left - 5, padding.top + 2.5 * bandHeight, 'end', 10, '#9d7030');
    
    svg.appendChild(aboveLabel);
    svg.appendChild(inRangeLabel);
    svg.appendChild(belowLabel);

    // Plot points and line
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const points = numericEvents.map((event, index) => {
        const x = padding.left + (chartWidth / (numericEvents.length - 1 || 1)) * index;
        const y = padding.top + chartHeight - ((event.numericValue - chartMin) / chartRange) * chartHeight;
        return { x, y, event };
    });

    // Trend line
    if (points.length > 1) {
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#4a5fc1');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
    }

    // Data points
    points.forEach((point, index) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 7);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${formatDisplayDate(point.event.date)}\n${formatValue(point.event.value, point.event.unit)}\n${point.event.status}`;
        circle.appendChild(title);
        
        svg.appendChild(circle);

        // Value label above point
        const valueLabel = createSVGText(
            String(point.event.numericValue),
            point.x,
            point.y - 12,
            'middle',
            11,
            '#2d334c'
        );
        valueLabel.setAttribute('font-weight', '600');
        svg.appendChild(valueLabel);

        // Date label below
        const dateLabel = createSVGText(
            formatShortDate(point.event.date),
            point.x,
            height - padding.bottom + 20,
            'middle',
            10,
            '#6c748c'
        );
        svg.appendChild(dateLabel);
    });

    container.appendChild(svg);
    return container;
}

function createThresholdChart(events) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container fh-chart-threshold';

    const width = 600;
    const height = 120;
    const padding = { top: 20, right: 40, bottom: 30, left: 80 };

    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);

    if (numericEvents.length === 0) {
        container.textContent = 'Unable to parse values';
        return container;
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-threshold-chart');

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const midY = padding.top + chartHeight / 2;

    // Threshold line
    const thresholdLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    thresholdLine.setAttribute('x1', padding.left);
    thresholdLine.setAttribute('y1', midY);
    thresholdLine.setAttribute('x2', width - padding.right);
    thresholdLine.setAttribute('y2', midY);
    thresholdLine.setAttribute('stroke', '#8892b0');
    thresholdLine.setAttribute('stroke-width', '1.5');
    thresholdLine.setAttribute('stroke-dasharray', '4,4');
    svg.appendChild(thresholdLine);

    // Plot points along timeline
    numericEvents.forEach((event, index) => {
        const x = padding.left + (chartWidth / (numericEvents.length - 1 || 1)) * index;
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', midY);
        circle.setAttribute('r', 7);
        circle.setAttribute('fill', STATUS_COLORS[event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${formatDisplayDate(event.date)}\n${event.value} ${event.unit || ''}\n${event.status}`;
        circle.appendChild(title);
        svg.appendChild(circle);

        // Date label
        const dateLabel = createSVGText(
            formatShortDate(event.date),
            x,
            height - padding.bottom + 20,
            'middle',
            10,
            '#6c748c'
        );
        svg.appendChild(dateLabel);
    });

    container.appendChild(svg);
    return container;
}

function createCategoricalTimeline(events) {
    const container = document.createElement('div');
    container.className = 'fh-categorical-timeline';

    events.slice().reverse().forEach((event, index) => {
        const chip = document.createElement('div');
        chip.className = `fh-cat-chip fh-status-${normalizeStatus(event.status)}`;
        
        const icon = document.createElement('span');
        icon.className = 'fh-cat-icon';
        icon.textContent = getCategoricalIcon(event.value, event.status);
        
        const text = document.createElement('span');
        text.textContent = `${formatShortDate(event.date)} • ${event.value}`;
        
        chip.appendChild(icon);
        chip.appendChild(text);
        container.appendChild(chip);
    });

    return container;
}

function createSimpleSparkline(events) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container';

    const width = 400;
    const height = 80;

    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);

    if (numericEvents.length === 0) {
        return container;
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-simple-sparkline');

    const values = numericEvents.map(e => e.numericValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = numericEvents.map((event, index) => {
        const x = (width / (numericEvents.length - 1 || 1)) * index;
        const y = height - ((event.numericValue - min) / range) * height;
        return { x, y, event };
    });

    if (points.length > 1) {
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#6471f5');
        path.setAttribute('stroke-width', '2');
        svg.appendChild(path);
    }

    points.forEach((point) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 5);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        svg.appendChild(circle);
    });

    container.appendChild(svg);
    return container;
}

function createHistoryFooter(events, type) {
    const footer = document.createElement('div');
    footer.className = 'fh-bio-footer';

    const chips = document.createElement('div');
    chips.className = 'fh-history-chips';

    const maxChips = 5;
    const recentEvents = events.slice().reverse().slice(0, maxChips);

    recentEvents.forEach((event) => {
        const chip = document.createElement('span');
        chip.className = `fh-history-chip fh-status-${normalizeStatus(event.status)}`;
        chip.textContent = `${formatShortDate(event.date)} • ${formatValue(event.value, event.unit)}`;
        chips.appendChild(chip);
    });

    if (events.length > maxChips) {
        const moreChip = document.createElement('span');
        moreChip.className = 'fh-history-chip fh-history-chip--more';
        moreChip.textContent = `+${events.length - maxChips} more`;
        chips.appendChild(moreChip);
    }

    footer.appendChild(chips);

    const insight = getTrendInsight(events);
    if (insight) {
        const insightBadge = document.createElement('div');
        insightBadge.className = `fh-trend-insight fh-trend-insight--${insight.type}`;
        insightBadge.textContent = insight.text;
        footer.appendChild(insightBadge);
    }

    return footer;
}

// ===== HELPER FUNCTIONS =====

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

function determineBiomarkerStatus(events) {
    if (events.length === 0) return 'Unknown';
    
    const latest = events[events.length - 1];
    
    // Check for improving status
    if (events.length >= 2) {
        const previous = events[events.length - 2];
        if (previous.status === 'Out of Range' && latest.status === 'In Range') {
            return 'Improving';
        }
    }
    
    return latest.status || 'Unknown';
}

function getDirectionBadge(events) {
    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);
    
    if (numericEvents.length < 2) return null;
    
    const latest = numericEvents[numericEvents.length - 1].numericValue;
    const previous = numericEvents[numericEvents.length - 2].numericValue;
    const percentChange = ((latest - previous) / previous) * 100;
    
    const badge = document.createElement('div');
    
    if (Math.abs(percentChange) < 5) {
        badge.className = 'fh-direction fh-direction--flat';
        badge.textContent = '→ Stable';
    } else if (latest > previous) {
        badge.className = 'fh-direction fh-direction--up';
        badge.textContent = `▲ +${Math.abs(percentChange).toFixed(1)}%`;
    } else {
        badge.className = 'fh-direction fh-direction--down';
        badge.textContent = `▼ -${Math.abs(percentChange).toFixed(1)}%`;
    }
    
    return badge;
}

function getTrendInsight(events) {
    if (events.length < 2) return null;
    
    const latest = events[events.length - 1];
    const previous = events[events.length - 2];
    
    // Improving
    if (previous.status === 'Out of Range' && latest.status === 'In Range') {
        return {
            type: 'improving',
            text: `↗ Back in range as of ${formatShortDate(latest.date)}`
        };
    }
    
    // Recently out of range
    if (previous.status === 'In Range' && latest.status === 'Out of Range') {
        return {
            type: 'warning',
            text: `⚠ Moved out of range on ${formatShortDate(latest.date)}`
        };
    }
    
    // Stable in range
    const allInRange = events.slice(-3).every(e => e.status === 'In Range');
    if (allInRange && events.length >= 3) {
        return {
            type: 'stable',
            text: `✓ Stable across ${events.length} tests`
        };
    }
    
    return null;
}

function formatReferenceInfo(type, latestEntry) {
    const unit = latestEntry.unit || '';
    
    switch (type) {
        case 'categorical':
            return `Expected: ${getCategoricalExpected(latestEntry.value)}`;
        case 'threshold':
            if (String(latestEntry.value || '').includes('<')) {
                return `Target: below threshold ${unit}`.trim();
            } else if (String(latestEntry.value || '').includes('>')) {
                return `Target: above threshold ${unit}`.trim();
            }
            return `Threshold-based ${unit}`.trim();
        case 'static':
            return 'Informational value';
        default:
            return unit ? `Reference range not available • ${unit}` : 'Reference range not available';
    }
}

function getCategoricalExpected(value) {
    const str = String(value || '').toUpperCase();
    if (str.includes('NOT DETECTED') || str.includes('NEGATIVE') || str.includes('NON-REACTIVE')) {
        return 'NEGATIVE / NOT DETECTED';
    }
    if (str.includes('CLEAR')) return 'CLEAR';
    if (str.includes('NONE SEEN')) return 'NONE SEEN';
    return value;
}

function getCategoricalIcon(value, status) {
    const str = String(value || '').toUpperCase();
    if (status === 'Out of Range') return '⚠';
    if (str.includes('NOT DETECTED') || str.includes('NEGATIVE') || str.includes('NON-REACTIVE') || str.includes('NONE SEEN')) {
        return '✓';
    }
    if (str.includes('POSITIVE') || str.includes('DETECTED')) {
        return '⚠';
    }
    return 'ℹ';
}

function isOutOfRange(biomarker) {
    const events = buildTimelineEvents(biomarker);
    if (events.length === 0) return false;
    return events[events.length - 1].status === 'Out of Range';
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

function formatShortDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
    });
}

function createSVGText(text, x, y, anchor, size, color) {
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.setAttribute('text-anchor', anchor);
    textEl.setAttribute('font-size', size);
    textEl.setAttribute('fill', color);
    textEl.textContent = text;
    return textEl;
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
            background: rgba(20, 24, 33, 0.75);
            backdrop-filter: blur(10px);
            z-index: 2147483646;
            display: none;
            align-items: center;
            justify-content: center;
            padding: clamp(12px, 3vw, 24px);
        }

        .fh-visual-overlay--open {
            display: flex;
            animation: fhOverlayFade 0.25s ease-out;
        }

        .fh-visual-panel {
            width: min(1400px, 98vw);
            max-height: 94vh;
            background: #f6f7fb;
            border-radius: 20px;
            box-shadow: 0 30px 70px rgba(15, 23, 42, 0.4);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid rgba(102, 126, 234, 0.25);
        }

        .fh-visual-header {
            display: flex;
            align-items: center;
            padding: 22px 28px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.18), rgba(118, 75, 162, 0.14));
            border-bottom: 1px solid rgba(102, 126, 234, 0.28);
        }

        .fh-visual-header h2 {
            margin: 0;
            font-size: 24px;
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
            background: rgba(102, 126, 234, 0.2);
            color: #4a55a2;
            padding: 7px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .fh-chip--ghost {
            background: rgba(102, 126, 234, 0.12);
            color: #4a55a2;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .fh-chip--ghost:hover {
            background: rgba(102, 126, 234, 0.22);
        }

        .fh-visual-close {
            margin-left: 18px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.85);
            color: #4a55a2;
            font-size: 28px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .fh-visual-close:hover {
            background: #ffffff;
            transform: scale(1.05);
        }

        .fh-visual-body {
            overflow: hidden auto;
            padding: 0 28px 28px;
        }

        .fh-visual-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .fh-visual-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            align-items: flex-end;
            padding-top: 20px;
            padding-bottom: 8px;
        }

        .fh-toolbar-control {
            display: flex;
            flex-direction: column;
            gap: 7px;
            position: relative;
        }

        .fh-toolbar-control span {
            font-size: 11px;
            font-weight: 700;
            color: #53618c;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }

        .fh-select-button {
            border: 1px solid rgba(102, 126, 234, 0.35);
            background: rgba(255, 255, 255, 0.95);
            padding: 10px 16px;
            border-radius: 10px;
            font-size: 14px;
            color: #49538d;
            cursor: pointer;
            min-width: 200px;
            text-align: left;
            transition: all 0.2s ease;
        }

        .fh-select-button:hover {
            background: #ffffff;
            border-color: rgba(102, 126, 234, 0.5);
        }

        .fh-select-dropdown {
            position: absolute;
            top: calc(100% + 10px);
            left: 0;
            z-index: 30;
            width: 280px;
            background: #ffffff;
            border-radius: 14px;
            box-shadow: 0 24px 48px rgba(51, 57, 100, 0.22);
            border: 1px solid rgba(102, 126, 234, 0.2);
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .fh-select-search {
            padding: 9px 12px;
            border-radius: 9px;
            border: 1px solid rgba(102, 126, 234, 0.3);
            font-size: 13px;
            outline: none;
        }

        .fh-select-search:focus {
            border-color: rgba(102, 126, 234, 0.5);
        }

        .fh-select-actions {
            display: flex;
            gap: 8px;
        }

        .fh-select-actions button {
            flex: 1;
            padding: 7px 10px;
            border-radius: 8px;
            border: 1px solid rgba(102, 126, 234, 0.28);
            background: rgba(102, 126, 234, 0.12);
            color: #515a94;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .fh-select-actions button:hover {
            background: rgba(102, 126, 234, 0.2);
        }

        .fh-select-list {
            max-height: 220px;
            overflow-y: auto;
            display: grid;
            gap: 7px;
        }

        .fh-select-item {
            display: flex;
            gap: 10px;
            align-items: center;
            font-size: 13px;
            color: #414674;
            cursor: pointer;
            padding: 4px 6px;
            border-radius: 6px;
            transition: background 0.2s ease;
        }

        .fh-select-item:hover {
            background: rgba(102, 126, 234, 0.08);
        }

        .fh-select-item input {
            accent-color: #667eea;
            cursor: pointer;
        }

        .fh-bio-grid {
            display: grid;
            gap: 18px;
            grid-template-columns: repeat(auto-fill, minmax(520px, 1fr));
        }

        .fh-category-header {
            grid-column: 1 / -1;
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            margin-top: 20px;
            padding: 8px 4px 6px;
            border-bottom: 2px solid rgba(102, 126, 234, 0.2);
        }

        .fh-category-header h3 {
            margin: 0;
            font-size: 19px;
            color: #27304d;
            font-weight: 700;
        }

        .fh-category-header span {
            font-size: 13px;
            color: #6d7391;
            font-weight: 600;
        }

        .fh-bio-card {
            border-radius: 16px;
            background: linear-gradient(145deg, #ffffff, rgba(246, 247, 251, 0.98));
            padding: 18px 20px 20px;
            box-shadow: 0 16px 40px rgba(48, 55, 99, 0.13);
            border: 1px solid rgba(102, 126, 234, 0.14);
            display: grid;
            gap: 16px;
            transition: all 0.25s ease;
        }

        .fh-bio-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 50px rgba(48, 55, 99, 0.18);
        }

        .fh-bio-card--static {
            min-height: 140px;
        }

        .fh-bio-header {
            display: grid;
            gap: 10px;
        }

        .fh-bio-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
        }

        .fh-bio-header h4 {
            margin: 0;
            font-size: 17px;
            color: #2e3658;
            font-weight: 700;
            line-height: 1.3;
        }

        .fh-status-badge {
            padding: 6px 13px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            white-space: nowrap;
        }

        .fh-status-in-range { background: #30c48d; }
        .fh-status-out-of-range { background: #f77070; }
        .fh-status-improving { background: #f7b267; }
        .fh-status-unknown { background: #94a0be; }

        .fh-reference-info {
            font-size: 12px;
            color: #6a7395;
            font-weight: 500;
            font-style: italic;
        }

        .fh-bio-hero {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            padding-top: 4px;
        }

        .fh-hero-value-block {
            display: grid;
            gap: 4px;
        }

        .fh-hero-value {
            font-size: 26px;
            font-weight: 700;
            color: #243057;
            line-height: 1.1;
        }

        .fh-hero-date {
            font-size: 13px;
            color: #6a7395;
            font-weight: 500;
        }

        .fh-direction {
            font-size: 13px;
            font-weight: 700;
            padding: 7px 12px;
            border-radius: 10px;
            letter-spacing: 0.02em;
        }

        .fh-direction--up {
            color: #1c8f63;
            background: rgba(48, 196, 141, 0.18);
        }

        .fh-direction--down {
            color: #d45b5b;
            background: rgba(247, 112, 112, 0.18);
        }

        .fh-direction--flat {
            color: #5a5f80;
            background: rgba(149, 156, 201, 0.18);
        }

        .fh-chart-container {
            width: 100%;
            margin: 6px 0;
        }

        .fh-band-chart,
        .fh-threshold-chart,
        .fh-simple-sparkline {
            width: 100%;
            height: auto;
        }

        .fh-categorical-timeline {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            padding: 12px 0;
        }

        .fh-cat-chip {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            border: 1px solid;
        }

        .fh-cat-chip.fh-status-in-range {
            background: rgba(48, 196, 141, 0.14);
            color: #1e805c;
            border-color: rgba(48, 196, 141, 0.3);
        }

        .fh-cat-chip.fh-status-out-of-range {
            background: rgba(247, 112, 112, 0.14);
            color: #b23e3e;
            border-color: rgba(247, 112, 112, 0.3);
        }

        .fh-cat-icon {
            font-size: 16px;
        }

        .fh-bio-footer {
            display: grid;
            gap: 12px;
            padding-top: 6px;
        }

        .fh-history-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .fh-history-chip {
            font-size: 11px;
            padding: 6px 11px;
            border-radius: 999px;
            font-weight: 600;
            letter-spacing: 0.01em;
        }

        .fh-history-chip.fh-status-in-range {
            background: rgba(48, 196, 141, 0.16);
            color: #1e805c;
        }

        .fh-history-chip.fh-status-out-of-range {
            background: rgba(247, 112, 112, 0.16);
            color: #b23e3e;
        }

        .fh-history-chip.fh-status-improving {
            background: rgba(247, 178, 103, 0.16);
            color: #a86b2a;
        }

        .fh-history-chip.fh-status-unknown {
            background: rgba(164, 168, 194, 0.16);
            color: #606477;
        }

        .fh-history-chip--more {
            background: rgba(102, 126, 234, 0.12);
            color: #555f9a;
        }

        .fh-trend-insight {
            font-size: 12px;
            font-weight: 600;
            padding: 8px 12px;
            border-radius: 10px;
            display: inline-block;
        }

        .fh-trend-insight--improving {
            background: rgba(247, 178, 103, 0.18);
            color: #a86b2a;
        }

        .fh-trend-insight--warning {
            background: rgba(247, 112, 112, 0.18);
            color: #b23e3e;
        }

        .fh-trend-insight--stable {
            background: rgba(48, 196, 141, 0.16);
            color: #1e805c;
        }

        @keyframes fhOverlayFade {
            from {
                opacity: 0;
                transform: scale(0.96);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        @media (max-width: 1200px) {
            .fh-bio-grid {
                grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
            }
        }

        @media (max-width: 768px) {
            .fh-visual-panel {
                width: 96vw;
            }
            .fh-bio-grid {
                grid-template-columns: 1fr;
            }
            .fh-bio-hero {
                flex-direction: column;
                align-items: flex-start;
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
