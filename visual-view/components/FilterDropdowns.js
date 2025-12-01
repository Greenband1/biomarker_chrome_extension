/**
 * Filter dropdown components for the visual overlay
 */

import { formatDisplayDate } from '../utils/dateUtils.js';
import { extractAllDates } from '../data/consolidation.js';

/**
 * Create filter dropdown controls for the header
 * Returns an object with methods to manage dropdowns
 */
export function createFilterControls(overlay, dataset) {
    return {
        createCategoryDropdown: (anchorButton, categories, selectedCategories, onUpdate) => {
            return createGenericDropdown({
                anchorButton,
                items: categories,
                selectedItems: selectedCategories,
                onUpdate,
                formatItem: (name) => name,
                title: 'Categories'
            });
        },
        
        createDateDropdown: (anchorButton, dates, selectedDates, onUpdate) => {
            return createGenericDropdown({
                anchorButton,
                items: dates,
                selectedItems: selectedDates,
                onUpdate,
                formatItem: formatDisplayDate,
                title: 'Test Dates'
            });
        },
        
        createStatusDropdown: (anchorButton, selectedStatuses, onUpdate) => {
            const statusOptions = [
                { id: 'in-range', label: 'In Range', color: '#30c48d' },
                { id: 'out-of-range', label: 'Out of Range', color: '#f77070' },
                { id: 'improving', label: 'Improving', color: '#f7b267' }
            ];
            
            return createStatusDropdownElement(anchorButton, statusOptions, selectedStatuses, onUpdate);
        }
    };
}

/**
 * Generic dropdown builder
 */
function createGenericDropdown({ anchorButton, items, selectedItems, onUpdate, formatItem, title }) {
    const dropdown = document.createElement('div');
    dropdown.className = 'fh-header-dropdown';

    const actions = document.createElement('div');
    actions.className = 'fh-dropdown-actions';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.textContent = 'Select all';
    selectAllBtn.addEventListener('click', () => {
        items.forEach((item) => selectedItems.add(item));
        onUpdate();
        buildList();
    });

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
        selectedItems.clear();
        onUpdate();
        buildList();
    });
    
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'fh-dropdown-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close dropdown');

    actions.appendChild(selectAllBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(closeBtn);

    const list = document.createElement('div');
    list.className = 'fh-dropdown-list';

    const buildList = () => {
        list.innerHTML = '';
        items.forEach((item) => {
            const itemEl = document.createElement('label');
            itemEl.className = 'fh-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedItems.has(item);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedItems.add(item);
                } else {
                    selectedItems.delete(item);
                }
                onUpdate();
            });

            itemEl.appendChild(checkbox);
            const span = document.createElement('span');
            span.textContent = formatItem(item);
            itemEl.appendChild(span);
            list.appendChild(itemEl);
        });
    };

    dropdown.appendChild(actions);
    dropdown.appendChild(list);
    buildList();

    return { dropdown, closeBtn, buildList };
}

/**
 * Status dropdown with color indicators
 */
function createStatusDropdownElement(anchorButton, statusOptions, selectedStatuses, onUpdate) {
    const dropdown = document.createElement('div');
    dropdown.className = 'fh-header-dropdown fh-status-dropdown';

    const actions = document.createElement('div');
    actions.className = 'fh-dropdown-actions';

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.textContent = 'Select all';
    selectAllBtn.addEventListener('click', () => {
        statusOptions.forEach(opt => selectedStatuses.add(opt.id));
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
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close dropdown');

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
                if (checkbox.checked) {
                    selectedStatuses.add(id);
                } else {
                    selectedStatuses.delete(id);
                }
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

    return { dropdown, closeBtn, buildList };
}

/**
 * Update category button text based on selection
 */
export function updateCategoryButtonText(button, selectedCategories, allCategories) {
    if (!button) return;
    
    let label;
    if (selectedCategories.size === 0) {
        label = 'None selected';
    } else if (selectedCategories.size === allCategories.length) {
        label = 'All categories';
    } else {
        label = `${selectedCategories.size} selected`;
    }
    button.textContent = label;
}

/**
 * Update date button text based on selection
 */
export function updateDateButtonText(button, selectedDates, allDates) {
    if (!button) return;
    
    let label;
    if (selectedDates.size === 0) {
        label = 'None selected';
    } else if (selectedDates.size === allDates.length) {
        label = 'All dates';
    } else {
        label = `${selectedDates.size} selected`;
    }
    button.textContent = label;
}

/**
 * Update status button text based on selection
 */
export function updateStatusButtonText(button, selectedStatuses) {
    if (!button) return;
    
    let label;
    if (selectedStatuses.size === 0) {
        label = 'None selected';
    } else if (selectedStatuses.size === 3) {
        label = 'All statuses';
    } else {
        const labels = [];
        if (selectedStatuses.has('in-range')) labels.push('In Range');
        if (selectedStatuses.has('out-of-range')) labels.push('Out of Range');
        if (selectedStatuses.has('improving')) labels.push('Improving');
        label = labels.join(', ');
    }
    button.textContent = label;
}

