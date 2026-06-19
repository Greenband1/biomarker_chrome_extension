const STATUS_COLORS = {
    'In Range': '#30c48d',
    'Out of Range': '#f77070',
    'Improving': '#f7b267',
    'Unknown': '#a0a4b8'
};

let overlay;
let contentContainer;
let stylesInjected = false;

export function openVisualResultsView({ dataset, filtersApplied = false, latestOnly = false }) {
    if (!dataset || !dataset.categories) {
        console.warn('[visual-view] Missing dataset payload.');
        return;
    }

    ensureStyles();
    ensureOverlay();
    renderDataset(dataset, { filtersApplied, latestOnly });
    overlay.classList.add('open');
    overlay.focus();
}

function ensureOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'visual-view-overlay';
    overlay.tabIndex = -1;

    const panel = document.createElement('div');
    panel.className = 'visual-view-panel';

    const header = document.createElement('header');
    header.className = 'visual-view-header';

    const title = document.createElement('h2');
    title.textContent = 'Biomarker Trends';

    const headerMeta = document.createElement('div');
    headerMeta.className = 'visual-view-meta';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'visual-view-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close visual results view');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closeOverlay);

    header.appendChild(title);
    header.appendChild(headerMeta);
    header.appendChild(closeBtn);

    contentContainer = document.createElement('div');
    contentContainer.className = 'visual-view-content';

    panel.appendChild(header);
    panel.appendChild(contentContainer);
    overlay.appendChild(panel);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeOverlay();
        }
    });

    document.body.appendChild(overlay);
    document.addEventListener('keydown', handleKeydown, { capture: true });
}

function renderDataset(dataset, { filtersApplied, latestOnly }) {
    if (!contentContainer) return;
    contentContainer.replaceChildren();

    const summaryBar = document.createElement('div');
    summaryBar.className = 'visual-view-summary';
    const summaryItems = [
        `${Object.keys(dataset.categories).length} categories`,
        `${dataset.summary?.total ?? 0} biomarkers`,
        filtersApplied ? 'Filters active' : 'All data',
        latestOnly ? 'Showing latest results' : 'Full history',
    ];
    summaryItems.forEach((text) => {
        const span = document.createElement('span');
        span.textContent = text;
        summaryBar.appendChild(span);
    });
    contentContainer.appendChild(summaryBar);

    Object.entries(dataset.categories).forEach(([categoryName, category]) => {
        if (!Array.isArray(category?.biomarkers) || category.biomarkers.length === 0) {
            return;
        }

        const section = document.createElement('section');
        section.className = 'visual-view-section';

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'visual-view-section-header';

        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = categoryName;

        const sectionMeta = document.createElement('span');
        sectionMeta.textContent = `${category.biomarkers.length} biomarkers`;

        sectionHeader.appendChild(sectionTitle);
        sectionHeader.appendChild(sectionMeta);
        section.appendChild(sectionHeader);

        const list = document.createElement('div');
        list.className = 'visual-view-biomarker-list';

        category.biomarkers
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach((biomarker) => {
                const entry = createBiomarkerEntry(biomarker);
                list.appendChild(entry);
            });

        section.appendChild(list);
        contentContainer.appendChild(section);
    });
}

function createBiomarkerEntry(biomarker) {
    const container = document.createElement('article');
    container.className = 'visual-view-biomarker';

    const header = document.createElement('div');
    header.className = 'biomarker-header';

    const nameEl = document.createElement('h4');
    nameEl.textContent = biomarker.name;

    const latest = getLatestSnapshot(biomarker);
    const badge = document.createElement('span');
    badge.className = `status-badge status-${normalizeStatus(latest?.status)}`;
    badge.textContent = latest?.status ?? 'Unknown';

    header.appendChild(nameEl);
    header.appendChild(badge);
    container.appendChild(header);

    const timeline = document.createElement('div');
    timeline.className = 'biomarker-timeline';

    const events = buildTimelineEvents(biomarker);
    events.forEach((event, index) => {
        const point = document.createElement('div');
        point.className = 'timeline-point';

        const connector = document.createElement('div');
        connector.className = 'timeline-connector';
        if (index === 0) {
            connector.classList.add('timeline-connector--hidden');
        }

        const dot = document.createElement('div');
        dot.className = 'timeline-dot';
        dot.style.background = STATUS_COLORS[event.status] || STATUS_COLORS.Unknown;
        dot.title = `${event.date}\n${event.status} • ${event.value}${event.unit ? ' ' + event.unit : ''}`;

        const valueLabel = document.createElement('div');
        valueLabel.className = 'timeline-value';
        valueLabel.textContent = formatValue(event.value, event.unit);

        const dateLabel = document.createElement('div');
        dateLabel.className = 'timeline-date';
        dateLabel.textContent = formatDisplayDate(event.date);

        point.appendChild(connector);
        point.appendChild(dot);
        point.appendChild(valueLabel);
        point.appendChild(dateLabel);
        timeline.appendChild(point);
    });

    container.appendChild(timeline);
    return container;
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

function getLatestSnapshot(biomarker) {
    const events = buildTimelineEvents(biomarker);
    return events[events.length - 1];
}

function normalizeStatus(status) {
    if (!status) return 'unknown';
    return status.toLowerCase().replace(/\s+/g, '-');
}

function formatValue(value, unit) {
    if (value === null || value === undefined || value === '') return '—';
    return unit ? `${value} ${unit}` : String(value);
}

function formatDisplayDate(dateString) {
    if (!dateString) return 'No date';
    try {
        const date = new Date(dateString);
        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        return dateString;
    } catch (error) {
        return dateString;
    }
}

function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove('open');
}

function handleKeydown(event) {
    if (event.key === 'Escape' && overlay?.classList.contains('open')) {
        event.stopPropagation();
        closeOverlay();
    }
}

function ensureStyles() {
    if (stylesInjected) return;
    const style = document.createElement('style');
    style.textContent = `
        .visual-view-overlay {
            position: fixed;
            inset: 0;
            background: rgba(28, 32, 46, 0.68);
            backdrop-filter: blur(6px);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        .visual-view-overlay.open {
            display: flex;
        }

        .visual-view-panel {
            width: min(900px, 96vw);
            max-height: 90vh;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 24px 48px rgba(17, 24, 39, 0.25);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .visual-view-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid rgba(102, 126, 234, 0.2);
        }

        .visual-view-header h2 {
            margin: 0;
            font-size: 20px;
            color: #333;
        }

        .visual-view-meta {
            margin-left: auto;
            margin-right: 18px;
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #6c757d;
        }

        .visual-view-close {
            border: none;
            background: rgba(102, 126, 234, 0.12);
            color: #667eea;
            font-size: 22px;
            line-height: 1;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .visual-view-close:hover {
            background: rgba(102, 126, 234, 0.2);
        }

        .visual-view-content {
            padding: 16px 24px 24px;
            overflow-y: auto;
        }

        .visual-view-summary {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 16px;
            font-size: 12px;
            color: #495057;
        }

        .visual-view-summary span {
            background: rgba(102, 126, 234, 0.08);
            border-radius: 999px;
            padding: 6px 12px;
        }

        .visual-view-section {
            margin-bottom: 28px;
            border-radius: 12px;
            border: 1px solid rgba(102, 126, 234, 0.12);
            padding: 18px;
            background: rgba(248, 249, 252, 0.9);
        }

        .visual-view-section-header {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            margin-bottom: 14px;
            gap: 8px;
        }

        .visual-view-section-header h3 {
            margin: 0;
            font-size: 16px;
            color: #4a4f5e;
        }

        .visual-view-section-header span {
            font-size: 12px;
            color: #7c818d;
        }

        .visual-view-biomarker-list {
            display: grid;
            gap: 12px;
        }

        .visual-view-biomarker {
            background: #ffffff;
            border-radius: 10px;
            padding: 12px 16px;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.08);
        }

        .biomarker-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
            gap: 12px;
        }

        .biomarker-header h4 {
            margin: 0;
            font-size: 15px;
            color: #2f3342;
        }

        .status-badge {
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            color: #ffffff;
        }

        .status-badge.status-in-range { background: #30c48d; }
        .status-badge.status-out-of-range { background: #f77070; }
        .status-badge.status-improving { background: #f7b267; }
        .status-badge.status-unknown { background: #a0a4b8; }

        .biomarker-timeline {
            display: flex;
            align-items: stretch;
            gap: 16px;
            overflow-x: auto;
            padding-bottom: 4px;
        }

        .timeline-point {
            display: grid;
            grid-template-rows: min-content min-content min-content;
            justify-items: center;
            gap: 6px;
            min-width: 80px;
        }

        .timeline-connector {
            height: 2px;
            width: 100%;
            background: linear-gradient(90deg, rgba(102, 126, 234, 0.2), rgba(102, 126, 234, 0.6));
            position: relative;
            top: 11px;
        }

        .timeline-connector--hidden {
            visibility: hidden;
        }

        .timeline-dot {
            width: 16px;
            height: 16px;
            border-radius: 999px;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12);
        }

        .timeline-value {
            font-size: 13px;
            font-weight: 600;
            color: #2d3142;
        }

        .timeline-date {
            font-size: 11px;
            color: #6c717f;
        }

        @media (max-width: 768px) {
            .visual-view-panel {
                width: 94vw;
            }
        }
    `;
    document.head.appendChild(style);
    stylesInjected = true;
}
