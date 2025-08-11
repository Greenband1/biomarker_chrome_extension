/**
 * File: popup.js
 * Purpose: Handle user interactions in the extension popup
 * Dependencies: Chrome Extension APIs
 * Last Modified: 2024
 */

let extractedData = null;

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
        canProceed: false
    };

    // Check if on Function Health domain
    if (!tab.url || !tab.url.includes('functionhealth.com')) {
        validation.error = 'wrong_domain';
        validation.message = 'Please navigate to Function Health first';
        validation.instructions = 'Go to https://my.functionhealth.com/biomarkers';
        return validation;
    }

    // Check if on the correct biomarkers page
    const correctUrl = 'https://my.functionhealth.com/biomarkers';
    if (tab.url !== correctUrl) {
        validation.error = 'wrong_page';
        validation.message = 'Please navigate to the biomarkers page';
        validation.instructions = 'Click "Go to Biomarkers Page" below or navigate to the biomarkers section';
        validation.canRedirect = true;
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
            validation.message = 'Please log in to Function Health';
            validation.instructions = 'Log in to your Function Health account and return to the biomarkers page';
            return validation;
        }

        // If we get here, everything looks good
        validation.isValid = true;
        validation.canProceed = true;
        validation.message = 'Ready to extract biomarker data';
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
 * @description Update the status message in the popup
 * @param {string} message - The status message
 * @param {string} type - Status type: 'success', 'error', 'info', 'warning'
 */
function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = type;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = '';
        }, 3000);
    }
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
    
    document.getElementById('biomarkerCount').textContent = biomarkerCount;
    document.getElementById('categoryCount').textContent = categoryCount;
    document.getElementById('dateCount').textContent = dateSet.size || '1';
    

    
    document.getElementById('stats').style.display = 'flex';
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
 * @description Extract current data using API (same as full extraction but with different messaging)
 */
async function extractData() {
    try {
        updateStatus('⚡ Validating page and login status...', 'info');
        
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // Validate page and login status
        const validation = await validatePageAndLogin(tab);
        
        if (!validation.canProceed) {
            updateStatus(validation.message, 'error');
            
            // Show specific instructions based on error type
            if (validation.instructions) {
                setTimeout(() => {
                    updateStatus(validation.instructions, 'warning');
                }, 2000);
            }
            
            // Show redirect button if applicable
            if (validation.canRedirect) {
                document.getElementById('redirectButton').style.display = 'block';
            }
            
            return;
        }
        
        updateStatus('✅ Validation passed - extracting current results...', 'info');

        // Verify content script is available
        const isContentScriptReady = await verifyContentScript(tab.id);
        if (!isContentScriptReady) {
            console.log('Content script not responding, injecting...');
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        }

        // Inject the final API extractor (uses proven userData.idToken)
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['final-api-extractor.js']
        });

        updateStatus('🚀 Extracting current data...', 'info');

        // Execute the current-only API extraction
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractCurrentOnly' });
        
        if (response && response.success) {
            extractedData = response.data;
            updateStatus(`✅ Current extraction complete! Found ${response.data.summary.total} biomarkers`, 'success');
            updateStats(response.data);
            // No preview for current results - keep it clean
        } else {
            throw new Error(response?.error || 'Current extraction failed');
        }

    } catch (error) {
        console.error('Current extraction error:', error);
        updateStatus('❌ Current extraction failed: ' + error.message, 'error');
    }
}

/**
 * @description Download data as CSV file
 */
async function downloadCSV() {
    if (!extractedData) {
        updateStatus('Please extract data first', 'warning');
        return;
    }
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { action: 'getCSV', data: extractedData }, (response) => {
            if (chrome.runtime.lastError) {
                updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
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
                updateStatus('CSV downloaded successfully!', 'success');
            }
        });
    } catch (error) {
        updateStatus('Error: ' + error.message, 'error');
    }
}

/**
 * @description Download data as JSON file
 */
function downloadJSON() {
    if (!extractedData) {
        updateStatus('Please extract data first', 'warning');
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
        updateStatus('JSON downloaded successfully!', 'success');
    } catch (error) {
        updateStatus('Error: ' + error.message, 'error');
    }
}

/**
 * @description Copy data as table to clipboard
 */
async function copyTable() {
    if (!extractedData) {
        updateStatus('Please extract data first', 'warning');
        return;
    }
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, { action: 'getTable', data: extractedData }, async (response) => {
            if (chrome.runtime.lastError) {
                updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            if (response && response.success) {
                // Use the Clipboard API
                try {
                    await navigator.clipboard.writeText(response.table);
                    updateStatus('Table copied to clipboard!', 'success');
                } catch (err) {
                    // Fallback method
                    const textarea = document.createElement('textarea');
                    textarea.value = response.table;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    updateStatus('Table copied to clipboard!', 'success');
                }
            }
        });
    } catch (error) {
        updateStatus('Error: ' + error.message, 'error');
    }
}





function redirectToBiomarkers() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        chrome.tabs.update(tab.id, { url: 'https://my.functionhealth.com/biomarkers' });
        window.close(); // Close the popup
    });
}

/**
 * @description Extract data using Function Health's REST API
 */
async function extractViaAPI() {
    try {
        updateStatus('⚡ Validating page and login status...', 'info');
        
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // Validate page and login status
        const validation = await validatePageAndLogin(tab);
        
        if (!validation.canProceed) {
            updateStatus(validation.message, 'error');
            
            // Show specific instructions based on error type
            if (validation.instructions) {
                setTimeout(() => {
                    updateStatus(validation.instructions, 'warning');
                }, 2000);
            }
            
            // Show redirect button if applicable
            if (validation.canRedirect) {
                document.getElementById('redirectButton').style.display = 'block';
            }
            
            return;
        }
        
        updateStatus('✅ Validation passed - starting extraction...', 'info');

        // Verify content script is available
        const isContentScriptReady = await verifyContentScript(tab.id);
        if (!isContentScriptReady) {
            console.log('Content script not responding, injecting...');
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        }

        // Inject the final API extractor (uses proven userData.idToken)
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['final-api-extractor.js']
        });

        updateStatus('🚀 API extractor injected, extracting data...', 'info');

        // Execute the API extraction
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractViaAPI' });
        
        if (response && response.success) {
            extractedData = response.data;
            updateStatus(`✅ API extraction complete! Found ${response.data.summary.total} biomarkers`, 'success');
            updateStats(response.data);
            // No preview for cleaner interface
        } else {
            throw new Error(response?.error || 'API extraction failed');
        }

    } catch (error) {
        console.error('API extraction error:', error);
        updateStatus('❌ API extraction failed: ' + error.message, 'error');
    }
}




// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('extractData').addEventListener('click', extractData);
    document.getElementById('extractAPI').addEventListener('click', extractViaAPI);
    document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
    document.getElementById('downloadJSON').addEventListener('click', downloadJSON);
    document.getElementById('copyTable').addEventListener('click', copyTable);
    document.getElementById('redirectButton').addEventListener('click', redirectToBiomarkers);
    document.getElementById('closeButton').addEventListener('click', () => window.close());
    
    // Display version
    const version = chrome.runtime.getManifest().version;
    document.getElementById('version').textContent = `v${version}`;

    // Validate page and login status on popup open
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
        if (tab && tab.url) {
            try {
                const validation = await validatePageAndLogin(tab);
                
                if (validation.canProceed) {
                    updateStatus(validation.message, 'success');
                } else {
                    updateStatus(validation.message, 'error');
                    
                    // Show instructions after a brief delay
                    if (validation.instructions) {
                        setTimeout(() => {
                            updateStatus(validation.instructions, 'warning');
                        }, 2000);
                    }
                    
                    // Show redirect button if applicable
                    if (validation.canRedirect) {
                        document.getElementById('redirectButton').style.display = 'block';
                    }
                    
                    // Disable extraction buttons if not ready
                    document.getElementById('extractData').disabled = true;
                    document.getElementById('extractAPI').disabled = true;
                }
            } catch (error) {
                console.error('Validation error on popup open:', error);
                updateStatus('Unable to validate page status', 'warning');
            }
        } else {
            updateStatus('Unable to access current tab', 'error');
        }
    });

    // Listener for progress updates from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'progressUpdate') {
            updateProgressBar(request.progress, request.text);
        }
    });
});