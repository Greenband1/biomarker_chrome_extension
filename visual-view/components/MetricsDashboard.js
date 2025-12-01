/**
 * Metrics dashboard component
 */

import { CATEGORY_ICONS } from '../constants/index.js';
import { normalizeDate } from '../utils/dateUtils.js';
import { buildTimelineEvents, determineBiomarkerStatus } from '../utils/statusHelpers.js';
import { consolidateBiomarkersByName } from '../data/consolidation.js';

/**
 * Compute metrics from the dataset for the dashboard
 */
export function computeDatasetMetrics(dataset, selectedCategories, selectedDates) {
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
export function createMetricsDashboard(metrics) {
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
export function getCategoryIcon(categoryName) {
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

