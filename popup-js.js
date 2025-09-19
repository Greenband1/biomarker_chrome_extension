/**
 * File: popup.js
 * Purpose: Handle user interactions in the extension popup
 * Dependencies: Chrome Extension APIs
 * Last Modified: 2024
 */

// New unified state management system
const appState = {
    extractionStatus: 'idle', // 'idle', 'extracting', 'completed', 'error'
    extractedData: null,
    filteredData: null,
    extractionScope: 'full', // Always full now
    showAdvancedFilters: false,
    filtersApplied: false,
    availableDates: [],
    availableCategories: [],
    // Session-only filter state (resets on popup close/reopen)
    sessionFilters: {
        selectedDates: [],
        selectedCategories: [],
        latestOnly: false
    }
};

// Legacy variables for compatibility during transition
let extractedData = null;
let filteredData = null;

/**
 * @description Update application state and trigger UI updates
 * @param {Object} updates - State updates to apply
 */
function setState(updates) {
    Object.assign(appState, updates);
    updateUIState();
    
    // Sync legacy variables
    extractedData = appState.extractedData;
    filteredData = appState.filteredData;
}

/**
 * @description Update UI based on current application state
 */
function updateUIState() {
    updateButtonState();
    updateExportZone();
    updateAdvancedFilters();
}

/**
 * @description Update primary button state based on extraction status
 */
function updateButtonState() {
    const button = document.getElementById('extractButton');
    if (!button) return;
    
    const buttonText = button.querySelector('.button-text');
    const spinner = button.querySelector('.button-spinner');
    
    switch (appState.extractionStatus) {
        case 'idle':
            button.disabled = false;
            button.classList.remove('loading');
            if (buttonText) buttonText.textContent = 'Extract My Biomarkers';
            if (spinner) spinner.style.display = 'none';
            break;
            
        case 'extracting':
            button.disabled = true;
            button.classList.add('loading');
            if (buttonText) buttonText.textContent = 'Extracting...';
            if (spinner) spinner.style.display = 'inline-block';
            break;
            
        case 'completed':
            button.disabled = false;
            button.classList.remove('loading');
            if (buttonText) buttonText.textContent = 'Extract Again';
            if (spinner) spinner.style.display = 'none';
            break;
            
        case 'error':
            button.disabled = false;
            button.classList.remove('loading');
            if (buttonText) buttonText.textContent = 'Try Again';
            if (spinner) spinner.style.display = 'none';
            break;
    }
}

/**
 * @description Update export zone visibility
 */
function updateExportZone() {
    const exportZone = document.getElementById('exportZone');
    
    if (appState.extractionStatus === 'completed' && appState.extractedData) {
        // Show export zone without redundant success message
        if (exportZone) {
            exportZone.style.display = 'block';
        }
    } else {
        if (exportZone) {
            exportZone.style.display = 'none';
        }
    }
}

/**
 * @description Update advanced filters section and button state
 */
function updateAdvancedFilters() {
    const advancedFilters = document.getElementById('advancedFilters');
    const advancedToggle = document.getElementById('advancedToggle');
    
    // Update expandable section
    if (advancedFilters) {
        if (appState.showAdvancedFilters) {
            advancedFilters.classList.add('expanded');
        } else {
            advancedFilters.classList.remove('expanded');
        }
    }
    
    // Update button text and styling based on filter state
    if (advancedToggle) {
        if (appState.filtersApplied) {
            advancedToggle.textContent = '🔧 Advanced Filters Applied';
            advancedToggle.classList.add('applied');
        } else {
            advancedToggle.textContent = '🔧 Advanced Filters';
            advancedToggle.classList.remove('applied');
        }
    }
}

/**
 * @description Validate if user is on correct page and logged in
 * @param {Object} tab - Current tab object
 * @returns {Object} Validation result with status and message
 */
async function validatePageAndLogin(tab) {
    const validation = {
        isValid: false,
        error: null,
        message: null,
        canProceed: false,
        shouldExit: false,
        shouldAutoNavigate: false
    };

    // Check if on Function Health domain
    if (!tab.url || !tab.url.includes('functionhealth.com')) {
        validation.error = 'wrong_domain';
        validation.message = 'Extension only works on functionhealth.com';
        validation.shouldExit = true;
        return validation;
    }

    // Check if on the correct biomarkers page
    const correctUrl = 'https://my.functionhealth.com/biomarkers';
    if (tab.url !== correctUrl) {
        validation.error = 'wrong_page';
        validation.message = 'Navigating to biomarkers page...';
        validation.shouldAutoNavigate = true;
        validation.keepPopupOpen = true; // New flag to keep popup visible
        return validation;
    }

    // Check if user is logged in by looking for authentication data
    try {
        // Inject a small script to check login status
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Check for common indicators of being logged in
                const userData = localStorage.getItem('userData');
                const hasAuthToken = userData && JSON.parse(userData).idToken;
                
                // Check for page elements that indicate login status
                const hasUserElements = document.querySelector('[data-testid*="user"], [class*="user"], [class*="profile"]');
                const hasLoginForm = document.querySelector('input[type="email"], input[type="password"], [class*="login"], [class*="signin"]');
                
                return {
                    hasAuthToken: !!hasAuthToken,
                    hasUserElements: !!hasUserElements,
                    hasLoginForm: !!hasLoginForm,
                    currentUrl: window.location.href,
                    pageTitle: document.title
                };
            }
        });

        const loginStatus = results[0].result;
        
        if (!loginStatus.hasAuthToken) {
            validation.error = 'not_logged_in';
            validation.message = 'Must be logged in to Function Health';
            validation.instructions = 'Log in to your Function Health account and try again';
            return validation;
        }

        // If we get here, everything looks good - silent success
        validation.isValid = true;
        validation.canProceed = true;
        // No success message - silent validation
        return validation;

    } catch (error) {
        console.error('Login validation error:', error);
        validation.error = 'validation_failed';
        validation.message = 'Unable to verify login status';
        validation.instructions = 'Please refresh the page and try again';
        return validation;
    }
}

/**
 * @description Verify if content script is responding
 * @param {number} tabId - Tab ID to check
 * @returns {Promise<boolean>} True if content script is responding
 */
async function verifyContentScript(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
                resolve(false);
            } else {
                resolve(response && response.pong === true);
            }
        });
    });
}

/**
 * @description Show a temporary notification
 * @param {string} message - The notification message
 * @param {string} type - Notification type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds (default: 2000 for success/info, 3000 for error/warning)
 */
function showNotification(message, type = 'info', duration = null) {
    const container = document.getElementById('notificationContainer');
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to container
    container.appendChild(notification);
    
    // Trigger animation
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Set duration based on type (extended by 1.5 seconds)
    const autoHideDuration = duration || (type === 'error' || type === 'warning' ? 4500 : 3500);
    
    // Auto-remove notification
        setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                container.removeChild(notification);
            }
        }, 300); // Wait for fade out animation
    }, autoHideDuration);
}

/**
 * @description Legacy function for compatibility - redirects to showNotification
 */
function updateStatus(message, type = 'info') {
    showNotification(message, type);
}

/**
 * @description Update statistics display
 * @param {Object} data - Extracted biomarker data
 */
function updateStats(data) {
    if (!data || !data.categories) return;
    
    let biomarkerCount = 0;
    let categoryCount = Object.keys(data.categories).length;
    let dateSet = new Set();
    
    Object.values(data.categories).forEach(category => {
        biomarkerCount += category.biomarkers.length;
        category.biomarkers.forEach(biomarker => {
            if (biomarker.historicalValues) {
                biomarker.historicalValues.forEach(hv => {
                    if (hv.date) dateSet.add(hv.date);
                });
            }
        });
    });
    
    const biomarkerCountEl = document.getElementById('biomarkerCount');
    const categoryCountEl = document.getElementById('categoryCount');
    const dateCountEl = document.getElementById('dateCount');
    const statsEl = document.getElementById('stats');
    
    if (biomarkerCountEl) biomarkerCountEl.textContent = biomarkerCount;
    if (categoryCountEl) categoryCountEl.textContent = categoryCount;
    if (dateCountEl) dateCountEl.textContent = dateSet.size || '1';
    if (statsEl) statsEl.style.display = 'flex';
}

/**
 * @description Show data preview
 * @param {Object} data - Extracted biomarker data
 */
function showDataPreview(data) {
    const preview = document.getElementById('dataPreview');
    const previewData = {
        summary: data.summary,
        categories: Object.keys(data.categories),
        sampleBiomarkers: []
    };
    
    // Get first 3 biomarkers as sample
    for (let category in data.categories) {
        const biomarkers = data.categories[category].biomarkers.slice(0, 1);
        previewData.sampleBiomarkers.push(...biomarkers);
        if (previewData.sampleBiomarkers.length >= 3) break;
    }
    
    preview.textContent = JSON.stringify(previewData, null, 2);
    preview.classList.add('show');
}

function updateProgressBar(progress, text = '') {
    const progressBar = document.getElementById('progressBar');
    const progressBarContainer = document.getElementById('progressBarContainer');
    
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = text || `${Math.round(progress)}%`;
    progressBarContainer.style.display = progress > 0 ? 'block' : 'none';
    if (progress >= 100) {
        setTimeout(() => {
            progressBarContainer.style.display = 'none';
        }, 2000);
    }
}

/**
 * @description Unified biomarker extraction function - always extracts full historical data
 */
async function extractMyBiomarkers() {
    const scope = 'full'; // Always extract full historical data
    
    try {
        setState({ 
            extractionStatus: 'extracting',
            extractionScope: scope 
        });
        
        showNotification('⚡ Validating page and login status...', 'info');
        
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // Validate page and login status
        const validation = await validatePageAndLogin(tab);
        
        if (!validation.canProceed) {
            setState({ extractionStatus: 'error' });
            
            // Handle different validation scenarios
            if (validation.shouldExit) {
                handlePopupExit('❌ ' + validation.message);
                return;
            }
            
            if (validation.shouldAutoNavigate) {
                handleAutoNavigation(tab, validation.keepPopupOpen);
                return;
            }
            
            // For login errors, show message and instructions
            showNotification('❌ ' + validation.message, 'error');
            if (validation.instructions) {
                setTimeout(() => {
                    showNotification('⚠️ ' + validation.instructions, 'warning');
                }, 2000);
            }
            
            return;
        }
        
        const extractionType = scope === 'current' ? 'current results' : 'historical data';
        showNotification(`🚀 Extracting ${extractionType}...`, 'info');

        // Verify content script is available
        const isContentScriptReady = await verifyContentScript(tab.id);
        if (!isContentScriptReady) {
            console.log('Content script not responding, injecting...');
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        }

        // Inject the API extractor
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['final-api-extractor.js']
        });

        // Execute extraction based on scope
        const action = scope === 'current' ? 'extractCurrentOnly' : 'extractViaAPI';
        const response = await chrome.tabs.sendMessage(tab.id, { action: action });
        
        if (response && response.success) {
            setState({ 
                extractionStatus: 'completed',
                extractedData: response.data 
            });
            
            // Analyze data for filters
            analyzeDataForFilters(response.data);
            
            const totalBiomarkers = response.data.summary?.total || 0;
            showNotification(`✅ Extraction complete! Found ${totalBiomarkers} biomarkers`, 'success');
            updateStats(response.data);
        } else {
            throw new Error(response?.error || 'Extraction failed');
        }

    } catch (error) {
        console.error('Extraction error:', error);
        setState({ extractionStatus: 'error' });
        showNotification('❌ Extraction failed: ' + error.message, 'error');
    }
}

/**
 * @description Legacy function - redirects to unified extraction
 */
async function extractData() {
    return await extractMyBiomarkers();
}

/**
 * @description Download data as CSV file
 */
async function downloadCSV() {
    if (!extractedData) {
        showNotification('⚠️ Please extract data first', 'warning');
        return;
    }
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { action: 'getCSV', data: extractedData }, (response) => {
            if (chrome.runtime.lastError) {
                showNotification('❌ Error: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            if (response && response.success) {
                const blob = new Blob([response.csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `function_health_biomarkers_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                showNotification('📥 CSV downloaded successfully!', 'success');
            }
        });
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

/**
 * @description Download data as JSON file
 */
function downloadJSON() {
    if (!extractedData) {
        showNotification('⚠️ Please extract data first', 'warning');
        return;
    }
    
    try {
        const json = JSON.stringify(extractedData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `function_health_biomarkers_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('📥 JSON downloaded successfully!', 'success');
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

/**
 * @description Copy data as CSV to clipboard
 */
async function copyTable() {
    if (!extractedData) {
        showNotification('⚠️ Please extract data first', 'warning');
        return;
    }
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { action: 'getCSV', data: extractedData }, async (response) => {
            if (chrome.runtime.lastError) {
                showNotification('❌ Error: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            if (response && response.success) {
                // Use the Clipboard API
                try {
                    await navigator.clipboard.writeText(response.csv);
                    showNotification('📋 CSV copied to clipboard!', 'success');
                } catch (err) {
                    // Fallback method
                    const textarea = document.createElement('textarea');
                    textarea.value = response.csv;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showNotification('📋 CSV copied to clipboard!', 'success');
                }
            }
        });
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}






/**
 * @description Handle auto-navigation to biomarkers page
 * @param {Object} tab - Current tab object
 * @param {boolean} keepOpen - Whether to keep popup open after navigation
 */
function handleAutoNavigation(tab, keepOpen = false) {
    showNotification('🔄 Navigating to biomarkers page...', 'info');
    
    // Auto-navigate after 1.5 seconds
    setTimeout(() => {
        chrome.tabs.update(tab.id, { url: 'https://my.functionhealth.com/biomarkers' });
        
        if (keepOpen) {
            // Keep popup open and show ready message after navigation
            setTimeout(() => {
                showNotification('✅ Ready to extract biomarkers', 'success');
                setState({ extractionStatus: 'idle' });
            }, 2000);
        } else {
            window.close(); // Close popup after navigation starts
        }
    }, 1500);
}

/**
 * @description Handle exit from popup with notification
 * @param {string} message - Message to show before exit
 */
function handlePopupExit(message) {
    showNotification(message, 'error');
    
    // Close popup after 2 seconds
    setTimeout(() => {
        window.close();
    }, 2000);
}

/**
 * @description Navigate between main and filter pages
 */
function showMainPage() {
    document.querySelector('.main-page').classList.remove('hidden');
    document.getElementById('filterPage').classList.remove('active');
    currentPage = 'main';
}

function showFilterPage() {
    document.querySelector('.main-page').classList.add('hidden');
    document.getElementById('filterPage').classList.add('active');
    currentPage = 'filter';
}

/**
 * @description Extract data and show export options
 */
async function showExportOptions() {
    try {
        showNotification('⚡ Extracting data for export options...', 'info');
        
        // First extract the full data
        await extractViaAPI();
        
        if (!extractedData) {
            showNotification('❌ Please extract data first', 'error');
            return;
        }
        
        // Analyze available dates and categories
        analyzeDataForFilters(extractedData);
        
        // Load saved filter preferences
        await loadFilterPreferences();
        
        // Populate filter interface
        populateFilterInterface();
        
        // Show filter page
        showFilterPage();
        
        // Apply current filters and update stats
        applyFilters();
        
        showNotification('✅ Ready to filter and export data', 'success');
        
    } catch (error) {
        console.error('Export options error:', error);
        showNotification('❌ Error preparing export options: ' + error.message, 'error');
    }
}

/**
 * @description Analyze extracted data to find available dates and categories
 */
function analyzeDataForFilters(data) {
    const dates = new Set();
    const categories = [];
    
    if (!data || !data.categories) return;
    
    // Get all categories
    categories.push(...Object.keys(data.categories));
    
    // Get all unique dates from historical data
    Object.values(data.categories).forEach(category => {
        category.biomarkers.forEach(biomarker => {
            if (biomarker.historicalValues && Array.isArray(biomarker.historicalValues)) {
                biomarker.historicalValues.forEach(hv => {
                    if (hv.date) {
                        dates.add(hv.date);
                    }
                });
            }
            // Also add current date if available
            if (biomarker.date) {
                dates.add(biomarker.date);
            }
        });
    });
    
    // Convert Set to sorted array and update state
    const sortedDates = Array.from(dates).sort((a, b) => new Date(b) - new Date(a)); // Most recent first
    
    setState({
        availableDates: sortedDates,
        availableCategories: categories
    });
    
    console.log('Available dates:', sortedDates.length);
    console.log('Available categories:', categories.length);
}


/**
 * @description Populate the filter interface with checkboxes (all selected by default)
 */
function populateFilterInterface() {
    // Populate date checkboxes
    const dateContainer = document.getElementById('dateCheckboxes');
    dateContainer.innerHTML = '';
    
    appState.availableDates.forEach(date => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `date-${date}`;
        checkbox.value = date;
        checkbox.checked = true; // Default to all selected
        checkbox.addEventListener('change', () => {
            updateFilterState();
        });
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = formatDate(date);
        
        div.appendChild(checkbox);
        div.appendChild(label);
        dateContainer.appendChild(div);
    });
    
    // Populate category checkboxes
    const categoryContainer = document.getElementById('categoryCheckboxes');
    categoryContainer.innerHTML = '';
    
    appState.availableCategories.forEach(category => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `category-${category.replace(/\s+/g, '-')}`;
        checkbox.value = category;
        checkbox.checked = true; // Default to all selected
        checkbox.addEventListener('change', () => {
            updateFilterState();
        });
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = category;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        categoryContainer.appendChild(div);
    });
    
    // Initialize filter state
    updateFilterState();
}

/**
 * @description Toggle latest-only mode
 */
function toggleLatestOnly() {
    console.log('🔄 toggleLatestOnly called');
    const latestOnlyButton = document.getElementById('latestOnlyToggle');
    const dateCheckboxes = document.getElementById('dateCheckboxes');
    
    if (latestOnlyButton.classList.contains('active')) {
        // Deactivate latest-only mode
        console.log('❌ Deactivating Latest Only mode');
        latestOnlyButton.classList.remove('active');
        dateCheckboxes.classList.remove('disabled');
        
        // Restore all dates selected (default state)
        document.querySelectorAll('#dateCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = true);
    } else {
        // Activate latest-only mode
        console.log('✅ Activating Latest Only mode');
        latestOnlyButton.classList.add('active');
        dateCheckboxes.classList.add('disabled');
        
        // Uncheck all date checkboxes (they're disabled anyway)
        document.querySelectorAll('#dateCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
    
    console.log('🔄 Calling updateFilterState from toggleLatestOnly');
    updateFilterState();
}

/**
 * @description Update filter state and apply filters
 */
function updateFilterState() {
    const filtersApplied = areFiltersApplied();
    console.log('Filter state update:', { filtersApplied, latestOnly: isLatestOnlyActive() });
    setState({ filtersApplied: filtersApplied });
    
    // Apply filters if any are active
    if (filtersApplied) {
        console.log('Applying filters...');
        applyFilters();
    } else {
        // No filters applied, use original data
        console.log('No filters applied, using original data');
        setState({ filteredData: null });
    }
}

/**
 * @description Format date for display
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

/**
 * @description Get selected dates from checkboxes
 */
function getSelectedDates() {
    const checkboxes = document.querySelectorAll('#dateCheckboxes input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * @description Get selected categories from checkboxes
 */
function getSelectedCategories() {
    const checkboxes = document.querySelectorAll('#categoryCheckboxes input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * @description Apply current filters to create filtered dataset
 */
function applyFilters() {
    if (!appState.extractedData) return;
    
    const latestOnlyActive = isLatestOnlyActive();
    const selectedDates = latestOnlyActive ? [] : getSelectedDates();
    const selectedCategories = getSelectedCategories();
    
    // Create filtered data structure
    const filteredData = {
        categories: {},
        summary: { inRange: 0, outOfRange: 0, improving: 0, total: 0 },
        extractedAt: appState.extractedData.extractedAt,
        debug: { ...appState.extractedData.debug, filtered: true, latestOnly: latestOnlyActive }
    };
    
    // Filter categories and biomarkers
    selectedCategories.forEach(categoryName => {
        if (appState.extractedData.categories[categoryName]) {
            const originalCategory = appState.extractedData.categories[categoryName];
            const filteredCategory = {
                biomarkers: [],
                count: 0,
                outOfRange: 0
            };
            
            // Filter biomarkers
            originalCategory.biomarkers.forEach(biomarker => {
                const filteredBiomarker = { ...biomarker };
                
                if (latestOnlyActive) {
                    // Latest-only mode: find most recent date per biomarker
                    filteredBiomarker.historicalValues = getLatestResultForBiomarker(biomarker);
                } else {
                    // Regular date filtering
                    if (biomarker.historicalValues && Array.isArray(biomarker.historicalValues)) {
                        filteredBiomarker.historicalValues = biomarker.historicalValues.filter(hv => 
                            selectedDates.includes(hv.date)
                        );
                    }
                }
                
                // Include biomarker if it has data
                const hasCurrentData = latestOnlyActive || !biomarker.date || selectedDates.includes(biomarker.date);
                const hasHistoricalData = filteredBiomarker.historicalValues && filteredBiomarker.historicalValues.length > 0;
                
                if (hasCurrentData || hasHistoricalData) {
                    filteredCategory.biomarkers.push(filteredBiomarker);
                }
            });
            
            filteredCategory.count = filteredCategory.biomarkers.length;
            filteredData.categories[categoryName] = filteredCategory;
        }
    });
    
    // Update filtered summary stats
    let totalBiomarkers = 0;
    Object.values(filteredData.categories).forEach(category => {
        totalBiomarkers += category.biomarkers.length;
        category.biomarkers.forEach(biomarker => {
            if (biomarker.status === 'In Range') filteredData.summary.inRange++;
            else if (biomarker.status === 'Out of Range') filteredData.summary.outOfRange++;
        });
    });
    
    filteredData.summary.total = totalBiomarkers;
    
    // Update state with filtered data
    setState({ filteredData: filteredData });
    
    // Update filtered stats display
    const displayDates = latestOnlyActive ? ['Latest Results'] : selectedDates;
    updateFilteredStats(displayDates, selectedCategories, totalBiomarkers);
}

/**
 * @description Get the latest result for a specific biomarker
 * @param {Object} biomarker - The biomarker object
 * @returns {Array} Array containing the most recent historical value
 */
function getLatestResultForBiomarker(biomarker) {
    if (!biomarker.historicalValues || !Array.isArray(biomarker.historicalValues) || biomarker.historicalValues.length === 0) {
        return [];
    }
    
    // Sort by date (most recent first) and return the first one
    const sortedValues = [...biomarker.historicalValues].sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date) - new Date(a.date);
    });
    
    return [sortedValues[0]];
}

/**
 * @description Update filtered stats display
 */
function updateFilteredStats(selectedDates, selectedCategories, totalBiomarkers) {
    // These elements were removed in the refactoring, so we'll skip this for now
    // The main stats are shown in the success message instead
    console.log('Filter stats:', {
        biomarkers: totalBiomarkers,
        categories: selectedCategories.length,
        dates: selectedDates.length
    });
}

/**
 * @description Show notification on filter page (same as main page now)
 */
function updateFilterStatus(message, type = 'info') {
    showNotification(message, type);
}

/**
 * @description Download filtered CSV
 */
async function downloadFilteredCSV() {
    if (!filteredData) {
        showNotification('⚠️ Please apply filters first', 'warning');
            return;
        }
        
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { action: 'getCSV', data: filteredData }, (response) => {
            if (chrome.runtime.lastError) {
                showNotification('❌ Error: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
        
        if (response && response.success) {
                const blob = new Blob([response.csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `function_health_filtered_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                showNotification('📥 Filtered CSV downloaded successfully!', 'success');
            }
        });
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

/**
 * @description Download filtered JSON
 */
function downloadFilteredJSON() {
    if (!filteredData) {
        showNotification('⚠️ Please apply filters first', 'warning');
        return;
    }
    
    try {
        const json = JSON.stringify(filteredData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `function_health_filtered_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('📥 Filtered JSON downloaded successfully!', 'success');
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

/**
 * @description Copy filtered data as CSV to clipboard
 */
async function copyFilteredData() {
    if (!filteredData) {
        showNotification('⚠️ Please apply filters first', 'warning');
        return;
    }
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { action: 'getCSV', data: filteredData }, async (response) => {
            if (chrome.runtime.lastError) {
                showNotification('❌ Error: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            if (response && response.success) {
                try {
                    await navigator.clipboard.writeText(response.csv);
                    showNotification('📋 Filtered CSV copied to clipboard!', 'success');
                } catch (err) {
                    // Fallback method
                    const textarea = document.createElement('textarea');
                    textarea.value = response.csv;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showNotification('📋 Filtered CSV copied to clipboard!', 'success');
                }
            }
        });
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

/**
 * @description Legacy function - redirects to unified extraction
 */
async function extractViaAPI() {
    return await extractMyBiomarkers();
}

/**
 * @description Unified export function for main export buttons
 * Automatically uses filtered data if filters are applied
 * @param {string} format - 'csv', 'json', or 'copy'
 */
async function exportData(format) {
    if (!appState.extractedData) {
        showNotification('⚠️ Please extract data first', 'warning');
        return;
    }
    
    // Use filtered data if filters are applied, otherwise use original data
    const data = appState.filtersApplied && appState.filteredData ? 
                 appState.filteredData : 
                 appState.extractedData;
    
    const suffix = appState.filtersApplied ? 'filtered' : '';
    
    console.log('Export data:', { 
        format, 
        filtersApplied: appState.filtersApplied, 
        hasFilteredData: !!appState.filteredData,
        usingFilteredData: data === appState.filteredData,
        latestOnly: isLatestOnlyActive()
    });
    
    switch (format) {
        case 'csv':
            await downloadCSVData(data, suffix);
            break;
        case 'json':
            downloadJSONData(data, suffix);
            break;
        case 'copy':
            await copyCSVData(data);
            break;
    }
}

/**
 * @description Check if filters are applied (any date or category unchecked, or latest-only active)
 */
function areFiltersApplied() {
    if (!appState.extractedData || appState.availableDates.length === 0 || appState.availableCategories.length === 0) {
        return false;
    }
    
    // Check if latest-only is active
    const latestOnlyActive = isLatestOnlyActive();
    if (latestOnlyActive) {
        return true;
    }
    
    const selectedDates = getSelectedDates();
    const selectedCategories = getSelectedCategories();
    
    // Filters are applied if any date or category is unchecked
    return selectedDates.length < appState.availableDates.length || 
           selectedCategories.length < appState.availableCategories.length;
}

/**
 * @description Check if latest-only toggle is active
 */
function isLatestOnlyActive() {
    const latestOnlyButton = document.getElementById('latestOnlyToggle');
    return latestOnlyButton && latestOnlyButton.classList.contains('active');
}

/**
 * @description Toggle advanced filters visibility
 * Collapses help section if both would be open to save space
 */
function toggleAdvancedFilters() {
    if (!appState.extractedData) {
        showNotification('⚠️ Please extract data first', 'warning');
        return;
    }
    
    const willShowAdvancedFilters = !appState.showAdvancedFilters;
    
    // If we're about to show Advanced Filters and help is visible, hide help
    if (willShowAdvancedFilters) {
        const helpSection = document.getElementById('helpSection');
        const isHelpVisible = helpSection.style.display !== 'none';
        
        if (isHelpVisible) {
            helpSection.style.display = 'none';
            showNotification('ℹ️ Help collapsed to show Advanced Filters', 'info');
        }
    }
    
    setState({ showAdvancedFilters: willShowAdvancedFilters });
    
    if (appState.showAdvancedFilters) {
        // Populate filters when first opened
        populateFilterInterface();
    }
}


/**
 * @description Download CSV data
 */
async function downloadCSVData(data, suffix = '') {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { action: 'getCSV', data: data }, (response) => {
            if (chrome.runtime.lastError) {
                showNotification('❌ Error: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
        
        if (response && response.success) {
                const blob = new Blob([response.csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const filename = suffix ? 
                    `function_health_${suffix}_${new Date().toISOString().split('T')[0]}.csv` :
                    `function_health_biomarkers_${new Date().toISOString().split('T')[0]}.csv`;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                showNotification('📥 CSV downloaded successfully!', 'success');
            }
        });
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

/**
 * @description Download JSON data
 */
function downloadJSONData(data, suffix = '') {
    try {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = suffix ? 
            `function_health_${suffix}_${new Date().toISOString().split('T')[0]}.json` :
            `function_health_biomarkers_${new Date().toISOString().split('T')[0]}.json`;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('📥 JSON downloaded successfully!', 'success');
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

/**
 * @description Copy CSV data to clipboard
 */
async function copyCSVData(data) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { action: 'getCSV', data: data }, async (response) => {
            if (chrome.runtime.lastError) {
                showNotification('❌ Error: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            if (response && response.success) {
                try {
                    await navigator.clipboard.writeText(response.csv);
                    showNotification('📋 CSV copied to clipboard!', 'success');
                } catch (err) {
                    // Fallback method
                    const textarea = document.createElement('textarea');
                    textarea.value = response.csv;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    showNotification('📋 CSV copied to clipboard!', 'success');
                }
            }
        });
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

/**
 * @description Toggle help section visibility
 * Collapses Advanced Filters if both would be open to save space
 */
function toggleHelp() {
    const helpSection = document.getElementById('helpSection');
    const isHelpVisible = helpSection.style.display !== 'none';
    
    if (isHelpVisible) {
        // Hide help section
        helpSection.style.display = 'none';
    } else {
        // Show help section
        helpSection.style.display = 'block';
        
        // If Advanced Filters is open, close it to save space
        if (appState.showAdvancedFilters) {
            setState({ showAdvancedFilters: false });
            showNotification('ℹ️ Advanced Filters collapsed to show help', 'info');
        }
    }
}




// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Primary extraction button
    document.getElementById('extractButton').addEventListener('click', extractMyBiomarkers);
    
    
    // Export buttons
    document.getElementById('exportCSV').addEventListener('click', () => {
        console.log('📥 CSV export button clicked');
        exportData('csv');
    });
    document.getElementById('exportJSON').addEventListener('click', () => {
        console.log('📥 JSON export button clicked');
        exportData('json');
    });
    document.getElementById('exportCopy').addEventListener('click', () => {
        console.log('📋 Copy button clicked');
        exportData('copy');
    });
    
    // Advanced filters toggle
    document.getElementById('advancedToggle').addEventListener('click', toggleAdvancedFilters);
    document.getElementById('closeAdvanced').addEventListener('click', () => {
        setState({ showAdvancedFilters: false });
    });
    
    // Filter controls
    document.getElementById('latestOnlyToggle').addEventListener('click', toggleLatestOnly);
    document.getElementById('selectAllDates').addEventListener('click', () => {
        document.querySelectorAll('#dateCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = true);
        updateFilterState();
    });
    document.getElementById('selectNoDates').addEventListener('click', () => {
        document.querySelectorAll('#dateCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateFilterState();
    });
    document.getElementById('selectAllCategories').addEventListener('click', () => {
        document.querySelectorAll('#categoryCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = true);
        updateFilterState();
    });
    document.getElementById('selectNoCategories').addEventListener('click', () => {
        document.querySelectorAll('#categoryCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateFilterState();
    });
    
    
    // Close button
    document.getElementById('closeButton').addEventListener('click', () => window.close());
    
    // Help button
    document.getElementById('helpButton').addEventListener('click', toggleHelp);
    
    // Display version
    const version = chrome.runtime.getManifest().version;
    const versionEl = document.getElementById('version');
    if (versionEl) versionEl.textContent = `v${version}`;
    
    // Initialize UI state
    updateUIState();

    // Validate page and login status on popup open
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        if (tab && tab.url) {
            try {
                const validation = await validatePageAndLogin(tab);
                
                if (validation.canProceed) {
                    // Silent success - no notification needed
                    // Buttons remain enabled and ready to use
                } else {
                    // Handle different validation scenarios
                    if (validation.shouldExit) {
                        handlePopupExit('❌ ' + validation.message);
                        return;
                    }
                    
                    if (validation.shouldAutoNavigate) {
                        handleAutoNavigation(tab);
                        return;
                    }
                    
                    // For login errors, show message and instructions
                    showNotification('❌ ' + validation.message, 'error');
                    if (validation.instructions) {
                        setTimeout(() => {
                            showNotification('⚠️ ' + validation.instructions, 'warning');
                        }, 2000);
                    }
                    
                    // Disable extraction buttons if not ready
                    document.getElementById('extractData').disabled = true;
                    document.getElementById('extractAPI').disabled = true;
                }
            } catch (error) {
                console.error('Validation error on popup open:', error);
                showNotification('⚠️ Unable to validate page status', 'warning');
            }
        } else {
            showNotification('❌ Unable to access current tab', 'error');
        }
    });

    // Listener for progress updates from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'progressUpdate') {
            updateProgressBar(request.progress, request.text);
        }
    });
});