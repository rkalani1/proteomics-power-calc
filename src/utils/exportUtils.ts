import { type CorrectionMethod, type AnalysisType, type StudyDesign } from './statistics';

export interface ExportData {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  scenarios: any[];
  effectSize: number;
  targetPower: number;
  fdrQ: number;
  correctionMethod: CorrectionMethod;
  sampleSize: number;
  events: number;
  prevalence: number;
  residualSD: number;
  numCases: number;
  numControls: number;
  subcohortSize: number;
  totalCohort: number;
  matchingRatio: number;
  clusterSize: number;
  icc: number;
  covariateR2: number;
  effectSymbol: string;
  effectLabel: string;
  tableData: Array<Record<string, any>>;
}

export const formatAnalysisType = (type: AnalysisType): string => {
  const map: Record<AnalysisType, string> = {
    cox: 'Cox Proportional Hazards',
    linear: 'Linear Regression',
    logistic: 'Logistic Regression',
    poisson: 'Modified Poisson Regression',
    gee: 'GEE/Mixed Effects',
  };
  return map[type];
};

export const formatStudyDesign = (design: StudyDesign): string => {
  const map: Record<StudyDesign, string> = {
    cohort: 'Cohort',
    'case-control': 'Case-Control',
    'cross-sectional': 'Cross-Sectional',
    'case-cohort': 'Case-Cohort',
    'nested-case-control': 'Nested Case-Control',
  };
  return map[design];
};

export const generateCSV = (data: ExportData): string => {
  const {
    analysisType,
    studyDesign,
    scenarios,
    effectSize,
    targetPower,
    fdrQ,
    correctionMethod,
    sampleSize,
    events,
    prevalence,
    residualSD,
    numCases,
    numControls,
    subcohortSize,
    totalCohort,
    matchingRatio,
    clusterSize,
    icc,
    covariateR2,
    effectSymbol,
    effectLabel,
    tableData,
  } = data;

  const lines: string[] = [];

  const isFdr = correctionMethod === 'fdr';
  const thresholdLabel = isFdr ? 'FDR Threshold (q)' : 'FWER Alpha (α)';
  const isCaseControl = studyDesign === 'case-control' || studyDesign === 'nested-case-control';
  const showSampleSize = analysisType !== 'cox' && !isCaseControl;

  const designParams: Array<[string, string]> = [];
  if (analysisType === 'cox' && studyDesign === 'case-cohort') {
    designParams.push(['Subcohort Size', `${subcohortSize}`], ['Total Cohort Size', `${totalCohort}`]);
  }
  if (analysisType === 'cox' && studyDesign === 'nested-case-control') {
    designParams.push(['Controls per Case', `${matchingRatio}`]);
  }
  if (analysisType === 'gee') {
    designParams.push(['Cluster Size (m)', `${clusterSize}`], ['Intraclass Correlation (ICC)', `${icc}`]);
  }
  if (covariateR2 > 0) {
    designParams.push(['Covariate R² (protein ~ covariates)', `${covariateR2}`]);
  }

  // Header section
  lines.push('Proteomics Power Calculator - Analysis Results');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Parameters section
  lines.push('STUDY PARAMETERS');
  lines.push(`Analysis Type,${formatAnalysisType(analysisType)}`);
  lines.push(`Study Design,${formatStudyDesign(studyDesign)}`);
  lines.push(`Target Power,${(targetPower * 100).toFixed(0)}%`);
  lines.push(`${thresholdLabel},${fdrQ}`);
  lines.push(`${effectLabel} (${effectSymbol}),${effectSize}`);

  if (analysisType === 'cox') {
    lines.push(`Number of Events,${events}`);
  } else if (showSampleSize) {
    lines.push(`Sample Size,${sampleSize}`);
  }

  if (analysisType === 'linear' || analysisType === 'gee') {
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

  designParams.forEach(([label, value]) => lines.push(`${label},${value}`));

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

export const generatePrintHTML = (data: ExportData): string => {
  const {
    analysisType,
    studyDesign,
    scenarios,
    effectSize,
    targetPower,
    fdrQ,
    correctionMethod,
    sampleSize,
    events,
    prevalence,
    residualSD,
    numCases,
    numControls,
    subcohortSize,
    totalCohort,
    matchingRatio,
    clusterSize,
    icc,
    covariateR2,
    effectSymbol,
    effectLabel,
    tableData,
  } = data;

  const isFdr = correctionMethod === 'fdr';
  const thresholdLabel = isFdr ? 'FDR Threshold (q)' : 'FWER Alpha (α)';
  const correctionName = isFdr ? 'Benjamini-Hochberg FDR' : 'Bonferroni FWER';
  const isCaseControl = studyDesign === 'case-control' || studyDesign === 'nested-case-control';
  const showSampleSize = analysisType !== 'cox' && !isCaseControl;

  const designParams: Array<[string, string]> = [];
  if (analysisType === 'cox' && studyDesign === 'case-cohort') {
    designParams.push(['Subcohort Size', `${subcohortSize}`], ['Total Cohort Size', `${totalCohort}`]);
  }
  if (analysisType === 'cox' && studyDesign === 'nested-case-control') {
    designParams.push(['Controls per Case', `${matchingRatio}`]);
  }
  if (analysisType === 'gee') {
    designParams.push(['Cluster Size (m)', `${clusterSize}`], ['Intraclass Correlation (ICC)', `${icc}`]);
  }
  if (covariateR2 > 0) {
    designParams.push(['Covariate R² (protein ~ covariates)', `${covariateR2}`]);
  }

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

  return `<!DOCTYPE html>
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
    <tr><td>${thresholdLabel}</td><td>${fdrQ}</td></tr>
    <tr><td>${effectLabel}</td><td>${effectSize}</td></tr>
    ${analysisType === 'cox' ? `<tr><td>Number of Events</td><td>${events}</td></tr>` : showSampleSize ? `<tr><td>Sample Size</td><td>${sampleSize.toLocaleString()}</td></tr>` : ''}
    ${analysisType === 'linear' || analysisType === 'gee' ? `<tr><td>Residual SD</td><td>${residualSD}</td></tr>` : ''}
    ${(analysisType === 'logistic' || analysisType === 'poisson') && studyDesign !== 'case-control' && studyDesign !== 'nested-case-control' ? `<tr><td>Outcome Prevalence</td><td>${(prevalence * 100).toFixed(1)}%</td></tr>` : ''}
    ${studyDesign === 'case-control' || studyDesign === 'nested-case-control' ? `<tr><td>Cases / Controls</td><td>${numCases} / ${numControls}</td></tr>` : ''}
    ${designParams.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join('')}
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
    <p><strong>Note:</strong> This analysis assumes the predictor variable (protein level) is standardized with unit variance. Power calculations use the two-sided Wald-test framework with ${correctionName} correction for multiple testing (effective per-test &alpha; &asymp; threshold / number of proteins).</p>
    <p>Generated by Proteomics Power Calculator</p>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
};

export const generateTextSummary = (data: ExportData): string => {
  const {
    analysisType,
    studyDesign,
    scenarios,
    effectSize,
    targetPower,
    fdrQ,
    correctionMethod,
    sampleSize,
    numCases,
    numControls,
    effectSymbol,
  } = data;

  const isFdr = correctionMethod === 'fdr';
  const correctionName = isFdr ? 'Benjamini-Hochberg FDR' : 'Bonferroni FWER';
  const isCaseControl = studyDesign === 'case-control' || studyDesign === 'nested-case-control';

  return [
    'PROTEOMICS POWER ANALYSIS SUMMARY',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    `Analysis: ${formatAnalysisType(analysisType)} (${formatStudyDesign(studyDesign)})`,
    `Target Power: ${(targetPower * 100).toFixed(0)}%`,
    `${correctionName}: ${isFdr ? 'q' : 'α'}=${fdrQ}`,
    `Effect Size: ${effectSymbol}=${effectSize}`,
    analysisType === 'cox'
      ? `Events: ${data.events}`
      : isCaseControl
        ? `Cases/Controls: ${numCases}/${numControls}`
        : `Sample Size: ${sampleSize}`,
    '',
    'RESULTS:',
    ...scenarios.map(s =>
      `- ${s.proteinCount.toLocaleString()} proteins: Power=${(s.powerAtInput * 100).toFixed(1)}%, Min ${effectSymbol}=${s.minEffect.toFixed(3)}`
    ),
  ].join('\n');
};

/**
 * Trigger browser download of a CSV file
 */
export const performCSVDownload = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Trigger browser print of a summary report
 */
export const performPrint = (html: string) => {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    alert('Please allow popups to print the summary.');
    URL.revokeObjectURL(url);
    return;
  }

  // Implementation Pattern: Use setTimeout for cleanup as window.onload/onload
  // are unreliable when noopener is present or in some browser versions.
  // We use a safe margin for the print dialog to initialize.
  try {
    printWindow.onload = () => {
      URL.revokeObjectURL(url);
    };
  } catch (e) {
    // Fallback for cross-origin or other restrictions
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
};

/**
 * Copy text to clipboard
 */
export const performCopy = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
};
