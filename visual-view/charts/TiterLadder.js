/**
 * Titer ladder visualization component
 */

import { STATUS_COLORS } from '../constants/index.js';
import { formatShortDate } from '../utils/dateUtils.js';
import { createSVGText } from '../utils/formatters.js';

/**
 * Creates a titer ladder visualization with logarithmic scale
 */
export function createTiterLadder(events, referenceRange) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container fh-titer-ladder-container';
    
    // Parse titer values from events
    const titerEvents = events.map(e => {
        const match = String(e.value || '').match(/1\s*:\s*(\d+)/);
        return {
            ...e,
            titerValue: match ? parseInt(match[1]) : null
        };
    }).filter(e => e.titerValue !== null);
    
    if (titerEvents.length === 0) {
        container.textContent = 'No titer values found';
        return container;
    }
    
    const width = 500;
    const height = 140;
    const padding = { top: 30, right: 60, bottom: 35, left: 75 };
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-titer-ladder');
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Determine scale (log scale for titers)
    const allTiters = titerEvents.map(e => e.titerValue);
    const minTiter = Math.min(...allTiters, 40); // Include 40 as baseline
    const maxTiter = Math.max(...allTiters, 640); // Include reasonable max
    
    // Log scale helper
    const logScale = (val) => {
        const logMin = Math.log2(minTiter);
        const logMax = Math.log2(maxTiter);
        const logVal = Math.log2(val);
        return ((logVal - logMin) / (logMax - logMin)) * chartHeight;
    };
    
    // Draw zones
    const zones = [
        { max: 40, color: 'rgba(48, 196, 141, 0.15)', label: 'Negative' },
        { max: 80, color: 'rgba(247, 178, 103, 0.12)', label: 'Low' },
        { max: 160, color: 'rgba(247, 178, 103, 0.18)', label: 'Moderate' },
        { max: Infinity, color: 'rgba(247, 112, 112, 0.15)', label: 'High' }
    ];
    
    let prevY = height - padding.bottom;
    zones.forEach((zone, idx) => {
        const zoneMax = Math.min(zone.max, maxTiter);
        if (zoneMax < minTiter) return;
        
        const zoneY = height - padding.bottom - logScale(zoneMax);
        const zoneHeight = prevY - zoneY;
        
        if (zoneHeight > 0) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', padding.left);
            rect.setAttribute('y', zoneY);
            rect.setAttribute('width', chartWidth);
            rect.setAttribute('height', zoneHeight);
            rect.setAttribute('fill', zone.color);
            svg.appendChild(rect);
            
            // Zone label (only if zone is tall enough)
            if (zoneHeight > 15) {
                const labelY = zoneY + zoneHeight / 2 + 4;
                const zoneLabel = createSVGText(
                    zone.label,
                    width - padding.right + 8,
                    labelY,
                    'start',
                    9,
                    '#6a7395'
                );
                svg.appendChild(zoneLabel);
            }
        }
        
        prevY = zoneY;
    });
    
    // Draw scale labels on left
    const scaleValues = [40, 80, 160, 320, 640].filter(v => v >= minTiter && v <= maxTiter);
    scaleValues.forEach(val => {
        const y = height - padding.bottom - logScale(val);
        
        // Tick line
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', padding.left - 5);
        tick.setAttribute('y1', y);
        tick.setAttribute('x2', padding.left);
        tick.setAttribute('y2', y);
        tick.setAttribute('stroke', '#8892b0');
        tick.setAttribute('stroke-width', '1');
        svg.appendChild(tick);
        
        // Label
        const label = createSVGText(
            `1:${val}`,
            padding.left - 10,
            y + 4,
            'end',
            10,
            '#6a7395'
        );
        svg.appendChild(label);
    });
    
    // Calculate x positions for events
    const points = titerEvents.map((event, index) => {
        const x = padding.left + (chartWidth / (titerEvents.length - 1 || 1)) * index;
        const y = height - padding.bottom - logScale(event.titerValue);
        return { x, y, event };
    });
    
    // Draw connecting line
    if (points.length > 1) {
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#667eea');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
    }
    
    // Draw points
    points.forEach((point, index) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 7);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${point.event.value}\n${point.event.date}\n${point.event.status}`;
        circle.appendChild(title);
        svg.appendChild(circle);
        
        // Value label - position based on index to avoid overlap with axis
        let textAnchor = 'middle';
        let labelX = point.x;
        
        if (index === 0) {
            // First point - position label to the right to avoid left axis
            textAnchor = 'start';
            labelX = point.x + 10;
        } else if (index === points.length - 1) {
            // Last point - position label to the left to avoid right edge
            textAnchor = 'end';
            labelX = point.x - 10;
        }
        
        const valueLabel = createSVGText(
            point.event.value,
            labelX,
            point.y - 14,
            textAnchor,
            11,
            '#2d334c'
        );
        valueLabel.setAttribute('font-weight', '600');
        svg.appendChild(valueLabel);
        
        // Date label
        const dateLabel = createSVGText(
            formatShortDate(point.event.date),
            point.x,
            height - padding.bottom + 18,
            'middle',
            10,
            '#6c748c'
        );
        svg.appendChild(dateLabel);
    });
    
    container.appendChild(svg);
    return container;
}

/**
 * Creates a titer chart (legacy style)
 */
export function createTiterChart(events, referenceRange) {
    return createTiterLadder(events, referenceRange);
}

