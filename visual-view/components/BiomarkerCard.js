/**
 * Biomarker card component
 */

import { formatDisplayDate } from '../utils/dateUtils.js';
import { formatValue, normalizeStatus } from '../utils/formatters.js';
import { buildTimelineEvents, determineBiomarkerStatus } from '../utils/statusHelpers.js';
import { getDirectionBadge, getTrendInsight, generateProgressNarrative } from '../utils/trendHelpers.js';
import { classifyBiomarker } from '../classification/classifier.js';
import { getBiomarkerInfo } from '../data/biomarkerInfo.js';
import { createRangeBarVisualization } from '../charts/RangeBarChart.js';
import { createThresholdVisualization } from '../charts/ThresholdChart.js';
import { createTiterLadder } from '../charts/TiterLadder.js';
import { createSimpleSparkline } from '../charts/Sparklines.js';
import { createBinaryPassFailDisplay } from '../charts/BinaryDisplay.js';
import { createPatternGradeDisplay } from '../charts/PatternDisplay.js';
import { createCategoricalTimeline } from '../charts/CategoricalTimeline.js';

/**
 * Creates a biomarker card element
 */
export function createBiomarkerCard(biomarker) {
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
export function createVisualization(classification, events, biomarker, refData) {
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
export function createInformationalDisplay(events, biomarker) {
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
export function formatReferenceInfoNew(classification, biomarker, latestEntry) {
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

// Import formatShortDate for internal use
import { formatShortDate } from '../utils/dateUtils.js';

