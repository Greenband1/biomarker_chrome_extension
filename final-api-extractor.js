/**
 * Final API Extractor - Uses results-report endpoint for better categorization
 * Features: Dynamic API endpoint discovery with fallback support
 */

console.log('🚀 Final API Extractor loading...');

// =============================================================================
// API ENDPOINT DISCOVERY MODULE
// =============================================================================

/**
 * Known API endpoints (relative paths)
 */
const KNOWN_ENDPOINTS = {
    resultsReport: '/api/v1/results-report',
    requisitions: '/api/v1/requisitions?pending=false'
};

/**
 * Known base URLs (ordered by preference, most likely first)
 */
const KNOWN_BASE_URLS = [
    'https://production-member-app-mid-lhuqotpy2a-ue.a.run.app'
];

/**
 * Current app version for API headers
 */
const FE_APP_VERSION = '0.84.76';

/**
 * Cache for discovered API base URL (persists for page session)
 */
let discoveredBaseUrl = null;

/**
 * Setup fetch interception to discover API base URL dynamically
 * This captures the actual endpoint the Function Health website uses
 */
function setupApiDiscovery() {
    if (window.__FH_API_DISCOVERY_ACTIVE) return;
    window.__FH_API_DISCOVERY_ACTIVE = true;
    
    const originalFetch = window.fetch;
    
    window.fetch = async function(input, init) {
        const request = new Request(input, init);
        const url = request.url;
        
        // Check if this is a Function Health API call
        if (url.includes('/api/v1/') && url.includes('.run.app')) {
            try {
                const parsed = new URL(url);
                const baseUrl = `${parsed.protocol}//${parsed.host}`;
                
                if (!discoveredBaseUrl) {
                    discoveredBaseUrl = baseUrl;
                    console.log('🔍 Discovered API base URL:', discoveredBaseUrl);
                    
                    // Cache it for future use
                    try {
                        sessionStorage.setItem('fh_api_base_url', baseUrl);
                    } catch (e) { /* ignore storage errors */ }
                }
            } catch (e) {
                console.warn('Failed to parse API URL:', e);
            }
        }
        
        return originalFetch.apply(this, arguments);
    };
    
    console.log('🔍 API discovery interceptor installed');
}

/**
 * Get cached or discovered API base URL
 */
function getCachedBaseUrl() {
    // Check if already discovered this session
    if (discoveredBaseUrl) {
        return discoveredBaseUrl;
    }
    
    // Check sessionStorage cache
    try {
        const cached = sessionStorage.getItem('fh_api_base_url');
        if (cached) {
            console.log('📦 Using cached API base URL:', cached);
            discoveredBaseUrl = cached;
            return cached;
        }
    } catch (e) { /* ignore storage errors */ }
    
    return null;
}

/**
 * Get the best available API base URL
 * Uses discovery chain: cached -> intercepted -> fallback
 */
function getApiBaseUrl() {
    // Try cached/discovered URL first
    const baseUrl = getCachedBaseUrl();
    if (baseUrl) return baseUrl;
    
    // Fall back to known URLs
    console.log('⚠️ Using fallback API base URL');
    return KNOWN_BASE_URLS[0];
}

/**
 * Build standard API request headers
 */
function buildApiHeaders(token) {
    return {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://my.functionhealth.com',
        'Referer': 'https://my.functionhealth.com/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': navigator.userAgent,
        'fe-app-version': FE_APP_VERSION,
        'x-backend-skip-cache': 'true'
    };
}

/**
 * Make API request with automatic retry on different base URLs
 */
async function fetchWithFallback(endpoint, token) {
    const headers = buildApiHeaders(token);
    const options = {
        method: 'GET',
        credentials: 'include',
        headers: headers
    };
    
    // Try primary base URL first
    const primaryBase = getApiBaseUrl();
    const primaryUrl = `${primaryBase}${endpoint}`;
    
    console.log(`📡 Trying primary endpoint: ${primaryUrl}`);
    
    try {
        const response = await fetch(primaryUrl, options);
        if (response.ok) {
            console.log(`✅ Primary endpoint succeeded: ${response.status}`);
            return response;
        }
        console.warn(`⚠️ Primary endpoint returned: ${response.status} ${response.statusText}`);
    } catch (error) {
        console.warn(`❌ Primary endpoint failed: ${primaryUrl}`, error.message);
    }
    
    // Try fallback base URLs
    for (const fallbackBase of KNOWN_BASE_URLS) {
        if (fallbackBase === primaryBase) continue; // Skip already tried
        
        const fallbackUrl = `${fallbackBase}${endpoint}`;
        console.log(`🔄 Trying fallback: ${fallbackUrl}`);
        
        try {
            const response = await fetch(fallbackUrl, options);
            if (response.ok) {
                // Update discovered URL for future requests
                discoveredBaseUrl = fallbackBase;
                try {
                    sessionStorage.setItem('fh_api_base_url', fallbackBase);
                } catch (e) { /* ignore */ }
                console.log(`✅ Fallback endpoint succeeded: ${response.status}`);
                return response;
            }
            console.warn(`⚠️ Fallback returned: ${response.status} ${response.statusText}`);
        } catch (error) {
            console.warn(`❌ Fallback failed: ${fallbackUrl}`, error.message);
        }
    }
    
    throw new Error(`All API endpoints failed for ${endpoint}`);
}

// Initialize API discovery on script load
setupApiDiscovery();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Normalize date to YYYY-MM-DD format for consistent comparison
 * Handles both "2025-07-23" and "2025-07-23T12:00:00+00:00" formats
 */
function normalizeDate(dateStr) {
    if (!dateStr) return null;
    const match = String(dateStr).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : dateStr;
}

/**
 * Normalize biomarker name for grouping similar tests
 * Handles variations like "Omega 3" vs "Omega-3", removes suffixes like "/ OmegaCheck"
 */
function normalizeBiomarkerName(name) {
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
 */
function getBestDisplayName(names) {
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

// =============================================================================
// CATEGORY MAPPING
// =============================================================================

/**
 * Map API category names to internal category names (with normalization)
 * Handles short names from results-report API (e.g., "Heart", "Kidney")
 * Unknown categories are accepted as-is for forward compatibility
 */
function mapApiCategoryToInternal(apiCategory) {
    if (!apiCategory) return null;
    
    // Normalize categories for UI consistency
    // Short API names -> Expanded display names
    const categoryNormalization = {
        // Expand abbreviated names
        'Heart': 'Heart & Cardiovascular',
        'Cardiovascular': 'Heart & Cardiovascular',
        'Heart Health': 'Heart & Cardiovascular',
        'Blood': 'Blood & Hematology',
        'Hematology': 'Blood & Hematology',
        'Metabolic': 'Metabolic & Diabetes',
        'Diabetes': 'Metabolic & Diabetes',
        'Metabolism': 'Metabolic & Diabetes',
        'Kidney': 'Kidney & Renal',
        'Renal': 'Kidney & Renal',
        
        // Normalize variations
        'Infectious': 'Infectious Disease',
        'STD': 'Infectious Disease',
        'STI': 'Infectious Disease',
        'Other': 'Infectious Disease',
        'Environmental': 'Environmental Toxins',
        'Toxins': 'Environmental Toxins',
        'Heavy Metals': 'Environmental Toxins',
        'Autoimmune': 'Autoimmunity',
        'Pancreatic': 'Pancreas',
        'Stress': 'Stress & Aging',
        'Aging': 'Stress & Aging',
        'Urine': 'Urinalysis',
        
        // Sex-specific to unified category
        'Male Health': 'Reproductive Health',
        'Female Health': 'Reproductive Health',
        'Reproductive': 'Reproductive Health',
        
        // Pass-through categories (already good names)
        'Immune Regulation': 'Immune Regulation',
        'Nutrients': 'Nutrients',
        'Liver': 'Liver',
        'Thyroid': 'Thyroid',
        'Electrolytes': 'Electrolytes',
        'Pancreas': 'Pancreas',
        'Environmental Toxins': 'Environmental Toxins',
        'Autoimmunity': 'Autoimmunity',
        'Biological Age': 'Biological Age'
    };
    
    // Check for exact normalization match
    if (categoryNormalization[apiCategory]) {
        return categoryNormalization[apiCategory];
    }
    
    // Check for partial match (API might return variations)
    const lowerApi = apiCategory.toLowerCase();
    for (const [key, value] of Object.entries(categoryNormalization)) {
        if (lowerApi.includes(key.toLowerCase())) {
            return value;
        }
    }
    
    // Accept unknown API categories as-is for forward compatibility
    console.log(`📂 New API category detected: "${apiCategory}" - using as-is`);
    return apiCategory;
}

/**
 * Get biomarker category from biomarker name (fallback for uncategorized biomarkers)
 * Only used for the ~7 infectious disease tests that lack API categories
 */
function getBiomarkerCategoryFromName(biomarkerName) {
    if (!biomarkerName) return 'Infectious Disease';
    
    const name = biomarkerName.toLowerCase();
    
    // Infectious disease tests (the main use case for this fallback)
    const infectiousKeywords = [
        'herpes', 'hiv', 'chlamydia', 'gonorrhoea', 'gonorrhea',
        'syphilis', 'trichomonas', 'hepatitis', 'std', 'sti'
    ];
    
    for (const keyword of infectiousKeywords) {
        if (name.includes(keyword)) {
            return 'Infectious Disease';
        }
    }
    
    // If not infectious, return General (but this should rarely happen with results-report API)
    console.log(`📂 Fallback categorization for "${biomarkerName}" -> "General"`);
    return 'General';
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Get the working authentication token from localStorage
 */
function getWorkingToken() {
    try {
        const userData = localStorage.getItem('userData');
        if (!userData) {
            throw new Error('No userData found in localStorage');
        }
        
        const parsed = JSON.parse(userData);
        const token = parsed.idToken;
        
        if (!token) {
            throw new Error('No idToken found in userData');
        }
        
        // Verify token is not expired
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000;
            const now = Date.now();
            
            if (now > exp) {
                throw new Error(`Token expired at ${new Date(exp).toLocaleString()}`);
            }
            
            console.log(`✅ Token valid until: ${new Date(exp).toLocaleString()}`);
        } catch (e) {
            console.warn('⚠️ Could not verify token expiration:', e.message);
        }
        
        return token;
        
    } catch (error) {
        console.error('❌ Error getting token:', error);
        throw error;
    }
}

// =============================================================================
// RESULTS-REPORT API PARSER
// =============================================================================

/**
 * Parse the results-report API response format
 * This API provides authoritative category information for 96% of biomarkers
 */
function parseResultsReportResponse(rawData) {
    console.log('🔄 Parsing results-report API response...');
    
    const data = {
        categories: {},
        summary: {
            inRange: 0,
            outOfRange: 0,
            improving: 0,
            total: 0
        },
        extractedAt: new Date().toISOString(),
        source: 'Results Report API'
    };

    // Extract biomarkerResultsRecord from the response
    const records = rawData?.data?.biomarkerResultsRecord;
    
    if (!Array.isArray(records)) {
        console.warn('⚠️ No biomarkerResultsRecord found in API response');
        console.log('📊 Response structure:', Object.keys(rawData || {}));
        return data;
    }

    console.log(`📊 Processing ${records.length} biomarker records...`);

    records.forEach((record, index) => {
        try {
            const biomarkerName = record.biomarker?.name;
            if (!biomarkerName) {
                console.warn(`⚠️ Record ${index} has no biomarker name`);
                return;
            }

            // Get category from API (authoritative source)
            // The category is in biomarker.categories[0].categoryName
            let categoryName = record.biomarker?.categories?.[0]?.categoryName;
            
            // Map to internal names for UI consistency
            if (categoryName) {
                categoryName = mapApiCategoryToInternal(categoryName);
            } else {
                // Fallback for the ~7 biomarkers without categories (infectious disease tests)
                categoryName = getBiomarkerCategoryFromName(biomarkerName);
                console.log(`📂 "${biomarkerName}" -> "${categoryName}" (fallback - no API category)`);
            }

            // Build historical values from the structured data
            // Each result has its own inRange field which is the authoritative source
            const historicalValues = [];
            
            // Add current result
            if (record.currentResult) {
                historicalValues.push({
                    date: normalizeDate(record.currentResult.dateOfService),
                    value: record.currentResult.displayResult || record.currentResult.calculatedResult,
                    unit: record.units || '',
                    status: record.currentResult.inRange ? 'In Range' : 'Out of Range',
                    inRange: record.currentResult.inRange,
                    riskLevel: record.currentResult.riskLevel
                });
            }
            
            // Add previous result
            if (record.previousResult) {
                historicalValues.push({
                    date: normalizeDate(record.previousResult.dateOfService),
                    value: record.previousResult.displayResult || record.previousResult.calculatedResult,
                    unit: record.units || '',
                    status: record.previousResult.inRange ? 'In Range' : 'Out of Range',
                    inRange: record.previousResult.inRange,
                    riskLevel: record.previousResult.riskLevel
                });
            }
            
            // Add past results
            if (Array.isArray(record.pastResults)) {
                record.pastResults.forEach(past => {
                    historicalValues.push({
                        date: normalizeDate(past.dateOfService),
                        value: past.displayResult || past.calculatedResult,
                        unit: record.units || '',
                        status: past.inRange ? 'In Range' : 'Out of Range',
                        inRange: past.inRange,
                        riskLevel: past.riskLevel
                    });
                });
            }

            // Sort historical values by date (most recent first)
            historicalValues.sort((a, b) => {
                if (!a.date || !b.date) return 0;
                return new Date(b.date) - new Date(a.date);
            });

            // Determine current status from currentResult.inRange (authoritative source)
            // outOfRangeType tells us WHY something is out of range, not WHETHER it is
            let currentStatus = 'In Range';
            if (record.currentResult) {
                currentStatus = record.currentResult.inRange ? 'In Range' : 'Out of Range';
            } else if (record.outOfRangeType === 'above' || record.outOfRangeType === 'below') {
                // Fallback: if no currentResult, use outOfRangeType for above/below
                currentStatus = 'Out of Range';
            }
            
            // Determine if reference range is available
            const hasReferenceRange = record.rangeString && record.rangeString.trim() !== '';
            
            // Detect if this is a qualitative/threshold-based result
            const displayValue = record.currentResult?.displayResult || record.currentResult?.calculatedResult || '';
            const displayStr = String(displayValue).toUpperCase();
            const isQualitativeResult = /NEG|POS|REACTIVE|DETECTED|^<|^>/i.test(displayValue);
            const resultType = isQualitativeResult ? 'qualitative' : 'quantitative';
            
            // Determine qualitative interpretation
            const isNegative = /NEG|NON-REACTIVE|NOT DETECTED/i.test(displayStr);
            const isPositive = /(?<!NON[ -]?)REACTIVE|(?<!NOT )DETECTED/i.test(displayStr) && !isNegative;
            const isBelowThreshold = String(displayValue).trim().startsWith('<');
            const isAboveThreshold = String(displayValue).trim().startsWith('>');
            
            // Create biomarker object
            const biomarker = {
                name: biomarkerName,
                description: record.biomarker?.oneLineDescription || null,  // API-provided description
                status: currentStatus,
                value: record.currentResult?.displayResult || record.currentResult?.calculatedResult || '',
                unit: record.units || '',
                date: normalizeDate(record.currentResult?.dateOfService) || '',
                referenceRange: hasReferenceRange ? record.rangeString : null,
                hasReferenceRange: hasReferenceRange,
                rangeContext: record.outOfRangeType,  // 'in_range', 'above', 'below', 'OTHER', 'text', etc.
                questId: record.questBiomarkerId,
                category: categoryName,
                improving: record.improving || false,
                historicalValues: historicalValues,
                source: 'Results Report API',
                // Qualitative result fields
                resultType: resultType,
                isQualitative: isQualitativeResult,
                isNegative: isNegative,
                isPositive: isPositive,
                isBelowThreshold: isBelowThreshold,
                isAboveThreshold: isAboveThreshold
            };

            // Add to category
            if (!data.categories[categoryName]) {
                data.categories[categoryName] = {
                    biomarkers: [],
                    count: 0,
                    outOfRange: 0
                };
            }

            data.categories[categoryName].biomarkers.push(biomarker);
            data.categories[categoryName].count++;
            
            // Update summary
            data.summary.total++;
            if (biomarker.status === 'In Range') {
                data.summary.inRange++;
            } else {
                data.summary.outOfRange++;
                data.categories[categoryName].outOfRange++;
            }
            
            if (biomarker.improving) {
                data.summary.improving++;
            }

        } catch (error) {
            console.warn(`⚠️ Error processing record ${index}:`, error);
        }
    });

    console.log('✅ Parsing complete:', {
        categories: Object.keys(data.categories).length,
        totalBiomarkers: data.summary.total,
        inRange: data.summary.inRange,
        outOfRange: data.summary.outOfRange,
        improving: data.summary.improving
    });

    return data;
}

/**
 * Parse results-report API response for current results only
 * Returns only the most recent result for each biomarker
 */
function parseResultsReportCurrentOnly(rawData) {
    console.log('🔄 Parsing results-report API for current results only...');
    
    const data = {
        categories: {},
        summary: {
            inRange: 0,
            outOfRange: 0,
            improving: 0,
            total: 0
        },
        extractedAt: new Date().toISOString(),
        source: 'Results Report API (Current Only)'
    };

    // Extract biomarkerResultsRecord from the response
    const records = rawData?.data?.biomarkerResultsRecord;
    
    if (!Array.isArray(records)) {
        console.warn('⚠️ No biomarkerResultsRecord found in API response');
        return data;
    }

    console.log(`📊 Processing ${records.length} biomarker records for current values...`);

    records.forEach((record, index) => {
        try {
            const biomarkerName = record.biomarker?.name;
            if (!biomarkerName) return;

            // Skip if no current result
            if (!record.currentResult) {
                console.log(`⏭️ Skipping "${biomarkerName}" - no current result`);
                return;
            }

            // Get category from API
            let categoryName = record.biomarker?.categories?.[0]?.categoryName;
            if (categoryName) {
                categoryName = mapApiCategoryToInternal(categoryName);
            } else {
                categoryName = getBiomarkerCategoryFromName(biomarkerName);
            }

            // Determine current status from currentResult.inRange (authoritative source)
            const currentStatus = record.currentResult.inRange ? 'In Range' : 'Out of Range';
            
            // Determine if reference range is available
            const hasReferenceRange = record.rangeString && record.rangeString.trim() !== '';
            
            // Detect if this is a qualitative/threshold-based result
            const displayValue = record.currentResult.displayResult || record.currentResult.calculatedResult || '';
            const displayStr = String(displayValue).toUpperCase();
            const isQualitativeResult = /NEG|POS|REACTIVE|DETECTED|^<|^>/i.test(displayValue);
            const resultType = isQualitativeResult ? 'qualitative' : 'quantitative';
            
            // Determine qualitative interpretation
            const isNegative = /NEG|NON-REACTIVE|NOT DETECTED/i.test(displayStr);
            const isPositive = /(?<!NON[ -]?)REACTIVE|(?<!NOT )DETECTED/i.test(displayStr) && !isNegative;
            const isBelowThreshold = String(displayValue).trim().startsWith('<');
            const isAboveThreshold = String(displayValue).trim().startsWith('>');
            
            // Create biomarker object with only current result
            const biomarker = {
                name: biomarkerName,
                description: record.biomarker?.oneLineDescription || null,  // API-provided description
                status: currentStatus,
                value: record.currentResult.displayResult || record.currentResult.calculatedResult || '',
                unit: record.units || '',
                date: normalizeDate(record.currentResult.dateOfService) || '',
                referenceRange: hasReferenceRange ? record.rangeString : null,
                hasReferenceRange: hasReferenceRange,
                rangeContext: record.outOfRangeType,  // 'in_range', 'above', 'below', 'OTHER', 'text', etc.
                questId: record.questBiomarkerId,
                category: categoryName,
                improving: record.improving || false,
                historicalValues: [{
                    date: normalizeDate(record.currentResult.dateOfService),
                    value: record.currentResult.displayResult || record.currentResult.calculatedResult,
                    unit: record.units || '',
                    status: currentStatus,
                    inRange: record.currentResult.inRange
                }],
                source: 'Results Report API (Current Only)',
                // Qualitative result fields
                resultType: resultType,
                isQualitative: isQualitativeResult,
                isNegative: isNegative,
                isPositive: isPositive,
                isBelowThreshold: isBelowThreshold,
                isAboveThreshold: isAboveThreshold
            };

            // Add to category
            if (!data.categories[categoryName]) {
                data.categories[categoryName] = {
                    biomarkers: [],
                    count: 0,
                    outOfRange: 0
                };
            }

            data.categories[categoryName].biomarkers.push(biomarker);
            data.categories[categoryName].count++;
            
            // Update summary
            data.summary.total++;
            if (biomarker.status === 'In Range') {
                data.summary.inRange++;
            } else {
                data.summary.outOfRange++;
                data.categories[categoryName].outOfRange++;
            }
            
            if (biomarker.improving) {
                data.summary.improving++;
            }

        } catch (error) {
            console.warn(`⚠️ Error processing record ${index}:`, error);
        }
    });

    console.log('✅ Current-only parsing complete:', {
        categories: Object.keys(data.categories).length,
        totalBiomarkers: data.summary.total,
        inRange: data.summary.inRange,
        outOfRange: data.summary.outOfRange
    });

    return data;
}

// =============================================================================
// MAIN EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract biomarker data using the results-report API
 * Uses dynamic endpoint discovery with fallback support
 */
async function extractViaFinalAPI() {
    console.log('⚡ Starting final API extraction...');
    
    try {
        // Get the working token
        const token = getWorkingToken();
        console.log('🔐 Using working token from userData.idToken');
        
        // Use the results-report endpoint (has category data)
        const endpoint = KNOWN_ENDPOINTS.resultsReport;
        console.log('📡 Requesting biomarker data from results-report API...');
        
        const response = await fetchWithFallback(endpoint, token);
        
        console.log(`📊 API Response: ${response.status} ${response.statusText}`);
        
        const rawData = await response.json();
        console.log('✅ Raw data received, parsing...');
        
        // Parse using results-report format (has categories)
        const parsedData = parseResultsReportResponse(rawData);
        
        console.log('🎯 Final extraction complete:', {
            categories: Object.keys(parsedData.categories).length,
            totalBiomarkers: parsedData.summary.total
        });
        
        return parsedData;
        
    } catch (error) {
        console.error('❌ Final extraction failed:', error);
        throw error;
    }
}

/**
 * Extract only the most recent biomarker data (current results only)
 * Uses results-report API with current-only parsing
 */
async function extractCurrentResultsOnly() {
    console.log('⚡ Starting current-only API extraction...');
    
    try {
        // Get the working token
        const token = getWorkingToken();
        console.log('🔐 Using working token from userData.idToken');
        
        // Use the results-report endpoint
        const endpoint = KNOWN_ENDPOINTS.resultsReport;
        console.log('📡 Requesting current biomarker data from results-report API...');
        
        const response = await fetchWithFallback(endpoint, token);
        
        console.log(`📊 API Response: ${response.status} ${response.statusText}`);
        
        const rawData = await response.json();
        console.log('✅ Raw data received, filtering to current results...');
        
        // Parse with current-only filter
        const parsedData = parseResultsReportCurrentOnly(rawData);
        
        console.log('🎯 Current-only extraction complete:', {
            categories: Object.keys(parsedData.categories).length,
            totalBiomarkers: parsedData.summary.total
        });
        
        return parsedData;
        
    } catch (error) {
        console.error('❌ Current-only extraction failed:', error);
        throw error;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Make functions available globally
window.extractViaFinalAPI = extractViaFinalAPI;
window.extractCurrentResultsOnly = extractCurrentResultsOnly;

console.log('✅ Final API Extractor loaded! Using results-report API with dynamic endpoint discovery.');
