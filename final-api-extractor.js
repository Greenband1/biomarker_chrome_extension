/**
 * Final API Extractor - Uses proven working authentication
 * Based on successful token analysis: userData.idToken works perfectly
 */

console.log('🚀 Final API Extractor loading...');

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

/**
 * Map API category names to internal category names (with normalization)
 * HYBRID APPROACH: Accept any API category, only normalize for UI consistency
 * Unknown categories are accepted as-is (not forced to "General")
 */
function mapApiCategoryToInternal(apiCategory) {
    if (!apiCategory) return null;
    
    // Only normalize categories that need expanded/consistent naming
    // All other API categories are accepted as-is
    const categoryNormalization = {
        // Expand abbreviated names for UI consistency
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
        'Other': 'Infectious Disease',  // "Other" in PDF contains STDs
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
        'Reproductive': 'Reproductive Health'
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
    
    // HYBRID: Accept unknown API categories as-is (don't force to "General")
    // This allows new Function Health categories to work automatically
    console.log(`📂 New API category detected: "${apiCategory}" - using as-is`);
    return apiCategory;
}

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
    
    // STEP 1: Build a GLOBAL lookup map of biomarker ID -> category/name
    // This scans ALL requisitions and visits FIRST before processing results
    // This ensures we can find categories even if a visit only has biomarkerResults
    const globalBiomarkerCategoryMap = new Map();
    const globalBiomarkerNameMap = new Map();
    
    if (Array.isArray(rawData)) {
        rawData.forEach(requisition => {
            if (requisition.visits && Array.isArray(requisition.visits)) {
                requisition.visits.forEach(visit => {
                    if (visit.biomarkers && Array.isArray(visit.biomarkers)) {
                        visit.biomarkers.forEach(entry => {
                            const biomarkerId = entry.biomarker?.id;
                            const category = entry.biomarker?.categories?.[0]?.categoryName || null;
                            const name = entry.biomarker?.name || '';
                            
                            if (biomarkerId) {
                                // Only set if not already set (keep first found)
                                if (category && !globalBiomarkerCategoryMap.has(biomarkerId)) {
                                    globalBiomarkerCategoryMap.set(biomarkerId, category);
                                }
                                if (name && !globalBiomarkerNameMap.has(biomarkerId)) {
                                    globalBiomarkerNameMap.set(biomarkerId, name);
                                }
                            }
                        });
                    }
                });
            }
        });
    }
    
    console.log(`📂 Built global biomarker lookup: ${globalBiomarkerCategoryMap.size} categories, ${globalBiomarkerNameMap.size} names`);
    
    // STEP 2: Now process all results using the global lookup map
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
                    
                    // Check if visit has biomarker entries with parent biomarker info (new API structure)
                    if (visit.biomarkers && Array.isArray(visit.biomarkers)) {
                        visit.biomarkers.forEach(entry => {
                            // Extract category from parent biomarker object
                            const apiCategory = entry.biomarker?.categories?.[0]?.categoryName || null;
                            const biomarkerName = entry.biomarker?.name || '';
                            
                            if (entry.biomarkerResults && Array.isArray(entry.biomarkerResults)) {
                                entry.biomarkerResults.forEach(result => {
                                    allBiomarkerResults.push({
                                        ...result,
                                        // Use biomarker name from parent if result's name is empty
                                        biomarkerName: result.biomarkerName || biomarkerName,
                                        // Attach API-provided category
                                        apiCategory: apiCategory,
                                        visitDate: visit.visitDate,
                                        visitId: visit.id
                                    });
                                });
                            }
                        });
                    }
                    
                    // Also check for direct biomarkerResults (legacy/alternative structure)
                    if (visit.biomarkerResults && Array.isArray(visit.biomarkerResults)) {
                        visit.biomarkerResults.forEach(result => {
                            // Only add if not already added via biomarkers array
                            const alreadyAdded = allBiomarkerResults.some(r => 
                                r.id === result.id || 
                                (r.biomarkerName === result.biomarkerName && 
                                 r.dateOfService === result.dateOfService &&
                                 r.testResult === result.testResult)
                            );
                            
                            if (!alreadyAdded) {
                                // Use GLOBAL lookup map to find category
                                const biomarkerId = result.biomarkerId;
                                const apiCategory = biomarkerId ? globalBiomarkerCategoryMap.get(biomarkerId) : null;
                                const parentName = biomarkerId ? globalBiomarkerNameMap.get(biomarkerId) : null;
                                
                                allBiomarkerResults.push({
                                    ...result,
                                    biomarkerName: result.biomarkerName || parentName || '',
                                    apiCategory: apiCategory,
                                    visitDate: visit.visitDate,
                                    visitId: visit.id
                                });
                            }
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

    // Group results by NORMALIZED biomarker name to consolidate historical data
    // This handles variations like "Omega 3 Total" vs "Omega-3 Total" vs "Omega 3 Total / OmegaCheck"
    const biomarkerGroups = new Map();
    
    allBiomarkerResults.forEach(result => {
        const originalName = result.biomarkerName?.trim();
        if (!originalName) return;
        
        const normalizedName = normalizeBiomarkerName(originalName);
        
        if (!biomarkerGroups.has(normalizedName)) {
            biomarkerGroups.set(normalizedName, { 
                results: [], 
                apiCategory: null,
                originalNames: new Set() // Track all original name variations
            });
        }
        const group = biomarkerGroups.get(normalizedName);
        group.results.push(result);
        group.originalNames.add(originalName);
        
        // Capture API category if available (use first one found)
        if (!group.apiCategory && result.apiCategory) {
            group.apiCategory = result.apiCategory;
        }
    });
    
    console.log(`📊 Found ${biomarkerGroups.size} unique biomarkers after normalization`);

    // Process each unique biomarker with ALL its historical values
    biomarkerGroups.forEach((group, normalizedName) => {
        // Use the best display name from all variations
        const displayName = getBestDisplayName([...group.originalNames]);
        try {
            const biomarker = createConsolidatedBiomarker(group.results, displayName);
            if (biomarker) {
                // Use API-provided category if available (mapped to internal name), otherwise fall back to keyword matching
                let categoryName = group.apiCategory ? mapApiCategoryToInternal(group.apiCategory) : null;
                if (!categoryName) {
                    categoryName = getBiomarkerCategoryFromName(displayName) || 'General';
                }
                
                // Store the category on the biomarker for reference
                biomarker.category = categoryName;
                
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
                
                if (group.apiCategory) {
                    console.log(`📂 Categorized "${displayName}" as "${categoryName}" (from API)`);
                }
            }
        } catch (error) {
            console.warn(`⚠️ Error processing biomarker "${displayName}":`, error);
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
 * Create a consolidated biomarker object from multiple results
 * Combines all historical values into a single biomarker entry
 */
function createConsolidatedBiomarker(results, biomarkerName) {
    if (!results || results.length === 0) {
        return null;
    }
    
    // Sort by date descending (most recent first)
    results.sort((a, b) => 
        new Date(b.dateOfService || b.visitDate || 0) - 
        new Date(a.dateOfService || a.visitDate || 0)
    );
    
    const mostRecent = results[0];
    
    // Build historical values from ALL results with normalized dates
    const allHistoricalValues = results.map(r => ({
        date: normalizeDate(r.dateOfService || r.visitDate),
        value: r.testResult,
        unit: r.measurementUnits || '',
        status: r.testResultOutOfRange ? 'Out of Range' : 'In Range',
        inRange: !r.testResultOutOfRange,
        visitDate: normalizeDate(r.visitDate)
    })).filter(h => h.date); // Only include entries with valid dates
    
    // Deduplicate historical values with same date and value
    // This handles cases like "Omega 3 Total" and "Omega 3 Total / OmegaCheck" having identical entries
    const seenKeys = new Set();
    const historicalValues = allHistoricalValues.filter(h => {
        const key = `${h.date}|${h.value}`;
        if (seenKeys.has(key)) {
            return false; // Skip duplicate
        }
        seenKeys.add(key);
        return true;
    });
    
    const duplicatesRemoved = allHistoricalValues.length - historicalValues.length;
    if (duplicatesRemoved > 0) {
        console.log(`🔄 Deduplicated ${duplicatesRemoved} duplicate entries for "${biomarkerName}"`);
    }
    
    const biomarker = {
        name: biomarkerName,
        status: mostRecent.testResultOutOfRange ? 'Out of Range' : 'In Range',
        value: mostRecent.testResult || '',
        unit: mostRecent.measurementUnits || '',
        date: normalizeDate(mostRecent.dateOfService || mostRecent.visitDate) || '',
        referenceRange: mostRecent.questReferenceRange,
        questId: mostRecent.questBiomarkerId,
        source: 'Final API',
        historicalValues: historicalValues
    };
    
    console.log(`🧪 Consolidated biomarker: ${biomarker.name} = ${biomarker.value} ${biomarker.unit} (${biomarker.status}) [${historicalValues.length} historical values]`);
    return biomarker;
}

/**
 * Parse individual biomarker result from API response
 * Used for single-result extraction (extractCurrentResultsOnly)
 */
function parseBiomarkerResult(result) {
    if (!result || !result.biomarkerName) {
        console.warn('⚠️ Invalid biomarker result:', result);
        return null;
    }
    
    const status = result.testResultOutOfRange ? 'Out of Range' : 'In Range';
    const normalizedDate = normalizeDate(result.dateOfService || result.visitDate);
    
    const biomarker = {
        name: result.biomarkerName,
        status: status,
        value: result.testResult || '',
        unit: result.measurementUnits || '',
        date: normalizedDate || '',
        historicalValues: [],
        source: 'Final API',
        questId: result.questBiomarkerId,
        dateOfService: normalizeDate(result.dateOfService),
        visitDate: normalizeDate(result.visitDate),
        referenceRange: result.questReferenceRange
    };

    // Create historical entry for this result with consistent structure
    if (normalizedDate) {
        biomarker.historicalValues.push({
            date: normalizedDate,
            value: result.testResult,
            unit: result.measurementUnits || '',
            status: status,  // Include status string for consistency
            inRange: !result.testResultOutOfRange,
            visitDate: normalizeDate(result.visitDate)
        });
    }

    console.log(`🧪 Parsed biomarker: ${biomarker.name} = ${biomarker.value} ${biomarker.unit} (${biomarker.status}) [${biomarker.date}]`);
    return biomarker;
}

/**
 * Get biomarker category from biomarker name
 * Uses priority-based matching to avoid misclassification
 */
function getBiomarkerCategoryFromName(biomarkerName) {
    if (!biomarkerName) return 'General';
    
    const name = biomarkerName.toLowerCase();
    
    // HIGH PRIORITY: Check urinalysis suffix FIRST to avoid mismatches
    // e.g., "Hyaline Casts - Urine" should NOT match "ast" -> Liver
    if (name.includes('- urine') || name.endsWith(' urine')) {
        console.log(`📂 Categorized "${biomarkerName}" as "Urinalysis" (urine suffix)`);
        return 'Urinalysis';
    }
    
    // Electrolytes category
    const electrolytes = ['sodium', 'potassium', 'chloride', 'carbon dioxide', 'bicarbonate'];
    for (const e of electrolytes) {
        if (name === e || name.startsWith(e + ' ') || name.startsWith(e + ',')) {
            console.log(`📂 Categorized "${biomarkerName}" as "Electrolytes" (matched: ${e})`);
            return 'Electrolytes';
        }
    }
    
    // Enhanced categorization based on actual Function Health biomarker names
    // Using more specific matching to avoid false positives
    const categoryMap = {
        // Heart & Cardiovascular
        'cholesterol': 'Heart & Cardiovascular', 'hdl': 'Heart & Cardiovascular', 'ldl': 'Heart & Cardiovascular', 
        'triglyceride': 'Heart & Cardiovascular', 'apolipoprotein': 'Heart & Cardiovascular', 'lp-pla2': 'Heart & Cardiovascular',
        'lipoprotein': 'Heart & Cardiovascular', 'lp(a)': 'Heart & Cardiovascular',
        'pcad': 'Heart & Cardiovascular', 'pcec': 'Heart & Cardiovascular', 'oxldl': 'Heart & Cardiovascular',
        'trimethylamine': 'Heart & Cardiovascular', 'homocysteine': 'Heart & Cardiovascular',
        
        // Blood & Hematology (use more specific patterns)
        'hemoglobin': 'Blood & Hematology', 'hematocrit': 'Blood & Hematology', 'platelet': 'Blood & Hematology',
        'white blood cell': 'Blood & Hematology', 'red blood cell': 'Blood & Hematology', 
        'neutrophil': 'Blood & Hematology', 'lymphocyte': 'Blood & Hematology', 'monocyte': 'Blood & Hematology',
        'eosinophil': 'Blood & Hematology', 'basophil': 'Blood & Hematology', 'mcv': 'Blood & Hematology',
        'mch': 'Blood & Hematology', 'mchc': 'Blood & Hematology', 'rdw': 'Blood & Hematology', 'mpv': 'Blood & Hematology',
        'abo group': 'Blood & Hematology', 'blood type': 'Blood & Hematology', 'rhesus': 'Blood & Hematology', 'rh factor': 'Blood & Hematology',
        
        // Metabolic & Diabetes
        'glucose': 'Metabolic & Diabetes', 'insulin': 'Metabolic & Diabetes', 'hemoglobin a1c': 'Metabolic & Diabetes',
        'hba1c': 'Metabolic & Diabetes', 'adiponectin': 'Metabolic & Diabetes', 'uric acid': 'Metabolic & Diabetes',
        'c-peptide': 'Metabolic & Diabetes',
        
        // Kidney & Renal
        'creatinine': 'Kidney & Renal', 'kidney': 'Kidney & Renal', 'urea': 'Kidney & Renal', 'bun': 'Kidney & Renal',
        'egfr': 'Kidney & Renal', 'glomerular': 'Kidney & Renal', 'cystatin': 'Kidney & Renal',
        
        // Liver (use word boundaries to avoid matching "Hyaline Casts")
        'liver': 'Liver', 'alanine transaminase': 'Liver', 'aspartate aminotransferase': 'Liver', 
        'alkaline phosphatase': 'Liver', 'bilirubin': 'Liver', 'albumin': 'Liver', 
        'total protein': 'Liver', 'globulin': 'Liver', 'ggtp': 'Liver', 'ggt': 'Liver',
        'gamma-glutamyl': 'Liver', '(alt)': 'Liver', '(ast)': 'Liver', '(alp)': 'Liver',
        'albumin/globulin': 'Liver', 'a/g ratio': 'Liver',
        
        // Thyroid
        'thyroid': 'Thyroid', 'tsh': 'Thyroid', 'triiodothyronine': 'Thyroid', 'thyroxine': 'Thyroid',
        
        // Hormones
        'testosterone': 'Hormones', 'estradiol': 'Hormones', 'cortisol': 'Hormones', 'dhea': 'Hormones',
        'progesterone': 'Hormones', 'follicle stimulating': 'Hormones', 'luteinizing hormone': 'Hormones',
        'prolactin': 'Hormones', 'shbg': 'Hormones', 'sex hormone binding': 'Hormones',
        'androstenedione': 'Hormones', 'dihydrotestosterone': 'Hormones',
        'insulin-like growth factor': 'Hormones', 'igf-1': 'Hormones', 'igf': 'Hormones',
        
        // Nutrients & Vitamins (also matches API category "Nutrients")
        'vitamin': 'Nutrients', 'iron': 'Nutrients', 'calcium': 'Nutrients',
        'magnesium': 'Nutrients', 'zinc': 'Nutrients', 'b12': 'Nutrients',
        'folate': 'Nutrients', 'ferritin': 'Nutrients', 'omega': 'Nutrients',
        'arachidonic': 'Nutrients', 'epa': 'Nutrients', 'dha': 'Nutrients',
        'fatty acid': 'Nutrients', 'linoleic': 'Nutrients', 'alpha-linolenic': 'Nutrients',
        
        // Infectious Disease & STDs
        'herpes': 'Infectious Disease', 'hiv': 'Infectious Disease', 'chlamydia': 'Infectious Disease',
        'gonorrhoea': 'Infectious Disease', 'syphilis': 'Infectious Disease', 'trichomonas': 'Infectious Disease',
        'hepatitis': 'Infectious Disease',
        
        // Inflammation & Immune
        'c-reactive': 'Inflammation', 'crp': 'Inflammation', 'esr': 'Inflammation', 'sed rate': 'Inflammation',
        'fibrinogen': 'Inflammation', 'myeloperoxidase': 'Inflammation', 'ana': 'Inflammation',
        'antinuclear': 'Inflammation',
        
        // Environmental Toxins & Heavy Metals
        'mercury': 'Environmental Toxins', 'lead': 'Environmental Toxins', 'arsenic': 'Environmental Toxins',
        'cadmium': 'Environmental Toxins', 'thallium': 'Environmental Toxins', 'heavy metal': 'Environmental Toxins',
        
        // Autoimmunity
        'antibody': 'Autoimmunity', 'autoantibody': 'Autoimmunity', 'centromere': 'Autoimmunity',
        'anti-dsdna': 'Autoimmunity', 'anti-smith': 'Autoimmunity', 'scleroderma': 'Autoimmunity',
        'lupus': 'Autoimmunity', 'rheumatoid factor': 'Autoimmunity', 'sjogren': 'Autoimmunity',
        'jo-1': 'Autoimmunity', 'scl-70': 'Autoimmunity', 'ssa': 'Autoimmunity', 'ssb': 'Autoimmunity',
        'rnp': 'Autoimmunity', 'chromatin': 'Autoimmunity', 'ribosomal': 'Autoimmunity',
        'cardiolipin': 'Autoimmunity', 'phospholipid': 'Autoimmunity', 'beta-2 glycoprotein': 'Autoimmunity',
        
        // Reproductive Health (sex-specific)
        'prostate': 'Reproductive Health', 'psa': 'Reproductive Health',
        'ovarian': 'Reproductive Health', 'amh': 'Reproductive Health', 'anti-mullerian': 'Reproductive Health',
        
        // Pancreas
        'amylase': 'Pancreas', 'lipase': 'Pancreas', 'pancreas': 'Pancreas', 'pancreatic': 'Pancreas',
        
        // Stress & Aging
        'z score': 'Stress & Aging', 'dhea sulfate': 'Stress & Aging', 'dhea-s': 'Stress & Aging'
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
    
    // STEP 1: Build a GLOBAL lookup map of biomarker ID -> category/name
    // This scans ALL requisitions and visits FIRST before processing results
    const globalBiomarkerCategoryMap = new Map();
    const globalBiomarkerNameMap = new Map();
    
    if (Array.isArray(rawData)) {
        rawData.forEach(requisition => {
            if (requisition.visits && Array.isArray(requisition.visits)) {
                requisition.visits.forEach(visit => {
                    if (visit.biomarkers && Array.isArray(visit.biomarkers)) {
                        visit.biomarkers.forEach(entry => {
                            const biomarkerId = entry.biomarker?.id;
                            const category = entry.biomarker?.categories?.[0]?.categoryName || null;
                            const name = entry.biomarker?.name || '';
                            
                            if (biomarkerId) {
                                if (category && !globalBiomarkerCategoryMap.has(biomarkerId)) {
                                    globalBiomarkerCategoryMap.set(biomarkerId, category);
                                }
                                if (name && !globalBiomarkerNameMap.has(biomarkerId)) {
                                    globalBiomarkerNameMap.set(biomarkerId, name);
                                }
                            }
                        });
                    }
                });
            }
        });
    }
    
    console.log(`📂 Built global biomarker lookup: ${globalBiomarkerCategoryMap.size} categories`);
    
    // STEP 2: Now process all results using the global lookup map
    if (Array.isArray(rawData)) {
        rawData.forEach((requisition, reqIndex) => {
            console.log(`📋 Processing requisition ${reqIndex + 1} for current results`);
            
            if (requisition.visits && Array.isArray(requisition.visits)) {
                requisition.visits.forEach((visit, visitIndex) => {
                    // Check for biomarker entries with parent biomarker info (new API structure)
                    if (visit.biomarkers && Array.isArray(visit.biomarkers)) {
                        visit.biomarkers.forEach(entry => {
                            const apiCategory = entry.biomarker?.categories?.[0]?.categoryName || null;
                            const biomarkerName = entry.biomarker?.name || '';
                            
                            if (entry.biomarkerResults && Array.isArray(entry.biomarkerResults)) {
                                entry.biomarkerResults.forEach(result => {
                                    allBiomarkerResults.push({
                                        ...result,
                                        biomarkerName: result.biomarkerName || biomarkerName,
                                        apiCategory: apiCategory,
                                        visitDate: visit.visitDate,
                                        visitId: visit.id
                                    });
                                });
                            }
                        });
                    }
                    
                    // Also check for direct biomarkerResults (legacy structure)
                    if (visit.biomarkerResults && Array.isArray(visit.biomarkerResults)) {
                        visit.biomarkerResults.forEach(result => {
                            const alreadyAdded = allBiomarkerResults.some(r => 
                                r.id === result.id || 
                                (r.biomarkerName === result.biomarkerName && 
                                 r.dateOfService === result.dateOfService &&
                                 r.testResult === result.testResult)
                            );
                            
                            if (!alreadyAdded) {
                                // Use GLOBAL lookup map to find category
                                const biomarkerId = result.biomarkerId;
                                const apiCategory = biomarkerId ? globalBiomarkerCategoryMap.get(biomarkerId) : null;
                                const parentName = biomarkerId ? globalBiomarkerNameMap.get(biomarkerId) : null;
                                
                                allBiomarkerResults.push({
                                    ...result,
                                    biomarkerName: result.biomarkerName || parentName || '',
                                    apiCategory: apiCategory,
                                    visitDate: visit.visitDate,
                                    visitId: visit.id
                                });
                            }
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

    // Group by NORMALIZED biomarker name and get the most recent result for each
    // This handles variations like "Omega 3 Total" vs "Omega-3 Total" vs "Omega 3 Total / OmegaCheck"
    const biomarkerGroups = {};
    
    allBiomarkerResults.forEach(result => {
        const originalName = result.biomarkerName;
        if (!originalName) return;
        
        // Normalize biomarker name to handle variations
        const normalizedName = normalizeBiomarkerName(originalName);
        
        if (!biomarkerGroups[normalizedName]) {
            biomarkerGroups[normalizedName] = { 
                results: [], 
                apiCategory: null,
                originalNames: new Set()
            };
        }
        
        biomarkerGroups[normalizedName].results.push(result);
        biomarkerGroups[normalizedName].originalNames.add(originalName);
        
        // Capture API category if available
        if (!biomarkerGroups[normalizedName].apiCategory && result.apiCategory) {
            biomarkerGroups[normalizedName].apiCategory = result.apiCategory;
        }
    });
    
    console.log(`📊 Found ${Object.keys(biomarkerGroups).length} unique biomarkers after normalization`);
    
    // For each biomarker, get the most recent result
    const currentResults = [];
    
    Object.entries(biomarkerGroups).forEach(([normalizedName, group]) => {
        // Sort by date (most recent first)
        const sortedResults = group.results.sort((a, b) => {
            const dateA = new Date(a.dateOfService || a.visitDate || '1900-01-01');
            const dateB = new Date(b.dateOfService || b.visitDate || '1900-01-01');
            return dateB - dateA; // Most recent first
        });
        
        const mostRecent = sortedResults[0];
        // Use the best display name from all variations
        const displayName = getBestDisplayName([...group.originalNames]);
        mostRecent.biomarkerName = displayName; // Use clean display name
        mostRecent.apiCategory = group.apiCategory;
        currentResults.push(mostRecent);
        
        const variantCount = group.originalNames.size;
        if (variantCount > 1) {
            console.log(`📅 ${displayName}: Merged ${variantCount} name variants, using result from ${mostRecent.dateOfService || mostRecent.visitDate}`);
        } else {
            console.log(`📅 ${displayName}: Using result from ${mostRecent.dateOfService || mostRecent.visitDate} (${sortedResults.length} total results available)`);
        }
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
                
                // Use API-provided category if available (mapped to internal name), otherwise fall back to keyword matching
                let categoryName = result.apiCategory ? mapApiCategoryToInternal(result.apiCategory) : null;
                if (!categoryName) {
                    categoryName = getBiomarkerCategoryFromName(result.biomarkerName) || 'General';
                }
                
                // Store the category on the biomarker
                biomarker.category = categoryName;
                
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
                
                const categorySource = result.apiCategory ? 'from API' : 'from keywords';
                console.log(`✅ Added: ${normalizedName} to "${categoryName}" (${categorySource})`);
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
