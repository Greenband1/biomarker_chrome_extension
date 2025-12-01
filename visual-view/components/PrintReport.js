/**
 * Print report generation component
 */

import { normalizeDate, formatDisplayDate } from '../utils/dateUtils.js';
import { formatValue, normalizeStatus } from '../utils/formatters.js';
import { buildTimelineEvents, determineBiomarkerStatus } from '../utils/statusHelpers.js';
import { consolidateBiomarkersByName } from '../data/consolidation.js';
import { computeDatasetMetrics } from './MetricsDashboard.js';

/**
 * Generate and open a print-friendly report
 */
export function generatePrintReport(dataset, selectedCategories, selectedDates) {
    const metrics = computeDatasetMetrics(dataset, selectedCategories, selectedDates);
    const reportDate = new Date().toLocaleDateString(undefined, { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });

    // Collect biomarker data by category
    const categorizedData = [];
    const outOfRangeBiomarkers = [];

    Object.entries(dataset.categories)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([categoryName, category]) => {
            if (!selectedCategories.has(categoryName)) return;
            if (!Array.isArray(category?.biomarkers)) return;

            const consolidatedBiomarkers = consolidateBiomarkersByName(category.biomarkers);
            const biomarkersData = [];

            consolidatedBiomarkers.forEach(biomarker => {
                const filteredHistorical = biomarker.historicalValues.filter(hv => 
                    selectedDates.has(normalizeDate(hv.date))
                );
                if (filteredHistorical.length === 0) return;

                const events = buildTimelineEvents({ ...biomarker, historicalValues: filteredHistorical });
                const status = determineBiomarkerStatus(events);
                const latest = events[events.length - 1];

                const biomarkerInfo = {
                    name: biomarker.name,
                    value: formatValue(latest.value, latest.unit),
                    status: status,
                    reference: biomarker.referenceRange || 'N/A',
                    date: formatDisplayDate(latest.date)
                };

                biomarkersData.push(biomarkerInfo);

                if (status === 'Out of Range') {
                    outOfRangeBiomarkers.push({
                        ...biomarkerInfo,
                        category: categoryName
                    });
                }
            });

            if (biomarkersData.length > 0) {
                categorizedData.push({
                    name: categoryName,
                    biomarkers: biomarkersData
                });
            }
        });

    // Generate print HTML
    const printHTML = generatePrintHTML(metrics, reportDate, categorizedData, outOfRangeBiomarkers);

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(printHTML);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    }
}

/**
 * Generate the HTML content for the print report
 */
function generatePrintHTML(metrics, reportDate, categorizedData, outOfRangeBiomarkers) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Health Report - ${reportDate}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1f2a44;
            line-height: 1.5;
            padding: 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 2px solid #667eea;
        }
        .header h1 {
            font-size: 28px;
            color: #2e3658;
            margin-bottom: 8px;
        }
        .header .date {
            font-size: 14px;
            color: #6a7395;
        }
        .summary {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 32px;
            padding: 20px;
            background: #f6f7fb;
            border-radius: 12px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-value {
            font-size: 28px;
            font-weight: 700;
        }
        .summary-label {
            font-size: 12px;
            color: #6a7395;
            text-transform: uppercase;
        }
        .summary-value.green { color: #1c8f63; }
        .summary-value.red { color: #c94545; }
        .summary-value.amber { color: #b87d0a; }
        .summary-value.purple { color: #5a67ba; }
        
        .attention-section {
            margin-bottom: 32px;
            padding: 20px;
            background: rgba(247, 112, 112, 0.08);
            border-radius: 12px;
            border: 1px solid rgba(247, 112, 112, 0.2);
        }
        .attention-section h2 {
            font-size: 16px;
            color: #c94545;
            margin-bottom: 12px;
        }
        .attention-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(247, 112, 112, 0.15);
        }
        .attention-item:last-child { border-bottom: none; }
        .attention-name { font-weight: 600; }
        .attention-category { font-size: 12px; color: #6a7395; }
        .attention-value { color: #c94545; font-weight: 600; }
        
        .category {
            margin-bottom: 24px;
            page-break-inside: avoid;
        }
        .category h2 {
            font-size: 16px;
            color: #2e3658;
            padding: 8px 0;
            border-bottom: 1px solid #e8eaf3;
            margin-bottom: 12px;
        }
        .biomarker-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .biomarker-table th {
            text-align: left;
            padding: 8px;
            background: #f6f7fb;
            color: #3d4a7a;
            font-weight: 600;
        }
        .biomarker-table td {
            padding: 8px;
            border-bottom: 1px solid #e8eaf3;
        }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        .status-in-range { background: rgba(48, 196, 141, 0.15); color: #1c8f63; }
        .status-out-of-range { background: rgba(247, 112, 112, 0.15); color: #c94545; }
        .status-improving { background: rgba(247, 178, 103, 0.15); color: #b87d0a; }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #6a7395;
            padding-top: 20px;
            border-top: 1px solid #e8eaf3;
        }
        
        @media print {
            body { padding: 20px; }
            .category { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Health Biomarker Report</h1>
        <div class="date">Generated on ${reportDate}</div>
    </div>
    
    <div class="summary">
        <div class="summary-item">
            <div class="summary-value">${metrics.totalBiomarkers}</div>
            <div class="summary-label">Total Tested</div>
        </div>
        <div class="summary-item">
            <div class="summary-value green">${metrics.inRange}</div>
            <div class="summary-label">In Range</div>
        </div>
        <div class="summary-item">
            <div class="summary-value red">${metrics.outOfRange}</div>
            <div class="summary-label">Out of Range</div>
        </div>
        <div class="summary-item">
            <div class="summary-value amber">${metrics.improving}</div>
            <div class="summary-label">Improving</div>
        </div>
        <div class="summary-item">
            <div class="summary-value purple">${metrics.healthScore}%</div>
            <div class="summary-label">Health Score</div>
        </div>
    </div>

    ${outOfRangeBiomarkers.length > 0 ? `
    <div class="attention-section">
        <h2>⚠️ Biomarkers Requiring Attention</h2>
        ${outOfRangeBiomarkers.map(b => `
            <div class="attention-item">
                <div>
                    <span class="attention-name">${b.name}</span>
                    <span class="attention-category"> - ${b.category}</span>
                </div>
                <div class="attention-value">${b.value}</div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${categorizedData.map(cat => `
    <div class="category">
        <h2>${cat.name}</h2>
        <table class="biomarker-table">
            <thead>
                <tr>
                    <th>Biomarker</th>
                    <th>Value</th>
                    <th>Reference Range</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${cat.biomarkers.map(b => `
                <tr>
                    <td>${b.name}</td>
                    <td>${b.value}</td>
                    <td>${b.reference}</td>
                    <td><span class="status-badge status-${normalizeStatus(b.status)}">${b.status}</span></td>
                    <td>${b.date}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `).join('')}

    <div class="footer">
        <p>This report is for informational purposes only. Please consult with your healthcare provider for medical advice.</p>
    </div>
</body>
</html>
    `;
}

