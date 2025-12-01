/**
 * Biomarker information data for tooltips and explanations
 */

// Biomarker information for tooltips
export const BIOMARKER_INFO = {
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
export function getBiomarkerInfo(name) {
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

/**
 * Get explanation for known pattern types
 */
export function getPatternExplanation(biomarkerName, value) {
    const nameUpper = biomarkerName.toUpperCase();
    const valueUpper = String(value).toUpperCase();
    
    if (nameUpper.includes('LDL PATTERN')) {
        if (valueUpper === 'A') {
            return 'Pattern A: Large, buoyant LDL particles (favorable)';
        } else if (valueUpper === 'B') {
            return 'Pattern B: Small, dense LDL particles (higher risk)';
        } else if (valueUpper === 'A/B' || valueUpper === 'AB') {
            return 'Pattern A/B: Mixed particle sizes (intermediate)';
        }
    }
    
    if (nameUpper.includes('ANA PATTERN')) {
        const patternMap = {
            'HOMOGENEOUS': 'Associated with lupus and drug-induced lupus',
            'SPECKLED': 'Associated with various autoimmune conditions',
            'NUCLEOLAR': 'Associated with scleroderma',
            'CENTROMERE': 'Associated with limited scleroderma',
            'PERIPHERAL': 'Associated with lupus'
        };
        
        for (const [pattern, desc] of Object.entries(patternMap)) {
            if (valueUpper.includes(pattern)) {
                return desc;
            }
        }
    }
    
    return null;
}

