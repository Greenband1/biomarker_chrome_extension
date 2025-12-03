/**
 * Chart Renderers Module
 * 
 * Contains all visualization and chart rendering functions for biomarker display.
 * Extracted from visual-overlay.js for better maintainability.
 */

import { normalizeDate, STATUS_COLORS, BAND_COLORS } from '../shared/utils.js';

// ===== NUMERIC VALUE EXTRACTION =====

/**
 * Extract numeric value from various formats (simple version)
 */
export function extractNumericValue(value) {
    if (!value) return null;
    const str = String(value).replace(/,/g, '');
    const match = str.match(/-?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : null;
}

/**
 * Extract numeric value from various formats including threshold operators and titer
 */
export function extractNumericFromValue(value) {
    if (!value) return null;
    const str = String(value).replace(/,/g, '');
    
    // Handle titer format (1:320 → 320)
    const titerMatch = str.match(/1\s*:\s*(\d+)/);
    if (titerMatch) {
        return parseFloat(titerMatch[1]);
    }
    
    // Remove operators and qualifiers, then parse
    const cleaned = str.replace(/[<>≤≥]/g, '').replace(/\s*(OR|or|AND|and|NEG|NEGATIVE|POS|POSITIVE).*$/i, '').trim();
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
}

// ===== REFERENCE RANGE PARSING =====

/**
 * Enhanced reference range parser that handles all observed formats
 */
export function parseReferenceRange(rangeString) {
    if (!rangeString || rangeString === '') return null;
    
    const str = String(rangeString).trim();
    const strUpper = str.toUpperCase();
    
    // Pattern: Titer format "<1:40" or "1:40"
    const titerMatch = str.match(/<?(\d+)\s*:\s*(\d+)/);
    if (titerMatch) {
        const titerValue = parseInt(titerMatch[2]);
        return {
            type: 'titer',
            threshold: titerValue,
            isUpperBound: str.startsWith('<'),
            raw: str
        };
    }
    
    // Pattern: Z-score or range with negative numbers "-2.0 - + 2.0" or "-2.0 - 2.0"
    const zScoreMatch = str.match(/(-?\d+\.?\d*)\s*-\s*\+?\s*(-?\d+\.?\d*)/);
    if (zScoreMatch) {
        const lower = parseFloat(zScoreMatch[1]);
        const upper = parseFloat(zScoreMatch[2]);
        if (!isNaN(lower) && !isNaN(upper)) {
            return {
                type: 'band',
                lower: Math.min(lower, upper),
                upper: Math.max(lower, upper),
                raw: str
            };
        }
    }
    
    // Pattern: Standard numeric range "38.5-50.0" or "7 - 25"
    const rangeMatch = str.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
    if (rangeMatch) {
        return {
            type: 'band',
            lower: parseFloat(rangeMatch[1]),
            upper: parseFloat(rangeMatch[2]),
            raw: str
        };
    }
    
    // Pattern: Less than or equal "<= 123", "< OR = 16", "≤123"
    const lessThanEqualMatch = str.match(/(?:<=|≤|<\s*(?:OR|or)?\s*=)\s*(\d+\.?\d*)/);
    if (lessThanEqualMatch) {
        return {
            type: 'threshold',
            direction: 'upper',
            value: parseFloat(lessThanEqualMatch[1]),
            inclusive: true,
            raw: str
        };
    }
    
    // Pattern: Greater than or equal ">= 60", "> OR = 60", "≥60"
    const greaterThanEqualMatch = str.match(/(?:>=|≥|>\s*(?:OR|or)?\s*=)\s*(\d+\.?\d*)/);
    if (greaterThanEqualMatch) {
        return {
            type: 'threshold',
            direction: 'lower',
            value: parseFloat(greaterThanEqualMatch[1]),
            inclusive: true,
            raw: str
        };
    }
    
    // Pattern: Less than with optional text "< 5.6", "<0.90"
    const lessThanMatch = str.match(/<\s*(\d+\.?\d*)\s*(.*)?/);
    if (lessThanMatch) {
        return {
            type: 'threshold',
            direction: 'upper',
            value: parseFloat(lessThanMatch[1]),
            inclusive: false,
            qualifier: lessThanMatch[2]?.trim() || null,
            raw: str
        };
    }
    
    // Pattern: Greater than "> 400", ">59"
    const greaterThanMatch = str.match(/>\s*(\d+\.?\d*)/);
    if (greaterThanMatch) {
        return {
            type: 'threshold',
            direction: 'lower',
            value: parseFloat(greaterThanMatch[1]),
            inclusive: false,
            raw: str
        };
    }
    
    // Categorical patterns
    const categoricalPatterns = [
        'NEGATIVE', 'POSITIVE', 'NON-REACTIVE', 'REACTIVE',
        'NOT DETECTED', 'DETECTED', 'NONE SEEN', 'CLEAR', 'YELLOW',
        'NORMAL', 'ABNORMAL'
    ];
    
    for (const pattern of categoricalPatterns) {
        if (strUpper.includes(pattern)) {
            return {
                type: 'categorical',
                expected: str,
                raw: str
            };
        }
    }
    
    // Pattern: Single letter/word pattern value
    if (/^[A-Za-z]$/.test(str) || /^[A-Za-z]+$/.test(str) && str.length <= 10) {
        return {
            type: 'pattern',
            expected: str,
            raw: str
        };
    }
    
    // Fallback
    console.log(`[FH Visual] Unknown reference range format: "${str}"`);
    return {
        type: 'unknown',
        raw: str
    };
}

// ===== HELPER FUNCTIONS =====

export function normalizeStatus(status) {
    if (!status) return 'unknown';
    return status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function formatValue(value, unit) {
    if (value === null || value === undefined || value === '') return '—';
    return unit ? `${value} ${unit}` : String(value);
}

export function formatDisplayDate(dateString) {
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

export function formatShortDate(dateString) {
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

export function createSVGText(text, x, y, anchor, size, color) {
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.setAttribute('text-anchor', anchor);
    textEl.setAttribute('font-size', size);
    textEl.setAttribute('fill', color);
    textEl.textContent = text;
    return textEl;
}

export function buildTimelineEvents(biomarker) {
    const entries = [];
    if (Array.isArray(biomarker.historicalValues)) {
        biomarker.historicalValues.forEach((record) => {
            const normalizedRecordDate = normalizeDate(record?.date);
            if (!normalizedRecordDate) return;
            
            let status = record.status;
            if (!status && typeof record.inRange === 'boolean') {
                status = record.inRange ? 'In Range' : 'Out of Range';
            }
            status = status ?? biomarker.status ?? 'Unknown';
            
            entries.push({
                date: normalizedRecordDate,
                value: record.value ?? biomarker.value ?? '',
                unit: record.unit ?? biomarker.unit ?? '',
                status: status,
                isInRange: status === 'In Range'
            });
        });
    }

    const normalizedBiomarkerDate = normalizeDate(biomarker.date);
    if (normalizedBiomarkerDate && !entries.some((entry) => normalizeDate(entry.date) === normalizedBiomarkerDate)) {
        const status = biomarker.status ?? 'Unknown';
        entries.push({
            date: normalizedBiomarkerDate,
            value: biomarker.value ?? '',
            unit: biomarker.unit ?? '',
            status: status,
            isInRange: status === 'In Range'
        });
    }

    return entries
        .filter((entry) => entry.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function determineBiomarkerStatus(events) {
    if (events.length === 0) return 'Unknown';
    
    const latest = events[events.length - 1];
    
    if (events.length >= 2) {
        const previous = events[events.length - 2];
        if (previous.status === 'Out of Range' && latest.status === 'In Range') {
            return 'Improving';
        }
    }
    
    return latest.status || 'Unknown';
}

export function isOutOfRange(biomarker) {
    const events = buildTimelineEvents(biomarker);
    if (events.length === 0) return false;
    return events[events.length - 1].status === 'Out of Range';
}

export function getCategoricalExpected(value) {
    const str = String(value || '').toUpperCase();
    if (str.includes('NOT DETECTED') || str.includes('NEGATIVE') || str.includes('NON-REACTIVE')) {
        return 'NEGATIVE / NOT DETECTED';
    }
    if (str.includes('CLEAR')) return 'CLEAR';
    if (str.includes('NONE SEEN')) return 'NONE SEEN';
    return value;
}

export function getCategoricalIcon(value, status) {
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

export function isPassingResult(valueUpper, status) {
    if (valueUpper.includes('NEGATIVE') || valueUpper.endsWith('NEG') ||
        valueUpper.includes('NON-REACTIVE') || valueUpper.includes('NOT DETECTED') ||
        valueUpper.includes('NONE SEEN')) {
        return true;
    }
    if ((valueUpper.includes('POSITIVE') || valueUpper.endsWith('POS') ||
         valueUpper.includes('REACTIVE') || valueUpper.includes('DETECTED')) &&
        !valueUpper.includes('NON-REACTIVE') && !valueUpper.includes('NOT DETECTED')) {
        return false;
    }
    return status === 'In Range';
}

export function getQualitativeLabel(valueUpper, isPass) {
    if (valueUpper.includes('NEGATIVE') || valueUpper.endsWith('NEG')) {
        return 'NEGATIVE';
    }
    if (valueUpper.includes('POSITIVE') || valueUpper.endsWith('POS')) {
        return 'POSITIVE';
    }
    if (valueUpper.includes('NON-REACTIVE')) {
        return 'NON-REACTIVE';
    }
    if (valueUpper.includes('REACTIVE')) {
        return 'REACTIVE';
    }
    if (valueUpper.includes('NOT DETECTED')) {
        return 'NOT DETECTED';
    }
    if (valueUpper.includes('DETECTED')) {
        return 'DETECTED';
    }
    return isPass ? 'NORMAL' : 'ABNORMAL';
}

export function getQualitativeContext(valueUpper, isPass) {
    if (valueUpper.startsWith('<')) {
        return isPass ? 'Below detection threshold' : 'Below expected range';
    }
    if (valueUpper.startsWith('>')) {
        return isPass ? 'Above detection threshold' : 'Above expected range';
    }
    if (isPass) {
        return 'Result within normal parameters';
    }
    return 'Result outside normal parameters';
}

export function getPatternExplanation(biomarkerName, value) {
    const nameUpper = biomarkerName.toUpperCase();
    const valueUpper = String(value).toUpperCase();
    
    if (nameUpper.includes('LDL PATTERN')) {
        if (valueUpper === 'A') {
            return 'Pattern A: Large, buoyant LDL particles (favorable)';
        } else if (valueUpper === 'B') {
            return 'Pattern B: Small, dense LDL particles (associated with higher cardiovascular risk)';
        }
    }
    
    if (nameUpper.includes('ANA') && nameUpper.includes('PATTERN')) {
        return `Staining pattern observed: ${value}`;
    }
    
    return null;
}

// ===== REFERENCE INFO FORMATTERS =====

export function formatReferenceInfoNew(classification, biomarker, latestEntry) {
    const unit = latestEntry.unit || biomarker.unit || '';
    const refData = classification.referenceData;
    
    if (!refData) {
        return 'No reference range available';
    }
    
    switch (refData.type) {
        case 'band':
            return `Normal: ${refData.lower}–${refData.upper}${unit ? ' ' + unit : ''}`;
            
        case 'threshold':
            const op = refData.inclusive ? 
                (refData.direction === 'upper' ? '≤' : '≥') :
                (refData.direction === 'upper' ? '<' : '>');
            return `Target: ${op} ${refData.value}${unit ? ' ' + unit : ''}`;
            
        case 'titer':
            return `Normal: <1:${refData.threshold}`;
            
        case 'categorical':
            return `Expected: ${refData.expected}`;
            
        case 'pattern':
            return `Expected: ${refData.expected}`;
            
        default:
            return refData.raw ? `Reference: ${refData.raw}` : 'See reference';
    }
}

export function formatReferenceInfo(type, biomarker, latestEntry) {
    const unit = latestEntry.unit || biomarker.unit || '';
    const refRange = biomarker.referenceRange || '';
    
    if (refRange && refRange !== '') {
        return `Normal: ${refRange} ${unit}`.trim();
    }
    
    switch (type) {
        case 'titer-ladder':
            return 'Normal: <1:40';
        case 'categorical':
            return `Expected: ${getCategoricalExpected(latestEntry.value)}`;
        case 'threshold':
            if (String(latestEntry.value || '').includes('<')) {
                return `Target: below threshold${unit ? ' • ' + unit : ''}`;
            } else if (String(latestEntry.value || '').includes('>')) {
                return `Target: above threshold${unit ? ' • ' + unit : ''}`;
            }
            return unit ? `Threshold-based • ${unit}` : 'Threshold-based';
        case 'static':
            return 'Informational value';
        default:
            return unit ? `Units: ${unit}` : 'No reference range available';
    }
}

// ===== TREND AND DIRECTION FUNCTIONS =====

export function getDirectionBadge(events, classification = null) {
    if (events.length < 2) return null;
    
    const latest = events[events.length - 1];
    const previous = events[events.length - 2];
    const type = classification?.type || 'unknown';
    
    // Handle titer type
    if (type === 'titer' || /1\s*:\s*\d+/.test(String(latest.value || ''))) {
        const latestMatch = String(latest.value || '').match(/1\s*:\s*(\d+)/);
        const previousMatch = String(previous.value || '').match(/1\s*:\s*(\d+)/);
        
        if (latestMatch && previousMatch) {
            const latestTiter = parseInt(latestMatch[1]);
            const previousTiter = parseInt(previousMatch[1]);
            
            const badge = document.createElement('div');
            
            if (latestTiter === previousTiter) {
                badge.className = 'fh-direction fh-direction--flat';
                badge.textContent = '→ Stable';
            } else if (latestTiter > previousTiter) {
                const fold = latestTiter / previousTiter;
                badge.className = 'fh-direction fh-direction--warning';
                badge.textContent = fold >= 2 ? `▲ ${fold.toFixed(0)}× higher` : `▲ Increased`;
            } else {
                const fold = previousTiter / latestTiter;
                badge.className = 'fh-direction fh-direction--good';
                badge.textContent = fold >= 2 ? `▼ ${fold.toFixed(0)}× lower` : `▼ Decreased`;
            }
            
            return badge;
        }
    }
    
    // Handle categorical types
    if (type === 'categorical-binary' || type === 'categorical-descriptive') {
        const allSame = events.every(e => e.value === latest.value);
        if (allSame && events.length >= 2) {
            const badge = document.createElement('div');
            badge.className = 'fh-direction fh-direction--flat';
            badge.textContent = `→ Consistent (${events.length} tests)`;
            return badge;
        }
        return null;
    }
    
    // Handle pattern types
    if (type === 'pattern') {
        const latestVal = String(latest.value || '').toUpperCase();
        const previousVal = String(previous.value || '').toUpperCase();
        if (latestVal !== previousVal) {
            const badge = document.createElement('div');
            badge.className = 'fh-direction fh-direction--changed';
            badge.textContent = `Changed from ${previous.value}`;
            return badge;
        }
        return null;
    }
    
    // Standard numeric percentage change
    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);
    
    if (numericEvents.length < 2) return null;
    
    const latestNum = numericEvents[numericEvents.length - 1].numericValue;
    const previousNum = numericEvents[numericEvents.length - 2].numericValue;
    
    if (previousNum === 0) return null;
    
    const percentChange = ((latestNum - previousNum) / Math.abs(previousNum)) * 100;
    
    const badge = document.createElement('div');
    
    if (Math.abs(percentChange) < 5) {
        badge.className = 'fh-direction fh-direction--flat';
        badge.textContent = '→ Stable';
    } else if (latestNum > previousNum) {
        badge.className = 'fh-direction fh-direction--up';
        badge.textContent = `▲ +${Math.abs(percentChange).toFixed(1)}%`;
    } else {
        badge.className = 'fh-direction fh-direction--down';
        badge.textContent = `▼ ${Math.abs(percentChange).toFixed(1)}%`;
    }
    
    return badge;
}

export function getTrendInsight(events, classification = null) {
    if (events.length < 2) return null;
    
    const latest = events[events.length - 1];
    const previous = events[events.length - 2];
    const type = classification?.type || 'unknown';
    
    // Special handling for titer
    if (type === 'titer') {
        const latestMatch = String(latest.value || '').match(/1\s*:\s*(\d+)/);
        const previousMatch = String(previous.value || '').match(/1\s*:\s*(\d+)/);
        
        if (latestMatch && previousMatch) {
            const latestTiter = parseInt(latestMatch[1]);
            const previousTiter = parseInt(previousMatch[1]);
            
            if (latestTiter < previousTiter && previousTiter >= 80) {
                return {
                    type: 'improving',
                    text: `↘ Titer decreasing (was 1:${previousTiter})`
                };
            }
            if (latestTiter > previousTiter && latestTiter >= 160) {
                return {
                    type: 'warning',
                    text: `⚠ Titer increased from 1:${previousTiter}`
                };
            }
        }
    }
    
    // Standard status-based insights
    if (previous.status === 'Out of Range' && latest.status === 'In Range') {
        return {
            type: 'improving',
            text: `↗ Back in range as of ${formatShortDate(latest.date)}`
        };
    }
    
    if (previous.status === 'In Range' && latest.status === 'Out of Range') {
        return {
            type: 'warning',
            text: `⚠ Moved out of range on ${formatShortDate(latest.date)}`
        };
    }
    
    // Stable in range
    const recentEvents = events.slice(-3);
    const allInRange = recentEvents.every(e => e.status === 'In Range');
    if (allInRange && events.length >= 3) {
        return {
            type: 'stable',
            text: `✓ Stable across ${events.length} tests`
        };
    }
    
    // Persistent out of range
    const allOutOfRange = recentEvents.every(e => e.status === 'Out of Range');
    if (allOutOfRange && events.length >= 2) {
        return {
            type: 'attention',
            text: `⚠ Out of range for ${events.length} consecutive tests`
        };
    }
    
    // For categorical binary
    if (type === 'categorical-binary') {
        const allPass = events.every(e => {
            const val = String(e.value || '').toUpperCase();
            return val.includes('NEGATIVE') || val.includes('NON-REACTIVE') || 
                   val.includes('NOT DETECTED') || e.status === 'In Range';
        });
        if (allPass) {
            return {
                type: 'stable',
                text: `✓ Consistently negative across ${events.length} tests`
            };
        }
    }
    
    return null;
}

// ===== MAIN VISUALIZATION DISPATCHER =====

export function createVisualization(classification, events, biomarker, refData) {
    const { type } = classification;
    
    switch (type) {
        case 'titer':
            return createTiterLadder(events, refData);
            
        case 'numeric-band':
        case 'percentage':
            if (events.length >= 1 && refData) {
                return createRangeBarVisualization(events, refData, biomarker);
            } else if (events.length > 1) {
                return createSimpleSparkline(events);
            }
            return null;
            
        case 'threshold-upper':
        case 'threshold-lower':
            if (events.length >= 1 && refData) {
                return createThresholdVisualization(events, refData, classification.type);
            }
            return null;
            
        case 'categorical-binary':
            return createBinaryPassFailDisplay(events, refData);
            
        case 'categorical-descriptive':
            return createCategoricalTimeline(events);
            
        case 'pattern':
            return createPatternGradeDisplay(events, refData, biomarker);
            
        case 'informational':
        default:
            if (events.length > 1 && classification.valueType === 'numeric') {
                return createSimpleSparkline(events);
            }
            if (events.length >= 1) {
                return createInformationalDisplay(events, biomarker);
            }
            return null;
    }
}

// ===== VISUALIZATION RENDERERS =====

export function createInformationalDisplay(events, biomarker) {
    if (events.length === 0) return null;
    
    const container = document.createElement('div');
    container.className = 'fh-informational-display';
    
    const notice = document.createElement('div');
    notice.className = 'fh-informational-notice';
    notice.textContent = 'No standard reference range - value shown for tracking';
    container.appendChild(notice);
    
    if (events.length > 1) {
        const history = document.createElement('div');
        history.className = 'fh-informational-history';
        
        events.slice().reverse().slice(0, 5).forEach(event => {
            const item = document.createElement('div');
            item.className = 'fh-informational-item';
            
            const value = document.createElement('span');
            value.className = 'fh-informational-value';
            value.textContent = formatValue(event.value, event.unit);
            
            const date = document.createElement('span');
            date.className = 'fh-informational-date';
            date.textContent = formatShortDate(event.date);
            
            item.appendChild(date);
            item.appendChild(value);
            history.appendChild(item);
        });
        
        container.appendChild(history);
    }
    
    return container;
}

export function createRangeBarVisualization(events, refData, biomarker) {
    const container = document.createElement('div');
    container.className = 'fh-range-bar-container';
    
    if (!refData || refData.type !== 'band') {
        return createSimpleSparkline(events);
    }
    
    const { lower, upper } = refData;
    const rangeSpan = upper - lower;
    
    const latestEvent = events[events.length - 1];
    const currentValue = extractNumericFromValue(latestEvent?.value);
    
    if (currentValue === null) {
        return createSimpleSparkline(events);
    }
    
    const padding = rangeSpan * 0.25;
    const displayMin = Math.min(lower - padding, currentValue - padding);
    const displayMax = Math.max(upper + padding, currentValue + padding);
    const displayRange = displayMax - displayMin;
    
    const lowerPos = ((lower - displayMin) / displayRange) * 100;
    const upperPos = ((upper - displayMin) / displayRange) * 100;
    const valuePos = Math.max(0, Math.min(100, ((currentValue - displayMin) / displayRange) * 100));
    
    let valueStatus = 'in-range';
    if (currentValue < lower) valueStatus = 'below';
    else if (currentValue > upper) valueStatus = 'above';
    
    const barWrapper = document.createElement('div');
    barWrapper.className = 'fh-range-bar-wrapper';
    
    const bar = document.createElement('div');
    bar.className = 'fh-range-bar';
    
    const belowZone = document.createElement('div');
    belowZone.className = 'fh-range-zone fh-range-zone--below';
    belowZone.style.width = `${lowerPos}%`;
    bar.appendChild(belowZone);
    
    const inRangeZone = document.createElement('div');
    inRangeZone.className = 'fh-range-zone fh-range-zone--in-range';
    inRangeZone.style.left = `${lowerPos}%`;
    inRangeZone.style.width = `${upperPos - lowerPos}%`;
    bar.appendChild(inRangeZone);
    
    const aboveZone = document.createElement('div');
    aboveZone.className = 'fh-range-zone fh-range-zone--above';
    aboveZone.style.left = `${upperPos}%`;
    aboveZone.style.width = `${100 - upperPos}%`;
    bar.appendChild(aboveZone);
    
    const marker = document.createElement('div');
    marker.className = `fh-range-marker fh-range-marker--${valueStatus}`;
    marker.style.left = `${valuePos}%`;
    
    const markerDot = document.createElement('div');
    markerDot.className = 'fh-range-marker-dot';
    marker.appendChild(markerDot);
    
    bar.appendChild(marker);
    barWrapper.appendChild(bar);
    
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
    
    if (events.length > 1) {
        const sparkline = createMiniSparkline(events, refData);
        container.appendChild(sparkline);
    }
    
    return container;
}

export function createThresholdVisualization(events, refData, thresholdType) {
    const container = document.createElement('div');
    container.className = 'fh-threshold-viz-container';
    
    if (!refData || refData.type !== 'threshold') {
        return createSimpleSparkline(events);
    }
    
    const threshold = refData.value;
    const isUpperBound = thresholdType === 'threshold-upper';
    
    const latestEvent = events[events.length - 1];
    const rawValue = String(latestEvent?.value || '').trim();
    let currentValue = extractNumericFromValue(rawValue);
    
    // Check if value is a "below detection limit" type (e.g., "<2.0")
    // These should be positioned clearly in the "good" zone for upper-bound thresholds
    const isBelowDetection = rawValue.startsWith('<') && !rawValue.startsWith('<=');
    const isAboveDetection = rawValue.startsWith('>') && !rawValue.startsWith('>=');
    
    if (currentValue === null) {
        return null;
    }
    
    // For "below detection" values on upper-bound thresholds, position marker clearly in good zone
    // The extracted number (e.g., 2.0 from "<2.0") represents the detection limit, not the actual value
    let displayValue = currentValue;
    if (isBelowDetection && isUpperBound) {
        // Position at 40% of the threshold to show it's clearly below
        displayValue = threshold * 0.4;
    } else if (isAboveDetection && !isUpperBound) {
        // For ">X" on lower-bound thresholds, position clearly above
        displayValue = threshold * 1.6;
    }
    
    const maxVal = Math.max(threshold * 1.5, displayValue * 1.2, currentValue * 1.2);
    const displayRange = maxVal;
    
    const thresholdPos = (threshold / displayRange) * 100;
    const valuePos = Math.max(0, Math.min(100, (displayValue / displayRange) * 100));
    
    // Determine if value is good or bad
    let isGood;
    if (isBelowDetection && isUpperBound) {
        // "<X" when target is "<threshold" is always good
        isGood = true;
    } else if (isAboveDetection && !isUpperBound) {
        // ">X" when target is ">threshold" is always good
        isGood = true;
    } else if (isUpperBound) {
        isGood = refData.inclusive ? currentValue <= threshold : currentValue < threshold;
    } else {
        isGood = refData.inclusive ? currentValue >= threshold : currentValue > threshold;
    }
    
    const barWrapper = document.createElement('div');
    barWrapper.className = 'fh-threshold-bar-wrapper';
    
    const bar = document.createElement('div');
    bar.className = 'fh-threshold-bar';
    
    const goodZone = document.createElement('div');
    goodZone.className = 'fh-threshold-zone fh-threshold-zone--good';
    if (isUpperBound) {
        goodZone.style.width = `${thresholdPos}%`;
    } else {
        goodZone.style.left = `${thresholdPos}%`;
        goodZone.style.width = `${100 - thresholdPos}%`;
    }
    bar.appendChild(goodZone);
    
    const badZone = document.createElement('div');
    badZone.className = 'fh-threshold-zone fh-threshold-zone--bad';
    if (isUpperBound) {
        badZone.style.left = `${thresholdPos}%`;
        badZone.style.width = `${100 - thresholdPos}%`;
    } else {
        badZone.style.width = `${thresholdPos}%`;
    }
    bar.appendChild(badZone);
    
    const thresholdLine = document.createElement('div');
    thresholdLine.className = 'fh-threshold-line';
    thresholdLine.style.left = `${thresholdPos}%`;
    bar.appendChild(thresholdLine);
    
    const markerEl = document.createElement('div');
    markerEl.className = `fh-threshold-marker ${isGood ? 'fh-threshold-marker--good' : 'fh-threshold-marker--bad'}`;
    markerEl.style.left = `${valuePos}%`;
    bar.appendChild(markerEl);
    
    barWrapper.appendChild(bar);
    
    const labelsEl = document.createElement('div');
    labelsEl.className = 'fh-threshold-labels';
    
    const thresholdLabel = document.createElement('span');
    thresholdLabel.className = 'fh-threshold-label';
    thresholdLabel.style.left = `${thresholdPos}%`;
    const op = refData.inclusive ? (isUpperBound ? '≤' : '≥') : (isUpperBound ? '<' : '>');
    thresholdLabel.textContent = `${op}${threshold}`;
    labelsEl.appendChild(thresholdLabel);
    
    barWrapper.appendChild(labelsEl);
    container.appendChild(barWrapper);
    
    if (events.length > 1) {
        const sparkline = createMiniSparkline(events, refData);
        container.appendChild(sparkline);
    }
    
    return container;
}

export function createBinaryPassFailDisplay(events, refData) {
    const container = document.createElement('div');
    container.className = 'fh-binary-display';
    
    const latestEvent = events[events.length - 1];
    const latestValueUpper = String(latestEvent?.value || '').toUpperCase();
    const latestIsPass = isPassingResult(latestValueUpper, latestEvent?.status);
    
    const prominentResult = document.createElement('div');
    prominentResult.className = `fh-binary-prominent ${latestIsPass ? 'fh-binary-prominent--pass' : 'fh-binary-prominent--fail'}`;
    
    const prominentIcon = document.createElement('div');
    prominentIcon.className = 'fh-binary-prominent-icon';
    prominentIcon.textContent = latestIsPass ? '✓' : '✗';
    
    const prominentLabel = document.createElement('div');
    prominentLabel.className = 'fh-binary-prominent-label';
    prominentLabel.textContent = getQualitativeLabel(latestValueUpper, latestIsPass);
    
    const prominentContext = document.createElement('div');
    prominentContext.className = 'fh-binary-prominent-context';
    prominentContext.textContent = getQualitativeContext(latestValueUpper, latestIsPass);
    
    prominentResult.appendChild(prominentIcon);
    prominentResult.appendChild(prominentLabel);
    prominentResult.appendChild(prominentContext);
    container.appendChild(prominentResult);
    
    if (events.length > 1) {
        const timeline = document.createElement('div');
        timeline.className = 'fh-binary-timeline';
        
        events.slice().reverse().forEach((event) => {
            const item = document.createElement('div');
            item.className = 'fh-binary-item';
            
            const valueUpper = String(event.value || '').toUpperCase();
            const isPass = isPassingResult(valueUpper, event.status);
            
            const icon = document.createElement('div');
            icon.className = `fh-binary-icon ${isPass ? 'fh-binary-icon--pass' : 'fh-binary-icon--fail'}`;
            icon.textContent = isPass ? '✓' : '✗';
            
            const details = document.createElement('div');
            details.className = 'fh-binary-details';
            
            const value = document.createElement('span');
            value.className = 'fh-binary-value';
            value.textContent = event.value;
            
            const date = document.createElement('span');
            date.className = 'fh-binary-date';
            date.textContent = formatShortDate(event.date);
            
            details.appendChild(value);
            details.appendChild(date);
            
            item.appendChild(icon);
            item.appendChild(details);
            timeline.appendChild(item);
        });
        
        container.appendChild(timeline);
    }
    
    return container;
}

export function createPatternGradeDisplay(events, refData, biomarker) {
    const container = document.createElement('div');
    container.className = 'fh-pattern-display';
    
    const latestEvent = events[events.length - 1];
    const currentValue = String(latestEvent?.value || '').trim();
    const expectedValue = refData?.expected || '';
    
    const comparison = document.createElement('div');
    comparison.className = 'fh-pattern-comparison';
    
    const expectedBlock = document.createElement('div');
    expectedBlock.className = 'fh-pattern-block fh-pattern-block--expected';
    
    const expectedLabelEl = document.createElement('div');
    expectedLabelEl.className = 'fh-pattern-label';
    expectedLabelEl.textContent = 'Expected';
    
    const expectedVal = document.createElement('div');
    expectedVal.className = 'fh-pattern-value';
    expectedVal.textContent = expectedValue || '—';
    
    expectedBlock.appendChild(expectedLabelEl);
    expectedBlock.appendChild(expectedVal);
    
    const arrow = document.createElement('div');
    arrow.className = 'fh-pattern-arrow';
    arrow.textContent = '→';
    
    const actualBlock = document.createElement('div');
    const isMatch = currentValue.toUpperCase() === expectedValue.toUpperCase();
    actualBlock.className = `fh-pattern-block fh-pattern-block--actual ${isMatch ? 'fh-pattern-block--match' : 'fh-pattern-block--mismatch'}`;
    
    const actualLabel = document.createElement('div');
    actualLabel.className = 'fh-pattern-label';
    actualLabel.textContent = 'Actual';
    
    const actualVal = document.createElement('div');
    actualVal.className = 'fh-pattern-value';
    actualVal.textContent = currentValue || '—';
    
    actualBlock.appendChild(actualLabel);
    actualBlock.appendChild(actualVal);
    
    comparison.appendChild(expectedBlock);
    comparison.appendChild(arrow);
    comparison.appendChild(actualBlock);
    
    container.appendChild(comparison);
    
    const explanation = getPatternExplanation(biomarker.name, currentValue);
    if (explanation) {
        const explainer = document.createElement('div');
        explainer.className = 'fh-pattern-explanation';
        explainer.textContent = explanation;
        container.appendChild(explainer);
    }
    
    if (events.length > 1) {
        const history = document.createElement('div');
        history.className = 'fh-pattern-history';
        
        events.slice(0, -1).reverse().forEach(event => {
            const histItem = document.createElement('span');
            histItem.className = 'fh-pattern-history-item';
            histItem.textContent = `${formatShortDate(event.date)}: ${event.value}`;
            history.appendChild(histItem);
        });
        
        container.appendChild(history);
    }
    
    return container;
}

export function createMiniSparkline(events, refData) {
    const container = document.createElement('div');
    container.className = 'fh-mini-sparkline-container';
    container.style.position = 'relative';
    
    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericFromValue(e.value) }))
        .filter(e => e.numericValue !== null);
    
    if (numericEvents.length < 2) {
        return container;
    }
    
    const width = 300;
    const height = 60;
    const padding = 8;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-mini-sparkline');
    
    const values = numericEvents.map(e => e.numericValue);
    let min = Math.min(...values);
    let max = Math.max(...values);
    
    if (refData?.type === 'band') {
        min = Math.min(min, refData.lower);
        max = Math.max(max, refData.upper);
    } else if (refData?.type === 'threshold' && refData.value !== undefined) {
        min = Math.min(min, refData.value * 0.8);
        max = Math.max(max, refData.value * 1.2);
    }
    
    const range = max - min || 1;
    
    const points = numericEvents.map((event, index) => {
        const x = padding + ((width - padding * 2) / (numericEvents.length - 1)) * index;
        const y = padding + ((height - padding * 2) - ((event.numericValue - min) / range) * (height - padding * 2));
        return { x, y, event };
    });
    
    if (refData?.type === 'band') {
        const upperY = padding + ((height - padding * 2) - ((refData.upper - min) / range) * (height - padding * 2));
        const lowerY = padding + ((height - padding * 2) - ((refData.lower - min) / range) * (height - padding * 2));
        
        const bandRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bandRect.setAttribute('x', 0);
        bandRect.setAttribute('y', Math.max(0, upperY));
        bandRect.setAttribute('width', width);
        bandRect.setAttribute('height', Math.min(height, lowerY - upperY));
        bandRect.setAttribute('fill', 'rgba(48, 196, 141, 0.15)');
        svg.appendChild(bandRect);
    }
    
    if (refData?.type === 'threshold' && refData.value !== undefined) {
        const thresholdVal = refData.value;
        if (thresholdVal >= min * 0.5 && thresholdVal <= max * 1.5) {
            const thresholdY = padding + ((height - padding * 2) - ((thresholdVal - min) / range) * (height - padding * 2));
            const clampedY = Math.max(0, Math.min(height, thresholdY));
            
            const isUpperBound = refData.direction === 'upper';
            const goodRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            goodRect.setAttribute('x', 0);
            goodRect.setAttribute('width', width);
            if (isUpperBound) {
                goodRect.setAttribute('y', clampedY);
                goodRect.setAttribute('height', Math.max(0, height - clampedY));
            } else {
                goodRect.setAttribute('y', 0);
                goodRect.setAttribute('height', Math.max(0, clampedY));
            }
            goodRect.setAttribute('fill', 'rgba(48, 196, 141, 0.12)');
            svg.appendChild(goodRect);
            
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('x2', width);
            line.setAttribute('y1', clampedY);
            line.setAttribute('y2', clampedY);
            line.setAttribute('stroke', '#30c48d');
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('stroke-dasharray', '4,3');
            svg.appendChild(line);
        }
    }
    
    if (points.length > 1) {
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#667eea');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
    }
    
    const tooltip = document.createElement('div');
    tooltip.className = 'fh-mini-sparkline-tooltip';
    tooltip.style.display = 'none';
    container.appendChild(tooltip);
    
    points.forEach((point) => {
        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hitArea.setAttribute('cx', point.x);
        hitArea.setAttribute('cy', point.y);
        hitArea.setAttribute('r', 15);
        hitArea.setAttribute('fill', 'transparent');
        hitArea.setAttribute('cursor', 'pointer');
        hitArea.classList.add('fh-mini-sparkline-hitarea');
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 4);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.classList.add('fh-mini-sparkline-dot');
        circle.style.pointerEvents = 'none';
        
        hitArea.addEventListener('mouseenter', () => {
            const value = point.event.numericValue ?? point.event.value;
            const date = formatShortDate(point.event.date);
            
            tooltip.innerHTML = `<strong>${value}</strong><br><span>${date}</span>`;
            tooltip.style.display = 'block';
            
            const svgRect = svg.getBoundingClientRect();
            const scaleX = svgRect.width / width;
            const dotX = point.x * scaleX;
            
            tooltip.style.left = `${dotX}px`;
            tooltip.style.bottom = `${svgRect.height + 6}px`;
            
            circle.setAttribute('r', 7);
        });
        
        hitArea.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
            circle.setAttribute('r', 4);
        });
        
        svg.appendChild(hitArea);
        svg.appendChild(circle);
    });
    
    container.appendChild(svg);
    return container;
}

export function createTiterLadder(events, referenceRange) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container fh-titer-ladder-container';

    const width = 600;
    const height = 220;
    const chartPadding = { top: 30, right: 130, bottom: 40, left: 80 };

    const allTiterLevels = [20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240];
    
    const titerEvents = events.map(e => {
        const match = String(e.value || '').match(/1\s*:\s*(\d+)/);
        const titerValue = match ? parseInt(match[1]) : null;
        return { ...e, titerValue };
    }).filter(e => e.titerValue !== null);

    if (titerEvents.length === 0) {
        container.textContent = 'Unable to parse titer values';
        return container;
    }

    const refThreshold = referenceRange?.type === 'titer' ? referenceRange.threshold : 40;

    const allTiterValues = titerEvents.map(e => e.titerValue);
    const minTiter = Math.min(...allTiterValues);
    const maxTiter = Math.max(...allTiterValues);
    
    const displayMin = Math.min(refThreshold / 2, minTiter / 2);
    const displayMax = Math.max(refThreshold * 4, maxTiter * 2);
    
    const relevantLevels = allTiterLevels.filter(level => 
        level >= displayMin && level <= displayMax
    );
    
    if (!relevantLevels.includes(refThreshold)) {
        relevantLevels.push(refThreshold);
        relevantLevels.sort((a, b) => a - b);
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-titer-ladder');

    const chartHeight = height - chartPadding.top - chartPadding.bottom;
    const chartWidth = width - chartPadding.left - chartPadding.right;
    
    const logMin = Math.log2(relevantLevels[0]);
    const logMax = Math.log2(relevantLevels[relevantLevels.length - 1]);
    const logRange = logMax - logMin || 1;
    
    const getYForTiter = (titerValue) => {
        const logValue = Math.log2(titerValue);
        const normalized = (logValue - logMin) / logRange;
        return chartPadding.top + chartHeight - (normalized * chartHeight);
    };

    const normalThreshold = refThreshold;
    const borderlineThreshold = refThreshold * 8;
    const elevatedThreshold = refThreshold * 32;

    const zones = [
        { max: normalThreshold, color: 'rgba(48, 196, 141, 0.12)', name: 'Normal', textColor: '#1e805c' },
        { max: borderlineThreshold, color: 'rgba(247, 178, 103, 0.12)', name: 'Elevated', textColor: '#9d7030' },
        { max: elevatedThreshold, color: 'rgba(247, 112, 112, 0.12)', name: 'High', textColor: '#b23e3e' },
        { max: Infinity, color: 'rgba(184, 51, 51, 0.15)', name: 'Very High', textColor: '#8b2626' }
    ];
    
    let prevY = height - chartPadding.bottom;
    zones.forEach((zone) => {
        const zoneMax = Math.min(zone.max, relevantLevels[relevantLevels.length - 1]);
        if (zoneMax < relevantLevels[0]) return;
        
        const y = getYForTiter(Math.max(zoneMax, relevantLevels[0]));
        const zoneHeight = prevY - y;
        
        if (zoneHeight > 0) {
            const zoneRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            zoneRect.setAttribute('x', chartPadding.left);
            zoneRect.setAttribute('y', y);
            zoneRect.setAttribute('width', chartWidth);
            zoneRect.setAttribute('height', zoneHeight);
            zoneRect.setAttribute('fill', zone.color);
            svg.appendChild(zoneRect);

            if (zoneHeight > 20) {
                const zoneLabel = createSVGText(zone.name, width - chartPadding.right + 10, y + zoneHeight / 2, 'start', 11, zone.textColor);
                zoneLabel.setAttribute('font-weight', '600');
                zoneLabel.setAttribute('dominant-baseline', 'middle');
                svg.appendChild(zoneLabel);
            }
        }
        prevY = y;
    });
    
    const refY = getYForTiter(refThreshold);
    const refLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    refLine.setAttribute('x1', chartPadding.left);
    refLine.setAttribute('y1', refY);
    refLine.setAttribute('x2', chartPadding.left + chartWidth);
    refLine.setAttribute('y2', refY);
    refLine.setAttribute('stroke', '#30c48d');
    refLine.setAttribute('stroke-width', '2');
    refLine.setAttribute('stroke-dasharray', '6,3');
    svg.appendChild(refLine);
    
    const refLabel = createSVGText(`Normal <1:${refThreshold}`, chartPadding.left + 5, refY - 6, 'start', 10, '#1e805c');
    refLabel.setAttribute('font-weight', '600');
    svg.appendChild(refLabel);

    relevantLevels.forEach((level) => {
        const y = getYForTiter(level);
        
        const rung = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        rung.setAttribute('x1', chartPadding.left);
        rung.setAttribute('y1', y);
        rung.setAttribute('x2', chartPadding.left + chartWidth);
        rung.setAttribute('y2', y);
        rung.setAttribute('stroke', 'rgba(102, 126, 234, 0.2)');
        rung.setAttribute('stroke-width', '1');
        svg.appendChild(rung);

        const levelLabel = createSVGText(`1:${level}`, chartPadding.left - 8, y, 'end', 10, '#6a7395');
        levelLabel.setAttribute('dominant-baseline', 'middle');
        levelLabel.setAttribute('font-weight', '500');
        svg.appendChild(levelLabel);
    });

    titerEvents.forEach((event, index) => {
        const y = getYForTiter(event.titerValue);
        const x = chartPadding.left + (chartWidth / (titerEvents.length - 1 || 1)) * index;

        if (index < titerEvents.length - 1) {
            const nextEvent = titerEvents[index + 1];
            const nextY = getYForTiter(nextEvent.titerValue);
            const nextX = chartPadding.left + (chartWidth / (titerEvents.length - 1 || 1)) * (index + 1);

            const connector = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            connector.setAttribute('x1', x);
            connector.setAttribute('y1', y);
            connector.setAttribute('x2', nextX);
            connector.setAttribute('y2', nextY);
            connector.setAttribute('stroke', '#4a5fc1');
            connector.setAttribute('stroke-width', '2.5');
            connector.setAttribute('stroke-linecap', 'round');
            svg.appendChild(connector);
        }

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 8);
        circle.setAttribute('fill', STATUS_COLORS[event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2.5');
        
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${formatDisplayDate(event.date)}\n${event.value}\n${event.status}`;
        circle.appendChild(title);
        svg.appendChild(circle);

        let labelX = x;
        let labelAnchor = 'middle';
        
        if (index === 0 && titerEvents.length > 1) {
            labelX = x + 5;
            labelAnchor = 'start';
        } else if (index === titerEvents.length - 1 && titerEvents.length > 1) {
            labelX = x - 5;
            labelAnchor = 'end';
        }
        
        const valueLabel = createSVGText(event.value, labelX, y - 16, labelAnchor, 12, '#2d334c');
        valueLabel.setAttribute('font-weight', '700');
        svg.appendChild(valueLabel);

        const dateLabel = createSVGText(formatShortDate(event.date), x, height - chartPadding.bottom + 18, 'middle', 11, '#6c748c');
        svg.appendChild(dateLabel);
    });

    container.appendChild(svg);
    return container;
}

export function createBandChart(events, referenceRange) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container';

    const width = 600;
    const height = 200;
    const chartPadding = { top: 20, right: 120, bottom: 40, left: 60 };

    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);

    if (numericEvents.length === 0) {
        container.textContent = 'Unable to parse numeric values';
        return container;
    }

    const values = numericEvents.map(e => e.numericValue);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    
    let chartMin, chartMax, lowerBound, upperBound;
    
    if (referenceRange && referenceRange.type === 'band') {
        lowerBound = referenceRange.lower;
        upperBound = referenceRange.upper;
        const rangeSpan = upperBound - lowerBound;
        
        chartMin = Math.min(lowerBound - rangeSpan * 0.15, dataMin - Math.abs(dataMin) * 0.05);
        chartMax = Math.max(upperBound + rangeSpan * 0.15, dataMax + Math.abs(dataMax) * 0.05);
    } else {
        const dataRange = dataMax - dataMin || 1;
        lowerBound = dataMin + dataRange * 0.25;
        upperBound = dataMin + dataRange * 0.75;
        chartMin = dataMin - dataRange * 0.1;
        chartMax = dataMax + dataRange * 0.1;
    }
    
    const chartRange = chartMax - chartMin;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-band-chart');

    const chartHeight = height - chartPadding.top - chartPadding.bottom;
    const chartWidth = width - chartPadding.left - chartPadding.right;

    const yForValue = (value) => {
        return chartPadding.top + chartHeight - ((value - chartMin) / chartRange) * chartHeight;
    };

    const upperY = yForValue(upperBound);
    const lowerY = yForValue(lowerBound);

    const hasAboveRange = values.some(v => v > upperBound);
    if (hasAboveRange || dataMax > upperBound) {
        const aboveRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        aboveRect.setAttribute('x', chartPadding.left);
        aboveRect.setAttribute('y', chartPadding.top);
        aboveRect.setAttribute('width', chartWidth);
        aboveRect.setAttribute('height', upperY - chartPadding.top);
        aboveRect.setAttribute('fill', BAND_COLORS.above);
        svg.appendChild(aboveRect);

        const aboveLabel = createSVGText('Above Range', width - chartPadding.right + 8, chartPadding.top + (upperY - chartPadding.top) / 2, 'start', 11, '#8e5b5b');
        aboveLabel.setAttribute('font-weight', '600');
        svg.appendChild(aboveLabel);
        
        const upperBoundLabel = createSVGText(`> ${upperBound}`, width - chartPadding.right + 8, upperY - 5, 'start', 10, '#8e5b5b');
        upperBoundLabel.setAttribute('font-style', 'italic');
        svg.appendChild(upperBoundLabel);
    }

    const inRangeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    inRangeRect.setAttribute('x', chartPadding.left);
    inRangeRect.setAttribute('y', upperY);
    inRangeRect.setAttribute('width', chartWidth);
    inRangeRect.setAttribute('height', lowerY - upperY);
    inRangeRect.setAttribute('fill', BAND_COLORS.inRange);
    svg.appendChild(inRangeRect);

    const inRangeLabel = createSVGText('In Range', width - chartPadding.right + 8, upperY + (lowerY - upperY) / 2 - 6, 'start', 12, '#2a7d5f');
    inRangeLabel.setAttribute('font-weight', '700');
    svg.appendChild(inRangeLabel);
    
    const rangeText = createSVGText(`${lowerBound}–${upperBound}`, width - chartPadding.right + 8, upperY + (lowerY - upperY) / 2 + 8, 'start', 10, '#2a7d5f');
    rangeText.setAttribute('font-style', 'italic');
    svg.appendChild(rangeText);

    const hasBelowRange = values.some(v => v < lowerBound);
    if (hasBelowRange || dataMin < lowerBound) {
        const belowRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        belowRect.setAttribute('x', chartPadding.left);
        belowRect.setAttribute('y', lowerY);
        belowRect.setAttribute('width', chartWidth);
        belowRect.setAttribute('height', (height - chartPadding.bottom) - lowerY);
        belowRect.setAttribute('fill', BAND_COLORS.below);
        svg.appendChild(belowRect);

        const belowLabel = createSVGText('Below Range', width - chartPadding.right + 8, lowerY + ((height - chartPadding.bottom) - lowerY) / 2, 'start', 11, '#9d7030');
        belowLabel.setAttribute('font-weight', '600');
        svg.appendChild(belowLabel);
        
        const lowerBoundLabel = createSVGText(`< ${lowerBound}`, width - chartPadding.right + 8, lowerY + 15, 'start', 10, '#9d7030');
        lowerBoundLabel.setAttribute('font-style', 'italic');
        svg.appendChild(lowerBoundLabel);
    }

    const points = numericEvents.map((event, index) => {
        const x = chartPadding.left + (chartWidth / (numericEvents.length - 1 || 1)) * index;
        const y = yForValue(event.numericValue);
        return { x, y, event };
    });

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

    points.forEach((point) => {
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

        const valueLabel = createSVGText(
            point.event.value || String(point.event.numericValue),
            point.x,
            point.y - 14,
            'middle',
            12,
            '#2d334c'
        );
        valueLabel.setAttribute('font-weight', '700');
        svg.appendChild(valueLabel);

        const dateLabel = createSVGText(
            formatShortDate(point.event.date),
            point.x,
            height - chartPadding.bottom + 18,
            'middle',
            11,
            '#6c748c'
        );
        svg.appendChild(dateLabel);
    });

    container.appendChild(svg);
    return container;
}

export function createThresholdChart(events, referenceRange) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container fh-chart-threshold';

    const width = 600;
    const height = 120;
    const chartPadding = { top: 20, right: 80, bottom: 30, left: 60 };

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

    const chartWidth = width - chartPadding.left - chartPadding.right;
    const chartHeight = height - chartPadding.top - chartPadding.bottom;
    const midY = chartPadding.top + chartHeight / 2;

    const thresholdLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    thresholdLine.setAttribute('x1', chartPadding.left);
    thresholdLine.setAttribute('y1', midY);
    thresholdLine.setAttribute('x2', width - chartPadding.right);
    thresholdLine.setAttribute('y2', midY);
    thresholdLine.setAttribute('stroke', '#8892b0');
    thresholdLine.setAttribute('stroke-width', '1.5');
    thresholdLine.setAttribute('stroke-dasharray', '4,4');
    svg.appendChild(thresholdLine);

    numericEvents.forEach((event, index) => {
        const x = chartPadding.left + (chartWidth / (numericEvents.length - 1 || 1)) * index;
        
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

        const dateLabel = createSVGText(
            formatShortDate(event.date),
            x,
            height - chartPadding.bottom + 20,
            'middle',
            10,
            '#6c748c'
        );
        svg.appendChild(dateLabel);
    });

    container.appendChild(svg);
    return container;
}

export function createCategoricalTimeline(events) {
    const container = document.createElement('div');
    container.className = 'fh-categorical-timeline';

    events.slice().reverse().forEach((event) => {
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

export function createSimpleSparkline(events) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container';

    const width = 400;
    const height = 80;
    const padding = 12;

    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);

    if (numericEvents.length === 0) {
        return container;
    }

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

    points.forEach((point) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 6);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        circle.classList.add('fh-chart-dot');
        circle.style.cursor = 'pointer';

        circle.addEventListener('mouseenter', () => {
            const rect = svg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const dotX = (point.x / width) * rect.width;
            const dotY = (point.y / height) * rect.height;
            
            let tooltipX = dotX + (rect.left - containerRect.left);
            let tooltipY = dotY + (rect.top - containerRect.top) - 50;
            
            if (tooltipY < 0) tooltipY = dotY + (rect.top - containerRect.top) + 20;
            
            tooltip.innerHTML = `
                <div class="fh-chart-tooltip-value">${formatValue(point.event.value, point.event.unit)}</div>
                <div class="fh-chart-tooltip-date">${formatDisplayDate(point.event.date)}</div>
                <div class="fh-chart-tooltip-status fh-status-${normalizeStatus(point.event.status)}">${point.event.status}</div>
            `;
            tooltip.style.left = `${tooltipX}px`;
            tooltip.style.top = `${tooltipY}px`;
            tooltip.classList.add('fh-chart-tooltip--visible');
            
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

