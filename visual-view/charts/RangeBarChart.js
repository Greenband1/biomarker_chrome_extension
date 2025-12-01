/**
 * Range bar visualization component
 */

import { extractNumericFromValue } from '../classification/referenceParser.js';
import { createSimpleSparkline, createMiniSparkline } from './Sparklines.js';

/**
 * Creates a range bar visualization showing the value position within a reference range
 * Shows colored zones: below (amber), in-range (green), above (red)
 */
export function createRangeBarVisualization(events, refData, biomarker) {
    const container = document.createElement('div');
    container.className = 'fh-range-bar-container';
    
    if (!refData || refData.type !== 'band') {
        return createSimpleSparkline(events);
    }
    
    const { lower, upper } = refData;
    const rangeSpan = upper - lower;
    
    // Get latest numeric value
    const latestEvent = events[events.length - 1];
    const currentValue = extractNumericFromValue(latestEvent?.value);
    
    if (currentValue === null) {
        return createSimpleSparkline(events);
    }
    
    // Calculate display bounds (extend 20% beyond range to show out-of-range values)
    const padding = rangeSpan * 0.25;
    const displayMin = Math.min(lower - padding, currentValue - padding);
    const displayMax = Math.max(upper + padding, currentValue + padding);
    const displayRange = displayMax - displayMin;
    
    // Calculate positions as percentages
    const lowerPos = ((lower - displayMin) / displayRange) * 100;
    const upperPos = ((upper - displayMin) / displayRange) * 100;
    const valuePos = Math.max(0, Math.min(100, ((currentValue - displayMin) / displayRange) * 100));
    
    // Determine value status
    let valueStatus = 'in-range';
    if (currentValue < lower) valueStatus = 'below';
    else if (currentValue > upper) valueStatus = 'above';
    
    // Build the visualization
    const barWrapper = document.createElement('div');
    barWrapper.className = 'fh-range-bar-wrapper';
    
    // Background bar with zones
    const bar = document.createElement('div');
    bar.className = 'fh-range-bar';
    
    // Below zone
    const belowZone = document.createElement('div');
    belowZone.className = 'fh-range-zone fh-range-zone--below';
    belowZone.style.width = `${lowerPos}%`;
    bar.appendChild(belowZone);
    
    // In-range zone
    const inRangeZone = document.createElement('div');
    inRangeZone.className = 'fh-range-zone fh-range-zone--in-range';
    inRangeZone.style.left = `${lowerPos}%`;
    inRangeZone.style.width = `${upperPos - lowerPos}%`;
    bar.appendChild(inRangeZone);
    
    // Above zone
    const aboveZone = document.createElement('div');
    aboveZone.className = 'fh-range-zone fh-range-zone--above';
    aboveZone.style.left = `${upperPos}%`;
    aboveZone.style.width = `${100 - upperPos}%`;
    bar.appendChild(aboveZone);
    
    // Value marker
    const marker = document.createElement('div');
    marker.className = `fh-range-marker fh-range-marker--${valueStatus}`;
    marker.style.left = `${valuePos}%`;
    
    const markerDot = document.createElement('div');
    markerDot.className = 'fh-range-marker-dot';
    marker.appendChild(markerDot);
    
    bar.appendChild(marker);
    barWrapper.appendChild(bar);
    
    // Range labels
    const labels = document.createElement('div');
    labels.className = 'fh-range-labels';
    
    const lowerLabel = document.createElement('span');
    lowerLabel.className = 'fh-range-label fh-range-label--lower';
    lowerLabel.textContent = lower;
    lowerLabel.style.left = `${lowerPos}%`;
    
    const upperLabel = document.createElement('span');
    upperLabel.className = 'fh-range-label fh-range-label--upper';
    upperLabel.textContent = upper;
    upperLabel.style.left = `${upperPos}%`;
    
    labels.appendChild(lowerLabel);
    labels.appendChild(upperLabel);
    barWrapper.appendChild(labels);
    
    container.appendChild(barWrapper);
    
    // Add mini sparkline if multiple events
    if (events.length > 1) {
        const sparkline = createMiniSparkline(events, refData);
        container.appendChild(sparkline);
    }
    
    return container;
}

