/**
 * Date utility functions for visual overlay
 */

/**
 * Normalize date to YYYY-MM-DD format for consistent comparison
 * Handles both "2025-07-23" and "2025-07-23T12:00:00+00:00" formats
 */
export function normalizeDate(dateStr) {
    if (!dateStr) return null;
    const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : dateStr;
}

/**
 * Format date for display (e.g., "Jul 23, 2025")
 */
export function formatDisplayDate(dateString) {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

/**
 * Format date for short display (e.g., "Jul 23")
 */
export function formatShortDate(dateString) {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

