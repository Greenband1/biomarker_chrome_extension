/**
 * Pattern/grade display component
 */

import { formatShortDate } from '../utils/dateUtils.js';
import { getPatternExplanation } from '../data/biomarkerInfo.js';

/**
 * Creates a pattern/grade comparison display
 */
export function createPatternGradeDisplay(events, refData, biomarker) {
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

