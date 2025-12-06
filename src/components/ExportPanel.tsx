import { useState } from 'react';

type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';
type StudyDesign = 'cohort' | 'case-control' | 'cross-sectional' | 'case-cohort' | 'nested-case-control';

interface ScenarioResult {
  proteinCount: number;
  alpha: number;
  minEffect: number;
  powerAtInput: number;
  sampleNeeded: number | string;
}

interface ExportPanelProps {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  scenarios: ScenarioResult[];
  effectSize: number;
  targetPower: number;
  fdrQ: number;
  sampleSize: number;
  events: number;
  prevalence: number;
  residualSD: number;
  numCases: number;
  numControls: number;
  effectSymbol: string;
  effectLabel: string;
  tableData: Array<Record<string, number>>;
}

/**
 * ExportPanel Component
 *
 * Provides export functionality for power analysis results.
 * Supports CSV export for data and a printable summary.
 */
const ExportPanel: React.FC<ExportPanelProps> = ({
  analysisType,
  studyDesign,
  scenarios,
  effectSize,
  targetPower,
  fdrQ,
  sampleSize,
  events,
  prevalence,
  residualSD,
  numCases,
  numControls,
  effectSymbol,
  effectLabel,
  tableData,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  // Format analysis type for display
  const formatAnalysisType = (type: AnalysisType): string => {
    const map: Record<AnalysisType, string> = {
      cox: 'Cox Proportional Hazards',
      linear: 'Linear Regression',
      logistic: 'Logistic Regression',
      poisson: 'Modified Poisson Regression',
      gee: 'GEE/Mixed Effects',
    };
    return map[type];
  };

  // Format study design for display
  const formatStudyDesign = (design: StudyDesign): string => {
    const map: Record<StudyDesign, string> = {
      cohort: 'Cohort',
      'case-control': 'Case-Control',
      'cross-sectional': 'Cross-Sectional',
      'case-cohort': 'Case-Cohort',
      'nested-case-control': 'Nested Case-Control',
    };
    return map[design];
  };

  // Generate CSV content
  const generateCSV = (): string => {
    const lines: string[] = [];

    // Header section
    lines.push('Proteomics Power Calculator - Analysis Results');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Parameters section
    lines.push('STUDY PARAMETERS');
    lines.push(`Analysis Type,${formatAnalysisType(analysisType)}`);
    lines.push(`Study Design,${formatStudyDesign(studyDesign)}`);
    lines.push(`Target Power,${(targetPower * 100).toFixed(0)}%`);
    lines.push(`FDR Threshold (q),${fdrQ}`);
    lines.push(`${effectLabel} (${effectSymbol}),${effectSize}`);

    if (analysisType === 'cox') {
      lines.push(`Number of Events,${events}`);
    } else {
      lines.push(`Sample Size,${sampleSize}`);
    }

    if (analysisType === 'linear') {
      lines.push(`Residual SD,${residualSD}`);
    }

    if ((analysisType === 'logistic' || analysisType === 'poisson') &&
        studyDesign !== 'case-control' && studyDesign !== 'nested-case-control') {
      lines.push(`Outcome Prevalence,${(prevalence * 100).toFixed(1)}%`);
    }

    if (studyDesign === 'case-control' || studyDesign === 'nested-case-control') {
      lines.push(`Number of Cases,${numCases}`);
      lines.push(`Number of Controls,${numControls}`);
    }

    lines.push('');

    // Scenario results
    lines.push('SCENARIO RESULTS');
    lines.push(`Proteins Tested,Effective Alpha,Min Detectable ${effectSymbol},Power at ${effectSymbol}=${effectSize},Required ${analysisType === 'cox' ? 'Events' : 'N'}`);

    scenarios.forEach(scenario => {
      lines.push([
        scenario.proteinCount,
        scenario.alpha.toExponential(3),
        scenario.minEffect.toFixed(4),
        (scenario.powerAtInput * 100).toFixed(1) + '%',
        typeof scenario.sampleNeeded === 'string' ? scenario.sampleNeeded : scenario.sampleNeeded.toString(),
      ].join(','));
    });

    lines.push('');

    // Power table
    lines.push('POWER BY EFFECT SIZE');
    const proteinCounts = scenarios.map(s => s.proteinCount);
    lines.push([effectLabel, ...proteinCounts.map(c => `${c} proteins`)].join(','));

    tableData.forEach(row => {
      const values = [
        row.effect.toFixed(3),
        ...proteinCounts.map(c => ((row[`power_${c}`] || 0) * 100).toFixed(1) + '%'),
      ];
      lines.push(values.join(','));
    });

    return lines.join('\n');
  };

  // Download CSV
  const downloadCSV = () => {
    setIsExporting(true);
    try {
      const csv = generateCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `power-analysis-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  // Generate printable HTML and open print dialog using Blob URL
  const printSummary = () => {
    setIsExporting(true);
    try {
      const scenarioRows = scenarios.map(s => {
        const powerClass = s.powerAtInput >= targetPower ? 'power-good' : s.powerAtInput >= 0.5 ? 'power-marginal' : 'power-low';
        return `<tr>
          <td>${s.proteinCount.toLocaleString()}</td>
          <td>${s.alpha.toExponential(2)}</td>
          <td>${s.minEffect.toFixed(3)}</td>
          <td class="${powerClass}">${(s.powerAtInput * 100).toFixed(1)}%</td>
          <td>${typeof s.sampleNeeded === 'string' ? s.sampleNeeded : s.sampleNeeded.toLocaleString()}</td>
        </tr>`;
      }).join('');

      const tableRows = tableData.map(row => {
        const cells = scenarios.map(s => {
          const power = row[`power_${s.proteinCount}`] || 0;
          const powerClass = power >= targetPower ? 'power-good' : power >= 0.5 ? 'power-marginal' : 'power-low';
          return `<td class="${powerClass}">${(power * 100).toFixed(1)}%</td>`;
        }).join('');
        return `<tr><td>${row.effect.toFixed(2)}</td>${cells}</tr>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Power Analysis Summary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; line-height: 1.6; }
    h1 { color: #4f46e5; margin-bottom: 5px; }
    h2 { color: #6b7280; font-size: 1.1em; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    .timestamp { color: #9ca3af; font-size: 0.9em; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .param-table td:first-child { font-weight: 500; width: 40%; }
    .power-good { color: #059669; font-weight: 600; }
    .power-marginal { color: #d97706; }
    .power-low { color: #dc2626; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 0.85em; color: #6b7280; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Proteomics Power Analysis</h1>
  <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
  <h2>Study Parameters</h2>
  <table class="param-table">
    <tr><td>Analysis Type</td><td>${formatAnalysisType(analysisType)}</td></tr>
    <tr><td>Study Design</td><td>${formatStudyDesign(studyDesign)}</td></tr>
    <tr><td>Target Power</td><td>${(targetPower * 100).toFixed(0)}%</td></tr>
    <tr><td>FDR Threshold (q)</td><td>${fdrQ}</td></tr>
    <tr><td>${effectLabel}</td><td>${effectSize}</td></tr>
    ${analysisType === 'cox' ? `<tr><td>Number of Events</td><td>${events}</td></tr>` : `<tr><td>Sample Size</td><td>${sampleSize.toLocaleString()}</td></tr>`}
    ${analysisType === 'linear' ? `<tr><td>Residual SD</td><td>${residualSD}</td></tr>` : ''}
    ${(analysisType === 'logistic' || analysisType === 'poisson') && studyDesign !== 'case-control' && studyDesign !== 'nested-case-control' ? `<tr><td>Outcome Prevalence</td><td>${(prevalence * 100).toFixed(1)}%</td></tr>` : ''}
    ${studyDesign === 'case-control' || studyDesign === 'nested-case-control' ? `<tr><td>Cases / Controls</td><td>${numCases} / ${numControls}</td></tr>` : ''}
  </table>
  <h2>Power Analysis Results</h2>
  <table>
    <thead><tr><th>Proteins Tested</th><th>Effective Alpha</th><th>Min Detectable ${effectSymbol}</th><th>Power at ${effectSymbol}=${effectSize}</th><th>Required ${analysisType === 'cox' ? 'Events' : 'N'}</th></tr></thead>
    <tbody>${scenarioRows}</tbody>
  </table>
  <h2>Power by ${effectLabel}</h2>
  <table>
    <thead><tr><th>${effectSymbol}</th>${scenarios.map(s => `<th>${s.proteinCount.toLocaleString()} proteins</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">
    <p><strong>Note:</strong> This analysis assumes the predictor variable (protein level) is standardized with unit variance. Power calculations are based on the Wald test framework with Benjamini-Hochberg FDR correction for multiple testing.</p>
    <p>Generated by Proteomics Power Calculator</p>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (!printWindow) {
        alert('Please allow popups to print the summary.');
        URL.revokeObjectURL(url);
        return;
      }

      // Clean up the URL after the window loads
      printWindow.onload = () => {
        URL.revokeObjectURL(url);
      };
    } finally {
      setIsExporting(false);
    }
  };

  // Copy summary to clipboard
  const copyToClipboard = async () => {
    setIsExporting(true);
    try {
      const summary = [
        'PROTEOMICS POWER ANALYSIS SUMMARY',
        `Generated: ${new Date().toLocaleString()}`,
        '',
        `Analysis: ${formatAnalysisType(analysisType)} (${formatStudyDesign(studyDesign)})`,
        `Target Power: ${(targetPower * 100).toFixed(0)}%`,
        `FDR: q=${fdrQ}`,
        `Effect Size: ${effectSymbol}=${effectSize}`,
        analysisType === 'cox' ? `Events: ${events}` : `Sample Size: ${sampleSize}`,
        '',
        'RESULTS:',
        ...scenarios.map(s =>
          `- ${s.proteinCount.toLocaleString()} proteins: Power=${(s.powerAtInput * 100).toFixed(1)}%, Min ${effectSymbol}=${s.minEffect.toFixed(3)}`
        ),
      ].join('\n');

      await navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Results
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-500 mb-4">
            Download your power analysis results for documentation, sharing, or further analysis.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={downloadCSV}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV
            </button>

            <button
              onClick={printSummary}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>

            <button
              onClick={copyToClipboard}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Summary
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <strong>CSV:</strong> Full data for spreadsheet analysis |
            <strong> Print/PDF:</strong> Formatted report for documentation |
            <strong> Copy:</strong> Quick summary for notes or emails
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExportPanel;
