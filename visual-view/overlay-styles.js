/**
 * Overlay Styles Module
 * 
 * Contains CSS injection for the visual overlay display.
 * Extracted from visual-overlay.js for better maintainability.
 */

/**
 * Inject styles for the visual overlay into the document head
 * Only injects once, checks for existing style element
 */
export function injectStyles() {
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

        .fh-print-button {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.92);
            font-size: 13px;
            color: #2c3555;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
            margin-top: auto;
        }

        .fh-print-button:hover {
            background: #ffffff;
            border-color: rgba(102, 126, 234, 0.5);
            color: #5a67ba;
        }

        .fh-print-button svg {
            width: 18px;
            height: 18px;
        }

        /* Print Styles - prints the visual display directly */
        @media print {
            /* Hide the host page content */
            body > *:not(.fh-visual-overlay) {
                display: none !important;
            }
            
            /* Reset overlay - it's the backdrop */
            .fh-visual-overlay {
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                max-height: none !important;
                background: white !important;
                padding: 0 !important;
                overflow: visible !important;
            }
            
            /* KEY FIX: Reset the panel - this has max-height: 94vh that cuts off content */
            .fh-visual-panel {
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                height: auto !important;
                overflow: visible !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                background: white !important;
            }
            
            /* Hide interactive controls */
            .fh-header-controls,
            .fh-close-button,
            .fh-info-button,
            .fh-category-dropdown,
            .fh-date-dropdown,
            .fh-status-dropdown,
            .fh-print-button {
                display: none !important;
            }
            
            /* Reset the scrollable body */
            .fh-visual-body {
                overflow: visible !important;
                max-height: none !important;
                height: auto !important;
                padding: 16px !important;
            }
            
            /* Reset content container */
            .fh-visual-content {
                overflow: visible !important;
                height: auto !important;
            }
            
            /* Single column layout for reliable multi-page printing */
            .fh-bio-grid {
                display: block !important;
            }
            
            /* Card print optimization */
            .fh-bio-card {
                display: block !important;
                break-inside: avoid;
                page-break-inside: avoid;
                box-shadow: none !important;
                border: 1px solid #ccc !important;
                margin-bottom: 16px !important;
                padding: 12px !important;
                background: white !important;
            }
            
            /* Ensure visualizations don't break across pages */
            .fh-timeline-viz,
            .fh-range-chart,
            .fh-binary-display {
                break-inside: avoid;
                page-break-inside: avoid;
            }
            
            /* Header styling for print */
            .fh-visual-header {
                background: #f5f5f5 !important;
                padding: 16px !important;
                margin-bottom: 16px !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            /* Summary metrics row */
            .fh-summary-metrics {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 12px !important;
                justify-content: flex-start !important;
            }
            
            /* Ensure status colors print */
            .fh-status-in-range,
            .fh-status-badge.fh-status-in-range { 
                background: rgba(48, 196, 141, 0.2) !important;
                color: #1c8f63 !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            .fh-status-out-of-range,
            .fh-status-badge.fh-status-out-of-range { 
                background: rgba(247, 112, 112, 0.2) !important;
                color: #c94545 !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            /* Page setup */
            @page {
                margin: 0.5in;
                size: letter portrait;
            }
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

        /* Metrics Dashboard */
        .fh-metrics-dashboard {
            display: flex;
            gap: 14px;
            flex-wrap: wrap;
            padding: 16px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.06));
            border-radius: 16px;
            border: 1px solid rgba(102, 126, 234, 0.15);
        }

        .fh-metric-card {
            flex: 1;
            min-width: 120px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            padding: 16px 12px;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(48, 55, 99, 0.08);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .fh-metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(48, 55, 99, 0.12);
        }

        .fh-metric-icon {
            font-size: 18px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 10px;
            color: #5a67ba;
        }

        .fh-metric--success .fh-metric-icon {
            background: rgba(48, 196, 141, 0.15);
            color: #25a279;
        }

        .fh-metric--danger .fh-metric-icon {
            background: rgba(247, 112, 112, 0.15);
            color: #d45050;
        }

        .fh-metric--warning .fh-metric-icon {
            background: rgba(247, 178, 103, 0.15);
            color: #d4900a;
        }

        .fh-metric--score .fh-metric-icon {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
            color: #764ba2;
        }

        .fh-metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #243057;
            line-height: 1.1;
        }

        .fh-metric--success .fh-metric-value { color: #1c8f63; }
        .fh-metric--danger .fh-metric-value { color: #c94545; }
        .fh-metric--warning .fh-metric-value { color: #b87d0a; }
        .fh-metric--score .fh-metric-value { color: #5a67ba; }

        .fh-metric-label {
            font-size: 11px;
            font-weight: 600;
            color: #6a7395;
            text-transform: uppercase;
            letter-spacing: 0.05em;
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

        .fh-status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .fh-status-dropdown {
            width: 200px;
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
            align-items: center;
            justify-content: space-between;
            margin-top: 20px;
            padding: 8px 4px 6px;
            border-bottom: 2px solid rgba(102, 126, 234, 0.2);
        }

        .fh-category-title-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .fh-category-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.12));
            border-radius: 8px;
            color: #5a67ba;
        }

        .fh-category-icon svg {
            width: 18px;
            height: 18px;
        }

        .fh-category-header h3 {
            margin: 0;
            font-size: 19px;
            color: #27304d;
            font-weight: 700;
        }

        .fh-category-header > span {
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
            border-left: 4px solid #94a0be;
            display: grid;
            gap: 16px;
            transition: all 0.25s ease;
        }

        /* Gradient status borders */
        .fh-bio-card--status-in-range {
            border-left: 4px solid transparent;
            border-image: linear-gradient(to bottom, #30c48d, #25a279) 1;
        }

        .fh-bio-card--status-out-of-range {
            border-left: 4px solid transparent;
            border-image: linear-gradient(to bottom, #f77070, #d45050) 1;
            animation: borderPulse 2.5s ease-in-out infinite;
        }

        .fh-bio-card--status-improving {
            border-left: 4px solid transparent;
            border-image: linear-gradient(to bottom, #f7b267, #e5a050) 1;
        }

        .fh-bio-card--status-unknown {
            border-left: 4px solid transparent;
            border-image: linear-gradient(to bottom, #94a0be, #7a86a6) 1;
        }

        @keyframes borderPulse {
            0%, 100% { 
                box-shadow: 0 16px 40px rgba(48, 55, 99, 0.13);
            }
            50% { 
                box-shadow: 0 16px 40px rgba(48, 55, 99, 0.13), 
                            inset 0 0 0 1px rgba(247, 112, 112, 0.15);
            }
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

        .fh-info-button {
            position: relative;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1px solid rgba(102, 126, 234, 0.3);
            background: rgba(102, 126, 234, 0.08);
            color: #5a67ba;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .fh-info-button:hover {
            background: rgba(102, 126, 234, 0.18);
            border-color: rgba(102, 126, 234, 0.5);
        }

        .fh-info-tooltip {
            display: none;
            position: absolute;
            top: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            width: 260px;
            padding: 12px 14px;
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 12px 32px rgba(48, 55, 99, 0.25);
            border: 1px solid rgba(102, 126, 234, 0.15);
            z-index: 100;
            text-align: left;
            animation: tooltipFade 0.2s ease-out;
        }

        @keyframes tooltipFade {
            from { opacity: 0; transform: translateX(-50%) translateY(-4px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .fh-info-button:hover .fh-info-tooltip,
        .fh-info-button:focus .fh-info-tooltip {
            display: block;
        }

        .fh-tooltip-row {
            font-size: 12px;
            color: #414674;
            line-height: 1.5;
            margin-bottom: 6px;
        }

        .fh-tooltip-row:last-child {
            margin-bottom: 0;
        }

        .fh-tooltip-row strong {
            color: #2e3658;
            font-weight: 600;
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

        .fh-progress-narrative {
            font-size: 12px;
            color: #5a67ba;
            font-weight: 500;
            padding: 6px 10px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.06));
            border-radius: 8px;
            margin-top: 4px;
            display: block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
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
            position: relative;
        }

        .fh-band-chart,
        .fh-threshold-chart,
        .fh-simple-sparkline,
        .fh-titer-ladder {
            width: 100%;
            height: auto;
        }

        /* Chart tooltip */
        .fh-chart-tooltip {
            position: absolute;
            background: #ffffff;
            border-radius: 10px;
            padding: 10px 14px;
            box-shadow: 0 8px 24px rgba(48, 55, 99, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.15);
            font-size: 12px;
            pointer-events: none;
            z-index: 50;
            opacity: 0;
            transform: translateX(-50%) translateY(4px);
            transition: opacity 0.15s ease-out, transform 0.15s ease-out;
            min-width: 100px;
            text-align: center;
        }

        .fh-chart-tooltip--visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        .fh-chart-tooltip-value {
            font-size: 16px;
            font-weight: 700;
            color: #243057;
            line-height: 1.2;
        }

        .fh-chart-tooltip-date {
            font-size: 11px;
            color: #6a7395;
            margin-top: 2px;
        }

        .fh-chart-tooltip-status {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-top: 6px;
            padding: 3px 8px;
            border-radius: 4px;
            display: inline-block;
        }

        .fh-chart-tooltip-status.fh-status-in-range {
            background: rgba(48, 196, 141, 0.15);
            color: #1c8f63;
        }

        .fh-chart-tooltip-status.fh-status-out-of-range {
            background: rgba(247, 112, 112, 0.15);
            color: #c94545;
        }

        .fh-chart-tooltip-status.fh-status-improving {
            background: rgba(247, 178, 103, 0.15);
            color: #b87d0a;
        }

        /* Chart dot hover effect */
        .fh-chart-dot {
            transition: r 0.15s ease-out;
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

        .fh-trend-insight--attention {
            background: rgba(247, 112, 112, 0.14);
            color: #b23e3e;
        }

        /* Range Bar Visualization */
        .fh-range-bar-container {
            padding: 16px 0 8px;
        }

        .fh-range-bar-wrapper {
            position: relative;
            padding: 20px 0 24px;
        }

        .fh-range-bar {
            position: relative;
            height: 24px;
            border-radius: 12px;
            overflow: visible;
            background: #e8eaf3;
            transform-origin: left center;
            animation: rangeBarReveal 0.5s ease-out forwards;
        }

        @keyframes rangeBarReveal {
            from {
                transform: scaleX(0);
                opacity: 0;
            }
            to {
                transform: scaleX(1);
                opacity: 1;
            }
        }

        .fh-range-zone {
            position: absolute;
            top: 0;
            height: 100%;
        }

        .fh-range-zone--below {
            left: 0;
            background: linear-gradient(90deg, rgba(247, 178, 103, 0.3), rgba(247, 178, 103, 0.15));
            border-radius: 12px 0 0 12px;
        }

        .fh-range-zone--in-range {
            background: linear-gradient(90deg, rgba(48, 196, 141, 0.25), rgba(48, 196, 141, 0.35), rgba(48, 196, 141, 0.25));
        }

        .fh-range-zone--above {
            background: linear-gradient(90deg, rgba(247, 112, 112, 0.15), rgba(247, 112, 112, 0.3));
            border-radius: 0 12px 12px 0;
        }

        .fh-range-marker {
            position: absolute;
            top: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
            animation: markerSlide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards;
            opacity: 0;
        }

        @keyframes markerSlide {
            from {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }

        .fh-range-marker-dot {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .fh-range-marker--in-range .fh-range-marker-dot {
            background: #30c48d;
        }

        .fh-range-marker--below .fh-range-marker-dot {
            background: #f7b267;
        }

        .fh-range-marker--above .fh-range-marker-dot {
            background: #f77070;
        }

        .fh-range-labels {
            position: relative;
            height: 20px;
            margin-top: 4px;
        }

        .fh-range-label {
            position: absolute;
            transform: translateX(-50%);
            font-size: 11px;
            font-weight: 600;
            color: #6a7395;
        }

        /* Threshold Visualization */
        .fh-threshold-viz-container {
            padding: 16px 0 8px;
        }

        .fh-threshold-bar-wrapper {
            position: relative;
            padding: 20px 0 24px;
        }

        .fh-threshold-bar {
            position: relative;
            height: 24px;
            border-radius: 12px;
            background: #e8eaf3;
            overflow: visible;
        }

        .fh-threshold-zone {
            position: absolute;
            top: 0;
            height: 100%;
        }

        .fh-threshold-zone--good {
            background: rgba(48, 196, 141, 0.2);
        }

        .fh-threshold-zone--bad {
            background: rgba(247, 112, 112, 0.15);
        }

        .fh-threshold-line {
            position: absolute;
            top: -4px;
            bottom: -4px;
            width: 3px;
            background: #667eea;
            border-radius: 2px;
            transform: translateX(-50%);
        }

        .fh-threshold-marker {
            position: absolute;
            top: 50%;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 3px solid #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transform: translate(-50%, -50%);
        }

        .fh-threshold-marker--good {
            background: #30c48d;
        }

        .fh-threshold-marker--bad {
            background: #f77070;
        }

        .fh-threshold-labels {
            position: relative;
            height: 20px;
            margin-top: 4px;
        }

        .fh-threshold-label {
            position: absolute;
            transform: translateX(-50%);
            font-size: 11px;
            font-weight: 600;
            color: #667eea;
            background: rgba(102, 126, 234, 0.1);
            padding: 2px 8px;
            border-radius: 4px;
        }

        /* Binary Pass/Fail Display */
        .fh-binary-display {
            padding: 12px 0;
        }

        .fh-binary-timeline {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .fh-binary-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            background: #f8f9fc;
            border-radius: 12px;
            border: 1px solid rgba(102, 126, 234, 0.12);
        }

        .fh-binary-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 700;
        }

        .fh-binary-icon--pass {
            background: rgba(48, 196, 141, 0.15);
            color: #1e805c;
        }

        .fh-binary-icon--fail {
            background: rgba(247, 112, 112, 0.15);
            color: #b23e3e;
        }

        .fh-binary-details {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .fh-binary-value {
            font-size: 13px;
            font-weight: 600;
            color: #2e3658;
        }

        .fh-binary-date {
            font-size: 11px;
            color: #6a7395;
        }

        /* Prominent Binary Result Display */
        .fh-binary-prominent {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px 24px;
            border-radius: 16px;
            margin-bottom: 12px;
            text-align: center;
        }

        .fh-binary-prominent--pass {
            background: linear-gradient(135deg, rgba(48, 196, 141, 0.12) 0%, rgba(48, 196, 141, 0.06) 100%);
            border: 2px solid rgba(48, 196, 141, 0.3);
        }

        .fh-binary-prominent--fail {
            background: linear-gradient(135deg, rgba(247, 112, 112, 0.12) 0%, rgba(247, 112, 112, 0.06) 100%);
            border: 2px solid rgba(247, 112, 112, 0.3);
        }

        .fh-binary-prominent-icon {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 12px;
        }

        .fh-binary-prominent--pass .fh-binary-prominent-icon {
            background: rgba(48, 196, 141, 0.2);
            color: #1a7a55;
        }

        .fh-binary-prominent--fail .fh-binary-prominent-icon {
            background: rgba(247, 112, 112, 0.2);
            color: #a33a3a;
        }

        .fh-binary-prominent-label {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
        }

        .fh-binary-prominent--pass .fh-binary-prominent-label {
            color: #1a7a55;
        }

        .fh-binary-prominent--fail .fh-binary-prominent-label {
            color: #a33a3a;
        }

        .fh-binary-prominent-context {
            font-size: 12px;
            color: #6a7395;
            font-weight: 500;
        }

        /* Pattern/Grade Display */
        .fh-pattern-display {
            padding: 12px 0;
        }

        .fh-pattern-comparison {
            display: flex;
            align-items: center;
            gap: 16px;
            justify-content: center;
            padding: 16px;
            background: #f8f9fc;
            border-radius: 12px;
        }

        .fh-pattern-block {
            text-align: center;
            padding: 12px 20px;
            border-radius: 10px;
            min-width: 80px;
        }

        .fh-pattern-block--expected {
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.2);
        }

        .fh-pattern-block--match {
            background: rgba(48, 196, 141, 0.15);
            border: 2px solid rgba(48, 196, 141, 0.4);
        }

        .fh-pattern-block--mismatch {
            background: rgba(247, 112, 112, 0.15);
            border: 2px solid rgba(247, 112, 112, 0.4);
        }

        .fh-pattern-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6a7395;
            margin-bottom: 4px;
        }

        .fh-pattern-value {
            font-size: 24px;
            font-weight: 700;
            color: #2e3658;
        }

        .fh-pattern-arrow {
            font-size: 24px;
            color: #9ca3c4;
        }

        .fh-pattern-explanation {
            margin-top: 12px;
            padding: 10px 14px;
            background: rgba(102, 126, 234, 0.08);
            border-radius: 8px;
            font-size: 12px;
            color: #4a5580;
            text-align: center;
        }

        .fh-pattern-history {
            margin-top: 12px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .fh-pattern-history-item {
            font-size: 11px;
            color: #6a7395;
            background: rgba(102, 126, 234, 0.08);
            padding: 4px 10px;
            border-radius: 6px;
        }

        /* Mini Sparkline - Enlarged for better visibility */
        .fh-mini-sparkline-container {
            margin-top: 12px;
            position: relative;
        }

        .fh-mini-sparkline {
            width: 100%;
            max-width: 300px;
            height: 60px;
        }

        .fh-mini-sparkline-dot {
            transition: r 0.15s ease;
        }

        .fh-mini-sparkline-hitarea {
            cursor: pointer;
        }

        .fh-mini-sparkline-tooltip {
            position: absolute;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 13px;
            line-height: 1.4;
            color: #4a5568;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            pointer-events: none;
            z-index: 100;
            transform: translateX(-50%);
            white-space: nowrap;
        }

        .fh-mini-sparkline-tooltip strong {
            color: #2d3748;
            font-weight: 600;
            font-size: 14px;
        }

        .fh-mini-sparkline-tooltip span {
            color: #718096;
            font-size: 11px;
        }

        /* Direction Badge Variants */
        .fh-direction--warning {
            color: #b23e3e;
            background: rgba(247, 112, 112, 0.18);
        }

        .fh-direction--good {
            color: #1e805c;
            background: rgba(48, 196, 141, 0.18);
        }

        .fh-direction--changed {
            color: #7c5a11;
            background: rgba(247, 178, 103, 0.2);
        }

        /* Informational Display (no reference range) */
        .fh-informational-display {
            padding: 12px 0;
        }

        .fh-informational-notice {
            font-size: 12px;
            color: #6a7395;
            font-style: italic;
            padding: 8px 12px;
            background: rgba(102, 126, 234, 0.06);
            border-radius: 8px;
            border-left: 3px solid rgba(102, 126, 234, 0.3);
            margin-bottom: 12px;
        }

        .fh-informational-history {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .fh-informational-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #f8f9fc;
            border-radius: 8px;
        }

        .fh-informational-date {
            font-size: 12px;
            color: #6a7395;
        }

        .fh-informational-value {
            font-size: 14px;
            font-weight: 600;
            color: #2e3658;
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

/**
 * Escape a string for safe use in CSS selectors
 * @param {string} value - The value to escape
 * @returns {string} CSS-safe string
 */
export function cssEscape(value) {
    if (window.CSS && CSS.escape) {
        return CSS.escape(value);
    }
    return value.replace(/[^a-zA-Z0-9\-]/g, '_');
}

