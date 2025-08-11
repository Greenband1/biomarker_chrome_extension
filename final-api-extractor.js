/**
 * Final API Extractor - Uses proven working authentication
 * Based on successful token analysis: userData.idToken works perfectly
 */

console.log('🚀 Final API Extractor loading...');

/**
 * Get the working authentication token
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

/**
 * Extract biomarker data using the working token
 */
async function extractViaFinalAPI() {
    console.log('⚡ Starting final API extraction...');
    
    try {
        // Get the working token
        const token = getWorkingToken();
        console.log('🔐 Using working token from userData.idToken');
        
        // Make the API request with exact headers that work
        const apiUrl = 'https://production-member-app-mid-lhuqotpy2a-ue.a.run.app/api/v1/requisitions?pending=false';
        console.log('📡 Requesting full biomarker data...');
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Authorization': `Bearer ${token}`,
                'Origin': 'https://my.functionhealth.com',
                'Referer': 'https://my.functionhealth.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site',
                'User-Agent': navigator.userAgent,
                'fe-app-version': '0.84.25',
                'x-backend-skip-cache': 'true'
            }
        });
        
        console.log(`📊 API Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const rawData = await response.json();
        console.log('✅ Raw data received, parsing...');
        
        // Parse the data
        const parsedData = parseAPIResponse(rawData);
        
        console.log('🎯 Final extraction complete:', {
            categories: Object.keys(parsedData.categories).length,
            totalBiomarkers: Object.values(parsedData.categories).reduce((sum, cat) => sum + cat.biomarkers.length, 0)
        });
        
        return parsedData;
        
    } catch (error) {
        console.error('❌ Final extraction failed:', error);
        throw error;
    }
}

/**
 * Parse API response into the expected format
 */
function parseAPIResponse(rawData) {
    console.log('🔄 Parsing API response...');
    console.log('📊 Raw API response structure:', {
        isArray: Array.isArray(rawData),
        length: Array.isArray(rawData) ? rawData.length : 'N/A',
        firstItemKeys: Array.isArray(rawData) && rawData.length > 0 ? Object.keys(rawData[0]) : 'N/A'
    });
    
    const data = {
        categories: {},
        summary: {
            inRange: 0,
            outOfRange: 0,
            improving: 0,
            total: 0
        },
        extractedAt: new Date().toISOString(),
        source: 'Final API Extractor'
    };

    // Extract all biomarker results from the nested structure
    let allBiomarkerResults = [];
    
    if (Array.isArray(rawData)) {
        // Each item in the array is a requisition with visits
        rawData.forEach((requisition, reqIndex) => {
            console.log(`📋 Processing requisition ${reqIndex + 1}:`, {
                id: requisition.id,
                visitsCount: requisition.visits ? requisition.visits.length : 0
            });
            
            if (requisition.visits && Array.isArray(requisition.visits)) {
                requisition.visits.forEach((visit, visitIndex) => {
                    console.log(`🏥 Processing visit ${visitIndex + 1}:`, {
                        visitDate: visit.visitDate,
                        biomarkerResultsCount: visit.biomarkerResults ? visit.biomarkerResults.length : 0
                    });
                    
                    if (visit.biomarkerResults && Array.isArray(visit.biomarkerResults)) {
                        visit.biomarkerResults.forEach(result => {
                            // Add visit context to each biomarker result
                            allBiomarkerResults.push({
                                ...result,
                                visitDate: visit.visitDate,
                                visitId: visit.id
                            });
                        });
                    }
                });
            }
        });
    }

    console.log(`📊 Total biomarker results extracted: ${allBiomarkerResults.length}`);

    if (allBiomarkerResults.length === 0) {
        console.warn('⚠️ No biomarker results found in API response');
        return data;
    }

    // Process each biomarker result
    allBiomarkerResults.forEach((result, index) => {
        try {
            const biomarker = parseBiomarkerResult(result);
            if (biomarker) {
                // Determine category based on biomarker name
                const categoryName = getBiomarkerCategoryFromName(result.biomarkerName) || 'General';
                
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
                } else if (biomarker.status === 'Out of Range') {
                    data.summary.outOfRange++;
                    data.categories[categoryName].outOfRange++;
                }
            }
        } catch (error) {
            console.warn(`⚠️ Error parsing biomarker result ${index}:`, error);
        }
    });

    console.log('✅ Parsing complete:', {
        categories: Object.keys(data.categories).length,
        totalBiomarkers: data.summary.total,
        inRange: data.summary.inRange,
        outOfRange: data.summary.outOfRange
    });

    return data;
}

/**
 * Parse individual biomarker result from API response
 */
function parseBiomarkerResult(result) {
    if (!result || !result.biomarkerName) {
        console.warn('⚠️ Invalid biomarker result:', result);
        return null;
    }
    
    const biomarker = {
        name: result.biomarkerName,
        status: result.testResultOutOfRange ? 'Out of Range' : 'In Range',
        value: result.testResult || '',
        unit: result.measurementUnits || '',
        date: result.dateOfService || result.visitDate || '',
        historicalValues: [],
        source: 'Final API',
        questId: result.questBiomarkerId,
        dateOfService: result.dateOfService,
        visitDate: result.visitDate,
        referenceRange: result.questReferenceRange
    };

    // Create historical entry for this result
    if (result.dateOfService) {
        biomarker.historicalValues.push({
            date: result.dateOfService,
            value: result.testResult,
            inRange: !result.testResultOutOfRange,
            visitDate: result.visitDate
        });
    }

    console.log(`🧪 Parsed biomarker: ${biomarker.name} = ${biomarker.value} ${biomarker.unit} (${biomarker.status}) [${biomarker.date}]`);
    return biomarker;
}

/**
 * Get biomarker category from biomarker name
 */
function getBiomarkerCategoryFromName(biomarkerName) {
    if (!biomarkerName) return 'General';
    
    const name = biomarkerName.toLowerCase();
    
    // Enhanced categorization based on actual Function Health biomarker names
    const categoryMap = {
        // Heart & Cardiovascular
        'cholesterol': 'Heart & Cardiovascular', 'hdl': 'Heart & Cardiovascular', 'ldl': 'Heart & Cardiovascular', 
        'triglyceride': 'Heart & Cardiovascular', 'apolipoprotein': 'Heart & Cardiovascular', 'lp-pla2': 'Heart & Cardiovascular',
        'pcad': 'Heart & Cardiovascular', 'pcec': 'Heart & Cardiovascular',
        
        // Blood & Hematology
        'hemoglobin': 'Blood & Hematology', 'hematocrit': 'Blood & Hematology', 'platelet': 'Blood & Hematology',
        'white blood': 'Blood & Hematology', 'red blood': 'Blood & Hematology', 'wbc': 'Blood & Hematology', 'rbc': 'Blood & Hematology',
        
        // Metabolic & Diabetes
        'glucose': 'Metabolic & Diabetes', 'insulin': 'Metabolic & Diabetes', 'hemoglobin a1c': 'Metabolic & Diabetes',
        'hba1c': 'Metabolic & Diabetes', 'adiponectin': 'Metabolic & Diabetes',
        
        // Kidney & Renal
        'creatinine': 'Kidney & Renal', 'kidney': 'Kidney & Renal', 'urea': 'Kidney & Renal', 'bun': 'Kidney & Renal',
        'egfr': 'Kidney & Renal', 'glomerular': 'Kidney & Renal', 'cystatin': 'Kidney & Renal',
        
        // Liver
        'liver': 'Liver', 'alt': 'Liver', 'ast': 'Liver', 'alp': 'Liver', 'bilirubin': 'Liver',
        'albumin': 'Liver', 'protein': 'Liver',
        
        // Thyroid
        'thyroid': 'Thyroid', 'tsh': 'Thyroid', 't3': 'Thyroid', 't4': 'Thyroid', 'thyroxine': 'Thyroid',
        
        // Hormones
        'testosterone': 'Hormones', 'estradiol': 'Hormones', 'cortisol': 'Hormones', 'dhea': 'Hormones',
        'progesterone': 'Hormones', 'fsh': 'Hormones', 'lh': 'Hormones',
        
        // Nutrients & Vitamins
        'vitamin': 'Nutrients & Vitamins', 'iron': 'Nutrients & Vitamins', 'calcium': 'Nutrients & Vitamins',
        'magnesium': 'Nutrients & Vitamins', 'zinc': 'Nutrients & Vitamins', 'b12': 'Nutrients & Vitamins',
        'folate': 'Nutrients & Vitamins', 'ferritin': 'Nutrients & Vitamins',
        
        // Infectious Disease & STDs
        'herpes': 'Infectious Disease', 'hiv': 'Infectious Disease', 'chlamydia': 'Infectious Disease',
        'gonorrhoea': 'Infectious Disease', 'syphilis': 'Infectious Disease', 'trichomonas': 'Infectious Disease',
        'hepatitis': 'Infectious Disease',
        
        // Inflammation & Immune
        'c-reactive': 'Inflammation', 'crp': 'Inflammation', 'esr': 'Inflammation', 'sed rate': 'Inflammation'
    };
    
    for (const [keyword, category] of Object.entries(categoryMap)) {
        if (name.includes(keyword)) {
            console.log(`📂 Categorized "${biomarkerName}" as "${category}" (matched: ${keyword})`);
            return category;
        }
    }
    
    console.log(`📂 Categorized "${biomarkerName}" as "General" (no match found)`);
    return 'General';
}

/**
 * Extract only the most recent biomarker data (current results only)
 */
async function extractCurrentResultsOnly() {
    console.log('⚡ Starting current-only API extraction...');
    
    try {
        // Get the working token
        const token = getWorkingToken();
        console.log('🔐 Using working token from userData.idToken');
        
        // Make the API request with exact headers that work
        const apiUrl = 'https://production-member-app-mid-lhuqotpy2a-ue.a.run.app/api/v1/requisitions?pending=false';
        console.log('📡 Requesting current biomarker data...');
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Authorization': `Bearer ${token}`,
                'Origin': 'https://my.functionhealth.com',
                'Referer': 'https://my.functionhealth.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site',
                'User-Agent': navigator.userAgent,
                'fe-app-version': '0.84.25',
                'x-backend-skip-cache': 'true'
            }
        });
        
        console.log(`📊 API Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const rawData = await response.json();
        console.log('✅ Raw data received, filtering to current results...');
        
        // Parse the data and filter to current results only
        const parsedData = parseAPIResponseCurrentOnly(rawData);
        
        console.log('🎯 Current-only extraction complete:', {
            categories: Object.keys(parsedData.categories).length,
            totalBiomarkers: Object.values(parsedData.categories).reduce((sum, cat) => sum + cat.biomarkers.length, 0)
        });
        
        return parsedData;
        
    } catch (error) {
        console.error('❌ Current-only extraction failed:', error);
        throw error;
    }
}

/**
 * Parse API response and filter to only the most recent result for each biomarker
 */
function parseAPIResponseCurrentOnly(rawData) {
    console.log('🔄 Parsing API response for current results only...');
    
    const data = {
        categories: {},
        summary: {
            inRange: 0,
            outOfRange: 0,
            improving: 0,
            total: 0
        },
        extractedAt: new Date().toISOString(),
        source: 'Final API Extractor (Current Only)'
    };

    // Extract all biomarker results from the nested structure
    let allBiomarkerResults = [];
    
    if (Array.isArray(rawData)) {
        rawData.forEach((requisition, reqIndex) => {
            console.log(`📋 Processing requisition ${reqIndex + 1} for current results`);
            
            if (requisition.visits && Array.isArray(requisition.visits)) {
                requisition.visits.forEach((visit, visitIndex) => {
                    if (visit.biomarkerResults && Array.isArray(visit.biomarkerResults)) {
                        visit.biomarkerResults.forEach(result => {
                            allBiomarkerResults.push({
                                ...result,
                                visitDate: visit.visitDate,
                                visitId: visit.id
                            });
                        });
                    }
                });
            }
        });
    }

    console.log(`📊 Total biomarker results found: ${allBiomarkerResults.length}`);

    if (allBiomarkerResults.length === 0) {
        console.warn('⚠️ No biomarker results found in API response');
        return data;
    }

    // Group by biomarker name and get the most recent result for each
    const biomarkerGroups = {};
    
    allBiomarkerResults.forEach(result => {
        const biomarkerName = result.biomarkerName;
        if (!biomarkerName) return;
        
        // Normalize biomarker name to handle slight variations
        const normalizedName = biomarkerName.trim();
        
        if (!biomarkerGroups[normalizedName]) {
            biomarkerGroups[normalizedName] = [];
        }
        
        biomarkerGroups[normalizedName].push(result);
    });
    
    console.log(`📊 Found ${Object.keys(biomarkerGroups).length} unique biomarkers`);
    
    // For each biomarker, get the most recent result
    const currentResults = [];
    
    Object.entries(biomarkerGroups).forEach(([biomarkerName, results]) => {
        // Sort by date (most recent first)
        const sortedResults = results.sort((a, b) => {
            const dateA = new Date(a.dateOfService || a.visitDate || '1900-01-01');
            const dateB = new Date(b.dateOfService || b.visitDate || '1900-01-01');
            return dateB - dateA; // Most recent first
        });
        
        const mostRecent = sortedResults[0];
        currentResults.push(mostRecent);
        
        console.log(`📅 ${biomarkerName}: Using result from ${mostRecent.dateOfService || mostRecent.visitDate} (${sortedResults.length} total results available)`);
    });
    
    console.log(`✅ Filtered to ${currentResults.length} current results`);

    // Process each current biomarker result with duplicate prevention
    const processedBiomarkers = new Set(); // Track processed biomarker names
    
    currentResults.forEach((result, index) => {
        try {
            const biomarker = parseBiomarkerResult(result);
            if (biomarker) {
                const normalizedName = biomarker.name.trim();
                
                // Double-check for duplicates (safety net)
                if (processedBiomarkers.has(normalizedName)) {
                    console.warn(`⚠️ Duplicate biomarker detected and skipped: ${normalizedName}`);
                    return;
                }
                
                processedBiomarkers.add(normalizedName);
                
                // Determine category based on biomarker name
                const categoryName = getBiomarkerCategoryFromName(result.biomarkerName) || 'General';
                
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
                } else if (biomarker.status === 'Out of Range') {
                    data.summary.outOfRange++;
                    data.categories[categoryName].outOfRange++;
                }
                
                console.log(`✅ Added: ${normalizedName} (${biomarker.date})`);
            }
        } catch (error) {
            console.warn(`⚠️ Error parsing current biomarker result ${index}:`, error);
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

// Make functions available globally
window.extractViaFinalAPI = extractViaFinalAPI;
window.extractCurrentResultsOnly = extractCurrentResultsOnly;

console.log('✅ Final API Extractor loaded! Ready for lightning-fast extraction!');
