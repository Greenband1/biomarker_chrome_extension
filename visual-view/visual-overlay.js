/**
 * Visual Overlay Controller - Function Health Biomarker Visualization
 * 
 * This is the main controller module that orchestrates the visual overlay.
 * All visualization logic is imported from modular components.
 */

// Import constants
import { STATUS_COLORS, BAND_COLORS, CATEGORY_ICONS } from './constants/index.js';

// Import utilities
import { normalizeDate, formatDisplayDate, formatShortDate } from './utils/dateUtils.js';
import { formatValue, normalizeStatus, cssEscape } from './utils/formatters.js';
import { buildTimelineEvents, getBiomarkerStatusCategory } from './utils/statusHelpers.js';

// Import data layer
import { extractAllDates, consolidateBiomarkersByName } from './data/consolidation.js';

// Import components
import { createBiomarkerCard } from './components/BiomarkerCard.js';
import { computeDatasetMetrics, createMetricsDashboard, getCategoryIcon } from './components/MetricsDashboard.js';
import { createFilterControls, updateCategoryButtonText, updateDateButtonText, updateStatusButtonText } from './components/FilterDropdowns.js';
import { generatePrintReport } from './components/PrintReport.js';

/**
 * Main Visual Overlay controller object
 */
const VisualOverlay = {
    overlay: null,
    dataset: null,
    selectedCategories: new Set(),
    selectedDates: new Set(),
    selectedStatuses: new Set(['in-range', 'out-of-range', 'improving']),
    
    // Dropdown state
    categoryDropdownOpen: false,
    dateDropdownOpen: false,
    statusDropdownOpen: false,
    categoryButton: null,
    dateButton: null,
    statusButton: null,
    categoryControl: null,
    dateControl: null,
    statusControl: null,
    categoryDropdown: null,
    dateDropdown: null,
    statusDropdown: null,

    /**
     * Open the visual overlay with the given dataset
     */
    open(dataset) {
        if (!dataset || !dataset.categories) {
            console.error('[FH Visual] Cannot open visual overlay: invalid dataset');
            return;
        }

        this.dataset = dataset;
        injectStyles();
        this.ensureOverlay();

        // Initialize categories and dates
        const categoryNames = Object.keys(dataset.categories);
        this.selectedCategories = new Set(categoryNames);
        
        const dates = extractAllDates(dataset);
        this.selectedDates = new Set(dates);
        
        // Default all statuses selected
        this.selectedStatuses = new Set(['in-range', 'out-of-range', 'improving']);

        this.render();
        this.overlay.classList.add('fh-visual-overlay--open');
        document.body.classList.add('fh-visual-no-scroll');
    },

    /**
     * Close the visual overlay
     */
    close() {
        if (this.overlay) {
            this.overlay.classList.remove('fh-visual-overlay--open');
        }
        document.body.classList.remove('fh-visual-no-scroll');
        this.closeCategoryDropdown();
        this.closeDateDropdown();
        this.closeStatusDropdown();
    },

    /**
     * Ensure overlay container exists
     */
    ensureOverlay() {
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'fh-visual-overlay';
            this.overlay.id = 'fh-visual-overlay';
            document.body.appendChild(this.overlay);
        }
    },

    /**
     * Main render method
     */
    render() {
        if (!this.overlay || !this.dataset) return;

        this.overlay.innerHTML = `
            <div class="fh-visual-panel">
                <header class="fh-visual-header">
                    <h2>Your Biomarkers</h2>
                    <div class="fh-header-controls"></div>
                    <button class="fh-visual-close" aria-label="Close">&times;</button>
                </header>
                <main class="fh-visual-body">
                    <div class="fh-visual-content"></div>
                </main>
            </div>
        `;

        const closeBtn = this.overlay.querySelector('.fh-visual-close');
        closeBtn.addEventListener('click', () => this.close());

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        this.renderHeaderControls();
        this.renderCards();
    },

    /**
     * Render header controls (filters, print button)
     */
    renderHeaderControls() {
        const headerControls = this.overlay.querySelector('.fh-header-controls');
        if (!headerControls) return;
        headerControls.innerHTML = '';

        const categories = Object.keys(this.dataset.categories);
        const dates = extractAllDates(this.dataset);

        // Category dropdown
        this.categoryControl = document.createElement('div');
        this.categoryControl.className = 'fh-header-control';
        this.categoryControl.innerHTML = '<span>Categories</span>';
        
        this.categoryButton = document.createElement('button');
        this.categoryButton.type = 'button';
        this.categoryButton.className = 'fh-header-select';
        updateCategoryButtonText(this.categoryButton, this.selectedCategories, categories);
        this.categoryButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCategoryDropdown();
        });
        this.categoryControl.appendChild(this.categoryButton);
        headerControls.appendChild(this.categoryControl);

        // Date dropdown
        this.dateControl = document.createElement('div');
        this.dateControl.className = 'fh-header-control';
        this.dateControl.innerHTML = '<span>Test Dates</span>';
        
        this.dateButton = document.createElement('button');
        this.dateButton.type = 'button';
        this.dateButton.className = 'fh-header-select';
        updateDateButtonText(this.dateButton, this.selectedDates, dates);
        this.dateButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDateDropdown();
        });
        this.dateControl.appendChild(this.dateButton);
        headerControls.appendChild(this.dateControl);

        // Status dropdown
        this.statusControl = document.createElement('div');
        this.statusControl.className = 'fh-header-control';
        this.statusControl.innerHTML = '<span>Status</span>';
        
        this.statusButton = document.createElement('button');
        this.statusButton.type = 'button';
        this.statusButton.className = 'fh-header-select';
        updateStatusButtonText(this.statusButton, this.selectedStatuses);
        this.statusButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleStatusDropdown();
        });
        this.statusControl.appendChild(this.statusButton);
        headerControls.appendChild(this.statusControl);

        // Print button
        const printBtn = document.createElement('button');
        printBtn.type = 'button';
        printBtn.className = 'fh-print-button';
        printBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Report
        `;
        printBtn.addEventListener('click', () => {
            generatePrintReport(this.dataset, this.selectedCategories, this.selectedDates);
        });
        headerControls.appendChild(printBtn);
    },

    /**
     * Render biomarker cards
     */
    renderCards() {
        const contentArea = this.overlay.querySelector('.fh-visual-content');
        if (!contentArea) return;
        contentArea.innerHTML = '';

        // Metrics dashboard
        const metrics = computeDatasetMetrics(this.dataset, this.selectedCategories, this.selectedDates);
        const dashboard = createMetricsDashboard(metrics);
        contentArea.appendChild(dashboard);

        // Biomarker grid
        const grid = document.createElement('div');
        grid.className = 'fh-bio-grid';

        let hasContent = false;

        Object.entries(this.dataset.categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([categoryName, category]) => {
                if (!this.selectedCategories.has(categoryName)) return;
                if (!Array.isArray(category?.biomarkers)) return;

                const consolidatedBiomarkers = consolidateBiomarkersByName(category.biomarkers);
                
                // Filter by date and status
                const filteredBiomarkers = consolidatedBiomarkers.filter(biomarker => {
                    const filteredHistorical = biomarker.historicalValues.filter(hv => 
                        this.selectedDates.has(normalizeDate(hv.date))
                    );
                    if (filteredHistorical.length === 0) return false;
                    
                    const statusCategory = getBiomarkerStatusCategory(
                        { ...biomarker, historicalValues: filteredHistorical },
                        this.selectedDates
                    );
                    return this.selectedStatuses.has(statusCategory);
                });

                if (filteredBiomarkers.length === 0) return;

                hasContent = true;

                // Category header
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'fh-category-header';
                
                const titleWrapper = document.createElement('div');
                titleWrapper.className = 'fh-category-title-wrapper';
                
                const iconEl = document.createElement('div');
                iconEl.className = 'fh-category-icon';
                iconEl.innerHTML = getCategoryIcon(categoryName);
                
                const title = document.createElement('h3');
                title.textContent = categoryName;
                
                titleWrapper.appendChild(iconEl);
                titleWrapper.appendChild(title);
                
                const count = document.createElement('span');
                count.textContent = `${filteredBiomarkers.length} biomarkers`;
                
                categoryHeader.appendChild(titleWrapper);
                categoryHeader.appendChild(count);
                grid.appendChild(categoryHeader);

                // Biomarker cards
                filteredBiomarkers.forEach(biomarker => {
                    const filteredHistorical = biomarker.historicalValues.filter(hv => 
                        this.selectedDates.has(normalizeDate(hv.date))
                    );
                    const filteredBiomarker = { ...biomarker, historicalValues: filteredHistorical };
                    const card = createBiomarkerCard(filteredBiomarker);
                    grid.appendChild(card);
                });
            });

        if (!hasContent) {
            const emptyState = document.createElement('div');
            emptyState.className = 'fh-empty-state';
            emptyState.innerHTML = `
                <div class="fh-empty-icon">🔍</div>
                <div class="fh-empty-title">No biomarkers match your filters</div>
                <div class="fh-empty-message">Try adjusting your category, date, or status filters to see results.</div>
            `;
            contentArea.appendChild(emptyState);
        } else {
            contentArea.appendChild(grid);
        }
    },

    // Dropdown toggle methods
    toggleCategoryDropdown() {
        if (this.categoryDropdownOpen) {
            this.closeCategoryDropdown();
        } else {
            this.closeDateDropdown();
            this.closeStatusDropdown();
            this.openCategoryDropdown();
        }
    },

    toggleDateDropdown() {
        if (this.dateDropdownOpen) {
            this.closeDateDropdown();
        } else {
            this.closeCategoryDropdown();
            this.closeStatusDropdown();
            this.openDateDropdown();
        }
    },

    toggleStatusDropdown() {
        if (this.statusDropdownOpen) {
            this.closeStatusDropdown();
        } else {
            this.closeCategoryDropdown();
            this.closeDateDropdown();
            this.openStatusDropdown();
        }
    },

    openCategoryDropdown() {
        const categories = Object.keys(this.dataset.categories);
        const { dropdown, closeBtn } = createCategoryDropdown(
            categories,
            this.selectedCategories,
            () => {
                updateCategoryButtonText(this.categoryButton, this.selectedCategories, categories);
                this.renderCards();
            }
        );
        closeBtn.addEventListener('click', () => this.closeCategoryDropdown());
        this.categoryDropdown = dropdown;
        this.categoryControl.appendChild(dropdown);
        this.categoryDropdownOpen = true;
    },

    closeCategoryDropdown() {
        if (this.categoryDropdown && this.categoryDropdown.parentNode) {
            this.categoryDropdown.parentNode.removeChild(this.categoryDropdown);
        }
        this.categoryDropdown = null;
        this.categoryDropdownOpen = false;
    },

    openDateDropdown() {
        const dates = extractAllDates(this.dataset);
        const { dropdown, closeBtn } = createDateDropdown(
            dates,
            this.selectedDates,
            () => {
                updateDateButtonText(this.dateButton, this.selectedDates, dates);
                this.renderCards();
            }
        );
        closeBtn.addEventListener('click', () => this.closeDateDropdown());
        this.dateDropdown = dropdown;
        this.dateControl.appendChild(dropdown);
        this.dateDropdownOpen = true;
    },

    closeDateDropdown() {
        if (this.dateDropdown && this.dateDropdown.parentNode) {
            this.dateDropdown.parentNode.removeChild(this.dateDropdown);
        }
        this.dateDropdown = null;
        this.dateDropdownOpen = false;
    },

    openStatusDropdown() {
        const { dropdown, closeBtn } = createStatusDropdown(
            this.selectedStatuses,
            () => {
                updateStatusButtonText(this.statusButton, this.selectedStatuses);
                this.renderCards();
            }
        );
        closeBtn.addEventListener('click', () => this.closeStatusDropdown());
        this.statusDropdown = dropdown;
        this.statusControl.appendChild(dropdown);
        this.statusDropdownOpen = true;
    },

    closeStatusDropdown() {
        if (this.statusDropdown && this.statusDropdown.parentNode) {
            this.statusDropdown.parentNode.removeChild(this.statusDropdown);
        }
        this.statusDropdown = null;
        this.statusDropdownOpen = false;
    }
};

/**
 * Create category dropdown element
 */
function createCategoryDropdown(categories, selectedCategories, onUpdate) {
    const dropdown = document.createElement('div');
    dropdown.className = 'fh-header-dropdown';

    const actions = document.createElement('div');
    actions.className = 'fh-dropdown-actions';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.textContent = 'Select all';
    selectAllBtn.addEventListener('click', () => {
        categories.forEach(c => selectedCategories.add(c));
        onUpdate();
        buildList();
    });

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
        selectedCategories.clear();
        onUpdate();
        buildList();
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'fh-dropdown-close';
    closeBtn.textContent = '×';

    actions.appendChild(selectAllBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(closeBtn);

    const list = document.createElement('div');
    list.className = 'fh-dropdown-list';

    const buildList = () => {
        list.innerHTML = '';
        categories.forEach(cat => {
            const item = document.createElement('label');
            item.className = 'fh-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedCategories.has(cat);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selectedCategories.add(cat);
                else selectedCategories.delete(cat);
                onUpdate();
            });

            const span = document.createElement('span');
            span.textContent = cat;
            item.appendChild(checkbox);
            item.appendChild(span);
            list.appendChild(item);
        });
    };

    buildList();
    dropdown.appendChild(actions);
    dropdown.appendChild(list);

    return { dropdown, closeBtn };
}

/**
 * Create date dropdown element
 */
function createDateDropdown(dates, selectedDates, onUpdate) {
    const dropdown = document.createElement('div');
    dropdown.className = 'fh-header-dropdown';

    const actions = document.createElement('div');
    actions.className = 'fh-dropdown-actions';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.textContent = 'Select all';
    selectAllBtn.addEventListener('click', () => {
        dates.forEach(d => selectedDates.add(d));
        onUpdate();
        buildList();
    });

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
        selectedDates.clear();
        onUpdate();
        buildList();
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'fh-dropdown-close';
    closeBtn.textContent = '×';

    actions.appendChild(selectAllBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(closeBtn);

    const list = document.createElement('div');
    list.className = 'fh-dropdown-list';

    const buildList = () => {
        list.innerHTML = '';
        dates.forEach(date => {
            const item = document.createElement('label');
            item.className = 'fh-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedDates.has(date);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selectedDates.add(date);
                else selectedDates.delete(date);
                onUpdate();
            });

            const span = document.createElement('span');
            span.textContent = formatDisplayDate(date);
            item.appendChild(checkbox);
            item.appendChild(span);
            list.appendChild(item);
        });
    };

    buildList();
    dropdown.appendChild(actions);
    dropdown.appendChild(list);

    return { dropdown, closeBtn };
}

/**
 * Create status dropdown element
 */
function createStatusDropdown(selectedStatuses, onUpdate) {
    const dropdown = document.createElement('div');
    dropdown.className = 'fh-header-dropdown fh-status-dropdown';

    const statusOptions = [
        { id: 'in-range', label: 'In Range', color: '#30c48d' },
        { id: 'out-of-range', label: 'Out of Range', color: '#f77070' },
        { id: 'improving', label: 'Improving', color: '#f7b267' }
    ];

    const actions = document.createElement('div');
    actions.className = 'fh-dropdown-actions';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.textContent = 'Select all';
    selectAllBtn.addEventListener('click', () => {
        statusOptions.forEach(s => selectedStatuses.add(s.id));
        onUpdate();
        buildList();
    });

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
        selectedStatuses.clear();
        onUpdate();
        buildList();
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'fh-dropdown-close';
    closeBtn.textContent = '×';

    actions.appendChild(selectAllBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(closeBtn);

    const list = document.createElement('div');
    list.className = 'fh-dropdown-list';

    const buildList = () => {
        list.innerHTML = '';
        statusOptions.forEach(({ id, label, color }) => {
            const item = document.createElement('label');
            item.className = 'fh-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedStatuses.has(id);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selectedStatuses.add(id);
                else selectedStatuses.delete(id);
                onUpdate();
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

    return { dropdown, closeBtn };
}

/**
 * Inject styles - loads from external CSS file
 */
async function injectStyles() {
    if (document.getElementById('fh-visual-styles')) return;
    
    const style = document.createElement('link');
    style.id = 'fh-visual-styles';
    style.rel = 'stylesheet';
    style.href = chrome.runtime.getURL('visual-view/styles/overlay.css');
    document.head.appendChild(style);
}

export default VisualOverlay;
