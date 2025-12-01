/**
 * Data consolidation functions for biomarker processing
 */

import { normalizeDate } from '../utils/dateUtils.js';

/**
 * Normalize biomarker name for grouping similar tests
 * Handles variations like "Omega 3" vs "Omega-3", removes suffixes like "/ OmegaCheck"
 */
export function normalizeBiomarkerName(name) {
    if (!name) return '';
    
    let normalized = name.trim();
    
    // Remove common suffixes that indicate same test
    normalized = normalized.replace(/\s*\/\s*OmegaCheck\s*$/i, '');
    
    // Normalize "Omega X" variations: "Omega 3" -> "Omega-3", "Omega 6" -> "Omega-6"
    normalized = normalized.replace(/Omega\s+(\d)/gi, 'Omega-$1');
    
    // Normalize spacing around colons
    normalized = normalized.replace(/\s*:\s*/g, ': ');
    
    return normalized.trim();
}

/**
 * Get the best display name from a group of name variations (prefer shorter, cleaner name)
 */
export function getBestDisplayName(names) {
    if (!names || names.length === 0) return '';
    if (names.length === 1) return names[0];
    
    const sorted = [...names].sort((a, b) => {
        const aHasSuffix = a.includes('/ OmegaCheck');
        const bHasSuffix = b.includes('/ OmegaCheck');
        if (aHasSuffix && !bHasSuffix) return 1;
        if (!aHasSuffix && bHasSuffix) return -1;
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
    });
    
    return sorted[0];
}

/**
 * Extract all unique dates from a dataset
 */
export function extractAllDates(dataset) {
    const dates = new Set();
    Object.values(dataset.categories).forEach(category => {
        if (!Array.isArray(category.biomarkers)) return;
        category.biomarkers.forEach(biomarker => {
            // Normalize all dates to YYYY-MM-DD format for consistent comparison
            const normalizedDate = normalizeDate(biomarker.date);
            const normalizedDateOfService = normalizeDate(biomarker.dateOfService);
            if (normalizedDate) dates.add(normalizedDate);
            if (normalizedDateOfService) dates.add(normalizedDateOfService);
            if (Array.isArray(biomarker.historicalValues)) {
                biomarker.historicalValues.forEach(hv => {
                    const normalizedHvDate = normalizeDate(hv.date);
                    if (normalizedHvDate) dates.add(normalizedHvDate);
                });
            }
        });
    });
    return Array.from(dates).sort((a, b) => new Date(b) - new Date(a));
}

/**
 * Consolidate biomarkers by name, merging historical values
 */
export function consolidateBiomarkersByName(biomarkers) {
    console.log(`[Consolidate] Starting with ${biomarkers.length} biomarker entries`);
    const groups = {};
    
    biomarkers.forEach((biomarker) => {
        // Use normalized name for grouping (handles "Omega 3" vs "Omega-3", etc.)
        const normalizedKey = normalizeBiomarkerName(biomarker.name);
        const originalName = biomarker.name.trim();
        
        if (!groups[normalizedKey]) {
            groups[normalizedKey] = {
                originalNames: new Set(),
                unit: biomarker.unit,
                referenceRange: biomarker.referenceRange,
                allResults: []
            };
        }
        
        groups[normalizedKey].originalNames.add(originalName);
        
        // Normalize dates for consistent comparison
        const normalizedMainDate = normalizeDate(biomarker.date || biomarker.dateOfService);
        
        // Add this result to the consolidated list
        groups[normalizedKey].allResults.push({
            date: normalizedMainDate,
            value: biomarker.value,
            unit: biomarker.unit || groups[normalizedKey].unit,
            status: biomarker.status,
            historicalValues: biomarker.historicalValues || []
        });
        
        // Merge historical values if present
        if (Array.isArray(biomarker.historicalValues)) {
            biomarker.historicalValues.forEach(hv => {
                const normalizedHvDate = normalizeDate(hv.date);
                // Check for duplicates by date AND value to handle merged biomarker variants
                const isDuplicate = groups[normalizedKey].allResults.some(r => 
                    normalizeDate(r.date) === normalizedHvDate && r.value === hv.value
                );
                if (normalizedHvDate && !isDuplicate) {
                    groups[normalizedKey].allResults.push({
                        date: normalizedHvDate,
                        value: hv.value,
                        unit: hv.unit || groups[normalizedKey].unit,
                        status: hv.inRange === false ? 'Out of Range' : hv.status || 'In Range',
                        historicalValues: []
                    });
                }
            });
        }
    });
    
    // Convert back to biomarker objects with consolidated historical values
    const consolidated = Object.values(groups).map(group => {
        // Deduplicate results by date+value before sorting
        const seenKeys = new Set();
        const dedupedResults = group.allResults.filter(r => {
            if (!r.date) return false;
            const key = `${r.date}|${r.value}`;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
        });
        
        // Sort results by date
        const sortedResults = dedupedResults.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Get the latest result for current values
        const latestResult = sortedResults.length > 0 ? sortedResults[sortedResults.length - 1] : null;
        
        // Use the best display name from all variations
        const displayName = getBestDisplayName([...group.originalNames]);
        
        return {
            name: displayName,
            unit: group.unit,
            referenceRange: group.referenceRange,
            historicalValues: sortedResults.map(r => ({
                date: normalizeDate(r.date),
                value: r.value,
                unit: r.unit,
                status: r.status
            })),
            // Latest values for convenience
            date: latestResult ? normalizeDate(latestResult.date) : null,
            value: latestResult ? latestResult.value : null,
            status: latestResult ? latestResult.status : 'Unknown'
        };
    });
    
    console.log(`[Consolidate] Reduced to ${consolidated.length} unique biomarkers after normalization`);
    return consolidated;
}

