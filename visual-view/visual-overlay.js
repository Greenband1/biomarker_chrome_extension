const STATUS_COLORS = {
    'In Range': '#30c48d',
    'Out of Range': '#f77070',
    'Improving': '#f7b267',
    'Unknown': '#a0a4b8'
};

const BAND_COLORS = {
    above: 'rgba(247, 112, 112, 0.09)',
    inRange: 'rgba(48, 196, 141, 0.12)',
    below: 'rgba(247, 178, 103, 0.09)'
};

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
    
    // Normalize spacing around colons
    normalized = normalized.replace(/\s*:\s*/g, ': ');
    
    return normalized.trim();
}

/**
 * Get the best display name from a group of name variations (prefer shorter, cleaner name)
 */
function getBestDisplayName(names) {
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

// Biomarker information for tooltips
const BIOMARKER_INFO = {
    // Blood Sugar / Metabolic
    'Glucose': { what: 'Blood sugar level (fasting)', why: 'Indicates diabetes risk and metabolic health', affects: 'Diet, exercise, stress, sleep' },
    'Hemoglobin A1c': { what: 'Average blood sugar over 2-3 months', why: 'Long-term diabetes indicator', affects: 'Diet, exercise, medication' },
    'HbA1c': { what: 'Average blood sugar over 2-3 months', why: 'Long-term diabetes indicator', affects: 'Diet, exercise, medication' },
    'Insulin': { what: 'Hormone that regulates blood sugar', why: 'Insulin resistance indicator', affects: 'Diet, weight, activity level' },
    
    // Cholesterol / Lipids
    'Total Cholesterol': { what: 'Total blood cholesterol', why: 'Cardiovascular disease risk', affects: 'Diet, exercise, genetics' },
    'LDL Cholesterol': { what: 'Bad cholesterol', why: 'Higher levels increase heart disease risk', affects: 'Saturated fat, exercise, weight' },
    'HDL Cholesterol': { what: 'Good cholesterol', why: 'Higher levels protect against heart disease', affects: 'Exercise, healthy fats, not smoking' },
    'Triglycerides': { what: 'Fat in the blood', why: 'High levels increase heart disease risk', affects: 'Sugar intake, alcohol, refined carbs' },
    
    // Liver
    'ALT': { what: 'Liver enzyme (alanine aminotransferase)', why: 'Liver damage indicator', affects: 'Alcohol, medications, fatty liver' },
    'AST': { what: 'Liver enzyme (aspartate aminotransferase)', why: 'Liver or muscle damage indicator', affects: 'Alcohol, medications, exercise' },
    'ALP': { what: 'Alkaline phosphatase enzyme', why: 'Liver or bone disorders', affects: 'Liver disease, bone conditions' },
    'Bilirubin': { what: 'Bile pigment from red blood cell breakdown', why: 'Liver function indicator', affects: 'Liver disease, hemolysis' },
    'GGT': { what: 'Gamma-glutamyl transferase enzyme', why: 'Liver and bile duct health', affects: 'Alcohol, medications, liver disease' },
    
    // Kidney
    'Creatinine': { what: 'Waste product from muscle metabolism', why: 'Kidney function indicator', affects: 'Kidney disease, muscle mass, hydration' },
    'BUN': { what: 'Blood urea nitrogen', why: 'Kidney and liver function', affects: 'Protein intake, kidney function, hydration' },
    'eGFR': { what: 'Estimated glomerular filtration rate', why: 'Kidney filtering capacity', affects: 'Age, kidney disease, diabetes' },
    
    // Thyroid
    'TSH': { what: 'Thyroid-stimulating hormone', why: 'Thyroid function regulator', affects: 'Thyroid disorders, iodine, stress' },
    'T3': { what: 'Active thyroid hormone (triiodothyronine)', why: 'Metabolism and energy regulator', affects: 'Thyroid health, selenium, stress' },
    'T4': { what: 'Primary thyroid hormone (thyroxine)', why: 'Metabolism and development', affects: 'Thyroid health, iodine intake' },
    'Free T4': { what: 'Unbound thyroxine hormone', why: 'Available thyroid hormone', affects: 'Thyroid disorders, medications' },
    'Free T3': { what: 'Unbound triiodothyronine hormone', why: 'Active metabolism hormone', affects: 'Thyroid health, conversion issues' },
    
    // Blood Cells
    'Hemoglobin': { what: 'Oxygen-carrying protein in red blood cells', why: 'Anemia indicator', affects: 'Iron, B12, folate, blood loss' },
    'Hematocrit': { what: 'Red blood cell volume percentage', why: 'Blood concentration indicator', affects: 'Hydration, anemia, altitude' },
    'RBC': { what: 'Red blood cell count', why: 'Oxygen delivery capacity', affects: 'Iron, B12, bone marrow health' },
    'WBC': { what: 'White blood cell count', why: 'Immune system activity', affects: 'Infections, inflammation, stress' },
    'Platelets': { what: 'Blood clotting cell fragments', why: 'Clotting ability', affects: 'Bone marrow, medications, infections' },
    
    // Inflammation
    'CRP': { what: 'C-reactive protein', why: 'General inflammation marker', affects: 'Infection, chronic disease, lifestyle' },
    'hs-CRP': { what: 'High-sensitivity C-reactive protein', why: 'Heart disease risk marker', affects: 'Diet, exercise, chronic inflammation' },
    'ESR': { what: 'Erythrocyte sedimentation rate', why: 'Inflammation and infection marker', affects: 'Autoimmune conditions, infections' },
    
    // Vitamins & Minerals
    'Vitamin D': { what: '25-hydroxyvitamin D level', why: 'Bone health, immune function', affects: 'Sun exposure, supplements, diet' },
    'Vitamin B12': { what: 'Cobalamin level', why: 'Nerve function, red blood cells', affects: 'Diet, absorption, age' },
    'Folate': { what: 'Folic acid / vitamin B9', why: 'Cell growth, DNA synthesis', affects: 'Leafy greens, fortified foods' },
    'Ferritin': { what: 'Iron storage protein', why: 'Iron reserves indicator', affects: 'Diet, blood loss, inflammation' },
    'Iron': { what: 'Serum iron level', why: 'Oxygen transport capacity', affects: 'Diet, absorption, blood loss' },
    'Magnesium': { what: 'Essential mineral level', why: 'Muscle, nerve, heart function', affects: 'Diet, medications, alcohol' },
    
    // Hormones
    'Testosterone': { what: 'Primary male sex hormone', why: 'Muscle, bone, mood, libido', affects: 'Age, sleep, exercise, stress' },
    'Estradiol': { what: 'Primary female sex hormone', why: 'Reproductive health, bone density', affects: 'Menstrual cycle, age, weight' },
    'Cortisol': { what: 'Stress hormone', why: 'Stress response, metabolism', affects: 'Stress, sleep, time of day' },
    'DHEA-S': { what: 'Adrenal hormone precursor', why: 'Hormone production, aging', affects: 'Age, adrenal function, stress' },
    
    // Infectious Disease
    'ANA': { what: 'Antinuclear antibodies', why: 'Autoimmune disease screening', affects: 'Autoimmune conditions, medications' },
    'ANA Titer': { what: 'Antinuclear antibody concentration', why: 'Autoimmune activity level', affects: 'Autoimmune disease activity' },
    'ANA Pattern': { what: 'Pattern of antinuclear antibodies', why: 'Type of autoimmune condition', affects: 'Specific autoimmune diseases' }
};

/**
 * Get biomarker info for tooltip, with fallback for unknown biomarkers
 */
function getBiomarkerInfo(name) {
    // Check for exact match
    if (BIOMARKER_INFO[name]) {
        return BIOMARKER_INFO[name];
    }
    
    // Check for partial matches
    const lowerName = name.toLowerCase();
    for (const [key, info] of Object.entries(BIOMARKER_INFO)) {
        if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
            return info;
        }
    }
    
    // Return generic fallback
    return {
        what: 'Health biomarker',
        why: 'Part of your health profile',
        affects: 'Various lifestyle factors'
    };
}

// Category icons using SVG for crisp rendering
const CATEGORY_ICONS = {
    'Heart & Cardiovascular': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    'Liver': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
    'Kidney & Renal': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>',
    'Blood & Hematology': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z"/></svg>',
    'Thyroid': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
    'Hormones': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>',
    'Metabolic & Diabetes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>',
    'Infectious Disease': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>',
    'Nutrients & Vitamins': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>',
    'Nutrients': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>',
    'Inflammation': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>',
    'Electrolytes': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm0-2h2V7h-2z"/></svg>',
    'Urinalysis': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>',
    'Environmental Toxins': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
    'Autoimmunity': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>',
    'General': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>'
};

/**
 * Generate a human-readable progress narrative for a biomarker
 */
function generateProgressNarrative(events, classification) {
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

/**
 * Get the status category for a biomarker (for filtering)
 */
function getBiomarkerStatusCategory(biomarker, selectedDates) {
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

/**
 * Compute metrics from the dataset for the dashboard
 */
function computeDatasetMetrics(dataset, selectedCategories, selectedDates) {
    let totalBiomarkers = 0;
    let inRange = 0;
    let outOfRange = 0;
    let improving = 0;

    Object.entries(dataset.categories).forEach(([categoryName, category]) => {
        if (!selectedCategories.has(categoryName)) return;
        if (!Array.isArray(category?.biomarkers)) return;

        const consolidatedBiomarkers = consolidateBiomarkersByName(category.biomarkers);
        
        consolidatedBiomarkers.forEach(biomarker => {
            const filteredHistorical = biomarker.historicalValues.filter(hv => 
                selectedDates.has(normalizeDate(hv.date))
            );
            if (filteredHistorical.length === 0) return;

            totalBiomarkers++;
            const events = buildTimelineEvents({ ...biomarker, historicalValues: filteredHistorical });
            const status = determineBiomarkerStatus(events);
            
            if (status === 'In Range') {
                inRange++;
            } else if (status === 'Out of Range') {
                outOfRange++;
            } else if (status === 'Improving') {
                improving++;
                // Improving also counts as in-range for the latest value
            }

            // Check for improving: was out-of-range, now in-range
            if (events.length >= 2) {
                const latest = events[events.length - 1];
                const previous = events[events.length - 2];
                if (latest.isInRange && !previous.isInRange) {
                    // Count as improving even if not caught by status
                    if (status !== 'Improving') {
                        improving++;
                    }
                }
            }
        });
    });

    const healthScore = totalBiomarkers > 0 
        ? Math.round((inRange / totalBiomarkers) * 100) 
        : 0;

    return { totalBiomarkers, inRange, outOfRange, improving, healthScore };
}

/**
 * Create the metrics dashboard element
 */
function createMetricsDashboard(metrics) {
    const dashboard = document.createElement('div');
    dashboard.className = 'fh-metrics-dashboard';

    const metricsData = [
        { label: 'Total Tested', value: metrics.totalBiomarkers, icon: '📊', className: '' },
        { label: 'In Range', value: metrics.inRange, icon: '✓', className: 'fh-metric--success' },
        { label: 'Out of Range', value: metrics.outOfRange, icon: '!', className: 'fh-metric--danger' },
        { label: 'Improving', value: metrics.improving, icon: '↗', className: 'fh-metric--warning' },
        { label: 'Health Score', value: `${metrics.healthScore}%`, icon: '♥', className: 'fh-metric--score' }
    ];

    metricsData.forEach(({ label, value, icon, className }) => {
        const card = document.createElement('div');
        card.className = `fh-metric-card ${className}`;

        const iconEl = document.createElement('span');
        iconEl.className = 'fh-metric-icon';
        iconEl.textContent = icon;

        const valueEl = document.createElement('span');
        valueEl.className = 'fh-metric-value';
        valueEl.textContent = value;

        const labelEl = document.createElement('span');
        labelEl.className = 'fh-metric-label';
        labelEl.textContent = label;

        card.appendChild(iconEl);
        card.appendChild(valueEl);
        card.appendChild(labelEl);
        dashboard.appendChild(card);
    });

    return dashboard;
}

/**
 * Get category icon HTML, with fallback for unknown categories
 */
function getCategoryIcon(categoryName) {
    // Check for exact match first
    if (CATEGORY_ICONS[categoryName]) {
        return CATEGORY_ICONS[categoryName];
    }
    // Check for partial matches
    const lowerName = categoryName.toLowerCase();
    if (lowerName.includes('heart') || lowerName.includes('cardio')) {
        return CATEGORY_ICONS['Heart & Cardiovascular'];
    }
    if (lowerName.includes('liver')) {
        return CATEGORY_ICONS['Liver'];
    }
    if (lowerName.includes('kidney') || lowerName.includes('renal')) {
        return CATEGORY_ICONS['Kidney & Renal'];
    }
    if (lowerName.includes('blood') || lowerName.includes('hematology')) {
        return CATEGORY_ICONS['Blood & Hematology'];
    }
    if (lowerName.includes('thyroid')) {
        return CATEGORY_ICONS['Thyroid'];
    }
    if (lowerName.includes('hormone')) {
        return CATEGORY_ICONS['Hormones'];
    }
    if (lowerName.includes('metabolic') || lowerName.includes('diabetes')) {
        return CATEGORY_ICONS['Metabolic & Diabetes'];
    }
    if (lowerName.includes('infectious') || lowerName.includes('disease')) {
        return CATEGORY_ICONS['Infectious Disease'];
    }
    if (lowerName.includes('nutrient') || lowerName.includes('vitamin')) {
        return CATEGORY_ICONS['Nutrients'];
    }
    if (lowerName.includes('inflam')) {
        return CATEGORY_ICONS['Inflammation'];
    }
    if (lowerName.includes('electrolyte')) {
        return CATEGORY_ICONS['Electrolytes'];
    }
    if (lowerName.includes('urin')) {
        return CATEGORY_ICONS['Urinalysis'];
    }
    // Default icon
    return CATEGORY_ICONS['General'];
}

const VisualOverlay = {
    container: null,
    content: null,
    header: null,
    dataCache: null,
    categoryDropdown: null,
    dateDropdown: null,
    statusDropdown: null,
    selectedCategories: null,
    selectedDates: null,
    selectedStatuses: null,
    categoryDropdownOpen: false,
    dateDropdownOpen: false,
    statusDropdownOpen: false,

    open(payload) {
        if (!payload || !payload.dataset) {
            console.warn('[FH Visual View] Missing payload for overlay');
            return;
        }
        this.dataCache = payload;
        this.ensureOverlay();
        this.render();
        requestAnimationFrame(() => {
            this.container.classList.add('fh-visual-overlay--open');
            this.container.focus({ preventScroll: true });
        });
        document.body.classList.add('fh-visual-no-scroll');
    },

    ensureOverlay() {
        if (this.container) return;

        injectStyles();

        const overlay = document.createElement('div');
        overlay.className = 'fh-visual-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.tabIndex = -1;
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                this.close();
            }
        });

        const panel = document.createElement('div');
        panel.className = 'fh-visual-panel';

        const header = document.createElement('header');
        header.className = 'fh-visual-header';

        const title = document.createElement('h2');
        title.textContent = 'Biomarker Trends';

        const controls = document.createElement('div');
        controls.className = 'fh-header-controls';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'fh-visual-close';
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Close visual results view');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => this.close());

        header.appendChild(title);
        header.appendChild(controls);
        header.appendChild(closeBtn);
        panel.appendChild(header);
        
        this.header = header;
        this.headerControls = controls;

        const body = document.createElement('div');
        body.className = 'fh-visual-body';

        const content = document.createElement('div');
        content.className = 'fh-visual-content';

        body.appendChild(content);
        panel.appendChild(body);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        document.addEventListener('keydown', this.handleKeydown);
        document.addEventListener('click', (event) => {
            if (this.categoryDropdownOpen && this.categoryDropdown && !this.categoryDropdown.contains(event.target) && !this.categoryButton?.contains(event.target)) {
                this.closeCategoryDropdown();
            }
            if (this.dateDropdownOpen && this.dateDropdown && !this.dateDropdown.contains(event.target) && !this.dateButton?.contains(event.target)) {
                this.closeDateDropdown();
            }
            if (this.statusDropdownOpen && this.statusDropdown && !this.statusDropdown.contains(event.target) && !this.statusButton?.contains(event.target)) {
                this.closeStatusDropdown();
            }
        });

        this.container = overlay;
        this.content = content;
    },

    render() {
        if (!this.dataCache || !this.content) return;
        const { dataset, filtersApplied, latestOnly } = this.dataCache;

        if (!this.selectedCategories) {
            this.selectedCategories = new Set(Object.keys(dataset.categories));
        }
        
        if (!this.selectedDates) {
            this.selectedDates = new Set(extractAllDates(dataset));
        }

        if (!this.selectedStatuses) {
            this.selectedStatuses = new Set(['in-range', 'out-of-range', 'improving']);
        }

        this.renderHeaderControls(dataset);
        this.renderCards(dataset);
    },

    renderHeaderControls(dataset) {
        if (!this.headerControls) return;
        
        // Only render once
        if (this.categoryButton && this.dateButton && this.statusButton) {
            this.updateCategoryButton(dataset);
            this.updateDateButton(dataset);
            this.updateStatusButton();
            return;
        }
        
        this.headerControls.innerHTML = '';

        // Category dropdown control
        const categoryControl = document.createElement('div');
        categoryControl.className = 'fh-header-control';

        const categoryLabel = document.createElement('span');
        categoryLabel.textContent = 'Categories';

        const categoryButton = document.createElement('button');
        categoryButton.type = 'button';
        categoryButton.className = 'fh-header-select';
        categoryButton.textContent = 'All categories';
        categoryButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleCategoryDropdown(dataset, categoryButton);
        });

        categoryControl.appendChild(categoryLabel);
        categoryControl.appendChild(categoryButton);

        // Date dropdown control
        const dateControl = document.createElement('div');
        dateControl.className = 'fh-header-control';

        const dateLabel = document.createElement('span');
        dateLabel.textContent = 'Test Dates';

        const dateButton = document.createElement('button');
        dateButton.type = 'button';
        dateButton.className = 'fh-header-select';
        dateButton.textContent = 'All dates';
        dateButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleDateDropdown(dataset, dateButton);
        });

        dateControl.appendChild(dateLabel);
        dateControl.appendChild(dateButton);

        // Status dropdown control
        const statusControl = document.createElement('div');
        statusControl.className = 'fh-header-control';

        const statusLabel = document.createElement('span');
        statusLabel.textContent = 'Status';

        const statusButton = document.createElement('button');
        statusButton.type = 'button';
        statusButton.className = 'fh-header-select';
        statusButton.textContent = 'All statuses';
        statusButton.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleStatusDropdown(dataset, statusButton);
        });

        statusControl.appendChild(statusLabel);
        statusControl.appendChild(statusButton);

        // Print report button
        const printButton = document.createElement('button');
        printButton.type = 'button';
        printButton.className = 'fh-print-button';
        printButton.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg> Print Report';
        printButton.addEventListener('click', () => {
            this.generatePrintReport(dataset);
        });

        this.headerControls.appendChild(categoryControl);
        this.headerControls.appendChild(dateControl);
        this.headerControls.appendChild(statusControl);
        this.headerControls.appendChild(printButton);

        this.categoryButton = categoryButton;
        this.dateButton = dateButton;
        this.statusButton = statusButton;
        this.printButton = printButton;
        this.categoryControl = categoryControl;
        this.dateControl = dateControl;
        this.statusControl = statusControl;
        
        this.updateCategoryButton(dataset);
        this.updateDateButton(dataset);
        this.updateStatusButton();
    },

    toggleCategoryDropdown(dataset, anchorButton) {
        if (this.categoryDropdownOpen) {
            this.closeCategoryDropdown();
            return;
        }
        
        if (this.dateDropdownOpen) {
            this.closeDateDropdown();
        }
        if (this.statusDropdownOpen) {
            this.closeStatusDropdown();
        }
        
        const dropdown = document.createElement('div');
        dropdown.className = 'fh-header-dropdown';

        const actions = document.createElement('div');
        actions.className = 'fh-dropdown-actions';

        const selectAllBtn = document.createElement('button');
        selectAllBtn.type = 'button';
        selectAllBtn.textContent = 'Select all';
        selectAllBtn.addEventListener('click', () => {
            categories.forEach((cat) => this.selectedCategories.add(cat));
            this.updateCategoryButton(dataset);
            this.renderCards(dataset);
            buildList();
        });

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = 'Clear';
        clearBtn.addEventListener('click', () => {
            this.selectedCategories.clear();
            this.updateCategoryButton(dataset);
            this.renderCards(dataset);
            buildList();
        });
        
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'fh-dropdown-close';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close dropdown');
        closeBtn.addEventListener('click', () => {
            this.closeCategoryDropdown();
        });

        actions.appendChild(selectAllBtn);
        actions.appendChild(clearBtn);
        actions.appendChild(closeBtn);

        const list = document.createElement('div');
        list.className = 'fh-dropdown-list';

        const categories = Object.keys(dataset.categories).sort((a, b) => a.localeCompare(b));

        const buildList = () => {
            list.innerHTML = '';
            categories.forEach((name) => {
                const item = document.createElement('label');
                item.className = 'fh-dropdown-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = this.selectedCategories.has(name);
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        this.selectedCategories.add(name);
                    } else {
                        this.selectedCategories.delete(name);
                    }
                    this.updateCategoryButton(dataset);
                    this.renderCards(dataset);
                });

                item.appendChild(checkbox);
                const span = document.createElement('span');
                span.textContent = name;
                item.appendChild(span);
                list.appendChild(item);
            });
        };

        dropdown.appendChild(actions);
        dropdown.appendChild(list);

        anchorButton.parentElement.appendChild(dropdown);
        this.categoryDropdown = dropdown;
        this.categoryDropdownOpen = true;
        buildList();
    },

    toggleDateDropdown(dataset, anchorButton) {
        if (this.dateDropdownOpen) {
            this.closeDateDropdown();
            return;
        }
        
        if (this.categoryDropdownOpen) {
            this.closeCategoryDropdown();
        }
        if (this.statusDropdownOpen) {
            this.closeStatusDropdown();
        }
        
        const dropdown = document.createElement('div');
        dropdown.className = 'fh-header-dropdown';

        const actions = document.createElement('div');
        actions.className = 'fh-dropdown-actions';

        const selectAllBtn = document.createElement('button');
        selectAllBtn.type = 'button';
        selectAllBtn.textContent = 'Select all';
        selectAllBtn.addEventListener('click', () => {
            allDates.forEach((d) => this.selectedDates.add(d));
            this.updateDateButton(dataset);
            this.renderCards(dataset);
            list.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        });

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = 'Clear';
        clearBtn.addEventListener('click', () => {
            this.selectedDates.clear();
            this.updateDateButton(dataset);
            this.renderCards(dataset);
            list.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        });
        
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'fh-dropdown-close';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close dropdown');
        closeBtn.addEventListener('click', () => {
            this.closeDateDropdown();
        });

        actions.appendChild(selectAllBtn);
        actions.appendChild(clearBtn);
        actions.appendChild(closeBtn);

        const list = document.createElement('div');
        list.className = 'fh-dropdown-list';

        const allDates = extractAllDates(dataset).sort((a, b) => new Date(b) - new Date(a));

        allDates.forEach((date) => {
            const item = document.createElement('label');
            item.className = 'fh-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.selectedDates.has(date);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedDates.add(date);
                } else {
                    this.selectedDates.delete(date);
                }
                this.updateDateButton(dataset);
                this.renderCards(dataset);
            });

            item.appendChild(checkbox);
            const span = document.createElement('span');
            span.textContent = formatDisplayDate(date);
            item.appendChild(span);
            list.appendChild(item);
        });

        dropdown.appendChild(actions);
        dropdown.appendChild(list);

        anchorButton.parentElement.appendChild(dropdown);
        this.dateDropdown = dropdown;
        this.dateDropdownOpen = true;
    },

    closeCategoryDropdown() {
        if (!this.categoryDropdown) return;
        this.categoryDropdown.remove();
        this.categoryDropdown = null;
        this.categoryDropdownOpen = false;
    },
    
    closeDateDropdown() {
        if (!this.dateDropdown) return;
        this.dateDropdown.remove();
        this.dateDropdown = null;
        this.dateDropdownOpen = false;
    },

    updateCategoryButton(dataset) {
        const categories = Object.keys(dataset.categories).sort((a, b) => a.localeCompare(b));

        if (this.categoryButton) {
            let label;
            if (this.selectedCategories.size === 0) {
                label = 'None selected';
            } else if (this.selectedCategories.size === categories.length) {
                label = 'All categories';
            } else {
                label = `${this.selectedCategories.size} selected`;
            }
            this.categoryButton.textContent = label;
        }
    },
    
    updateDateButton(dataset) {
        const allDates = extractAllDates(dataset);

        if (this.dateButton) {
            let label;
            if (this.selectedDates.size === 0) {
                label = 'None selected';
            } else if (this.selectedDates.size === allDates.length) {
                label = 'All dates';
            } else {
                label = `${this.selectedDates.size} selected`;
            }
            this.dateButton.textContent = label;
        }
    },

    toggleStatusDropdown(dataset, anchorButton) {
        if (this.statusDropdownOpen) {
            this.closeStatusDropdown();
            return;
        }
        
        if (this.categoryDropdownOpen) {
            this.closeCategoryDropdown();
        }
        if (this.dateDropdownOpen) {
            this.closeDateDropdown();
        }
        
        const dropdown = document.createElement('div');
        dropdown.className = 'fh-header-dropdown fh-status-dropdown';

        const actions = document.createElement('div');
        actions.className = 'fh-dropdown-actions';

        const selectAllBtn = document.createElement('button');
        selectAllBtn.type = 'button';
        selectAllBtn.textContent = 'Select all';
        selectAllBtn.addEventListener('click', () => {
            this.selectedStatuses = new Set(['in-range', 'out-of-range', 'improving']);
            this.updateStatusButton();
            this.renderCards(dataset);
            buildList();
        });

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.textContent = 'Clear';
        clearBtn.addEventListener('click', () => {
            this.selectedStatuses.clear();
            this.updateStatusButton();
            this.renderCards(dataset);
            buildList();
        });
        
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => {
            this.closeStatusDropdown();
        });

        actions.appendChild(selectAllBtn);
        actions.appendChild(clearBtn);
        actions.appendChild(closeBtn);

        const list = document.createElement('div');
        list.className = 'fh-dropdown-list';

        const statusOptions = [
            { id: 'in-range', label: 'In Range', color: '#30c48d' },
            { id: 'out-of-range', label: 'Out of Range', color: '#f77070' },
            { id: 'improving', label: 'Improving', color: '#f7b267' }
        ];

        const buildList = () => {
            list.innerHTML = '';
            statusOptions.forEach(({ id, label, color }) => {
                const item = document.createElement('label');
                item.className = 'fh-dropdown-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = this.selectedStatuses.has(id);
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        this.selectedStatuses.add(id);
                    } else {
                        this.selectedStatuses.delete(id);
                    }
                    this.updateStatusButton();
                    this.renderCards(dataset);
                });

                const indicator = document.createElement('span');
                indicator.className = 'fh-status-indicator';
                indicator.style.background = color;

                const text = document.createElement('span');
                text.textContent = label;

                item.appendChild(checkbox);
                item.appendChild(indicator);
                item.appendChild(text);
                list.appendChild(item);
            });
        };

        buildList();
        dropdown.appendChild(actions);
        dropdown.appendChild(list);
        
        this.statusControl.appendChild(dropdown);
        this.statusDropdown = dropdown;
        this.statusDropdownOpen = true;
    },

    closeStatusDropdown() {
        if (!this.statusDropdown) return;
        this.statusDropdown.remove();
        this.statusDropdown = null;
        this.statusDropdownOpen = false;
    },

    updateStatusButton() {
        if (this.statusButton) {
            let label;
            if (this.selectedStatuses.size === 0) {
                label = 'None selected';
            } else if (this.selectedStatuses.size === 3) {
                label = 'All statuses';
            } else {
                const labels = [];
                if (this.selectedStatuses.has('in-range')) labels.push('In Range');
                if (this.selectedStatuses.has('out-of-range')) labels.push('Out of Range');
                if (this.selectedStatuses.has('improving')) labels.push('Improving');
                label = labels.join(', ');
            }
            this.statusButton.textContent = label;
        }
    },

    generatePrintReport(dataset) {
        const metrics = computeDatasetMetrics(dataset, this.selectedCategories, this.selectedDates);
        const reportDate = new Date().toLocaleDateString(undefined, { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });

        // Collect biomarker data by category
        const categorizedData = [];
        const outOfRangeBiomarkers = [];

        Object.entries(dataset.categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([categoryName, category]) => {
                if (!this.selectedCategories.has(categoryName)) return;
                if (!Array.isArray(category?.biomarkers)) return;

                const consolidatedBiomarkers = consolidateBiomarkersByName(category.biomarkers);
                const biomarkersData = [];

                consolidatedBiomarkers.forEach(biomarker => {
                    const filteredHistorical = biomarker.historicalValues.filter(hv => 
                        this.selectedDates.has(normalizeDate(hv.date))
                    );
                    if (filteredHistorical.length === 0) return;

                    const events = buildTimelineEvents({ ...biomarker, historicalValues: filteredHistorical });
                    const status = determineBiomarkerStatus(events);
                    const latest = events[events.length - 1];

                    const biomarkerInfo = {
                        name: biomarker.name,
                        value: formatValue(latest.value, latest.unit),
                        status: status,
                        reference: biomarker.referenceRange || 'N/A',
                        date: formatDisplayDate(latest.date)
                    };

                    biomarkersData.push(biomarkerInfo);

                    if (status === 'Out of Range') {
                        outOfRangeBiomarkers.push({
                            ...biomarkerInfo,
                            category: categoryName
                        });
                    }
                });

                if (biomarkersData.length > 0) {
                    categorizedData.push({
                        name: categoryName,
                        biomarkers: biomarkersData
                    });
                }
            });

        // Generate print HTML
        const printHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Health Report - ${reportDate}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1f2a44;
            line-height: 1.5;
            padding: 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 2px solid #667eea;
        }
        .header h1 {
            font-size: 28px;
            color: #2e3658;
            margin-bottom: 8px;
        }
        .header .date {
            font-size: 14px;
            color: #6a7395;
        }
        .summary {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 32px;
            padding: 20px;
            background: #f6f7fb;
            border-radius: 12px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-value {
            font-size: 28px;
            font-weight: 700;
        }
        .summary-label {
            font-size: 12px;
            color: #6a7395;
            text-transform: uppercase;
        }
        .summary-value.green { color: #1c8f63; }
        .summary-value.red { color: #c94545; }
        .summary-value.amber { color: #b87d0a; }
        .summary-value.purple { color: #5a67ba; }
        
        .attention-section {
            margin-bottom: 32px;
            padding: 20px;
            background: rgba(247, 112, 112, 0.08);
            border-radius: 12px;
            border: 1px solid rgba(247, 112, 112, 0.2);
        }
        .attention-section h2 {
            font-size: 16px;
            color: #c94545;
            margin-bottom: 12px;
        }
        .attention-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(247, 112, 112, 0.15);
        }
        .attention-item:last-child { border-bottom: none; }
        .attention-name { font-weight: 600; }
        .attention-category { font-size: 12px; color: #6a7395; }
        .attention-value { color: #c94545; font-weight: 600; }
        
        .category {
            margin-bottom: 24px;
            page-break-inside: avoid;
        }
        .category h2 {
            font-size: 16px;
            color: #2e3658;
            padding: 8px 0;
            border-bottom: 1px solid #e8eaf3;
            margin-bottom: 12px;
        }
        .biomarker-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .biomarker-table th {
            text-align: left;
            padding: 8px;
            background: #f6f7fb;
            color: #3d4a7a;
            font-weight: 600;
        }
        .biomarker-table td {
            padding: 8px;
            border-bottom: 1px solid #e8eaf3;
        }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        .status-in-range { background: rgba(48, 196, 141, 0.15); color: #1c8f63; }
        .status-out-of-range { background: rgba(247, 112, 112, 0.15); color: #c94545; }
        .status-improving { background: rgba(247, 178, 103, 0.15); color: #b87d0a; }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #6a7395;
            padding-top: 20px;
            border-top: 1px solid #e8eaf3;
        }
        
        @media print {
            body { padding: 20px; }
            .category { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Health Biomarker Report</h1>
        <div class="date">Generated on ${reportDate}</div>
    </div>
    
    <div class="summary">
        <div class="summary-item">
            <div class="summary-value">${metrics.totalBiomarkers}</div>
            <div class="summary-label">Total Tested</div>
        </div>
        <div class="summary-item">
            <div class="summary-value green">${metrics.inRange}</div>
            <div class="summary-label">In Range</div>
        </div>
        <div class="summary-item">
            <div class="summary-value red">${metrics.outOfRange}</div>
            <div class="summary-label">Out of Range</div>
        </div>
        <div class="summary-item">
            <div class="summary-value amber">${metrics.improving}</div>
            <div class="summary-label">Improving</div>
        </div>
        <div class="summary-item">
            <div class="summary-value purple">${metrics.healthScore}%</div>
            <div class="summary-label">Health Score</div>
        </div>
    </div>

    ${outOfRangeBiomarkers.length > 0 ? `
    <div class="attention-section">
        <h2>⚠️ Biomarkers Requiring Attention</h2>
        ${outOfRangeBiomarkers.map(b => `
            <div class="attention-item">
                <div>
                    <span class="attention-name">${b.name}</span>
                    <span class="attention-category"> - ${b.category}</span>
                </div>
                <div class="attention-value">${b.value}</div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${categorizedData.map(cat => `
    <div class="category">
        <h2>${cat.name}</h2>
        <table class="biomarker-table">
            <thead>
                <tr>
                    <th>Biomarker</th>
                    <th>Value</th>
                    <th>Reference Range</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${cat.biomarkers.map(b => `
                <tr>
                    <td>${b.name}</td>
                    <td>${b.value}</td>
                    <td>${b.reference}</td>
                    <td><span class="status-badge status-${normalizeStatus(b.status)}">${b.status}</span></td>
                    <td>${b.date}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `).join('')}

    <div class="footer">
        <p>This report is for informational purposes only. Please consult with your healthcare provider for medical advice.</p>
    </div>
</body>
</html>
        `;

        // Open print window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printHTML);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }
    },

    renderCards(dataset) {
        if (!this.content) return;
        const existingList = this.content.querySelector('.fh-bio-grid');
        if (existingList) {
            existingList.remove();
        }
        
        const existingEmpty = this.content.querySelector('.fh-empty-state');
        if (existingEmpty) {
            existingEmpty.remove();
        }

        const existingDashboard = this.content.querySelector('.fh-metrics-dashboard');
        if (existingDashboard) {
            existingDashboard.remove();
        }
        
        // Check if any selections exist
        if (this.selectedCategories.size === 0 || this.selectedDates.size === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'fh-empty-state';
            emptyState.innerHTML = `
                <div class="fh-empty-icon">📊</div>
                <div class="fh-empty-title">No data selected</div>
                <div class="fh-empty-message">Please select at least one category and one test date to view biomarker trends.</div>
            `;
            this.content.appendChild(emptyState);
            return;
        }

        // Add metrics dashboard
        const metrics = computeDatasetMetrics(dataset, this.selectedCategories, this.selectedDates);
        const dashboard = createMetricsDashboard(metrics);
        this.content.appendChild(dashboard);

        const list = document.createElement('div');
        list.className = 'fh-bio-grid';

        Object.entries(dataset.categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([categoryName, category]) => {
                if (!this.selectedCategories.has(categoryName)) return;
                if (!Array.isArray(category?.biomarkers) || category.biomarkers.length === 0) return;

                // Consolidate biomarkers by name
                const consolidatedBiomarkers = consolidateBiomarkersByName(category.biomarkers);
                
                // Filter biomarkers by selected dates (using normalized dates for consistent comparison)
                const dateFilteredBiomarkers = consolidatedBiomarkers.map(biomarker => {
                    const filteredHistorical = biomarker.historicalValues.filter(hv => 
                        this.selectedDates.has(normalizeDate(hv.date))
                    );
                    return {
                        ...biomarker,
                        historicalValues: filteredHistorical
                    };
                }).filter(biomarker => biomarker.historicalValues.length > 0);

                // Filter biomarkers by selected status
                const filteredBiomarkers = dateFilteredBiomarkers.filter(biomarker => {
                    const statusCategory = getBiomarkerStatusCategory(biomarker, this.selectedDates);
                    return statusCategory && this.selectedStatuses.has(statusCategory);
                });

                if (filteredBiomarkers.length === 0) return;

                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'fh-category-header';
                categoryHeader.dataset.category = categoryName;

                const titleWrapper = document.createElement('div');
                titleWrapper.className = 'fh-category-title-wrapper';

                const iconSpan = document.createElement('span');
                iconSpan.className = 'fh-category-icon';
                iconSpan.innerHTML = getCategoryIcon(categoryName);

                const title = document.createElement('h3');
                title.textContent = categoryName;

                titleWrapper.appendChild(iconSpan);
                titleWrapper.appendChild(title);

                const meta = document.createElement('span');
                meta.textContent = `${filteredBiomarkers.length} biomarkers`;

                categoryHeader.appendChild(titleWrapper);
                categoryHeader.appendChild(meta);
                list.appendChild(categoryHeader);

                filteredBiomarkers
                    .sort((a, b) => {
                        const aOutOfRange = isOutOfRange(a);
                        const bOutOfRange = isOutOfRange(b);
                        if (aOutOfRange && !bOutOfRange) return -1;
                        if (!aOutOfRange && bOutOfRange) return 1;
                        return a.name.localeCompare(b.name);
                    })
                    .forEach((biomarker) => {
                        const card = createBiomarkerCard(biomarker);
                        list.appendChild(card);
                    });
            });

        this.content.appendChild(list);
    },

    close() {
        if (!this.container) return;
        this.container.classList.remove('fh-visual-overlay--open');
        setTimeout(() => {
            if (this.container && !this.container.classList.contains('fh-visual-overlay--open')) {
                this.container.remove();
                this.container = null;
                this.content = null;
                this.header = null;
                this.headerControls = null;
                this.categoryDropdown = null;
                this.dateDropdown = null;
                this.categoryDropdownOpen = false;
                this.dateDropdownOpen = false;
                document.removeEventListener('keydown', this.handleKeydown);
                document.body.classList.remove('fh-visual-no-scroll');
            }
        }, 250);
    },

    handleKeydown(event) {
        if (event.key === 'Escape' && VisualOverlay.container?.classList.contains('fh-visual-overlay--open')) {
            event.stopPropagation();
            VisualOverlay.close();
        }
    }
};

// ===== DATA CONSOLIDATION =====

function extractAllDates(dataset) {
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

function consolidateBiomarkersByName(biomarkers) {
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

// ===== BIOMARKER TYPE DETECTION & CLASSIFICATION =====

/**
 * Known biomarker patterns for special handling
 */
const KNOWN_BIOMARKERS = {
    titers: ['ANA Titer', 'Antinuclear Antibodies (ANA) Titer'],
    patterns: ['LDL Pattern', 'Antinuclear Antibodies (ANA) Pattern'],
    percentages: ['HbA1c', 'Hemoglobin A1c', 'Iron % Saturation', 'Hematocrit'],
    binary: ['HIV', 'Chlamydia', 'Gonorrhoea', 'Syphilis', 'Trichomonas', 'Herpes']
};

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
function classifyBiomarker(biomarker) {
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
function detectBiomarkerType(biomarker) {
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

function isNumericValue(value) {
    if (!value) return false;
    const cleaned = String(value).replace(/[<>≤≥]/g, '').replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    return !Number.isNaN(parsed);
}

function isNonNumericValue(value) {
    if (!value) return true;
    const str = String(value).trim().toUpperCase();
    const categorical = ['NEGATIVE', 'POSITIVE', 'NON-REACTIVE', 'REACTIVE', 'NOT DETECTED', 'DETECTED', 
                        'CLEAR', 'YELLOW', 'NONE SEEN', 'NEG', 'NORMAL', 'ABNORMAL'];
    return categorical.some(cat => str.includes(cat));
}

function extractNumericValue(value) {
    return extractNumericFromValue(value);
}

// ===== BIOMARKER CARD CREATION =====

function createBiomarkerCard(biomarker) {
    const events = buildTimelineEvents(biomarker);
    const classification = classifyBiomarker(biomarker);
    const latestEntry = events[events.length - 1] || {};
    const refData = classification.referenceData;
    
    console.log(`[Visual Card] ${biomarker.name}: type=${classification.type}, hint=${classification.displayHint}, events=${events.length}`);
    
    const card = document.createElement('article');
    const status = determineBiomarkerStatus(events);
    const statusClass = `fh-bio-card--status-${normalizeStatus(status)}`;
    card.className = `fh-bio-card fh-bio-card--${classification.type} ${statusClass}`;

    // HEADER
    const header = document.createElement('div');
    header.className = 'fh-bio-header';

    const titleRow = document.createElement('div');
    titleRow.className = 'fh-bio-title-row';

    const name = document.createElement('h4');
    name.textContent = biomarker.name;

    // Info tooltip button
    const infoButton = document.createElement('button');
    infoButton.type = 'button';
    infoButton.className = 'fh-info-button';
    infoButton.innerHTML = 'ℹ';
    infoButton.setAttribute('aria-label', 'Learn more about this biomarker');
    
    const info = getBiomarkerInfo(biomarker.name);
    const tooltip = document.createElement('div');
    tooltip.className = 'fh-info-tooltip';
    tooltip.innerHTML = `
        <div class="fh-tooltip-row"><strong>What:</strong> ${info.what}</div>
        <div class="fh-tooltip-row"><strong>Why it matters:</strong> ${info.why}</div>
        <div class="fh-tooltip-row"><strong>Affected by:</strong> ${info.affects}</div>
    `;
    infoButton.appendChild(tooltip);

    const badge = document.createElement('span');
    badge.className = `fh-status-badge fh-status-${normalizeStatus(status)}`;
    badge.textContent = status;

    titleRow.appendChild(name);
    titleRow.appendChild(infoButton);
    titleRow.appendChild(badge);
    header.appendChild(titleRow);

    const refInfo = document.createElement('div');
    refInfo.className = 'fh-reference-info';
    refInfo.textContent = formatReferenceInfoNew(classification, biomarker, latestEntry);
    header.appendChild(refInfo);

    // HERO METRICS
    const hero = document.createElement('div');
    hero.className = 'fh-bio-hero';

    const valueBlock = document.createElement('div');
    valueBlock.className = 'fh-hero-value-block';

    const valueEl = document.createElement('div');
    valueEl.className = 'fh-hero-value';
    valueEl.textContent = formatValue(latestEntry.value, latestEntry.unit);

    const dateEl = document.createElement('div');
    dateEl.className = 'fh-hero-date';
    dateEl.textContent = formatDisplayDate(latestEntry.date);

    valueBlock.appendChild(valueEl);
    valueBlock.appendChild(dateEl);
    hero.appendChild(valueBlock);

    if (events.length > 1) {
        const direction = getDirectionBadge(events, classification);
        if (direction) {
            hero.appendChild(direction);
        }
    }

    header.appendChild(hero);

    // PROGRESS NARRATIVE
    const narrative = generateProgressNarrative(events, classification);
    if (narrative) {
        const narrativeEl = document.createElement('div');
        narrativeEl.className = 'fh-progress-narrative';
        narrativeEl.textContent = narrative;
        header.appendChild(narrativeEl);
    }

    card.appendChild(header);

    // VISUALIZATION - Route based on classification
    const visualization = createVisualization(classification, events, biomarker, refData);
    if (visualization) {
        card.appendChild(visualization);
    }

    // FOOTER (trend insight)
    if (events.length > 1) {
        const insight = getTrendInsight(events, classification);
        if (insight) {
            const insightBadge = document.createElement('div');
            insightBadge.className = `fh-trend-insight fh-trend-insight--${insight.type}`;
            insightBadge.textContent = insight.text;
            card.appendChild(insightBadge);
        }
    }

    return card;
}

/**
 * Route to the appropriate visualization based on classification
 */
function createVisualization(classification, events, biomarker, refData) {
    const { type, displayHint } = classification;
    
    switch (type) {
        case 'titer':
            return createTiterLadder(events, refData);
            
        case 'numeric-band':
        case 'percentage':
            if (events.length >= 1 && refData) {
                return createRangeBarVisualization(events, refData, biomarker);
            } else if (events.length > 1) {
                return createSimpleSparkline(events);
            }
            return null;
            
        case 'threshold-upper':
        case 'threshold-lower':
            if (events.length >= 1 && refData) {
                return createThresholdVisualization(events, refData, classification.type);
            }
            return null;
            
        case 'categorical-binary':
            return createBinaryPassFailDisplay(events, refData);
            
        case 'categorical-descriptive':
            return createCategoricalTimeline(events);
            
        case 'pattern':
            return createPatternGradeDisplay(events, refData, biomarker);
            
        case 'informational':
        default:
            // Only show sparkline if we have multiple numeric values
            if (events.length > 1 && classification.valueType === 'numeric') {
                return createSimpleSparkline(events);
            }
            // Show informational display for single values or non-numeric types
            if (events.length >= 1) {
                return createInformationalDisplay(events, biomarker);
            }
            return null;
    }
}

/**
 * Creates a simple informational display for biomarkers without reference ranges
 */
function createInformationalDisplay(events, biomarker) {
    if (events.length === 0) return null;
    
    const container = document.createElement('div');
    container.className = 'fh-informational-display';
    
    // Show message about no reference range
    const notice = document.createElement('div');
    notice.className = 'fh-informational-notice';
    notice.textContent = 'No standard reference range - value shown for tracking';
    container.appendChild(notice);
    
    // Show historical values if multiple
    if (events.length > 1) {
        const history = document.createElement('div');
        history.className = 'fh-informational-history';
        
        events.slice().reverse().slice(0, 5).forEach(event => {
            const item = document.createElement('div');
            item.className = 'fh-informational-item';
            
            const value = document.createElement('span');
            value.className = 'fh-informational-value';
            value.textContent = formatValue(event.value, event.unit);
            
            const date = document.createElement('span');
            date.className = 'fh-informational-date';
            date.textContent = formatShortDate(event.date);
            
            item.appendChild(date);
            item.appendChild(value);
            history.appendChild(item);
        });
        
        container.appendChild(history);
    }
    
    return container;
}

/**
 * Format reference info based on new classification
 */
function formatReferenceInfoNew(classification, biomarker, latestEntry) {
    const unit = latestEntry.unit || biomarker.unit || '';
    const refData = classification.referenceData;
    
    if (!refData) {
        return 'No reference range available';
    }
    
    switch (refData.type) {
        case 'band':
            return `Normal: ${refData.lower}–${refData.upper}${unit ? ' ' + unit : ''}`;
            
        case 'threshold':
            const op = refData.inclusive ? 
                (refData.direction === 'upper' ? '≤' : '≥') :
                (refData.direction === 'upper' ? '<' : '>');
            return `Target: ${op} ${refData.value}${unit ? ' ' + unit : ''}`;
            
        case 'titer':
            return `Normal: <1:${refData.threshold}`;
            
        case 'categorical':
            return `Expected: ${refData.expected}`;
            
        case 'pattern':
            return `Expected: ${refData.expected}`;
            
        default:
            return refData.raw ? `Reference: ${refData.raw}` : 'See reference';
    }
}

// ===== REFERENCE RANGE PARSING =====

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
function parseReferenceRange(rangeString) {
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
function extractNumericFromValue(value) {
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

// ===== CHART RENDERERS =====

/**
 * Creates a range bar visualization showing the value position within a reference range
 * Shows colored zones: below (amber), in-range (green), above (red)
 */
function createRangeBarVisualization(events, refData, biomarker) {
    const container = document.createElement('div');
    container.className = 'fh-range-bar-container';
    
    if (!refData || refData.type !== 'band') {
        return createSimpleSparkline(events);
    }
    
    const { lower, upper } = refData;
    const rangeSpan = upper - lower;
    
    // Get latest numeric value
    const latestEvent = events[events.length - 1];
    const currentValue = extractNumericFromValue(latestEvent?.value);
    
    if (currentValue === null) {
        return createSimpleSparkline(events);
    }
    
    // Calculate display bounds (extend 20% beyond range to show out-of-range values)
    const padding = rangeSpan * 0.25;
    const displayMin = Math.min(lower - padding, currentValue - padding);
    const displayMax = Math.max(upper + padding, currentValue + padding);
    const displayRange = displayMax - displayMin;
    
    // Calculate positions as percentages
    const lowerPos = ((lower - displayMin) / displayRange) * 100;
    const upperPos = ((upper - displayMin) / displayRange) * 100;
    const valuePos = Math.max(0, Math.min(100, ((currentValue - displayMin) / displayRange) * 100));
    
    // Determine value status
    let valueStatus = 'in-range';
    if (currentValue < lower) valueStatus = 'below';
    else if (currentValue > upper) valueStatus = 'above';
    
    // Build the visualization
    const barWrapper = document.createElement('div');
    barWrapper.className = 'fh-range-bar-wrapper';
    
    // Background bar with zones
    const bar = document.createElement('div');
    bar.className = 'fh-range-bar';
    
    // Below zone
    const belowZone = document.createElement('div');
    belowZone.className = 'fh-range-zone fh-range-zone--below';
    belowZone.style.width = `${lowerPos}%`;
    bar.appendChild(belowZone);
    
    // In-range zone
    const inRangeZone = document.createElement('div');
    inRangeZone.className = 'fh-range-zone fh-range-zone--in-range';
    inRangeZone.style.left = `${lowerPos}%`;
    inRangeZone.style.width = `${upperPos - lowerPos}%`;
    bar.appendChild(inRangeZone);
    
    // Above zone
    const aboveZone = document.createElement('div');
    aboveZone.className = 'fh-range-zone fh-range-zone--above';
    aboveZone.style.left = `${upperPos}%`;
    aboveZone.style.width = `${100 - upperPos}%`;
    bar.appendChild(aboveZone);
    
    // Value marker
    const marker = document.createElement('div');
    marker.className = `fh-range-marker fh-range-marker--${valueStatus}`;
    marker.style.left = `${valuePos}%`;
    
    const markerDot = document.createElement('div');
    markerDot.className = 'fh-range-marker-dot';
    marker.appendChild(markerDot);
    
    bar.appendChild(marker);
    barWrapper.appendChild(bar);
    
    // Range labels
    const labels = document.createElement('div');
    labels.className = 'fh-range-labels';
    
    const lowerLabel = document.createElement('span');
    lowerLabel.className = 'fh-range-label fh-range-label--lower';
    lowerLabel.textContent = lower;
    lowerLabel.style.left = `${lowerPos}%`;
    
    const upperLabel = document.createElement('span');
    upperLabel.className = 'fh-range-label fh-range-label--upper';
    upperLabel.textContent = upper;
    upperLabel.style.left = `${upperPos}%`;
    
    labels.appendChild(lowerLabel);
    labels.appendChild(upperLabel);
    barWrapper.appendChild(labels);
    
    container.appendChild(barWrapper);
    
    // Add mini sparkline if multiple events
    if (events.length > 1) {
        const sparkline = createMiniSparkline(events, refData);
        container.appendChild(sparkline);
    }
    
    return container;
}

/**
 * Creates a threshold visualization showing value relative to a threshold
 */
function createThresholdVisualization(events, refData, thresholdType) {
    const container = document.createElement('div');
    container.className = 'fh-threshold-viz-container';
    
    if (!refData || refData.type !== 'threshold') {
        return createSimpleSparkline(events);
    }
    
    const threshold = refData.value;
    const isUpperBound = thresholdType === 'threshold-upper'; // Must be below threshold
    
    const latestEvent = events[events.length - 1];
    const currentValue = extractNumericFromValue(latestEvent?.value);
    
    if (currentValue === null) {
        return null;
    }
    
    // Calculate display bounds
    const maxVal = Math.max(threshold * 1.5, currentValue * 1.2);
    const displayRange = maxVal;
    
    const thresholdPos = (threshold / displayRange) * 100;
    const valuePos = Math.max(0, Math.min(100, (currentValue / displayRange) * 100));
    
    // Determine if value is good or bad
    let isGood;
    if (isUpperBound) {
        isGood = refData.inclusive ? currentValue <= threshold : currentValue < threshold;
    } else {
        isGood = refData.inclusive ? currentValue >= threshold : currentValue > threshold;
    }
    
    // Build visualization
    const barWrapper = document.createElement('div');
    barWrapper.className = 'fh-threshold-bar-wrapper';
    
    const bar = document.createElement('div');
    bar.className = 'fh-threshold-bar';
    
    // Good zone
    const goodZone = document.createElement('div');
    goodZone.className = 'fh-threshold-zone fh-threshold-zone--good';
    if (isUpperBound) {
        goodZone.style.width = `${thresholdPos}%`;
    } else {
        goodZone.style.left = `${thresholdPos}%`;
        goodZone.style.width = `${100 - thresholdPos}%`;
    }
    bar.appendChild(goodZone);
    
    // Bad zone
    const badZone = document.createElement('div');
    badZone.className = 'fh-threshold-zone fh-threshold-zone--bad';
    if (isUpperBound) {
        badZone.style.left = `${thresholdPos}%`;
        badZone.style.width = `${100 - thresholdPos}%`;
    } else {
        badZone.style.width = `${thresholdPos}%`;
    }
    bar.appendChild(badZone);
    
    // Threshold line
    const thresholdLine = document.createElement('div');
    thresholdLine.className = 'fh-threshold-line';
    thresholdLine.style.left = `${thresholdPos}%`;
    bar.appendChild(thresholdLine);
    
    // Value marker
    const marker = document.createElement('div');
    marker.className = `fh-threshold-marker ${isGood ? 'fh-threshold-marker--good' : 'fh-threshold-marker--bad'}`;
    marker.style.left = `${valuePos}%`;
    bar.appendChild(marker);
    
    barWrapper.appendChild(bar);
    
    // Labels
    const labels = document.createElement('div');
    labels.className = 'fh-threshold-labels';
    
    const thresholdLabel = document.createElement('span');
    thresholdLabel.className = 'fh-threshold-label';
    thresholdLabel.style.left = `${thresholdPos}%`;
    const op = refData.inclusive ? (isUpperBound ? '≤' : '≥') : (isUpperBound ? '<' : '>');
    thresholdLabel.textContent = `${op}${threshold}`;
    labels.appendChild(thresholdLabel);
    
    barWrapper.appendChild(labels);
    container.appendChild(barWrapper);
    
    // Add mini sparkline if multiple events (trend line)
    if (events.length > 1) {
        const sparkline = createMiniSparkline(events, refData);
        container.appendChild(sparkline);
    }
    
    return container;
}

/**
 * Creates a pass/fail display for binary categorical results
 */
function createBinaryPassFailDisplay(events, refData) {
    const container = document.createElement('div');
    container.className = 'fh-binary-display';
    
    // Display all events as pass/fail indicators
    const timeline = document.createElement('div');
    timeline.className = 'fh-binary-timeline';
    
    events.slice().reverse().forEach((event) => {
        const item = document.createElement('div');
        item.className = 'fh-binary-item';
        
        const valueUpper = String(event.value || '').toUpperCase();
        const isPass = valueUpper.includes('NEGATIVE') || 
                      valueUpper.includes('NON-REACTIVE') || 
                      valueUpper.includes('NOT DETECTED') ||
                      valueUpper.includes('NONE SEEN') ||
                      event.status === 'In Range';
        
        const icon = document.createElement('div');
        icon.className = `fh-binary-icon ${isPass ? 'fh-binary-icon--pass' : 'fh-binary-icon--fail'}`;
        icon.textContent = isPass ? '✓' : '✗';
        
        const details = document.createElement('div');
        details.className = 'fh-binary-details';
        
        const value = document.createElement('span');
        value.className = 'fh-binary-value';
        value.textContent = event.value;
        
        const date = document.createElement('span');
        date.className = 'fh-binary-date';
        date.textContent = formatShortDate(event.date);
        
        details.appendChild(value);
        details.appendChild(date);
        
        item.appendChild(icon);
        item.appendChild(details);
        timeline.appendChild(item);
    });
    
    container.appendChild(timeline);
    return container;
}

/**
 * Creates a pattern/grade comparison display
 */
function createPatternGradeDisplay(events, refData, biomarker) {
    const container = document.createElement('div');
    container.className = 'fh-pattern-display';
    
    const latestEvent = events[events.length - 1];
    const currentValue = String(latestEvent?.value || '').trim();
    const expectedValue = refData?.expected || '';
    
    // Create comparison display
    const comparison = document.createElement('div');
    comparison.className = 'fh-pattern-comparison';
    
    // Expected value
    const expectedBlock = document.createElement('div');
    expectedBlock.className = 'fh-pattern-block fh-pattern-block--expected';
    
    const expectedLabel = document.createElement('div');
    expectedLabel.className = 'fh-pattern-label';
    expectedLabel.textContent = 'Expected';
    
    const expectedVal = document.createElement('div');
    expectedVal.className = 'fh-pattern-value';
    expectedVal.textContent = expectedValue || '—';
    
    expectedBlock.appendChild(expectedLabel);
    expectedBlock.appendChild(expectedVal);
    
    // Arrow
    const arrow = document.createElement('div');
    arrow.className = 'fh-pattern-arrow';
    arrow.textContent = '→';
    
    // Actual value
    const actualBlock = document.createElement('div');
    const isMatch = currentValue.toUpperCase() === expectedValue.toUpperCase();
    actualBlock.className = `fh-pattern-block fh-pattern-block--actual ${isMatch ? 'fh-pattern-block--match' : 'fh-pattern-block--mismatch'}`;
    
    const actualLabel = document.createElement('div');
    actualLabel.className = 'fh-pattern-label';
    actualLabel.textContent = 'Actual';
    
    const actualVal = document.createElement('div');
    actualVal.className = 'fh-pattern-value';
    actualVal.textContent = currentValue || '—';
    
    actualBlock.appendChild(actualLabel);
    actualBlock.appendChild(actualVal);
    
    comparison.appendChild(expectedBlock);
    comparison.appendChild(arrow);
    comparison.appendChild(actualBlock);
    
    container.appendChild(comparison);
    
    // Add explanation for known patterns
    const explanation = getPatternExplanation(biomarker.name, currentValue);
    if (explanation) {
        const explainer = document.createElement('div');
        explainer.className = 'fh-pattern-explanation';
        explainer.textContent = explanation;
        container.appendChild(explainer);
    }
    
    // Show history if multiple events
    if (events.length > 1) {
        const history = document.createElement('div');
        history.className = 'fh-pattern-history';
        
        events.slice(0, -1).reverse().forEach(event => {
            const histItem = document.createElement('span');
            histItem.className = 'fh-pattern-history-item';
            histItem.textContent = `${formatShortDate(event.date)}: ${event.value}`;
            history.appendChild(histItem);
        });
        
        container.appendChild(history);
    }
    
    return container;
}

/**
 * Get explanation for known pattern types
 */
function getPatternExplanation(biomarkerName, value) {
    const nameUpper = biomarkerName.toUpperCase();
    const valueUpper = String(value).toUpperCase();
    
    if (nameUpper.includes('LDL PATTERN')) {
        if (valueUpper === 'A') {
            return 'Pattern A: Large, buoyant LDL particles (favorable)';
        } else if (valueUpper === 'B') {
            return 'Pattern B: Small, dense LDL particles (associated with higher cardiovascular risk)';
        }
    }
    
    if (nameUpper.includes('ANA') && nameUpper.includes('PATTERN')) {
        return `Staining pattern observed: ${value}`;
    }
    
    return null;
}

/**
 * Creates a mini sparkline for historical trend
 */
function createMiniSparkline(events, refData) {
    const container = document.createElement('div');
    container.className = 'fh-mini-sparkline-container';
    container.style.position = 'relative';
    
    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericFromValue(e.value) }))
        .filter(e => e.numericValue !== null);
    
    if (numericEvents.length < 2) {
        return container;
    }
    
    // Increased dimensions for better visibility
    const width = 300;
    const height = 60;
    const padding = 8;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-mini-sparkline');
    
    const values = numericEvents.map(e => e.numericValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const points = numericEvents.map((event, index) => {
        const x = padding + ((width - padding * 2) / (numericEvents.length - 1)) * index;
        const y = padding + ((height - padding * 2) - ((event.numericValue - min) / range) * (height - padding * 2));
        return { x, y, event };
    });
    
    // Draw reference band if available
    if (refData?.type === 'band') {
        const upperY = padding + ((height - padding * 2) - ((refData.upper - min) / range) * (height - padding * 2));
        const lowerY = padding + ((height - padding * 2) - ((refData.lower - min) / range) * (height - padding * 2));
        
        const bandRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bandRect.setAttribute('x', 0);
        bandRect.setAttribute('y', Math.max(0, upperY));
        bandRect.setAttribute('width', width);
        bandRect.setAttribute('height', Math.min(height, lowerY - upperY));
        bandRect.setAttribute('fill', 'rgba(48, 196, 141, 0.15)');
        svg.appendChild(bandRect);
    }
    
    // Draw threshold line and shaded region for threshold-type biomarkers
    if (refData?.type === 'threshold' && refData.value !== undefined) {
        const thresholdVal = refData.value;
        // Only draw if threshold is within or near the visible data range
        if (thresholdVal >= min * 0.5 && thresholdVal <= max * 1.5) {
            const thresholdY = padding + ((height - padding * 2) - ((thresholdVal - min) / range) * (height - padding * 2));
            const clampedY = Math.max(0, Math.min(height, thresholdY));
            
            // Shade the "good" region (green tint)
            const isUpperBound = refData.direction === 'upper';
            const goodRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            goodRect.setAttribute('x', 0);
            goodRect.setAttribute('width', width);
            if (isUpperBound) {
                // Good is below threshold (lower values are better)
                goodRect.setAttribute('y', clampedY);
                goodRect.setAttribute('height', Math.max(0, height - clampedY));
            } else {
                // Good is above threshold (higher values are better)
                goodRect.setAttribute('y', 0);
                goodRect.setAttribute('height', Math.max(0, clampedY));
            }
            goodRect.setAttribute('fill', 'rgba(48, 196, 141, 0.12)');
            svg.appendChild(goodRect);
            
            // Draw dashed threshold line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('x2', width);
            line.setAttribute('y1', clampedY);
            line.setAttribute('y2', clampedY);
            line.setAttribute('stroke', '#30c48d');
            line.setAttribute('stroke-width', '1.5');
            line.setAttribute('stroke-dasharray', '4,3');
            svg.appendChild(line);
        }
    }
    
    // Draw line with increased stroke width
    if (points.length > 1) {
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#667eea');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
    }
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'fh-mini-sparkline-tooltip';
    tooltip.style.display = 'none';
    container.appendChild(tooltip);
    
    // Draw points with larger hit areas for easier hover
    points.forEach((point, index) => {
        // Invisible larger hit area circle for easier hover detection
        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hitArea.setAttribute('cx', point.x);
        hitArea.setAttribute('cy', point.y);
        hitArea.setAttribute('r', 15); // Large invisible hit area
        hitArea.setAttribute('fill', 'transparent');
        hitArea.setAttribute('cursor', 'pointer');
        hitArea.classList.add('fh-mini-sparkline-hitarea');
        
        // Visible dot
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 4); // Larger visible dot
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.classList.add('fh-mini-sparkline-dot');
        circle.style.pointerEvents = 'none'; // Let hit area handle events
        
        // Hover events on the larger hit area
        hitArea.addEventListener('mouseenter', (e) => {
            // Format value (remove units, just show number)
            const value = point.event.numericValue ?? point.event.value;
            const date = formatShortDate(point.event.date);
            
            tooltip.innerHTML = `<strong>${value}</strong><br><span>${date}</span>`;
            tooltip.style.display = 'block';
            
            // Position tooltip - calculate based on SVG viewBox to container ratio
            const svgRect = svg.getBoundingClientRect();
            const scaleX = svgRect.width / width;
            const dotX = point.x * scaleX;
            
            // Center tooltip on dot, position above
            tooltip.style.left = `${dotX}px`;
            tooltip.style.bottom = `${svgRect.height + 6}px`;
            
            // Scale up the visible dot
            circle.setAttribute('r', 7);
        });
        
        hitArea.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
            circle.setAttribute('r', 4);
        });
        
        svg.appendChild(hitArea);
        svg.appendChild(circle);
    });
    
    container.appendChild(svg);
    return container;
}

function createTiterLadder(events, referenceRange) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container fh-titer-ladder-container';

    const width = 600;
    const height = 220;
    const padding = { top: 30, right: 130, bottom: 40, left: 80 };

    // Standard titer dilution series (log2 scale)
    const allTiterLevels = [20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240];
    
    // Parse titer values from events
    const titerEvents = events.map(e => {
        const match = String(e.value || '').match(/1\s*:\s*(\d+)/);
        const titerValue = match ? parseInt(match[1]) : null;
        return { ...e, titerValue };
    }).filter(e => e.titerValue !== null);

    if (titerEvents.length === 0) {
        container.textContent = 'Unable to parse titer values';
        return container;
    }

    // Get reference threshold from parsed data
    const refThreshold = referenceRange?.type === 'titer' ? referenceRange.threshold : 40;

    // Determine which titer levels to show based on data
    const allTiterValues = titerEvents.map(e => e.titerValue);
    const minTiter = Math.min(...allTiterValues);
    const maxTiter = Math.max(...allTiterValues);
    
    // Include reference threshold in range and ensure we have good coverage
    const displayMin = Math.min(refThreshold / 2, minTiter / 2);
    const displayMax = Math.max(refThreshold * 4, maxTiter * 2);
    
    const relevantLevels = allTiterLevels.filter(level => 
        level >= displayMin && level <= displayMax
    );
    
    // Ensure we have at least the threshold level
    if (!relevantLevels.includes(refThreshold)) {
        relevantLevels.push(refThreshold);
        relevantLevels.sort((a, b) => a - b);
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-titer-ladder');

    const chartHeight = height - padding.top - padding.bottom;
    const chartWidth = width - padding.left - padding.right;
    
    // Use log scale for Y positioning
    const logMin = Math.log2(relevantLevels[0]);
    const logMax = Math.log2(relevantLevels[relevantLevels.length - 1]);
    const logRange = logMax - logMin || 1;
    
    const getYForTiter = (titerValue) => {
        const logValue = Math.log2(titerValue);
        const normalized = (logValue - logMin) / logRange;
        return padding.top + chartHeight - (normalized * chartHeight);
    };

    // Define severity zones based on reference threshold
    const normalThreshold = refThreshold;
    const borderlineThreshold = refThreshold * 8;  // 2^3 = 8x above normal
    const elevatedThreshold = refThreshold * 32;   // 2^5 = 32x above normal

    // Draw severity zone backgrounds using log scale
    const zones = [
        { max: normalThreshold, color: 'rgba(48, 196, 141, 0.12)', name: 'Normal', textColor: '#1e805c' },
        { max: borderlineThreshold, color: 'rgba(247, 178, 103, 0.12)', name: 'Elevated', textColor: '#9d7030' },
        { max: elevatedThreshold, color: 'rgba(247, 112, 112, 0.12)', name: 'High', textColor: '#b23e3e' },
        { max: Infinity, color: 'rgba(184, 51, 51, 0.15)', name: 'Very High', textColor: '#8b2626' }
    ];
    
    let prevY = height - padding.bottom;
    zones.forEach((zone, idx) => {
        const zoneMax = Math.min(zone.max, relevantLevels[relevantLevels.length - 1]);
        if (zoneMax < relevantLevels[0]) return;
        
        const y = getYForTiter(Math.max(zoneMax, relevantLevels[0]));
        const zoneHeight = prevY - y;
        
        if (zoneHeight > 0) {
        const zoneRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        zoneRect.setAttribute('x', padding.left);
        zoneRect.setAttribute('y', y);
        zoneRect.setAttribute('width', chartWidth);
            zoneRect.setAttribute('height', zoneHeight);
            zoneRect.setAttribute('fill', zone.color);
        svg.appendChild(zoneRect);

        // Zone label on right
            if (zoneHeight > 20) {
                const zoneLabel = createSVGText(zone.name, width - padding.right + 10, y + zoneHeight / 2, 'start', 11, zone.textColor);
            zoneLabel.setAttribute('font-weight', '600');
                zoneLabel.setAttribute('dominant-baseline', 'middle');
            svg.appendChild(zoneLabel);
        }
        }
        prevY = y;
    });
    
    // Draw reference threshold line
    const refY = getYForTiter(refThreshold);
    const refLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    refLine.setAttribute('x1', padding.left);
    refLine.setAttribute('y1', refY);
    refLine.setAttribute('x2', padding.left + chartWidth);
    refLine.setAttribute('y2', refY);
    refLine.setAttribute('stroke', '#30c48d');
    refLine.setAttribute('stroke-width', '2');
    refLine.setAttribute('stroke-dasharray', '6,3');
    svg.appendChild(refLine);
    
    const refLabel = createSVGText(`Normal <1:${refThreshold}`, padding.left + 5, refY - 6, 'start', 10, '#1e805c');
    refLabel.setAttribute('font-weight', '600');
    svg.appendChild(refLabel);

    // Draw horizontal rungs (titer levels) using log scale
    relevantLevels.forEach((level) => {
        const y = getYForTiter(level);
        
        const rung = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        rung.setAttribute('x1', padding.left);
        rung.setAttribute('y1', y);
        rung.setAttribute('x2', padding.left + chartWidth);
        rung.setAttribute('y2', y);
        rung.setAttribute('stroke', 'rgba(102, 126, 234, 0.2)');
        rung.setAttribute('stroke-width', '1');
        svg.appendChild(rung);

        // Titer label on left
        const levelLabel = createSVGText(`1:${level}`, padding.left - 8, y, 'end', 10, '#6a7395');
        levelLabel.setAttribute('dominant-baseline', 'middle');
        levelLabel.setAttribute('font-weight', '500');
        svg.appendChild(levelLabel);
    });

    // Plot data points using log scale
    titerEvents.forEach((event, index) => {
        const y = getYForTiter(event.titerValue);
        const x = padding.left + (chartWidth / (titerEvents.length - 1 || 1)) * index;

        // Draw connector to next point
        if (index < titerEvents.length - 1) {
            const nextEvent = titerEvents[index + 1];
            const nextY = getYForTiter(nextEvent.titerValue);
            const nextX = padding.left + (chartWidth / (titerEvents.length - 1 || 1)) * (index + 1);

            const connector = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            connector.setAttribute('x1', x);
            connector.setAttribute('y1', y);
            connector.setAttribute('x2', nextX);
            connector.setAttribute('y2', nextY);
            connector.setAttribute('stroke', '#4a5fc1');
            connector.setAttribute('stroke-width', '2.5');
            connector.setAttribute('stroke-linecap', 'round');
            svg.appendChild(connector);

            // Arrow if moving up/down
            if (Math.abs(nextY - y) > 5) {
                const midX = (x + nextX) / 2;
                const midY = (y + nextY) / 2;
                const arrowSize = 8;
                const angle = Math.atan2(nextY - y, nextX - x);
                
                const arrowPath = `M ${midX},${midY} 
                    L ${midX - arrowSize * Math.cos(angle - Math.PI / 6)},${midY - arrowSize * Math.sin(angle - Math.PI / 6)}
                    M ${midX},${midY}
                    L ${midX - arrowSize * Math.cos(angle + Math.PI / 6)},${midY - arrowSize * Math.sin(angle + Math.PI / 6)}`;
                
                const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                arrow.setAttribute('d', arrowPath);
                arrow.setAttribute('stroke', '#4a5fc1');
                arrow.setAttribute('stroke-width', '2');
                arrow.setAttribute('fill', 'none');
                arrow.setAttribute('stroke-linecap', 'round');
                svg.appendChild(arrow);
            }
        }

        // Data point marker
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 8);
        circle.setAttribute('fill', STATUS_COLORS[event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2.5');
        
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${formatDisplayDate(event.date)}\n${event.value}\n${event.status}`;
        circle.appendChild(title);
        svg.appendChild(circle);

        // Titer value label above marker - adjust position to avoid overlapping axis labels
        let labelX = x;
        let labelAnchor = 'middle';
        
        // For leftmost point, shift label right to avoid Y-axis labels
        if (index === 0 && titerEvents.length > 1) {
            labelX = x + 5;
            labelAnchor = 'start';
        }
        // For rightmost point, shift label left to avoid zone labels
        else if (index === titerEvents.length - 1 && titerEvents.length > 1) {
            labelX = x - 5;
            labelAnchor = 'end';
        }
        
        const valueLabel = createSVGText(
            event.value,
            labelX,
            y - 16,
            labelAnchor,
            12,
            '#2d334c'
        );
        valueLabel.setAttribute('font-weight', '700');
        svg.appendChild(valueLabel);

        // Date label below chart
        const dateLabel = createSVGText(
            formatShortDate(event.date),
            x,
            height - padding.bottom + 18,
            'middle',
            11,
            '#6c748c'
        );
        svg.appendChild(dateLabel);
    });

    container.appendChild(svg);
    return container;
}

function createBandChart(events, referenceRange) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container';

    const width = 600;
    const height = 200;
    const padding = { top: 20, right: 120, bottom: 40, left: 60 };

    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);

    if (numericEvents.length === 0) {
        container.textContent = 'Unable to parse numeric values';
        return container;
    }

    const values = numericEvents.map(e => e.numericValue);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    
    // Use medical reference range if available, otherwise fall back to data-based scaling
    let chartMin, chartMax, lowerBound, upperBound;
    
    if (referenceRange && referenceRange.type === 'band') {
        lowerBound = referenceRange.lower;
        upperBound = referenceRange.upper;
        const rangeSpan = upperBound - lowerBound;
        
        // Extend chart to include all data points with padding
        chartMin = Math.min(lowerBound - rangeSpan * 0.15, dataMin - Math.abs(dataMin) * 0.05);
        chartMax = Math.max(upperBound + rangeSpan * 0.15, dataMax + Math.abs(dataMax) * 0.05);
    } else {
        // Fallback: estimate bands from data
        const dataRange = dataMax - dataMin || 1;
        lowerBound = dataMin + dataRange * 0.25;
        upperBound = dataMin + dataRange * 0.75;
        chartMin = dataMin - dataRange * 0.1;
        chartMax = dataMax + dataRange * 0.1;
    }
    
    const chartRange = chartMax - chartMin;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-band-chart');

    const chartHeight = height - padding.top - padding.bottom;
    const chartWidth = width - padding.left - padding.right;

    // Calculate Y positions for bounds
    const yForValue = (value) => {
        return padding.top + chartHeight - ((value - chartMin) / chartRange) * chartHeight;
    };

    const upperY = yForValue(upperBound);
    const lowerY = yForValue(lowerBound);

    // Above range band (if any data points exceed upper bound)
    const hasAboveRange = values.some(v => v > upperBound);
    if (hasAboveRange || dataMax > upperBound) {
        const aboveRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        aboveRect.setAttribute('x', padding.left);
        aboveRect.setAttribute('y', padding.top);
        aboveRect.setAttribute('width', chartWidth);
        aboveRect.setAttribute('height', upperY - padding.top);
        aboveRect.setAttribute('fill', BAND_COLORS.above);
        svg.appendChild(aboveRect);

        const aboveLabel = createSVGText('Above Range', width - padding.right + 8, padding.top + (upperY - padding.top) / 2, 'start', 11, '#8e5b5b');
        aboveLabel.setAttribute('font-weight', '600');
        svg.appendChild(aboveLabel);
        
        const upperBoundLabel = createSVGText(`> ${upperBound}`, width - padding.right + 8, upperY - 5, 'start', 10, '#8e5b5b');
        upperBoundLabel.setAttribute('font-style', 'italic');
        svg.appendChild(upperBoundLabel);
    }

    // In range band (between lower and upper bounds)
    const inRangeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    inRangeRect.setAttribute('x', padding.left);
    inRangeRect.setAttribute('y', upperY);
    inRangeRect.setAttribute('width', chartWidth);
    inRangeRect.setAttribute('height', lowerY - upperY);
    inRangeRect.setAttribute('fill', BAND_COLORS.inRange);
    svg.appendChild(inRangeRect);

    const inRangeLabel = createSVGText('In Range', width - padding.right + 8, upperY + (lowerY - upperY) / 2 - 6, 'start', 12, '#2a7d5f');
    inRangeLabel.setAttribute('font-weight', '700');
    svg.appendChild(inRangeLabel);
    
    const rangeText = createSVGText(`${lowerBound}–${upperBound}`, width - padding.right + 8, upperY + (lowerY - upperY) / 2 + 8, 'start', 10, '#2a7d5f');
    rangeText.setAttribute('font-style', 'italic');
    svg.appendChild(rangeText);

    // Below range band (if any data points below lower bound)
    const hasBelowRange = values.some(v => v < lowerBound);
    if (hasBelowRange || dataMin < lowerBound) {
        const belowRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        belowRect.setAttribute('x', padding.left);
        belowRect.setAttribute('y', lowerY);
        belowRect.setAttribute('width', chartWidth);
        belowRect.setAttribute('height', (height - padding.bottom) - lowerY);
        belowRect.setAttribute('fill', BAND_COLORS.below);
        svg.appendChild(belowRect);

        const belowLabel = createSVGText('Below Range', width - padding.right + 8, lowerY + ((height - padding.bottom) - lowerY) / 2, 'start', 11, '#9d7030');
        belowLabel.setAttribute('font-weight', '600');
        svg.appendChild(belowLabel);
        
        const lowerBoundLabel = createSVGText(`< ${lowerBound}`, width - padding.right + 8, lowerY + 15, 'start', 10, '#9d7030');
        lowerBoundLabel.setAttribute('font-style', 'italic');
        svg.appendChild(lowerBoundLabel);
    }

    // Plot points and line
    const points = numericEvents.map((event, index) => {
        const x = padding.left + (chartWidth / (numericEvents.length - 1 || 1)) * index;
        const y = yForValue(event.numericValue);
        return { x, y, event };
    });

    // Trend line
    if (points.length > 1) {
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#4a5fc1');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
    }

    // Data points
    points.forEach((point, index) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 7);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${formatDisplayDate(point.event.date)}\n${formatValue(point.event.value, point.event.unit)}\n${point.event.status}`;
        circle.appendChild(title);
        
        svg.appendChild(circle);

        // Value label above point
        const valueLabel = createSVGText(
            point.event.value || String(point.event.numericValue),
            point.x,
            point.y - 14,
            'middle',
            12,
            '#2d334c'
        );
        valueLabel.setAttribute('font-weight', '700');
        svg.appendChild(valueLabel);

        // Date label below
        const dateLabel = createSVGText(
            formatShortDate(point.event.date),
            point.x,
            height - padding.bottom + 18,
            'middle',
            11,
            '#6c748c'
        );
        svg.appendChild(dateLabel);
    });

    container.appendChild(svg);
    return container;
}

function createThresholdChart(events, referenceRange) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container fh-chart-threshold';

    const width = 600;
    const height = 120;
    const padding = { top: 20, right: 80, bottom: 30, left: 60 };

    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);

    if (numericEvents.length === 0) {
        container.textContent = 'Unable to parse values';
        return container;
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-threshold-chart');

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const midY = padding.top + chartHeight / 2;

    // Threshold line
    const thresholdLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    thresholdLine.setAttribute('x1', padding.left);
    thresholdLine.setAttribute('y1', midY);
    thresholdLine.setAttribute('x2', width - padding.right);
    thresholdLine.setAttribute('y2', midY);
    thresholdLine.setAttribute('stroke', '#8892b0');
    thresholdLine.setAttribute('stroke-width', '1.5');
    thresholdLine.setAttribute('stroke-dasharray', '4,4');
    svg.appendChild(thresholdLine);

    // Plot points along timeline
    numericEvents.forEach((event, index) => {
        const x = padding.left + (chartWidth / (numericEvents.length - 1 || 1)) * index;
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', midY);
        circle.setAttribute('r', 7);
        circle.setAttribute('fill', STATUS_COLORS[event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${formatDisplayDate(event.date)}\n${event.value} ${event.unit || ''}\n${event.status}`;
        circle.appendChild(title);
        svg.appendChild(circle);

        // Date label
        const dateLabel = createSVGText(
            formatShortDate(event.date),
            x,
            height - padding.bottom + 20,
            'middle',
            10,
            '#6c748c'
        );
        svg.appendChild(dateLabel);
    });

    container.appendChild(svg);
    return container;
}

function createCategoricalTimeline(events) {
    const container = document.createElement('div');
    container.className = 'fh-categorical-timeline';

    events.slice().reverse().forEach((event, index) => {
        const chip = document.createElement('div');
        chip.className = `fh-cat-chip fh-status-${normalizeStatus(event.status)}`;
        
        const icon = document.createElement('span');
        icon.className = 'fh-cat-icon';
        icon.textContent = getCategoricalIcon(event.value, event.status);
        
        const text = document.createElement('span');
        text.textContent = `${formatShortDate(event.date)} • ${event.value}`;
        
        chip.appendChild(icon);
        chip.appendChild(text);
        container.appendChild(chip);
    });

    return container;
}

function createSimpleSparkline(events) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container';

    const width = 400;
    const height = 80;
    const padding = 12; // Add padding for dots at edges

    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);

    if (numericEvents.length === 0) {
        return container;
    }

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'fh-chart-tooltip';
    container.appendChild(tooltip);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-simple-sparkline');

    const values = numericEvents.map(e => e.numericValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = numericEvents.map((event, index) => {
        const x = padding + ((width - padding * 2) / (numericEvents.length - 1 || 1)) * index;
        const y = padding + (height - padding * 2) - ((event.numericValue - min) / range) * (height - padding * 2);
        return { x, y, event };
    });

    if (points.length > 1) {
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#6471f5');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
    }

    points.forEach((point, index) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 6);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');
        circle.classList.add('fh-chart-dot');
        circle.style.cursor = 'pointer';

        // Hover tooltip functionality
        circle.addEventListener('mouseenter', (e) => {
            const rect = svg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const dotX = (point.x / width) * rect.width;
            const dotY = (point.y / height) * rect.height;
            
            // Position tooltip above the dot
            let tooltipX = dotX + (rect.left - containerRect.left);
            let tooltipY = dotY + (rect.top - containerRect.top) - 50;
            
            // Ensure tooltip stays within bounds
            if (tooltipY < 0) tooltipY = dotY + (rect.top - containerRect.top) + 20;
            
            tooltip.innerHTML = `
                <div class="fh-chart-tooltip-value">${formatValue(point.event.value, point.event.unit)}</div>
                <div class="fh-chart-tooltip-date">${formatDisplayDate(point.event.date)}</div>
                <div class="fh-chart-tooltip-status fh-status-${normalizeStatus(point.event.status)}">${point.event.status}</div>
            `;
            tooltip.style.left = `${tooltipX}px`;
            tooltip.style.top = `${tooltipY}px`;
            tooltip.classList.add('fh-chart-tooltip--visible');
            
            // Scale up the dot
            circle.setAttribute('r', 8);
        });

        circle.addEventListener('mouseleave', () => {
            tooltip.classList.remove('fh-chart-tooltip--visible');
            circle.setAttribute('r', 6);
        });

        svg.appendChild(circle);
    });

    container.appendChild(svg);
    return container;
}

function createHistoryFooter(events, type) {
    const footer = document.createElement('div');
    footer.className = 'fh-bio-footer';

    const chips = document.createElement('div');
    chips.className = 'fh-history-chips';

    const maxChips = 5;
    const recentEvents = events.slice().reverse().slice(0, maxChips);

    recentEvents.forEach((event) => {
        const chip = document.createElement('span');
        chip.className = `fh-history-chip fh-status-${normalizeStatus(event.status)}`;
        chip.textContent = `${formatShortDate(event.date)} • ${formatValue(event.value, event.unit)}`;
        chips.appendChild(chip);
    });

    if (events.length > maxChips) {
        const moreChip = document.createElement('span');
        moreChip.className = 'fh-history-chip fh-history-chip--more';
        moreChip.textContent = `+${events.length - maxChips} more`;
        chips.appendChild(moreChip);
    }

    footer.appendChild(chips);

    const insight = getTrendInsight(events);
    if (insight) {
        const insightBadge = document.createElement('div');
        insightBadge.className = `fh-trend-insight fh-trend-insight--${insight.type}`;
        insightBadge.textContent = insight.text;
        footer.appendChild(insightBadge);
    }

    return footer;
}

// ===== HELPER FUNCTIONS =====

function buildTimelineEvents(biomarker) {
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

function determineBiomarkerStatus(events) {
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

function getDirectionBadge(events, classification = null) {
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

function getTrendInsight(events, classification = null) {
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

function formatReferenceInfo(type, biomarker, latestEntry) {
    const unit = latestEntry.unit || biomarker.unit || '';
    const refRange = biomarker.referenceRange || '';
    
    // If we have actual reference range data, use it
    if (refRange && refRange !== '') {
        return `Normal: ${refRange} ${unit}`.trim();
    }
    
    switch (type) {
        case 'titer-ladder':
            return 'Normal: <1:40';
        case 'categorical':
            return `Expected: ${getCategoricalExpected(latestEntry.value)}`;
        case 'threshold':
            if (String(latestEntry.value || '').includes('<')) {
                return `Target: below threshold${unit ? ' • ' + unit : ''}`;
            } else if (String(latestEntry.value || '').includes('>')) {
                return `Target: above threshold${unit ? ' • ' + unit : ''}`;
            }
            return unit ? `Threshold-based • ${unit}` : 'Threshold-based';
        case 'static':
            return 'Informational value';
        default:
            return unit ? `Units: ${unit}` : 'No reference range available';
    }
}

function getCategoricalExpected(value) {
    const str = String(value || '').toUpperCase();
    if (str.includes('NOT DETECTED') || str.includes('NEGATIVE') || str.includes('NON-REACTIVE')) {
        return 'NEGATIVE / NOT DETECTED';
    }
    if (str.includes('CLEAR')) return 'CLEAR';
    if (str.includes('NONE SEEN')) return 'NONE SEEN';
    return value;
}

function getCategoricalIcon(value, status) {
    const str = String(value || '').toUpperCase();
    if (status === 'Out of Range') return '⚠';
    if (str.includes('NOT DETECTED') || str.includes('NEGATIVE') || str.includes('NON-REACTIVE') || str.includes('NONE SEEN')) {
        return '✓';
    }
    if (str.includes('POSITIVE') || str.includes('DETECTED')) {
        return '⚠';
    }
    return 'ℹ';
}

function isOutOfRange(biomarker) {
    const events = buildTimelineEvents(biomarker);
    if (events.length === 0) return false;
    return events[events.length - 1].status === 'Out of Range';
}

function normalizeStatus(status) {
    if (!status) return 'unknown';
    return status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function formatValue(value, unit) {
    if (value === null || value === undefined || value === '') return '—';
    return unit ? `${value} ${unit}` : String(value);
}

function formatDisplayDate(dateString) {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatShortDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
    });
}

function createSVGText(text, x, y, anchor, size, color) {
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.setAttribute('text-anchor', anchor);
    textEl.setAttribute('font-size', size);
    textEl.setAttribute('fill', color);
    textEl.textContent = text;
    return textEl;
}

function injectStyles() {
    if (document.getElementById('fh-visual-styles')) return;
    const style = document.createElement('style');
    style.id = 'fh-visual-styles';
    style.textContent = `
        .fh-visual-no-scroll {
            overflow: hidden !important;
        }

        .fh-visual-overlay {
            position: fixed;
            inset: 0;
            background: rgba(20, 24, 33, 0.75);
            backdrop-filter: blur(10px);
            z-index: 2147483646;
            display: none;
            align-items: center;
            justify-content: center;
            padding: clamp(12px, 3vw, 24px);
        }

        .fh-visual-overlay--open {
            display: flex;
            animation: fhOverlayFade 0.25s ease-out;
        }

        .fh-visual-panel {
            width: min(1400px, 98vw);
            max-height: 94vh;
            background: #f6f7fb;
            border-radius: 20px;
            box-shadow: 0 30px 70px rgba(15, 23, 42, 0.4);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid rgba(102, 126, 234, 0.25);
        }

        .fh-visual-header {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 20px 28px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.18), rgba(118, 75, 162, 0.14));
            border-bottom: 1px solid rgba(102, 126, 234, 0.28);
        }

        .fh-visual-header h2 {
            margin: 0;
            font-size: 24px;
            color: #1f2a44;
            font-weight: 700;
        }

        .fh-header-controls {
            display: flex;
            gap: 16px;
            margin-left: auto;
            align-items: flex-end;
        }

        .fh-header-control {
            display: flex;
            flex-direction: column;
            gap: 6px;
            position: relative;
        }

        .fh-header-control span {
            font-size: 10px;
            font-weight: 700;
            color: #3d4a7a;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .fh-header-select {
            border: 1px solid rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.92);
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 13px;
            color: #2c3555;
            cursor: pointer;
            min-width: 160px;
            text-align: left;
            transition: all 0.2s ease;
            font-weight: 600;
        }

        .fh-header-select:hover {
            background: #ffffff;
            border-color: rgba(255, 255, 255, 0.9);
        }

        .fh-visual-close {
            margin-left: 18px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.85);
            color: #4a55a2;
            font-size: 28px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .fh-visual-close:hover {
            background: #ffffff;
            transform: scale(1.05);
        }

        .fh-print-button {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.92);
            font-size: 13px;
            color: #2c3555;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
            margin-top: auto;
        }

        .fh-print-button:hover {
            background: #ffffff;
            border-color: rgba(102, 126, 234, 0.5);
            color: #5a67ba;
        }

        .fh-print-button svg {
            width: 18px;
            height: 18px;
        }

        .fh-visual-body {
            overflow: hidden auto;
            padding: 0 28px 28px;
        }

        .fh-visual-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
            padding-top: 20px;
        }

        /* Metrics Dashboard */
        .fh-metrics-dashboard {
            display: flex;
            gap: 14px;
            flex-wrap: wrap;
            padding: 16px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.06));
            border-radius: 16px;
            border: 1px solid rgba(102, 126, 234, 0.15);
        }

        .fh-metric-card {
            flex: 1;
            min-width: 120px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            padding: 16px 12px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(48, 55, 99, 0.08);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .fh-metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(48, 55, 99, 0.12);
        }

        .fh-metric-icon {
            font-size: 18px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 10px;
            color: #5a67ba;
        }

        .fh-metric--success .fh-metric-icon {
            background: rgba(48, 196, 141, 0.15);
            color: #25a279;
        }

        .fh-metric--danger .fh-metric-icon {
            background: rgba(247, 112, 112, 0.15);
            color: #d45050;
        }

        .fh-metric--warning .fh-metric-icon {
            background: rgba(247, 178, 103, 0.15);
            color: #d4900a;
        }

        .fh-metric--score .fh-metric-icon {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
            color: #764ba2;
        }

        .fh-metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #243057;
            line-height: 1.1;
        }

        .fh-metric--success .fh-metric-value { color: #1c8f63; }
        .fh-metric--danger .fh-metric-value { color: #c94545; }
        .fh-metric--warning .fh-metric-value { color: #b87d0a; }
        .fh-metric--score .fh-metric-value { color: #5a67ba; }

        .fh-metric-label {
            font-size: 11px;
            font-weight: 600;
            color: #6a7395;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .fh-header-dropdown {
            position: absolute;
            top: calc(100% + 10px);
            left: 0;
            z-index: 40;
            width: 280px;
            background: #ffffff;
            border-radius: 14px;
            box-shadow: 0 24px 48px rgba(51, 57, 100, 0.28);
            border: 1px solid rgba(102, 126, 234, 0.25);
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .fh-dropdown-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .fh-dropdown-actions button {
            flex: 1;
            padding: 7px 10px;
            border-radius: 8px;
            border: 1px solid rgba(102, 126, 234, 0.28);
            background: rgba(102, 126, 234, 0.12);
            color: #515a94;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s ease;
            font-weight: 600;
        }

        .fh-dropdown-actions button:hover {
            background: rgba(102, 126, 234, 0.2);
        }
        
        .fh-dropdown-close {
            flex: 0 0 auto !important;
            width: 28px !important;
            height: 28px !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 20px !important;
            border-radius: 6px !important;
            background: rgba(220, 53, 69, 0.1) !important;
            border-color: rgba(220, 53, 69, 0.2) !important;
            color: #a8364a !important;
        }
        
        .fh-dropdown-close:hover {
            background: rgba(220, 53, 69, 0.18) !important;
            border-color: rgba(220, 53, 69, 0.3) !important;
        }

        .fh-dropdown-list {
            max-height: 240px;
            overflow-y: auto;
            display: grid;
            gap: 7px;
        }

        .fh-dropdown-item {
            display: flex;
            gap: 10px;
            align-items: center;
            font-size: 13px;
            color: #414674;
            cursor: pointer;
            padding: 5px 7px;
            border-radius: 7px;
            transition: background 0.2s ease;
        }

        .fh-dropdown-item:hover {
            background: rgba(102, 126, 234, 0.1);
        }

        .fh-dropdown-item input {
            accent-color: #667eea;
            cursor: pointer;
        }

        .fh-status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .fh-status-dropdown {
            width: 200px;
        }

        .fh-empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 40px;
            text-align: center;
        }

        .fh-empty-icon {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.4;
        }

        .fh-empty-title {
            font-size: 20px;
            font-weight: 700;
            color: #3d4563;
            margin-bottom: 8px;
        }

        .fh-empty-message {
            font-size: 14px;
            color: #6a7395;
            max-width: 400px;
        }

        .fh-bio-grid {
            display: grid;
            gap: 18px;
            grid-template-columns: repeat(auto-fill, minmax(520px, 1fr));
        }

        .fh-category-header {
            grid-column: 1 / -1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 20px;
            padding: 8px 4px 6px;
            border-bottom: 2px solid rgba(102, 126, 234, 0.2);
        }

        .fh-category-title-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .fh-category-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.12));
            border-radius: 8px;
            color: #5a67ba;
        }

        .fh-category-icon svg {
            width: 18px;
            height: 18px;
        }

        .fh-category-header h3 {
            margin: 0;
            font-size: 19px;
            color: #27304d;
            font-weight: 700;
        }

        .fh-category-header > span {
            font-size: 13px;
            color: #6d7391;
            font-weight: 600;
        }

        .fh-bio-card {
            border-radius: 16px;
            background: linear-gradient(145deg, #ffffff, rgba(246, 247, 251, 0.98));
            padding: 18px 20px 20px;
            box-shadow: 0 16px 40px rgba(48, 55, 99, 0.13);
            border: 1px solid rgba(102, 126, 234, 0.14);
            border-left: 4px solid #94a0be;
            display: grid;
            gap: 16px;
            transition: all 0.25s ease;
        }

        /* Gradient status borders */
        .fh-bio-card--status-in-range {
            border-left: 4px solid transparent;
            border-image: linear-gradient(to bottom, #30c48d, #25a279) 1;
        }

        .fh-bio-card--status-out-of-range {
            border-left: 4px solid transparent;
            border-image: linear-gradient(to bottom, #f77070, #d45050) 1;
            animation: borderPulse 2.5s ease-in-out infinite;
        }

        .fh-bio-card--status-improving {
            border-left: 4px solid transparent;
            border-image: linear-gradient(to bottom, #f7b267, #e5a050) 1;
        }

        .fh-bio-card--status-unknown {
            border-left: 4px solid transparent;
            border-image: linear-gradient(to bottom, #94a0be, #7a86a6) 1;
        }

        @keyframes borderPulse {
            0%, 100% { 
                box-shadow: 0 16px 40px rgba(48, 55, 99, 0.13);
            }
            50% { 
                box-shadow: 0 16px 40px rgba(48, 55, 99, 0.13), 
                            inset 0 0 0 1px rgba(247, 112, 112, 0.15);
            }
        }

        .fh-bio-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 50px rgba(48, 55, 99, 0.18);
        }

        .fh-bio-card--static {
            min-height: 140px;
        }

        .fh-bio-header {
            display: grid;
            gap: 10px;
        }

        .fh-bio-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
        }

        .fh-bio-header h4 {
            margin: 0;
            font-size: 17px;
            color: #2e3658;
            font-weight: 700;
            line-height: 1.3;
        }

        .fh-info-button {
            position: relative;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1px solid rgba(102, 126, 234, 0.3);
            background: rgba(102, 126, 234, 0.08);
            color: #5a67ba;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .fh-info-button:hover {
            background: rgba(102, 126, 234, 0.18);
            border-color: rgba(102, 126, 234, 0.5);
        }

        .fh-info-tooltip {
            display: none;
            position: absolute;
            top: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            width: 260px;
            padding: 12px 14px;
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 12px 32px rgba(48, 55, 99, 0.25);
            border: 1px solid rgba(102, 126, 234, 0.15);
            z-index: 100;
            text-align: left;
            animation: tooltipFade 0.2s ease-out;
        }

        @keyframes tooltipFade {
            from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .fh-info-button:hover .fh-info-tooltip,
        .fh-info-button:focus .fh-info-tooltip {
            display: block;
        }

        .fh-tooltip-row {
            font-size: 12px;
            color: #414674;
            line-height: 1.5;
            margin-bottom: 6px;
        }

        .fh-tooltip-row:last-child {
            margin-bottom: 0;
        }

        .fh-tooltip-row strong {
            color: #2e3658;
            font-weight: 600;
        }

        .fh-status-badge {
            padding: 6px 13px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            white-space: nowrap;
        }

        .fh-status-in-range { background: #30c48d; }
        .fh-status-out-of-range { background: #f77070; }
        .fh-status-improving { background: #f7b267; }
        .fh-status-unknown { background: #94a0be; }

        .fh-reference-info {
            font-size: 12px;
            color: #6a7395;
            font-weight: 500;
            font-style: italic;
        }

        .fh-progress-narrative {
            font-size: 12px;
            color: #5a67ba;
            font-weight: 500;
            padding: 6px 10px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.06));
            border-radius: 8px;
            margin-top: 4px;
            display: block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .fh-bio-hero {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            padding-top: 4px;
        }

        .fh-hero-value-block {
            display: grid;
            gap: 4px;
        }

        .fh-hero-value {
            font-size: 26px;
            font-weight: 700;
            color: #243057;
            line-height: 1.1;
        }

        .fh-hero-date {
            font-size: 13px;
            color: #6a7395;
            font-weight: 500;
        }

        .fh-direction {
            font-size: 13px;
            font-weight: 700;
            padding: 7px 12px;
            border-radius: 10px;
            letter-spacing: 0.02em;
        }

        .fh-direction--up {
            color: #1c8f63;
            background: rgba(48, 196, 141, 0.18);
        }

        .fh-direction--down {
            color: #d45b5b;
            background: rgba(247, 112, 112, 0.18);
        }

        .fh-direction--flat {
            color: #5a5f80;
            background: rgba(149, 156, 201, 0.18);
        }

        .fh-chart-container {
            width: 100%;
            margin: 6px 0;
            position: relative;
        }

        .fh-band-chart,
        .fh-threshold-chart,
        .fh-simple-sparkline,
        .fh-titer-ladder {
            width: 100%;
            height: auto;
        }

        /* Chart tooltip */
        .fh-chart-tooltip {
            position: absolute;
            background: #ffffff;
            border-radius: 10px;
            padding: 10px 14px;
            box-shadow: 0 8px 24px rgba(48, 55, 99, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.15);
            font-size: 12px;
            pointer-events: none;
            z-index: 50;
            opacity: 0;
            transform: translateX(-50%) translateY(4px);
            transition: opacity 0.15s ease-out, transform 0.15s ease-out;
            min-width: 100px;
            text-align: center;
        }

        .fh-chart-tooltip--visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        .fh-chart-tooltip-value {
            font-size: 16px;
            font-weight: 700;
            color: #243057;
            line-height: 1.2;
        }

        .fh-chart-tooltip-date {
            font-size: 11px;
            color: #6a7395;
            margin-top: 2px;
        }

        .fh-chart-tooltip-status {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-top: 6px;
            padding: 3px 8px;
            border-radius: 4px;
            display: inline-block;
        }

        .fh-chart-tooltip-status.fh-status-in-range {
            background: rgba(48, 196, 141, 0.15);
            color: #1c8f63;
        }

        .fh-chart-tooltip-status.fh-status-out-of-range {
            background: rgba(247, 112, 112, 0.15);
            color: #c94545;
        }

        .fh-chart-tooltip-status.fh-status-improving {
            background: rgba(247, 178, 103, 0.15);
            color: #b87d0a;
        }

        /* Chart dot hover effect */
        .fh-chart-dot {
            transition: r 0.15s ease-out;
        }
        
        .fh-titer-ladder-container {
            margin: 10px 0;
        }

        .fh-categorical-timeline {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            padding: 12px 0;
        }

        .fh-cat-chip {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            border: 1px solid;
        }

        .fh-cat-chip.fh-status-in-range {
            background: rgba(48, 196, 141, 0.14);
            color: #1e805c;
            border-color: rgba(48, 196, 141, 0.3);
        }

        .fh-cat-chip.fh-status-out-of-range {
            background: rgba(247, 112, 112, 0.14);
            color: #b23e3e;
            border-color: rgba(247, 112, 112, 0.3);
        }

        .fh-cat-icon {
            font-size: 16px;
        }

        .fh-trend-insight {
            font-size: 13px;
            font-weight: 600;
            padding: 10px 14px;
            border-radius: 10px;
            display: inline-block;
            margin-top: 4px;
        }

        .fh-trend-insight--improving {
            background: rgba(247, 178, 103, 0.18);
            color: #a86b2a;
        }

        .fh-trend-insight--warning {
            background: rgba(247, 112, 112, 0.18);
            color: #b23e3e;
        }

        .fh-trend-insight--stable {
            background: rgba(48, 196, 141, 0.16);
            color: #1e805c;
        }

        .fh-trend-insight--attention {
            background: rgba(247, 112, 112, 0.14);
            color: #b23e3e;
        }

        /* Range Bar Visualization */
        .fh-range-bar-container {
            padding: 16px 0 8px;
        }

        .fh-range-bar-wrapper {
            position: relative;
            padding: 20px 0 24px;
        }

        .fh-range-bar {
            position: relative;
            height: 24px;
            border-radius: 12px;
            overflow: visible;
            background: #e8eaf3;
            transform-origin: left center;
            animation: rangeBarReveal 0.5s ease-out forwards;
        }

        @keyframes rangeBarReveal {
            from {
                transform: scaleX(0);
                opacity: 0;
            }
            to {
                transform: scaleX(1);
                opacity: 1;
            }
        }

        .fh-range-zone {
            position: absolute;
            top: 0;
            height: 100%;
        }

        .fh-range-zone--below {
            left: 0;
            background: linear-gradient(90deg, rgba(247, 178, 103, 0.3), rgba(247, 178, 103, 0.15));
            border-radius: 12px 0 0 12px;
        }

        .fh-range-zone--in-range {
            background: linear-gradient(90deg, rgba(48, 196, 141, 0.25), rgba(48, 196, 141, 0.35), rgba(48, 196, 141, 0.25));
        }

        .fh-range-zone--above {
            background: linear-gradient(90deg, rgba(247, 112, 112, 0.15), rgba(247, 112, 112, 0.3));
            border-radius: 0 12px 12px 0;
        }

        .fh-range-marker {
            position: absolute;
            top: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
            animation: markerSlide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards;
            opacity: 0;
        }

        @keyframes markerSlide {
            from {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }

        .fh-range-marker-dot {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .fh-range-marker--in-range .fh-range-marker-dot {
            background: #30c48d;
        }

        .fh-range-marker--below .fh-range-marker-dot {
            background: #f7b267;
        }

        .fh-range-marker--above .fh-range-marker-dot {
            background: #f77070;
        }

        .fh-range-labels {
            position: relative;
            height: 20px;
            margin-top: 4px;
        }

        .fh-range-label {
            position: absolute;
            transform: translateX(-50%);
            font-size: 11px;
            font-weight: 600;
            color: #6a7395;
        }

        /* Threshold Visualization */
        .fh-threshold-viz-container {
            padding: 16px 0 8px;
        }

        .fh-threshold-bar-wrapper {
            position: relative;
            padding: 20px 0 24px;
        }

        .fh-threshold-bar {
            position: relative;
            height: 24px;
            border-radius: 12px;
            background: #e8eaf3;
            overflow: visible;
        }

        .fh-threshold-zone {
            position: absolute;
            top: 0;
            height: 100%;
        }

        .fh-threshold-zone--good {
            background: rgba(48, 196, 141, 0.2);
        }

        .fh-threshold-zone--bad {
            background: rgba(247, 112, 112, 0.15);
        }

        .fh-threshold-line {
            position: absolute;
            top: -4px;
            bottom: -4px;
            width: 3px;
            background: #667eea;
            border-radius: 2px;
            transform: translateX(-50%);
        }

        .fh-threshold-marker {
            position: absolute;
            top: 50%;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transform: translate(-50%, -50%);
        }

        .fh-threshold-marker--good {
            background: #30c48d;
        }

        .fh-threshold-marker--bad {
            background: #f77070;
        }

        .fh-threshold-labels {
            position: relative;
            height: 20px;
            margin-top: 4px;
        }

        .fh-threshold-label {
            position: absolute;
            transform: translateX(-50%);
            font-size: 11px;
            font-weight: 600;
            color: #667eea;
            background: rgba(102, 126, 234, 0.1);
            padding: 2px 8px;
            border-radius: 4px;
        }

        /* Binary Pass/Fail Display */
        .fh-binary-display {
            padding: 12px 0;
        }

        .fh-binary-timeline {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .fh-binary-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            background: #f8f9fc;
            border-radius: 12px;
            border: 1px solid rgba(102, 126, 234, 0.12);
        }

        .fh-binary-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 700;
        }

        .fh-binary-icon--pass {
            background: rgba(48, 196, 141, 0.15);
            color: #1e805c;
        }

        .fh-binary-icon--fail {
            background: rgba(247, 112, 112, 0.15);
            color: #b23e3e;
        }

        .fh-binary-details {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .fh-binary-value {
            font-size: 13px;
            font-weight: 600;
            color: #2e3658;
        }

        .fh-binary-date {
            font-size: 11px;
            color: #6a7395;
        }

        /* Pattern/Grade Display */
        .fh-pattern-display {
            padding: 12px 0;
        }

        .fh-pattern-comparison {
            display: flex;
            align-items: center;
            gap: 16px;
            justify-content: center;
            padding: 16px;
            background: #f8f9fc;
            border-radius: 12px;
        }

        .fh-pattern-block {
            text-align: center;
            padding: 12px 20px;
            border-radius: 10px;
            min-width: 80px;
        }

        .fh-pattern-block--expected {
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.2);
        }

        .fh-pattern-block--match {
            background: rgba(48, 196, 141, 0.15);
            border: 2px solid rgba(48, 196, 141, 0.4);
        }

        .fh-pattern-block--mismatch {
            background: rgba(247, 112, 112, 0.15);
            border: 2px solid rgba(247, 112, 112, 0.4);
        }

        .fh-pattern-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6a7395;
            margin-bottom: 4px;
        }

        .fh-pattern-value {
            font-size: 24px;
            font-weight: 700;
            color: #2e3658;
        }

        .fh-pattern-arrow {
            font-size: 24px;
            color: #9ca3c4;
        }

        .fh-pattern-explanation {
            margin-top: 12px;
            padding: 10px 14px;
            background: rgba(102, 126, 234, 0.08);
            border-radius: 8px;
            font-size: 12px;
            color: #4a5580;
            text-align: center;
        }

        .fh-pattern-history {
            margin-top: 12px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .fh-pattern-history-item {
            font-size: 11px;
            color: #6a7395;
            background: rgba(102, 126, 234, 0.08);
            padding: 4px 10px;
            border-radius: 6px;
        }

        /* Mini Sparkline - Enlarged for better visibility */
        .fh-mini-sparkline-container {
            margin-top: 12px;
            position: relative;
        }

        .fh-mini-sparkline {
            width: 100%;
            max-width: 300px;
            height: 60px;
        }

        .fh-mini-sparkline-dot {
            transition: r 0.15s ease;
        }

        .fh-mini-sparkline-hitarea {
            cursor: pointer;
        }

        .fh-mini-sparkline-tooltip {
            position: absolute;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 13px;
            line-height: 1.4;
            color: #4a5568;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            pointer-events: none;
            z-index: 100;
            transform: translateX(-50%);
            white-space: nowrap;
        }

        .fh-mini-sparkline-tooltip strong {
            color: #2d3748;
            font-weight: 600;
            font-size: 14px;
        }

        .fh-mini-sparkline-tooltip span {
            color: #718096;
            font-size: 11px;
        }

        /* Direction Badge Variants */
        .fh-direction--warning {
            color: #b23e3e;
            background: rgba(247, 112, 112, 0.18);
        }

        .fh-direction--good {
            color: #1e805c;
            background: rgba(48, 196, 141, 0.18);
        }

        .fh-direction--changed {
            color: #7c5a11;
            background: rgba(247, 178, 103, 0.2);
        }

        /* Informational Display (no reference range) */
        .fh-informational-display {
            padding: 12px 0;
        }

        .fh-informational-notice {
            font-size: 12px;
            color: #6a7395;
            font-style: italic;
            padding: 8px 12px;
            background: rgba(102, 126, 234, 0.06);
            border-radius: 8px;
            border-left: 3px solid rgba(102, 126, 234, 0.3);
            margin-bottom: 12px;
        }

        .fh-informational-history {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .fh-informational-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #f8f9fc;
            border-radius: 8px;
        }

        .fh-informational-date {
            font-size: 12px;
            color: #6a7395;
        }

        .fh-informational-value {
            font-size: 14px;
            font-weight: 600;
            color: #2e3658;
        }

        @keyframes fhOverlayFade {
            from {
                opacity: 0;
                transform: scale(0.96);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        @media (max-width: 1200px) {
            .fh-bio-grid {
                grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
            }
        }

        @media (max-width: 768px) {
            .fh-visual-panel {
                width: 96vw;
            }
            .fh-bio-grid {
                grid-template-columns: 1fr;
            }
            .fh-bio-hero {
                flex-direction: column;
                align-items: flex-start;
            }
        }
    `;
    document.head.appendChild(style);
}

function cssEscape(value) {
    if (window.CSS && CSS.escape) {
        return CSS.escape(value);
    }
    return value.replace(/[^a-zA-Z0-9\-]/g, '_');
}

export default VisualOverlay;
