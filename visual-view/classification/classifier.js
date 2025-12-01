/**
 * Biomarker classification functions
 */

import { KNOWN_BIOMARKERS } from '../constants/index.js';
import { buildTimelineEvents } from '../utils/statusHelpers.js';
import { parseReferenceRange, extractNumericFromValue } from './referenceParser.js';

/**
 * Comprehensive biomarker classifier that analyzes the biomarker data
 * and returns structured classification information.
 * 
 * @returns {Object} Classification object with:
 *   - type: 'numeric-band' | 'threshold-upper' | 'threshold-lower' | 
 *           'categorical-binary' | 'categorical-descriptive' | 'titer' | 
 *           'pattern' | 'percentage' | 'informational'
 *   - referenceData: Parsed reference range data
 *   - displayHint: 'range-bar' | 'threshold-line' | 'pass-fail' | 'ladder' | 'grade' | 'simple'
 *   - valueType: 'numeric' | 'titer' | 'categorical' | 'pattern'
 */
export function classifyBiomarker(biomarker) {
    const events = buildTimelineEvents(biomarker);
    const latestValue = events.length > 0 ? String(events[events.length - 1].value || '').trim() : '';
    const refData = parseReferenceRange(biomarker.referenceRange);
    const unit = biomarker.unit || '';
    const name = biomarker.name || '';
    
    // Default classification
    const classification = {
        type: 'informational',
        referenceData: refData,
        displayHint: 'simple',
        valueType: 'unknown',
        eventCount: events.length
    };
    
    // No data case
    if (events.length === 0) {
        return classification;
    }
    
    // Check for titer format in values
    const isTiterValue = /1\s*:\s*\d+/.test(latestValue);
    if (isTiterValue || KNOWN_BIOMARKERS.titers.some(t => name.includes(t))) {
        return {
            ...classification,
            type: 'titer',
            displayHint: 'ladder',
            valueType: 'titer'
        };
    }
    
    // Check for pattern values (A, B, or descriptive patterns)
    if (refData?.type === 'pattern' || KNOWN_BIOMARKERS.patterns.some(p => name.includes(p))) {
        return {
            ...classification,
            type: 'pattern',
            displayHint: 'grade',
            valueType: 'pattern'
        };
    }
    
    // Check for categorical binary (pass/fail type tests)
    const binaryKeywords = ['NEGATIVE', 'POSITIVE', 'NON-REACTIVE', 'REACTIVE', 
                           'NOT DETECTED', 'DETECTED', 'NONE SEEN'];
    const latestUpper = latestValue.toUpperCase();
    const isBinaryValue = binaryKeywords.some(kw => latestUpper.includes(kw));
    
    if (isBinaryValue || refData?.type === 'categorical') {
        // Determine if it's binary (pass/fail) or descriptive
        const isBinary = binaryKeywords.some(kw => latestUpper.includes(kw)) ||
                        KNOWN_BIOMARKERS.binary.some(b => name.includes(b));
        
        return {
            ...classification,
            type: isBinary ? 'categorical-binary' : 'categorical-descriptive',
            displayHint: isBinary ? 'pass-fail' : 'simple',
            valueType: 'categorical'
        };
    }
    
    // Check for descriptive categorical (CLEAR, YELLOW, etc.)
    const descriptiveKeywords = ['CLEAR', 'YELLOW', 'NORMAL', 'ABNORMAL'];
    if (descriptiveKeywords.some(kw => latestUpper.includes(kw))) {
        return {
            ...classification,
            type: 'categorical-descriptive',
            displayHint: 'simple',
            valueType: 'categorical'
        };
    }
    
    // Numeric value handling
    const numericValue = extractNumericFromValue(latestValue);
    const isNumeric = numericValue !== null;
    
    if (!isNumeric) {
        // Non-numeric, non-categorical - treat as informational
        return classification;
    }
    
    // Check for percentage type
    const isPercentage = unit.includes('%') || 
                        KNOWN_BIOMARKERS.percentages.some(p => name.includes(p));
    
    // Classify based on reference range type
    if (refData) {
        switch (refData.type) {
            case 'band':
                return {
                    ...classification,
                    type: isPercentage ? 'percentage' : 'numeric-band',
                    displayHint: 'range-bar',
                    valueType: 'numeric'
                };
                
            case 'threshold':
                return {
                    ...classification,
                    type: refData.direction === 'upper' ? 'threshold-upper' : 'threshold-lower',
                    displayHint: 'threshold-line',
                    valueType: 'numeric'
                };
                
            case 'titer':
                return {
                    ...classification,
                    type: 'titer',
                    displayHint: 'ladder',
                    valueType: 'titer'
                };
                
            default:
                break;
        }
    }
    
    // Fallback for numeric values without clear reference type
    if (isNumeric && events.length > 1) {
        return {
            ...classification,
            type: 'numeric-band',
            displayHint: 'range-bar',
            valueType: 'numeric'
        };
    }
    
    // Single numeric value with no reference
    return {
        ...classification,
        type: 'informational',
        displayHint: 'simple',
        valueType: 'numeric'
    };
}

/**
 * Legacy function for backward compatibility - maps to new classification
 */
export function detectBiomarkerType(biomarker) {
    const classification = classifyBiomarker(biomarker);
    
    // Map new types to legacy type strings for existing code
    const typeMap = {
        'numeric-band': 'numeric-band',
        'threshold-upper': 'threshold',
        'threshold-lower': 'threshold',
        'categorical-binary': 'categorical',
        'categorical-descriptive': 'categorical',
        'titer': 'titer-ladder',
        'pattern': 'categorical',
        'percentage': 'numeric-band',
        'informational': 'static'
    };
    
    return typeMap[classification.type] || 'static';
}

/**
 * Check if a value is numeric
 */
export function isNumericValue(value) {
    if (!value) return false;
    const cleaned = String(value).replace(/[<>≤≥]/g, '').replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    return !Number.isNaN(parsed);
}

/**
 * Check if a value is non-numeric (categorical)
 */
export function isNonNumericValue(value) {
    if (!value) return true;
    const str = String(value).trim().toUpperCase();
    const categorical = ['NEGATIVE', 'POSITIVE', 'NON-REACTIVE', 'REACTIVE', 'NOT DETECTED', 'DETECTED', 
                        'CLEAR', 'YELLOW', 'NONE SEEN', 'NEG', 'NORMAL', 'ABNORMAL'];
    return categorical.some(cat => str.includes(cat));
}

/**
 * Extract numeric value (wrapper for consistency)
 */
export function extractNumericValue(value) {
    return extractNumericFromValue(value);
}

