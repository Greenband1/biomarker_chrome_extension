// This tool is for personal, non-commercial use only. Users must be logged in and comply with the target website's Terms of Service.

/**
 * File: content.js
 * Purpose: Extract biomarker data from health service pages
 * Dependencies: None (runs in page context)
 * Last Modified: 2024
 */

const SELECTORS = {
    summaryNumbers: '[class*="biomarkerSummary-styled__Number"]',
    categoryContainer: '[class*="biomarkersRangeSection-styled__BiomarkersContainer"]', // Fixed: use BiomarkersContainer for actual biomarker containers
    categoryTitle: '[class*="biomarkersRangeSection-styled__Title"]',
    biomarkerContainer: '[class*="biomarkerResult-styled__ResultContainer"]',
    biomarkerName: '[class*="biomarkerResultRow-styled__BiomarkerName"]', // This selector should work with attribute matching
    biomarkerStatus: '[class*="biomarkerChart-styled__ResultValue"]',
    biomarkerUnit: '[class*="biomarkerChart-styled__UnitValue"]',
    sentimentBar: '[class*="SentimentBar"]',
    // Additional selectors for comprehensive data extraction
    allBiomarkers: '[class*="biomarkerResult-styled__ResultContainer"], [class*="biomarker-container"], [data-testid*="biomarker"]',
    alternativeContainers: '[class*="biomarkerSection"], [class*="biomarker-item"], [class*="test-result"]'
};

// Global storage for collected data
let biomarkerData = {};
let historicalData = {};
let currentBiomarkerElement = null;
/**
 * @description Extract all biomarker data from the current page
 * @returns {Object} Structured biomarker data with categories and results
 */
function extractBiomarkerData() {
    const data = {
        categories: {},
        summary: {
            inRange: 0,
            outOfRange: 0,
            improving: 0,
            total: 0
        },
        extractedAt: new Date().toISOString(),
        debug: {
            categoryContainersFound: 0,
            totalBiomarkersFound: 0,
            biomarkersByCategory: {}
        }
    };

    try {
        // Extract summary data
        const summaryElements = document.querySelectorAll(SELECTORS.summaryNumbers);
        console.log('Summary elements found:', summaryElements.length);
        if (summaryElements.length >= 3) {
            data.summary.inRange = parseInt(summaryElements[0]?.textContent || '0');
            data.summary.outOfRange = parseInt(summaryElements[1]?.textContent || '0');
            data.summary.improving = parseInt(summaryElements[2]?.textContent || '0');
            data.summary.total = data.summary.inRange + data.summary.outOfRange;
        }

        // Extract categories and biomarkers
        // Find the parent containers that contain both title and biomarkers
        const categoryParentContainers = document.querySelectorAll('[class*="biomarkersRangeSection-styled__BoxesContainer"]');
        console.log('Category parent containers found:', categoryParentContainers.length);
        data.debug.categoryContainersFound = categoryParentContainers.length;
        
        categoryParentContainers.forEach((parentContainer, index) => {
            // Find the category title within this parent container
            const categoryNameElement = parentContainer.querySelector(SELECTORS.categoryTitle);
            const categoryName = categoryNameElement?.textContent?.trim() || `Unknown Category ${index + 1}`;
            console.log(`Processing category: ${categoryName}`);
            
            data.categories[categoryName] = {
                biomarkers: [],
                count: 0,
                outOfRange: 0
            };

            // Extract biomarker count for this category
            const countElement = parentContainer.querySelector('[class*="biomarkersRangeDetail-styled__Detail"] span');
            if (countElement) {
                data.categories[categoryName].count = parseInt(countElement.textContent || '0');
            }

            // Extract out of range count
            const outOfRangeElement = parentContainer.querySelector('[class*="biomarkersRangeDetail-styled__OutOfRangeContainer"]');
            if (outOfRangeElement) {
                const outOfRangeText = outOfRangeElement.textContent.trim();
                const outOfRangeMatch = outOfRangeText.match(/\d+/);
                if (outOfRangeMatch) {
                    data.categories[categoryName].outOfRange = parseInt(outOfRangeMatch[0]);
                }
            }

            // Find the biomarkers container within this parent
            const biomarkersContainer = parentContainer.querySelector(SELECTORS.categoryContainer);
            if (biomarkersContainer) {
                const biomarkerElements = biomarkersContainer.querySelectorAll(SELECTORS.biomarkerContainer);
                console.log(`Biomarkers found in ${categoryName}:`, biomarkerElements.length);
                data.debug.biomarkersByCategory[categoryName] = biomarkerElements.length;
            
            biomarkerElements.forEach(biomarkerElement => {
                const biomarker = extractSingleBiomarker(biomarkerElement);
                if (biomarker) {
                    data.categories[categoryName].biomarkers.push(biomarker);
                        data.debug.totalBiomarkersFound++;
                    }
                });
            } else {
                console.log(`No biomarkers container found for category: ${categoryName}`);
                data.debug.biomarkersByCategory[categoryName] = 0;
            }
        });

        // Fallback: Try to find biomarkers that might not be in category containers
        const allBiomarkerElements = document.querySelectorAll(SELECTORS.biomarkerContainer);
        console.log('Total biomarker elements found on page:', allBiomarkerElements.length);
        
        if (allBiomarkerElements.length > data.debug.totalBiomarkersFound) {
            console.log('Found additional biomarkers outside category containers');
            const uncategorizedBiomarkers = [];
            
            allBiomarkerElements.forEach(element => {
                // Check if this biomarker is already captured in a category
                const biomarkerName = element.querySelector(SELECTORS.biomarkerName)?.textContent?.trim();
                let alreadyCaptured = false;
                
                Object.values(data.categories).forEach(category => {
                    if (category.biomarkers.some(b => b.name === biomarkerName)) {
                        alreadyCaptured = true;
                    }
                });
                
                if (!alreadyCaptured && biomarkerName) {
                    const biomarker = extractSingleBiomarker(element);
                    if (biomarker) {
                        uncategorizedBiomarkers.push(biomarker);
                    }
                }
            });
            
            if (uncategorizedBiomarkers.length > 0) {
                data.categories['Uncategorized'] = {
                    biomarkers: uncategorizedBiomarkers,
                    count: uncategorizedBiomarkers.length,
                    outOfRange: 0
                };
                console.log('Added uncategorized biomarkers:', uncategorizedBiomarkers.length);
            }
        }

    } catch (error) {
        console.error('Error extracting biomarker data:', error);
        data.debug.error = error.message;
    }

    console.log('Final extraction summary:', {
        categories: Object.keys(data.categories).length,
        totalBiomarkers: Object.values(data.categories).reduce((sum, cat) => sum + cat.biomarkers.length, 0),
        debug: data.debug
    });

    return data;
}

/**
 * @description Extract data from a single biomarker element
 * @param {HTMLElement} element - The biomarker container element
 * @returns {Object|null} Biomarker data object or null if extraction fails
 */
function extractSingleBiomarker(element) {
    try {
        const nameElement = element.querySelector(SELECTORS.biomarkerName);
        const name = nameElement?.textContent?.trim();
        
        if (!name) return null;

        const biomarker = {
            name: name,
            status: 'Unknown',
            value: null,
            unit: null,
            historicalValues: []
        };

        // Extract status (In Range, Out of Range, etc.)
        const statusElements = element.querySelectorAll(SELECTORS.biomarkerStatus);
        statusElements.forEach(el => {
            const text = el.textContent.trim();
            if (text === 'In Range' || text === 'Out of Range') {
                biomarker.status = text;
            } else if (text && !biomarker.value) {
                biomarker.value = text;
            }
        });

        // Extract unit if present
        const unitElement = element.querySelector(SELECTORS.biomarkerUnit);
        if (unitElement) {
            biomarker.unit = unitElement.textContent.trim();
        }

        // Check for chart data (historical values)
        const chartContainer = element.querySelector('.recharts-wrapper');
        if (chartContainer) {
            biomarker.hasChart = true;
            // Associate the element for hover triggering
            biomarker.element = element;
        }

        // Extract sentiment (color indicator)
        const sentimentBar = element.querySelector(SELECTORS.sentimentBar);
        if (sentimentBar) {
            const className = sentimentBar.className;
            if (className.includes('cFpncA')) {
                biomarker.sentiment = 'green';
            } else if (className.includes('dnlZMP')) {
                biomarker.sentiment = 'red';
            } else if (className.includes('hZZXAW')) {
                biomarker.sentiment = 'gray';
            }
        }

        return biomarker;

    } catch (error) {
        console.error('Error extracting single biomarker:', error);
        return null;
    }
}






/**
 * @description Convert biomarker data to CSV format
 * @param {Object} data - The biomarker data object
 * @returns {string} CSV formatted string
 */
function convertToCSV(data) {
    const rows = [];
    
    // Header row
    rows.push(['Category', 'Biomarker', 'Status', 'Value', 'Unit', 'Reference Range', 'Date']);
    
    // Data rows - collect all biomarkers with category info
    const allBiomarkers = [];
    Object.entries(data.categories).forEach(([categoryName, category]) => {
        category.biomarkers.forEach(biomarker => {
            // Get reference range from biomarker (available from results-report API)
            const referenceRange = biomarker.referenceRange || '';
            
            // Check if biomarker has historical values
            if (biomarker.historicalValues && Array.isArray(biomarker.historicalValues) && biomarker.historicalValues.length > 0) {
                // Create a row for each historical value
                biomarker.historicalValues.forEach(historicalValue => {
                    allBiomarkers.push({
                        category: categoryName,
                        name: biomarker.name,
                        status: historicalValue.status || biomarker.status,
                        value: historicalValue.value || biomarker.value || '',
                        unit: historicalValue.unit || biomarker.unit || '',
                        referenceRange: referenceRange,
                        date: historicalValue.date || ''
                    });
                });
            } else {
                // Fallback to biomarker-level data if no historical values
                allBiomarkers.push({
                    category: categoryName,
                    name: biomarker.name,
                    status: biomarker.status,
                    value: biomarker.value || '',
                    unit: biomarker.unit || '',
                    referenceRange: referenceRange,
                    date: biomarker.date || ''
                });
            }
        });
    });
    
    // Sort by Category (A-Z), then Biomarker (A-Z), then Date (A-Z)
    allBiomarkers.sort((a, b) => {
        // First sort by category
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) return categoryCompare;
        
        // Then by biomarker name
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        
        // Finally by date (treat empty dates as earliest)
        const dateA = a.date || '1900-01-01';
        const dateB = b.date || '1900-01-01';
        return dateA.localeCompare(dateB);
    });
    
    // Add sorted rows
    allBiomarkers.forEach(biomarker => {
        rows.push([
            biomarker.category,
            biomarker.name,
            biomarker.status,
            biomarker.value,
            biomarker.unit,
            biomarker.referenceRange,
            biomarker.date
        ]);
    });
    
    // Convert to CSV string
    return rows.map(row => 
        row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma
            const escaped = String(cell).replace(/"/g, '""');
            return escaped.includes(',') ? `"${escaped}"` : escaped;
        }).join(',')
    ).join('\n');
}

/**
 * @description Convert biomarker data to table format for clipboard
 * @param {Object} data - The biomarker data object
 * @returns {string} Tab-separated table string
 */
function convertToTable(data) {
    const rows = [];
    
    // Header row
    rows.push(['Category', 'Biomarker', 'Status', 'Value', 'Unit', 'Date'].join('\t'));
    
    // Data rows - collect all biomarkers with category info
    const allBiomarkers = [];
    Object.entries(data.categories).forEach(([categoryName, category]) => {
        category.biomarkers.forEach(biomarker => {
            // Check if biomarker has historical values
            if (biomarker.historicalValues && Array.isArray(biomarker.historicalValues) && biomarker.historicalValues.length > 0) {
                // Create a row for each historical value
                biomarker.historicalValues.forEach(historicalValue => {
                    allBiomarkers.push({
                        category: categoryName,
                        name: biomarker.name,
                        status: historicalValue.status || biomarker.status,
                        value: historicalValue.value || biomarker.value || '',
                        unit: historicalValue.unit || biomarker.unit || '',
                        date: historicalValue.date || ''
                    });
                });
            } else {
                // Fallback to biomarker-level data if no historical values
                allBiomarkers.push({
                    category: categoryName,
                    name: biomarker.name,
                    status: biomarker.status,
                    value: biomarker.value || '',
                    unit: biomarker.unit || '',
                    date: biomarker.date || ''
                });
            }
        });
    });
    
    // Sort by Category (A-Z), then Biomarker (A-Z), then Date (A-Z)
    allBiomarkers.sort((a, b) => {
        // First sort by category
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) return categoryCompare;
        
        // Then by biomarker name
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        
        // Finally by date (treat empty dates as earliest)
        const dateA = a.date || '1900-01-01';
        const dateB = b.date || '1900-01-01';
        return dateA.localeCompare(dateB);
    });
    
    // Add sorted rows
    allBiomarkers.forEach(biomarker => {
        rows.push([
            biomarker.category,
            biomarker.name,
            biomarker.status,
            biomarker.value,
            biomarker.unit,
            biomarker.date
        ].join('\t'));
    });
    
    return rows.join('\n');
}





// Message listener for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request.action);
    
    switch(request.action) {
        case 'ping':
            sendResponse({ pong: true });
            break;
        
        case 'extractData':
            const data = extractBiomarkerData();
            sendResponse({ success: true, data: data });
            break;
        
        case 'getCSV':
            const csv = convertToCSV(request.data);
            sendResponse({ success: true, csv: csv });
            break;
        
        case 'getTable':
            const table = convertToTable(request.data);
            sendResponse({ success: true, table: table });
            break;
        
        case 'extractViaAPI':
            // Check if final API extractor is available
            if (typeof window.extractViaFinalAPI === 'function') {
                window.extractViaFinalAPI().then(data => {
                    sendResponse({ success: true, data: data });
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
            } else {
                sendResponse({ success: false, error: 'Final API extractor not loaded. Please try again.' });
            }
            return true; // Will respond asynchronously
        
        case 'extractCurrentOnly':
            // Check if current-only API extractor is available
            if (typeof window.extractCurrentResultsOnly === 'function') {
                window.extractCurrentResultsOnly().then(data => {
                    sendResponse({ success: true, data: data });
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
            } else {
                sendResponse({ success: false, error: 'Current-only API extractor not loaded. Please try again.' });
            }
            return true; // Will respond asynchronously
        
        case 'fhOpenVisualView':
            ensureVisualOverlayModule()
                .then(() => {
                    if (window.FHVisualOverlay && typeof window.FHVisualOverlay.open === 'function') {
                        window.FHVisualOverlay.open(request.payload);
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: 'Visual overlay unavailable' });
                    }
                })
                .catch(error => {
                    console.error('Failed to load visual overlay', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // async response
        
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
    
    return true; // Keep the message channel open for async response
});



console.log('Function Health content script loaded and ready');

let visualOverlayModulePromise = null;

function ensureVisualOverlayModule() {
    if (!visualOverlayModulePromise) {
        visualOverlayModulePromise = import(chrome.runtime.getURL('visual-view/visual-overlay.js'))
            .then((module) => {
                if (module && module.default) {
                    window.FHVisualOverlay = module.default;
                }
            });
    }
    return visualOverlayModulePromise;
}