/**
 * Trend analysis helper functions
 */

import { formatShortDate } from './dateUtils.js';
import { formatValue } from './formatters.js';

/**
 * Extract numeric value from various formats including threshold operators
 */
export function extractNumericValue(value) {
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

/**
 * Get direction badge for trend display
 */
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
                // Higher titer is usually worse
                const fold = latestTiter / previousTiter;
                badge.className = 'fh-direction fh-direction--warning';
                badge.textContent = fold >= 2 ? `▲ ${fold.toFixed(0)}× higher` : `▲ Increased`;
            } else {
                // Lower titer is usually better
                const fold = previousTiter / latestTiter;
                badge.className = 'fh-direction fh-direction--good';
                badge.textContent = fold >= 2 ? `▼ ${fold.toFixed(0)}× lower` : `▼ Decreased`;
            }
            
            return badge;
        }
    }
    
    // Handle categorical types - show consistency
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

/**
 * Get trend insight text and type
 */
export function getTrendInsight(events, classification = null) {
    if (events.length < 2) return null;
    
    const latest = events[events.length - 1];
    const previous = events[events.length - 2];
    const type = classification?.type || 'unknown';
    
    // Special handling for titer - improvement is decreasing
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
    
    // For categorical binary - show consistency
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

/**
 * Generate a human-readable progress narrative for a biomarker
 */
export function generateProgressNarrative(events, classification) {
    if (!events || events.length === 0) {
        return null;
    }
    
    if (events.length === 1) {
        return 'First time tested';
    }
    
    const latest = events[events.length - 1];
    const previous = events[events.length - 2];
    const oldest = events[0];
    
    // Calculate time span
    const latestDate = new Date(latest.date);
    const oldestDate = new Date(oldest.date);
    const daysDiff = Math.floor((latestDate - oldestDate) / (1000 * 60 * 60 * 24));
    
    let timeSpan = '';
    if (daysDiff < 30) {
        timeSpan = `${daysDiff} days`;
    } else if (daysDiff < 365) {
        const months = Math.round(daysDiff / 30);
        timeSpan = `${months} month${months !== 1 ? 's' : ''}`;
    } else {
        const years = Math.round(daysDiff / 365);
        timeSpan = `${years} year${years !== 1 ? 's' : ''}`;
    }
    
    // Check for status change
    if (latest.isInRange && !previous.isInRange) {
        return `Moved into range in the last test`;
    }
    if (!latest.isInRange && previous.isInRange) {
        return `Recently moved out of range`;
    }
    
    // Check for consistent status
    const allInRange = events.every(e => e.isInRange);
    const allOutOfRange = events.every(e => !e.isInRange);
    
    if (allInRange) {
        return `Consistently in range across ${events.length} tests`;
    }
    if (allOutOfRange) {
        return `Out of range across ${events.length} tests`;
    }
    
    // For numeric values, calculate percent change
    if (classification.type.includes('numeric') || classification.type === 'titer') {
        const latestVal = parseFloat(latest.value);
        const previousVal = parseFloat(previous.value);
        
        if (!isNaN(latestVal) && !isNaN(previousVal) && previousVal !== 0) {
            const percentChange = Math.round(((latestVal - previousVal) / previousVal) * 100);
            
            if (Math.abs(percentChange) < 3) {
                return `Holding steady over ${timeSpan}`;
            }
            
            // Determine if change is improvement or not
            const refData = classification.referenceData;
            let isImproving = false;
            
            if (refData?.type === 'threshold-upper' || refData?.type === 'less-than') {
                // For upper thresholds, decreasing is good
                isImproving = percentChange < 0;
            } else if (refData?.type === 'threshold-lower' || refData?.type === 'greater-than') {
                // For lower thresholds, increasing is good
                isImproving = percentChange > 0;
            } else if (refData?.type === 'band' && refData.low !== undefined && refData.high !== undefined) {
                // For bands, check if moving toward middle
                const mid = (refData.low + refData.high) / 2;
                const latestDist = Math.abs(latestVal - mid);
                const previousDist = Math.abs(previousVal - mid);
                isImproving = latestDist < previousDist;
            }
            
            const direction = percentChange > 0 ? 'up' : 'down';
            const verb = isImproving ? 'Improved' : 'Changed';
            
            return `${verb} ${Math.abs(percentChange)}% ${direction} over ${timeSpan}`;
        }
    }
    
    // Default fallback
    return `Tracked over ${timeSpan} (${events.length} tests)`;
}

