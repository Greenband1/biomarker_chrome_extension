const STATUS_COLORS = {
    'In Range': '#30c48d',
    'Out of Range': '#f77070',
    'Improving': '#f7b267',
    'Unknown': '#a0a4b8'
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
            toolbar.className = 'fh-visual-toolbar';

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
                this.toggleDropdown(dataset);
            });

            const chipContainer = document.createElement('div');
            chipContainer.className = 'fh-selected-chips';

            categoryControl.appendChild(label);
            categoryControl.appendChild(button);
            toolbar.appendChild(categoryControl);
            toolbar.appendChild(chipContainer);

            this.content.innerHTML = '';
            this.content.appendChild(toolbar);
            this.toolbar = toolbar;
            this.selectButton = button;
            this.selectedChips = chipContainer;
        }

        this.updateCategorySelection(dataset);
    },

    toggleDropdown(dataset) {
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
                                // Prevent empty state: default back to all
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

        this.toolbar.appendChild(dropdown);
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

        if (this.selectedChips) {
            this.selectedChips.innerHTML = '';
            const selected = categories.filter((cat) => this.selectedCategories.has(cat));
            selected.slice(0, 6).forEach((cat) => {
                const chip = document.createElement('span');
                chip.className = 'fh-chip fh-chip--ghost';
                chip.textContent = cat;
                chip.addEventListener('click', () => {
                    if (this.selectedCategories.size > 1) {
                        this.selectedCategories.delete(cat);
                        this.updateCategorySelection(dataset);
                        this.renderCards(dataset);
                    }
                });
                this.selectedChips.appendChild(chip);
            });
            if (selected.length > 6) {
                const moreChip = document.createElement('span');
                moreChip.className = 'fh-chip fh-chip--ghost';
                moreChip.textContent = `+${selected.length - 6} more`;
                this.selectedChips.appendChild(moreChip);
            }
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
                    .sort((a, b) => a.name.localeCompare(b.name))
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

function createBiomarkerCard(biomarker) {
    const card = document.createElement('article');
    card.className = 'fh-bio-card';

    const header = document.createElement('div');
    header.className = 'fh-bio-card-header';

    const titleRow = document.createElement('div');
    titleRow.className = 'fh-bio-title-row';

    const name = document.createElement('h4');
    name.textContent = biomarker.name;

    const latestEntry = getMostRecentEntry(biomarker);
    const badge = document.createElement('span');
    badge.className = `fh-status-badge fh-status-${normalizeStatus(latestEntry?.status)}`;
    badge.textContent = latestEntry?.status ?? 'Unknown';

    titleRow.appendChild(name);
    titleRow.appendChild(badge);

    const hero = document.createElement('div');
    hero.className = 'fh-bio-hero';

    const valueBlock = document.createElement('div');
    valueBlock.className = 'fh-bio-hero-block';

    const valueLabel = document.createElement('span');
    valueLabel.className = 'fh-bio-hero-value';
    valueLabel.textContent = formatValue(latestEntry?.value, latestEntry?.unit);

    const dateLabel = document.createElement('span');
    dateLabel.className = 'fh-bio-hero-meta';
    dateLabel.textContent = formatDisplayDate(latestEntry?.date);

    valueBlock.appendChild(valueLabel);
    valueBlock.appendChild(dateLabel);

    hero.appendChild(valueBlock);

    const events = buildTimelineEvents(biomarker);
    const direction = getDirection(events);
    const directionBlock = document.createElement('div');
    directionBlock.className = `fh-direction fh-direction--${direction}`;
    directionBlock.textContent = direction === 'up' ? '▲ Rising' : direction === 'down' ? '▼ Falling' : '→ Stable';
    hero.appendChild(directionBlock);

    header.appendChild(titleRow);
    header.appendChild(hero);
    card.appendChild(header);

    const trend = document.createElement('div');
    trend.className = 'fh-bio-trend';
    const sparkline = createSparkline(events);
    trend.appendChild(sparkline);
    card.appendChild(trend);

    const timeline = document.createElement('div');
    timeline.className = 'fh-bio-timeline-chips';
    events.slice().reverse().forEach((event) => {
        const chip = document.createElement('span');
        chip.className = `fh-timeline-chip fh-status-${normalizeStatus(event.status)}`;
        chip.textContent = `${formatDisplayDate(event.date)} • ${formatValue(event.value, event.unit)}`;
        timeline.appendChild(chip);
    });
    card.appendChild(timeline);

    return card;
}

function createSparkline(events) {
    const numericEvents = events
        .map((event) => ({
            date: event.date,
            status: event.status,
            rawValue: event.value,
            unit: event.unit,
            value: parseFloat(String(event.value).replace(/[^0-9.\-]/g, ''))
        }))
        .filter((event) => !Number.isNaN(event.value));

    const width = 220;
    const height = 60;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('fh-sparkline');

    if (numericEvents.length < 2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', 0);
        line.setAttribute('y1', height / 2);
        line.setAttribute('x2', width);
        line.setAttribute('y2', height / 2);
        line.setAttribute('stroke', '#d5d8f4');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
        return svg;
    }

    const minValue = Math.min(...numericEvents.map((event) => event.value));
    const maxValue = Math.max(...numericEvents.map((event) => event.value));
    const range = maxValue - minValue || 1;

    const points = numericEvents.map((event, index) => {
        const x = (width / (numericEvents.length - 1)) * index;
        const y = height - ((event.value - minValue) / range) * height;
        return { x, y, event };
    });

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
        .join(' ');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#6471f5');
    path.setAttribute('stroke-width', '2.2');
    path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);

    points.forEach((point) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 4.2);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('data-tooltip', `${formatDisplayDate(point.event.date)} • ${formatValue(point.event.rawValue, point.event.unit)} (${point.event.status})`);
        svg.appendChild(circle);
    });

    return svg;
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

function getDirection(events) {
    const numericEvents = events
        .map((event) => parseFloat(String(event.value).replace(/[^0-9.\-]/g, '')))
        .filter((value) => !Number.isNaN(value));
    if (numericEvents.length < 2) return 'flat';
    const last = numericEvents[numericEvents.length - 1];
    const prev = numericEvents[numericEvents.length - 2];
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'flat';
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

        .fh-chip--ghost {
            background: rgba(102, 126, 234, 0.12);
            color: #4a55a2;
            cursor: pointer;
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
            overflow: hidden auto;
            padding: 0 24px 24px;
        }

        .fh-visual-content {
            display: flex;
            flex-direction: column;
            gap: 18px;
        }

        .fh-visual-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            align-items: center;
            padding-top: 18px;
        }

        .fh-toolbar-control {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .fh-toolbar-control span {
            font-size: 12px;
            font-weight: 600;
            color: #53618c;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .fh-select-button {
            border: 1px solid rgba(102, 126, 234, 0.3);
            background: rgba(255, 255, 255, 0.92);
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 13px;
            color: #49538d;
            cursor: pointer;
            min-width: 180px;
            text-align: left;
        }

        .fh-selected-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .fh-select-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            z-index: 10;
            width: 260px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(51, 57, 100, 0.18);
            border: 1px solid rgba(102, 126, 234, 0.18);
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .fh-select-search {
            padding: 8px 10px;
            border-radius: 8px;
            border: 1px solid rgba(102, 126, 234, 0.28);
            font-size: 13px;
        }

        .fh-select-actions {
            display: flex;
            gap: 8px;
        }

        .fh-select-actions button {
            flex: 1;
            padding: 6px 8px;
            border-radius: 8px;
            border: 1px solid rgba(102, 126, 234, 0.25);
            background: rgba(102, 126, 234, 0.1);
            color: #515a94;
            font-size: 12px;
            cursor: pointer;
        }

        .fh-select-list {
            max-height: 200px;
            overflow-y: auto;
            display: grid;
            gap: 6px;
        }

        .fh-select-item {
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 13px;
            color: #414674;
        }

        .fh-select-item input {
            accent-color: #667eea;
        }

        .fh-bio-grid {
            display: grid;
            gap: 16px;
        }

        .fh-category-header {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            margin-top: 16px;
            padding: 4px 2px;
        }

        .fh-category-header h3 {
            margin: 0;
            font-size: 17px;
            color: #27304d;
        }

        .fh-category-header span {
            font-size: 12px;
            color: #6d7391;
        }

        .fh-bio-card {
            border-radius: 16px;
            background: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(246, 247, 251, 0.96));
            padding: 16px 18px;
            box-shadow: 0 16px 40px rgba(48, 55, 99, 0.12);
            border: 1px solid rgba(102, 126, 234, 0.12);
            display: grid;
            gap: 14px;
        }

        .fh-bio-card-header {
            display: grid;
            gap: 10px;
        }

        .fh-bio-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .fh-bio-card-header h4 {
            margin: 0;
            font-size: 17px;
            color: #2e3658;
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

        .fh-bio-hero {
            display: flex;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;
        }

        .fh-bio-hero-block {
            display: grid;
            gap: 4px;
        }

        .fh-bio-hero-value {
            font-size: 24px;
            font-weight: 700;
            color: #243057;
        }

        .fh-bio-hero-meta {
            font-size: 13px;
            color: #6a7395;
        }

        .fh-direction {
            font-size: 13px;
            font-weight: 600;
            padding: 6px 10px;
            border-radius: 10px;
        }

        .fh-direction--up {
            color: #1c8f63;
            background: rgba(48, 196, 141, 0.16);
        }

        .fh-direction--down {
            color: #d45b5b;
            background: rgba(247, 112, 112, 0.16);
        }

        .fh-direction--flat {
            color: #5a5f80;
            background: rgba(149, 156, 201, 0.16);
        }

        .fh-bio-trend {
            width: 100%;
        }

        .fh-sparkline {
            width: 100%;
            height: 70px;
        }

        .fh-bio-timeline-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .fh-timeline-chip {
            font-size: 11px;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(102, 126, 234, 0.14);
            color: #4d568f;
            font-weight: 600;
        }

        .fh-timeline-chip.fh-status-out-of-range { background: rgba(247, 112, 112, 0.18); color: #b23e3e; }
        .fh-timeline-chip.fh-status-in-range { background: rgba(48, 196, 141, 0.18); color: #1e805c; }
        .fh-timeline-chip.fh-status-improving { background: rgba(247, 178, 103, 0.18); color: #a86b2a; }
        .fh-timeline-chip.fh-status-unknown { background: rgba(164, 168, 194, 0.18); color: #606477; }

        @keyframes fhOverlayFade {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @media (max-width: 768px) {
            .fh-visual-panel {
                width: 96vw;
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
