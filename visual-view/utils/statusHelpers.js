/**
 * Status helper functions for biomarker analysis
 */

import { normalizeDate } from './dateUtils.js';

/**
 * Build timeline events from biomarker data
 */
export function buildTimelineEvents(biomarker) {
    const entries = [];
    if (Array.isArray(biomarker.historicalValues)) {
        biomarker.historicalValues.forEach((record) => {
            const normalizedRecordDate = normalizeDate(record?.date);
            if (!normalizedRecordDate) return;
            
            // Determine status: prefer string, fallback to boolean conversion for backward compatibility
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

/**
 * Determine the overall status of a biomarker based on its events
 */
export function determineBiomarkerStatus(events) {
    if (events.length === 0) return 'Unknown';
    
    const latest = events[events.length - 1];
    
    // Check for improving status
    if (events.length >= 2) {
        const previous = events[events.length - 2];
        if (previous.status === 'Out of Range' && latest.status === 'In Range') {
            return 'Improving';
        }
    }
    
    return latest.status || 'Unknown';
}

/**
 * Get the status category for a biomarker (for filtering)
 */
export function getBiomarkerStatusCategory(biomarker, selectedDates) {
    const filteredHistorical = biomarker.historicalValues.filter(hv => 
        selectedDates.has(normalizeDate(hv.date))
    );
    if (filteredHistorical.length === 0) return null;
    
    const events = buildTimelineEvents({ ...biomarker, historicalValues: filteredHistorical });
    const status = determineBiomarkerStatus(events);
    
    // Check for improving: was out-of-range, now in-range
    if (events.length >= 2) {
        const latest = events[events.length - 1];
        const previous = events[events.length - 2];
        if (latest.isInRange && !previous.isInRange) {
            return 'improving';
        }
    }
    
    if (status === 'In Range') return 'in-range';
    if (status === 'Out of Range') return 'out-of-range';
    if (status === 'Improving') return 'improving';
    
    // Default to showing if unknown
    return 'in-range';
}

