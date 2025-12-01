/**
 * Sparkline chart components
 */

import { STATUS_COLORS } from '../constants/index.js';
import { formatDisplayDate, formatShortDate } from '../utils/dateUtils.js';
import { formatValue, normalizeStatus } from '../utils/formatters.js';
import { extractNumericFromValue } from '../classification/referenceParser.js';

/**
 * Extract numeric value for chart purposes
 */
function extractNumericValue(value) {
    return extractNumericFromValue(value);
}

/**
 * Creates a simple sparkline chart for trend visualization
 */
export function createSimpleSparkline(events) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container';

    const width = 400;
    const height = 80;
    const padding = 12; // Add padding for dots at edges

    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);

    if (numericEvents.length === 0) {
        return container;
    }

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'fh-chart-tooltip';
    container.appendChild(tooltip);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-simple-sparkline');

    const values = numericEvents.map(e => e.numericValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = numericEvents.map((event, index) => {
        const x = padding + ((width - padding * 2) / (numericEvents.length - 1 || 1)) * index;
        const y = padding + (height - padding * 2) - ((event.numericValue - min) / range) * (height - padding * 2);
        return { x, y, event };
    });

    if (points.length > 1) {
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#6471f5');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
    }

    points.forEach((point, index) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 6);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        circle.classList.add('fh-chart-dot');
        circle.style.cursor = 'pointer';

        // Hover tooltip functionality
        circle.addEventListener('mouseenter', (e) => {
            const rect = svg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const dotX = (point.x / width) * rect.width;
            const dotY = (point.y / height) * rect.height;
            
            // Position tooltip above the dot
            let tooltipX = dotX + (rect.left - containerRect.left);
            let tooltipY = dotY + (rect.top - containerRect.top) - 50;
            
            // Ensure tooltip stays within bounds
            if (tooltipY < 0) tooltipY = dotY + (rect.top - containerRect.top) + 20;
            
            tooltip.innerHTML = `
                <div class="fh-chart-tooltip-value">${formatValue(point.event.value, point.event.unit)}</div>
                <div class="fh-chart-tooltip-date">${formatDisplayDate(point.event.date)}</div>
                <div class="fh-chart-tooltip-status fh-status-${normalizeStatus(point.event.status)}">${point.event.status}</div>
            `;
            tooltip.style.left = `${tooltipX}px`;
            tooltip.style.top = `${tooltipY}px`;
            tooltip.classList.add('fh-chart-tooltip--visible');
            
            // Scale up the dot
            circle.setAttribute('r', 8);
        });

        circle.addEventListener('mouseleave', () => {
            tooltip.classList.remove('fh-chart-tooltip--visible');
            circle.setAttribute('r', 6);
        });

        svg.appendChild(circle);
    });

    container.appendChild(svg);
    return container;
}

/**
 * Creates a mini sparkline for compact trend display
 */
export function createMiniSparkline(events, refData) {
    const container = document.createElement('div');
    container.className = 'fh-mini-sparkline-container';
    
    const width = 200;
    const height = 40;
    const padding = 8;
    
    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);
    
    if (numericEvents.length < 2) {
        return container;
    }
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'fh-mini-sparkline-tooltip';
    tooltip.style.display = 'none';
    container.appendChild(tooltip);
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-mini-sparkline');
    
    const values = numericEvents.map(e => e.numericValue);
    let min = Math.min(...values);
    let max = Math.max(...values);
    
    // Include reference range in scale if available
    if (refData && refData.type === 'band') {
        min = Math.min(min, refData.lower);
        max = Math.max(max, refData.upper);
    }
    
    const range = max - min || 1;
    
    const points = numericEvents.map((event, index) => {
        const x = padding + ((width - padding * 2) / (numericEvents.length - 1)) * index;
        const y = padding + (height - padding * 2) - ((event.numericValue - min) / range) * (height - padding * 2);
        return { x, y, event };
    });
    
    // Draw line
    if (points.length > 1) {
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#8892b0');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
    }
    
    // Draw dots
    points.forEach((point, index) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 2.5);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.classList.add('fh-mini-sparkline-dot');
        
        // Hover events for tooltip
        circle.addEventListener('mouseenter', () => {
            // Scale up the dot
            circle.setAttribute('r', 4);
            
            // Position and show tooltip
            const svgRect = svg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const dotX = (point.x / width) * svgRect.width;
            
            tooltip.innerHTML = `<strong>${point.event.value}</strong><br><span>${formatShortDate(point.event.date)}</span>`;
            tooltip.style.display = 'block';
            tooltip.style.left = `${dotX}px`;
            tooltip.style.bottom = `${height + 4}px`;
        });
        
        circle.addEventListener('mouseleave', () => {
            circle.setAttribute('r', 2.5);
            tooltip.style.display = 'none';
        });
        
        svg.appendChild(circle);
    });
    
    container.appendChild(svg);
    return container;
}

