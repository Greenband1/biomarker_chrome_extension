/**
 * Binary pass/fail display component
 */

import { formatShortDate } from '../utils/dateUtils.js';

/**
 * Creates a pass/fail display for binary categorical results
 */
export function createBinaryPassFailDisplay(events, refData) {
    const container = document.createElement('div');
    container.className = 'fh-binary-display';
    
    // Display all events as pass/fail indicators
    const timeline = document.createElement('div');
    timeline.className = 'fh-binary-timeline';
    
    events.slice().reverse().forEach((event) => {
        const item = document.createElement('div');
        item.className = 'fh-binary-item';
        
        const valueUpper = String(event.value || '').toUpperCase();
        const isPass = valueUpper.includes('NEGATIVE') || 
                      valueUpper.includes('NON-REACTIVE') || 
                      valueUpper.includes('NOT DETECTED') ||
                      valueUpper.includes('NONE SEEN') ||
                      event.status === 'In Range';
        
        const icon = document.createElement('div');
        icon.className = `fh-binary-icon ${isPass ? 'fh-binary-icon--pass' : 'fh-binary-icon--fail'}`;
        icon.textContent = isPass ? '✓' : '✗';
        
        const details = document.createElement('div');
        details.className = 'fh-binary-details';
        
        const value = document.createElement('span');
        value.className = 'fh-binary-value';
        value.textContent = event.value;
        
        const date = document.createElement('span');
        date.className = 'fh-binary-date';
        date.textContent = formatShortDate(event.date);
        
        details.appendChild(value);
        details.appendChild(date);
        
        item.appendChild(icon);
        item.appendChild(details);
        timeline.appendChild(item);
    });
    
    container.appendChild(timeline);
    return container;
}

