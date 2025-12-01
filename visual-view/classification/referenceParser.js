/**
 * Reference range parsing functions
 */

/**
 * Enhanced reference range parser that handles all observed formats:
 * - Standard range: "38.5-50.0", "7-25", "0.52-1.23"
 * - Z-score range: "-2.0 - + 2.0"
 * - Less than: "<5.6", "<0.90", "< 5.6"
 * - Less/equal: "<=123", "< OR = 16", "< or = 15.2", "≤123"
 * - Greater than: ">59", "> 400"
 * - Greater/equal: "> OR = 60", ">= 40", "> or = 115", "≥60"
 * - Combined threshold+text: "<1.0 NEGATIVE"
 * - Titer: "<1:40", "1:40"
 * - Categorical: "NEGATIVE", "NON-REACTIVE", "NOT DETECTED", "A", "CLEAR"
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
        // Only accept if it looks like a valid range (lower < upper or both negative)
        if (!isNaN(lower) && !isNaN(upper)) {
            return {
                type: 'band',
                lower: Math.min(lower, upper),
                upper: Math.max(lower, upper),
                raw: str
            };
        }
    }
    
    // Pattern: Standard numeric range "38.5-50.0" or "7 - 25" (no leading negative)
    const rangeMatch = str.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
    if (rangeMatch) {
        return {
            type: 'band',
            lower: parseFloat(rangeMatch[1]),
            upper: parseFloat(rangeMatch[2]),
            raw: str
        };
    }
    
    // Pattern: Less than or equal "<= 123", "< OR = 16", "< or = 15.2", "≤123"
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
    
    // Pattern: Greater than or equal ">= 60", "> OR = 60", "> or = 115", "≥60"
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
    
    // Pattern: Less than with optional text "< 5.6", "<0.90", "<1.0 NEGATIVE"
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
    
    // Categorical patterns - check for known categorical reference values
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
    
    // Pattern: Single letter/word pattern value (like "A" for LDL Pattern)
    if (/^[A-Za-z]$/.test(str) || /^[A-Za-z]+$/.test(str) && str.length <= 10) {
        return {
            type: 'pattern',
            expected: str,
            raw: str
        };
    }
    
    // Fallback: Return as unknown with raw value for display
    // Log for debugging to help identify new formats
    console.log(`[FH Visual] Unknown reference range format: "${str}"`);
    return {
        type: 'unknown',
        raw: str
    };
}

/**
 * Extract numeric value from various formats including threshold operators
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

