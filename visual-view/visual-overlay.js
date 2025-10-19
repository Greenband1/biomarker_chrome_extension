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

const VisualOverlay = {
    container: null,
    content: null,
    header: null,
    dataCache: null,
    categoryDropdown: null,
    dateDropdown: null,
    selectedCategories: null,
    selectedDates: null,
    categoryDropdownOpen: false,
    dateDropdownOpen: false,

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

        this.renderHeaderControls(dataset);
        this.renderCards(dataset);
    },

    renderHeaderControls(dataset) {
        if (!this.headerControls) return;
        
        // Only render once
        if (this.categoryButton && this.dateButton) {
            this.updateCategoryButton(dataset);
            this.updateDateButton(dataset);
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

        this.headerControls.appendChild(categoryControl);
        this.headerControls.appendChild(dateControl);

        this.categoryButton = categoryButton;
        this.dateButton = dateButton;
        this.categoryControl = categoryControl;
        this.dateControl = dateControl;
        
        this.updateCategoryButton(dataset);
        this.updateDateButton(dataset);
    },

    toggleCategoryDropdown(dataset, anchorButton) {
        if (this.categoryDropdownOpen) {
            this.closeCategoryDropdown();
            return;
        }
        
        if (this.dateDropdownOpen) {
            this.closeDateDropdown();
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

        const list = document.createElement('div');
        list.className = 'fh-bio-grid';

        Object.entries(dataset.categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([categoryName, category]) => {
                if (!this.selectedCategories.has(categoryName)) return;
                if (!Array.isArray(category?.biomarkers) || category.biomarkers.length === 0) return;

                // Consolidate biomarkers by name
                const consolidatedBiomarkers = consolidateBiomarkersByName(category.biomarkers);
                
                // Filter biomarkers by selected dates
                const filteredBiomarkers = consolidatedBiomarkers.map(biomarker => {
                    const filteredHistorical = biomarker.historicalValues.filter(hv => 
                        this.selectedDates.has(hv.date)
                    );
                    return {
                        ...biomarker,
                        historicalValues: filteredHistorical
                    };
                }).filter(biomarker => biomarker.historicalValues.length > 0);

                if (filteredBiomarkers.length === 0) return;

                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'fh-category-header';
                categoryHeader.dataset.category = categoryName;

                const title = document.createElement('h3');
                title.textContent = categoryName;

                const meta = document.createElement('span');
                meta.textContent = `${filteredBiomarkers.length} biomarkers`;

                categoryHeader.appendChild(title);
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
            if (biomarker.date) dates.add(biomarker.date);
            if (biomarker.dateOfService) dates.add(biomarker.dateOfService);
            if (Array.isArray(biomarker.historicalValues)) {
                biomarker.historicalValues.forEach(hv => {
                    if (hv.date) dates.add(hv.date);
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
        const key = biomarker.name.trim();
        
        if (!groups[key]) {
            groups[key] = {
                name: biomarker.name,
                unit: biomarker.unit,
                referenceRange: biomarker.referenceRange,
                allResults: []
            };
        }
        
        // Add this result to the consolidated list
        groups[key].allResults.push({
            date: biomarker.date || biomarker.dateOfService,
            value: biomarker.value,
            unit: biomarker.unit || groups[key].unit,
            status: biomarker.status,
            historicalValues: biomarker.historicalValues || []
        });
        
        // Merge historical values if present
        if (Array.isArray(biomarker.historicalValues)) {
            biomarker.historicalValues.forEach(hv => {
                if (hv.date && !groups[key].allResults.some(r => r.date === hv.date)) {
                    groups[key].allResults.push({
                        date: hv.date,
                        value: hv.value,
                        unit: hv.unit || groups[key].unit,
                        status: hv.inRange === false ? 'Out of Range' : hv.status || 'In Range',
                        historicalValues: []
                    });
                }
            });
        }
    });
    
    // Convert back to biomarker objects with consolidated historical values
    const consolidated = Object.values(groups).map(group => ({
        name: group.name,
        unit: group.unit,
        referenceRange: group.referenceRange,
        historicalValues: group.allResults
            .filter(r => r.date)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(r => ({
                date: r.date,
                value: r.value,
                unit: r.unit,
                status: r.status
            })),
        // Latest values for convenience
        date: group.allResults.length > 0 ? group.allResults[group.allResults.length - 1].date : null,
        value: group.allResults.length > 0 ? group.allResults[group.allResults.length - 1].value : null,
        status: group.allResults.length > 0 ? group.allResults[group.allResults.length - 1].status : 'Unknown'
    }));
    
    console.log(`[Consolidate] Reduced to ${consolidated.length} unique biomarkers`);
    return consolidated;
}

// ===== BIOMARKER TYPE DETECTION =====

function detectBiomarkerType(biomarker) {
    const events = buildTimelineEvents(biomarker);
    
    if (events.length === 0) {
        return 'static';
    }

    if (events.length === 1) {
        const value = String(events[0].value || '').trim();
        if (isNonNumericValue(value)) {
            return 'static';
        }
    }

    const values = events.map(e => String(e.value || '').trim());
    
    // Check for titer/ratio format (1:320, 1:1280, etc.)
    const titerCount = values.filter(v => /1\s*:\s*\d+/.test(v)).length;
    if (titerCount > values.length / 2) {
        return 'titer-ladder';
    }
    
    const numericCount = values.filter(v => isNumericValue(v)).length;
    const categoricalCount = values.filter(v => isNonNumericValue(v)).length;

    if (categoricalCount > numericCount) {
        return 'categorical';
    }

    const hasThresholdOperator = values.some(v => /^[<>]/.test(v));
    if (hasThresholdOperator) {
        return 'threshold';
    }

    return 'numeric-band';
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
    if (!value) return null;
    const str = String(value).replace(/,/g, '');
    
    // Handle titer format (1:320 → 320)
    const titerMatch = str.match(/1\s*:\s*(\d+)/);
    if (titerMatch) {
        return parseFloat(titerMatch[1]);
    }
    
    // Remove operators and parse
    const cleaned = str.replace(/[<>≤≥]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
}

// ===== BIOMARKER CARD CREATION =====

function createBiomarkerCard(biomarker) {
    const events = buildTimelineEvents(biomarker);
    const type = detectBiomarkerType(biomarker);
    const latestEntry = events[events.length - 1] || {};
    
    console.log(`[Visual Card] ${biomarker.name}: type=${type}, events=${events.length}, hasRefRange=${!!biomarker.referenceRange}`);
    
    const card = document.createElement('article');
    card.className = `fh-bio-card fh-bio-card--${type}`;

    // HEADER
    const header = document.createElement('div');
    header.className = 'fh-bio-header';

    const titleRow = document.createElement('div');
    titleRow.className = 'fh-bio-title-row';

    const name = document.createElement('h4');
    name.textContent = biomarker.name;

    const status = determineBiomarkerStatus(events);
    const badge = document.createElement('span');
    badge.className = `fh-status-badge fh-status-${normalizeStatus(status)}`;
    badge.textContent = status;

    titleRow.appendChild(name);
    titleRow.appendChild(badge);
    header.appendChild(titleRow);

    const refInfo = document.createElement('div');
    refInfo.className = 'fh-reference-info';
    refInfo.textContent = formatReferenceInfo(type, biomarker, latestEntry);
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
        const direction = getDirectionBadge(events);
        if (direction) {
            hero.appendChild(direction);
        }
    }

    header.appendChild(hero);
    card.appendChild(header);

    // VISUALIZATION
    const parsedRefRange = parseReferenceRange(biomarker.referenceRange);
    console.log(`[Visual Card] ${biomarker.name}: type=${type}, events=${events.length}, refRange=`, parsedRefRange);
    
    if (type === 'titer-ladder') {
        console.log(`[Visual Card] Creating titer ladder for ${biomarker.name}`);
        const chart = createTiterLadder(events, parsedRefRange);
        card.appendChild(chart);
    } else if (type === 'numeric-band' && events.length > 1) {
        console.log(`[Visual Card] Creating band chart for ${biomarker.name}`);
        const chart = createBandChart(events, parsedRefRange);
        card.appendChild(chart);
    } else if (type === 'threshold' && events.length > 1) {
        console.log(`[Visual Card] Creating threshold chart for ${biomarker.name}`);
        const chart = createThresholdChart(events, parsedRefRange);
        card.appendChild(chart);
    } else if (type === 'categorical') {
        console.log(`[Visual Card] Creating categorical timeline for ${biomarker.name}`);
        const timeline = createCategoricalTimeline(events);
        card.appendChild(timeline);
    } else if (type === 'static') {
        console.log(`[Visual Card] Static card for ${biomarker.name}, no chart`);
        // No chart for static single-value tests
    } else {
        console.log(`[Visual Card] Creating fallback sparkline for ${biomarker.name}`);
        // Fallback simple sparkline
        const chart = createSimpleSparkline(events);
        card.appendChild(chart);
    }

    // FOOTER (trend insight only)
    if (events.length > 1) {
        const insight = getTrendInsight(events);
        if (insight) {
            const insightBadge = document.createElement('div');
            insightBadge.className = `fh-trend-insight fh-trend-insight--${insight.type}`;
            insightBadge.textContent = insight.text;
            card.appendChild(insightBadge);
        }
    }

    return card;
}

// ===== REFERENCE RANGE PARSING =====

function parseReferenceRange(rangeString) {
    if (!rangeString || rangeString === '') return null;
    
    const str = String(rangeString).trim();
    
    // Pattern: "38.5-50.0" or "38.5 - 50.0"
    const rangeMatch = str.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (rangeMatch) {
        return {
            type: 'band',
            lower: parseFloat(rangeMatch[1]),
            upper: parseFloat(rangeMatch[2])
        };
    }
    
    // Pattern: "< 5.6" or "<5.6"
    const lessThanMatch = str.match(/<\s*(\d+\.?\d*)/);
    if (lessThanMatch) {
        return {
            type: 'threshold',
            direction: 'below',
            value: parseFloat(lessThanMatch[1])
        };
    }
    
    // Pattern: "> 400" or ">400"
    const greaterThanMatch = str.match(/>\s*(\d+\.?\d*)/);
    if (greaterThanMatch) {
        return {
            type: 'threshold',
            direction: 'above',
            value: parseFloat(greaterThanMatch[1])
        };
    }
    
    return null;
}

// ===== CHART RENDERERS =====

function createTiterLadder(events, referenceRange) {
    const container = document.createElement('div');
    container.className = 'fh-chart-container fh-titer-ladder-container';

    const width = 600;
    const height = 220;
    const padding = { top: 30, right: 120, bottom: 40, left: 80 };

    // Standard titer dilution series
    const titerLevels = [40, 80, 160, 320, 640, 1280, 2560, 5120];
    
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

    // Determine which titer levels to show based on data
    const allTiterValues = titerEvents.map(e => e.titerValue);
    const minTiter = Math.min(...allTiterValues);
    const maxTiter = Math.max(...allTiterValues);
    
    const relevantLevels = titerLevels.filter(level => 
        level >= minTiter / 2 && level <= maxTiter * 2
    );

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-titer-ladder');

    const chartHeight = height - padding.top - padding.bottom;
    const chartWidth = width - padding.left - padding.right;
    const rungHeight = chartHeight / (relevantLevels.length - 1 || 1);

    // Define severity zones
    const normalThreshold = 40;
    const borderlineThreshold = 320;
    const elevatedThreshold = 640;

    // Draw severity zone backgrounds
    relevantLevels.forEach((level, index) => {
        const y = padding.top + (relevantLevels.length - 1 - index) * rungHeight;
        const nextY = index < relevantLevels.length - 1 ? y + rungHeight : height - padding.bottom;
        
        let zoneColor;
        let zoneName;
        if (level <= normalThreshold) {
            zoneColor = 'rgba(48, 196, 141, 0.08)';
            zoneName = 'Normal';
        } else if (level <= borderlineThreshold) {
            zoneColor = 'rgba(247, 178, 103, 0.08)';
            zoneName = 'Borderline';
        } else if (level <= elevatedThreshold) {
            zoneColor = 'rgba(247, 112, 112, 0.08)';
            zoneName = 'Elevated';
        } else {
            zoneColor = 'rgba(184, 51, 51, 0.10)';
            zoneName = 'High';
        }

        const zoneRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        zoneRect.setAttribute('x', padding.left);
        zoneRect.setAttribute('y', y);
        zoneRect.setAttribute('width', chartWidth);
        zoneRect.setAttribute('height', nextY - y);
        zoneRect.setAttribute('fill', zoneColor);
        svg.appendChild(zoneRect);

        // Zone label on right
        if (index === 0 || level === normalThreshold + 40 || level === borderlineThreshold + 160 || level === elevatedThreshold + 320) {
            const zoneLabel = createSVGText(zoneName, width - padding.right + 8, y + (nextY - y) / 2, 'start', 11, '#6a7395');
            zoneLabel.setAttribute('font-weight', '600');
            svg.appendChild(zoneLabel);
        }
    });

    // Draw horizontal rungs (titer levels)
    relevantLevels.forEach((level, index) => {
        const y = padding.top + (relevantLevels.length - 1 - index) * rungHeight;
        
        const rung = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        rung.setAttribute('x1', padding.left);
        rung.setAttribute('y1', y);
        rung.setAttribute('x2', padding.left + chartWidth);
        rung.setAttribute('y2', y);
        rung.setAttribute('stroke', 'rgba(102, 126, 234, 0.25)');
        rung.setAttribute('stroke-width', '1.5');
        rung.setAttribute('stroke-dasharray', '4,4');
        svg.appendChild(rung);

        // Titer label on left
        const levelLabel = createSVGText(`1:${level}`, padding.left - 8, y, 'end', 11, '#4a5580');
        levelLabel.setAttribute('alignment-baseline', 'middle');
        levelLabel.setAttribute('font-weight', '600');
        svg.appendChild(levelLabel);
    });

    // Plot data points on rungs
    titerEvents.forEach((event, index) => {
        const levelIndex = relevantLevels.indexOf(event.titerValue);
        if (levelIndex === -1) {
            // Titer not in standard levels, find closest
            const closest = relevantLevels.reduce((prev, curr) => 
                Math.abs(curr - event.titerValue) < Math.abs(prev - event.titerValue) ? curr : prev
            );
            const closestIndex = relevantLevels.indexOf(closest);
            var y = padding.top + (relevantLevels.length - 1 - closestIndex) * rungHeight;
        } else {
            var y = padding.top + (relevantLevels.length - 1 - levelIndex) * rungHeight;
        }
        
        const x = padding.left + (chartWidth / (titerEvents.length - 1 || 1)) * index;

        // Draw connector to next point
        if (index < titerEvents.length - 1) {
            const nextEvent = titerEvents[index + 1];
            const nextLevelIndex = relevantLevels.indexOf(nextEvent.titerValue);
            const nextClosestIndex = nextLevelIndex === -1 ? relevantLevels.indexOf(
                relevantLevels.reduce((prev, curr) => 
                    Math.abs(curr - nextEvent.titerValue) < Math.abs(prev - nextEvent.titerValue) ? curr : prev
                )
            ) : nextLevelIndex;
            const nextY = padding.top + (relevantLevels.length - 1 - nextClosestIndex) * rungHeight;
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

        // Titer value label above marker
        const valueLabel = createSVGText(
            event.value,
            x,
            y - 16,
            'middle',
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

    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);

    if (numericEvents.length === 0) {
        return container;
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('fh-simple-sparkline');

    const values = numericEvents.map(e => e.numericValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = numericEvents.map((event, index) => {
        const x = (width / (numericEvents.length - 1 || 1)) * index;
        const y = height - ((event.numericValue - min) / range) * height;
        return { x, y, event };
    });

    if (points.length > 1) {
        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#6471f5');
        path.setAttribute('stroke-width', '2');
        svg.appendChild(path);
    }

    points.forEach((point) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', 5);
        circle.setAttribute('fill', STATUS_COLORS[point.event.status] || STATUS_COLORS.Unknown);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
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
            if (!record?.date) return;
            entries.push({
                date: record.date,
                value: record.value ?? biomarker.value ?? '',
                unit: record.unit ?? biomarker.unit ?? '',
                status: record.status ?? biomarker.status ?? 'Unknown'
            });
        });
    }

    if (biomarker.date && !entries.some((entry) => entry.date === biomarker.date)) {
        entries.push({
            date: biomarker.date,
            value: biomarker.value ?? '',
            unit: biomarker.unit ?? '',
            status: biomarker.status ?? 'Unknown'
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

function getDirectionBadge(events) {
    if (events.length < 2) return null;
    
    const latest = events[events.length - 1];
    const previous = events[events.length - 2];
    
    // Check if this is a titer
    const isTiter = /1\s*:\s*\d+/.test(String(latest.value || ''));
    
    if (isTiter) {
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
                const fold = latestTiter / previousTiter;
                badge.className = 'fh-direction fh-direction--up';
                badge.textContent = fold >= 2 ? `▲ ${fold.toFixed(0)}× higher` : `▲ Increased`;
            } else {
                const fold = previousTiter / latestTiter;
                badge.className = 'fh-direction fh-direction--down';
                badge.textContent = fold >= 2 ? `▼ ${fold.toFixed(0)}× lower` : `▼ Decreased`;
            }
            
            return badge;
        }
    }
    
    // Standard numeric percentage change
    const numericEvents = events
        .map(e => ({ ...e, numericValue: extractNumericValue(e.value) }))
        .filter(e => e.numericValue !== null);
    
    if (numericEvents.length < 2) return null;
    
    const latestNum = numericEvents[numericEvents.length - 1].numericValue;
    const previousNum = numericEvents[numericEvents.length - 2].numericValue;
    const percentChange = ((latestNum - previousNum) / previousNum) * 100;
    
    const badge = document.createElement('div');
    
    if (Math.abs(percentChange) < 5) {
        badge.className = 'fh-direction fh-direction--flat';
        badge.textContent = '→ Stable';
    } else if (latestNum > previousNum) {
        badge.className = 'fh-direction fh-direction--up';
        badge.textContent = `▲ +${Math.abs(percentChange).toFixed(1)}%`;
    } else {
        badge.className = 'fh-direction fh-direction--down';
        badge.textContent = `▼ -${Math.abs(percentChange).toFixed(1)}%`;
    }
    
    return badge;
}

function getTrendInsight(events) {
    if (events.length < 2) return null;
    
    const latest = events[events.length - 1];
    const previous = events[events.length - 2];
    
    // Improving
    if (previous.status === 'Out of Range' && latest.status === 'In Range') {
        return {
            type: 'improving',
            text: `↗ Back in range as of ${formatShortDate(latest.date)}`
        };
    }
    
    // Recently out of range
    if (previous.status === 'In Range' && latest.status === 'Out of Range') {
        return {
            type: 'warning',
            text: `⚠ Moved out of range on ${formatShortDate(latest.date)}`
        };
    }
    
    // Stable in range
    const allInRange = events.slice(-3).every(e => e.status === 'In Range');
    if (allInRange && events.length >= 3) {
        return {
            type: 'stable',
            text: `✓ Stable across ${events.length} tests`
        };
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
            align-items: baseline;
            justify-content: space-between;
            margin-top: 20px;
            padding: 8px 4px 6px;
            border-bottom: 2px solid rgba(102, 126, 234, 0.2);
        }

        .fh-category-header h3 {
            margin: 0;
            font-size: 19px;
            color: #27304d;
            font-weight: 700;
        }

        .fh-category-header span {
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
            display: grid;
            gap: 16px;
            transition: all 0.25s ease;
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
        }

        .fh-band-chart,
        .fh-threshold-chart,
        .fh-simple-sparkline,
        .fh-titer-ladder {
            width: 100%;
            height: auto;
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
