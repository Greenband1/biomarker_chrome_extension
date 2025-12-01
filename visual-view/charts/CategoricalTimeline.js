/**
 * Categorical timeline and history components
 */

import { formatShortDate } from '../utils/dateUtils.js';
import { formatValue, normalizeStatus, getCategoricalIcon } from '../utils/formatters.js';
import { getTrendInsight } from '../utils/trendHelpers.js';

/**
 * Creates a categorical timeline display
 */
export function createCategoricalTimeline(events) {
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

/**
 * Creates a history footer with chips
 */
export function createHistoryFooter(events, type) {
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

