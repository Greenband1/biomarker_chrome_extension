/**
 * Threshold visualization components
 */

import { STATUS_COLORS } from '../constants/index.js';
import { formatDisplayDate, formatShortDate } from '../utils/dateUtils.js';
import { createSVGText } from '../utils/formatters.js';
import { extractNumericFromValue } from '../classification/referenceParser.js';
import { createMiniSparkline } from './Sparklines.js';

/**
 * Extract numeric value helper
 */
function extractNumericValue(value) {
    return extractNumericFromValue(value);
}

/**
 * Creates a threshold visualization showing value relative to a threshold
 */
export function createThresholdVisualization(events, refData, thresholdType) {
    const container = document.createElement('div');
    container.className = 'fh-threshold-viz-container';
    
    if (!refData || refData.type !== 'threshold') {
        return null;
    }
    
    const threshold = refData.value;
    const isUpperBound = thresholdType === 'threshold-upper'; // Must be below threshold
    
    const latestEvent = events[events.length - 1];
    const currentValue = extractNumericFromValue(latestEvent?.value);
    
    if (currentValue === null) {
        return null;
    }
    
    // Calculate display bounds
    const maxVal = Math.max(threshold * 1.5, currentValue * 1.2);
    const displayRange = maxVal;
    
    const thresholdPos = (threshold / displayRange) * 100;
    const valuePos = Math.max(0, Math.min(100, (currentValue / displayRange) * 100));
    
    // Determine if value is good or bad
    let isGood;
    if (isUpperBound) {
        isGood = refData.inclusive ? currentValue <= threshold : currentValue < threshold;
    } else {
        isGood = refData.inclusive ? currentValue >= threshold : currentValue > threshold;
    }
    
    // Build visualization
    const barWrapper = document.createElement('div');
    barWrapper.className = 'fh-threshold-bar-wrapper';
    
    const bar = document.createElement('div');
    bar.className = 'fh-threshold-bar';
    
    // Good zone
    const goodZone = document.createElement('div');
    goodZone.className = 'fh-threshold-zone fh-threshold-zone--good';
    if (isUpperBound) {
        goodZone.style.width = `${thresholdPos}%`;
    } else {
        goodZone.style.left = `${thresholdPos}%`;
        goodZone.style.width = `${100 - thresholdPos}%`;
    }
    bar.appendChild(goodZone);
    
    // Bad zone
    const badZone = document.createElement('div');
    badZone.className = 'fh-threshold-zone fh-threshold-zone--bad';
    if (isUpperBound) {
        badZone.style.left = `${thresholdPos}%`;
        badZone.style.width = `${100 - thresholdPos}%`;
    } else {
        badZone.style.width = `${thresholdPos}%`;
    }
    bar.appendChild(badZone);
    
    // Threshold line
    const thresholdLine = document.createElement('div');
    thresholdLine.className = 'fh-threshold-line';
    thresholdLine.style.left = `${thresholdPos}%`;
    bar.appendChild(thresholdLine);
    
    // Value marker
    const marker = document.createElement('div');
    marker.className = `fh-threshold-marker ${isGood ? 'fh-threshold-marker--good' : 'fh-threshold-marker--bad'}`;
    marker.style.left = `${valuePos}%`;
    bar.appendChild(marker);
    
    barWrapper.appendChild(bar);
    
    // Labels
    const labels = document.createElement('div');
    labels.className = 'fh-threshold-labels';
    
    const thresholdLabel = document.createElement('span');
    thresholdLabel.className = 'fh-threshold-label';
    thresholdLabel.style.left = `${thresholdPos}%`;
    const op = refData.inclusive ? (isUpperBound ? '≤' : '≥') : (isUpperBound ? '<' : '>');
    thresholdLabel.textContent = `${op}${threshold}`;
    labels.appendChild(thresholdLabel);
    
    barWrapper.appendChild(labels);
    container.appendChild(barWrapper);
    
    // Add mini sparkline if multiple events (trend line)
    if (events.length > 1) {
        const sparkline = createMiniSparkline(events, refData);
        container.appendChild(sparkline);
    }
    
    return container;
}

/**
 * Creates a threshold chart (legacy/alternate style)
 */
export function createThresholdChart(events, referenceRange) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container fh-chart-threshold';

    const width = 600;
    const height = 120;
    const padding = { top: 20, right: 80, bottom: 30, left: 60 };

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

