/**
 * Formatting utility functions for visual overlay
 */

import { STATUS_COLORS } from '../constants/index.js';

/**
 * Format a value with its unit for display
 */
export function formatValue(value, unit) {
    if (value === null || value === undefined || value === '') return '—';
    const str = String(value).trim();
    if (!unit || unit === '') return str;
    return `${str} ${unit}`;
}

/**
 * Normalize status to CSS-friendly class name
 */
export function normalizeStatus(status) {
    if (!status) return 'unknown';
    const lower = String(status).toLowerCase().replace(/\s+/g, '-');
    if (lower.includes('in-range') || lower === 'in range') return 'in-range';
    if (lower.includes('out-of-range') || lower === 'out of range') return 'out-of-range';
    if (lower.includes('improving')) return 'improving';
    return 'unknown';
}

/**
 * Check if a biomarker is out of range based on its latest status
 */
export function isOutOfRange(biomarker) {
    if (!biomarker) return false;
    const status = biomarker.status || '';
    return status.toLowerCase().includes('out of range') || status.toLowerCase().includes('out-of-range');
}

/**
 * Get categorical icon based on value and status
 */
export function getCategoricalIcon(value, status) {
    const str = String(value || '').toUpperCase();
    
    // Positive results (usually concerning)
    if (str.includes('POSITIVE') || str.includes('REACTIVE') || str.includes('DETECTED')) {
        return '⚠️';
    }
    
    // Negative results (usually good)
    if (str.includes('NEGATIVE') || str.includes('NON-REACTIVE') || str.includes('NOT DETECTED') || str.includes('NONE SEEN')) {
        return '✓';
    }
    
    // Descriptive values
    if (str.includes('CLEAR') || str.includes('NORMAL')) {
        return '✓';
    }
    if (str.includes('ABNORMAL') || str.includes('YELLOW') || str.includes('CLOUDY')) {
        return '!';
    }
    
    // Based on status
    if (status === 'In Range') return '✓';
    if (status === 'Out of Range') return '!';
    
    return '•';
}

/**
 * Create an SVG text element
 */
export function createSVGText(content, x, y, anchor = 'middle', size = 12, color = '#333') {
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.setAttribute('text-anchor', anchor);
    textEl.setAttribute('font-size', size);
    textEl.setAttribute('fill', color);
    textEl.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
    textEl.textContent = content;
    return textEl;
}

/**
 * CSS escape for selectors
 */
export function cssEscape(value) {
    if (window.CSS && CSS.escape) {
        return CSS.escape(value);
    }
    return value.replace(/[^a-zA-Z0-9\-]/g, '_');
}

