/**
 * SHARED UTILITIES - CANONICAL SOURCE
 * 
 * This is the single source of truth for shared utility functions.
 * If you need to modify these functions, edit THIS FILE ONLY.
 * 
 * These utilities are copied to:
 * - final-api-extractor.js (search for "SHARED UTILITIES" comment block)
 * 
 * After editing, manually copy the updated functions to those locations.
 * 
 * Note: This file uses ES module exports for visual-overlay.js and other
 * web-accessible resources. Content scripts cannot import from here directly.
 */

// =============================================================================
// COLOR CONSTANTS
// =============================================================================

/**
 * Status colors for visual displays
 */
export const STATUS_COLORS = {
    'In Range': '#30c48d',
    'Out of Range': '#f77070',
    'Improving': '#f7b267',
    'Unknown': '#a0a4b8'
};

/**
 * Band colors for chart backgrounds
 */
export const BAND_COLORS = {
    above: 'rgba(247, 112, 112, 0.09)',
    inRange: 'rgba(48, 196, 141, 0.12)',
    below: 'rgba(247, 178, 103, 0.09)'
};

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Normalize date to YYYY-MM-DD format for consistent comparison
 * Handles both "2025-07-23" and "2025-07-23T12:00:00+00:00" formats
 * @param {string} dateStr - The date string to normalize
 * @returns {string|null} Normalized date string or null if invalid
 */
export function normalizeDate(dateStr) {
    if (!dateStr) return null;
    const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : dateStr;
}

// =============================================================================
// BIOMARKER NAME UTILITIES
// =============================================================================

/**
 * Normalize biomarker name for grouping similar tests
 * Handles variations like "Omega 3" vs "Omega-3", removes suffixes like "/ OmegaCheck"
 * @param {string} name - The biomarker name to normalize
 * @returns {string} Normalized biomarker name
 */
export function normalizeBiomarkerName(name) {
    if (!name) return '';
    
    let normalized = name.trim();
    
    // Remove common suffixes that indicate same test
    normalized = normalized.replace(/\s*\/\s*OmegaCheck\s*$/i, '');
    
    // Normalize "Omega X" variations: "Omega 3" -> "Omega-3", "Omega 6" -> "Omega-6"
    normalized = normalized.replace(/Omega\s+(\d)/gi, 'Omega-$1');
    
    // Normalize spacing around colons (e.g., "Omega-3: DHA" vs "Omega-3 : DHA")
    normalized = normalized.replace(/\s*:\s*/g, ': ');
    
    // Trim any resulting whitespace
    normalized = normalized.trim();
    
    return normalized;
}

/**
 * Get the display name for a group of biomarkers (prefer shorter, cleaner name)
 * @param {string[]} names - Array of name variations
 * @returns {string} The best display name
 */
export function getBestDisplayName(names) {
    if (!names || names.length === 0) return '';
    if (names.length === 1) return names[0];
    
    // Sort by length (prefer shorter names) then alphabetically
    const sorted = [...names].sort((a, b) => {
        // Prefer names without "/ OmegaCheck" suffix
        const aHasSuffix = a.includes('/ OmegaCheck');
        const bHasSuffix = b.includes('/ OmegaCheck');
        if (aHasSuffix && !bHasSuffix) return 1;
        if (!aHasSuffix && bHasSuffix) return -1;
        
        // Then prefer shorter names
        if (a.length !== b.length) return a.length - b.length;
        
        // Then alphabetically
        return a.localeCompare(b);
    });
    
    return sorted[0];
}

