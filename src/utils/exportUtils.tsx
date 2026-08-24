import { renderToStaticMarkup } from 'react-dom/server';
import { type CorrectionMethod, type AnalysisType, type StudyDesign } from './statistics';

export interface ScenarioResult {
  proteinCount: number;
  alpha: number;
  minEffect: number;
  powerAtInput: number;
  sampleNeeded: number | string;
}

export interface ExportData {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  scenarios: ScenarioResult[];
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
  tableData: Array<Record<string, number>>;
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
  // Always exported (even at 0) so a reader can tell "no covariate adjustment"
  // apart from "field not exported by this build".
  designParams.push(['Covariate R² (protein ~ covariates)', `${covariateR2}`]);

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
    // GEE is sized by total observations (subjects × observations each), not
    // by participants — label it to match the model input.
    lines.push(`${analysisType === 'gee' ? 'Total Observations' : 'Sample Size'},${sampleSize}`);
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
      row.effect.toFixed(2),
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
  // Always printed (even at 0) so the report fully specifies the calculation.
  designParams.push(['Covariate R² (protein ~ covariates)', `${covariateR2}`]);

  const html = renderToStaticMarkup(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Power Analysis Summary</title>
        <style>{`
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
        `}</style>
      </head>
      <body>
        <h1>Proteomics Power Analysis</h1>
        <div className="timestamp">Generated: {new Date().toLocaleString()}</div>
        <h2>Study Parameters</h2>
        <table className="param-table">
          <tbody>
            <tr><td>Analysis Type</td><td>{formatAnalysisType(analysisType)}</td></tr>
            <tr><td>Study Design</td><td>{formatStudyDesign(studyDesign)}</td></tr>
            <tr><td>Target Power</td><td>{(targetPower * 100).toFixed(0)}%</td></tr>
            <tr><td>{thresholdLabel}</td><td>{fdrQ}</td></tr>
            <tr><td>{effectLabel}</td><td>{effectSize}</td></tr>
            {analysisType === 'cox' && <tr><td>Number of Events</td><td>{events}</td></tr>}
            {showSampleSize && <tr><td>{analysisType === 'gee' ? 'Total Observations' : 'Sample Size'}</td><td>{sampleSize.toLocaleString()}</td></tr>}
            {(analysisType === 'linear' || analysisType === 'gee') && <tr><td>Residual SD</td><td>{residualSD}</td></tr>}
            {(analysisType === 'logistic' || analysisType === 'poisson') && !isCaseControl && (
              <tr><td>Outcome Prevalence</td><td>{(prevalence * 100).toFixed(1)}%</td></tr>
            )}
            {isCaseControl && <tr><td>Cases / Controls</td><td>{numCases} / {numControls}</td></tr>}
            {designParams.map(([label, value]) => <tr key={label}><td>{label}</td><td>{value}</td></tr>)}
          </tbody>
        </table>
        <h2>Power Analysis Results</h2>
        <table>
          <thead>
            <tr>
              <th>Proteins Tested</th>
              <th>Effective Alpha</th>
              <th>Min Detectable {effectSymbol}</th>
              <th>Power at {effectSymbol}={effectSize}</th>
              <th>Required {analysisType === 'cox' ? 'Events' : 'N'}</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map(s => {
              const powerClass = s.powerAtInput >= targetPower ? 'power-good' : s.powerAtInput >= 0.5 ? 'power-marginal' : 'power-low';
              return (
                <tr key={s.proteinCount}>
                  <td>{s.proteinCount.toLocaleString()}</td>
                  <td>{s.alpha.toExponential(3)}</td>
                  <td>{s.minEffect.toFixed(3)}</td>
                  <td className={powerClass}>{(s.powerAtInput * 100).toFixed(1)}%</td>
                  <td>{typeof s.sampleNeeded === 'string' ? s.sampleNeeded : s.sampleNeeded.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h2>Power by {effectLabel}</h2>
        <table>
          <thead>
            <tr>
              <th>{effectSymbol}</th>
              {scenarios.map(s => <th key={s.proteinCount}>{s.proteinCount.toLocaleString()} proteins</th>)}
            </tr>
          </thead>
          <tbody>
            {tableData.map(row => (
              <tr key={row.effect}>
                <td>{row.effect.toFixed(2)}</td>
                {scenarios.map(s => {
                  const power = row[`power_${s.proteinCount}`] || 0;
                  const powerClass = power >= targetPower ? 'power-good' : power >= 0.5 ? 'power-marginal' : 'power-low';
                  return <td key={s.proteinCount} className={powerClass}>{(power * 100).toFixed(1)}%</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="footer">
          <p><strong>Note:</strong> This analysis assumes the predictor variable (protein level) is standardized with unit variance. Power calculations use the two-sided Wald-test framework with {correctionName} correction for multiple testing ({isFdr ? <>effective per-test &alpha; &asymp; q / number of proteins, a conservative planning bound</> : <>per-test &alpha; = &alpha; / number of proteins, exact</>}).</p>
          <p>Generated by Proteomics Power Calculator</p>
        </div>
        <script>{"window.onload = function() { window.print(); };"}</script>
      </body>
    </html>
  );

  return `<!DOCTYPE html>\n${html}`;
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
  } = data;

  const isFdr = correctionMethod === 'fdr';
  const correctionName = isFdr ? 'Benjamini-Hochberg FDR' : 'Bonferroni FWER';
  const isCaseControl = studyDesign === 'case-control' || studyDesign === 'nested-case-control';

  // Every parameter that feeds the standard error must appear in the summary,
  // so the copied text fully reproduces the analysis inputs.
  const paramLines: string[] = [];
  if (analysisType === 'cox') {
    paramLines.push(`Events: ${data.events}`);
    if (studyDesign === 'case-cohort') paramLines.push(`Subcohort: ${subcohortSize}/${totalCohort}`);
    if (studyDesign === 'nested-case-control') paramLines.push(`Matching: ${matchingRatio} controls/case`);
  } else if (isCaseControl) {
    paramLines.push(`Cases/Controls: ${numCases}/${numControls}`);
  } else {
    paramLines.push(`${analysisType === 'gee' ? 'Total Observations' : 'Sample Size'}: ${sampleSize}`);
  }
  if (analysisType === 'linear' || analysisType === 'gee') paramLines.push(`Residual SD: ${residualSD}`);
  if ((analysisType === 'logistic' || analysisType === 'poisson') && !isCaseControl) {
    paramLines.push(`Prevalence: ${(prevalence * 100).toFixed(1)}%`);
  }
  if (analysisType === 'gee') paramLines.push(`Cluster Size: ${clusterSize}, ICC: ${icc}`);
  paramLines.push(`Covariate R²: ${covariateR2}`);

  const requiredLabel = analysisType === 'cox' ? 'Required Events' : 'Required N';

  return [
    'PROTEOMICS POWER ANALYSIS SUMMARY',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    `Analysis: ${formatAnalysisType(analysisType)} (${formatStudyDesign(studyDesign)})`,
    `Target Power: ${(targetPower * 100).toFixed(0)}%`,
    `${correctionName}: ${isFdr ? 'q' : 'α'}=${fdrQ}`,
    `Effect Size: ${effectSymbol}=${effectSize}`,
    ...paramLines,
    '',
    'RESULTS:',
    ...scenarios.map(s =>
      `- ${s.proteinCount.toLocaleString()} proteins: Power=${(s.powerAtInput * 100).toFixed(1)}%, Min ${effectSymbol}=${s.minEffect.toFixed(3)}, ${requiredLabel}=${typeof s.sampleNeeded === 'number' && Number.isFinite(s.sampleNeeded) ? s.sampleNeeded.toLocaleString() : s.sampleNeeded}`
    ),
  ].join('\n');
};

/**
 * Build a structured, machine-parseable JSON export of the analysis. Unlike the
 * CSV (which stores human-formatted strings), every value here is raw: power and
 * alpha are proportions in [0, 1], effect sizes and counts are numbers, so
 * downstream code/agents can consume the results without re-parsing.
 */
export const generateJSON = (data: ExportData): string => {
  const {
    analysisType, studyDesign, scenarios, effectSize, targetPower, fdrQ,
    correctionMethod, sampleSize, events, prevalence, residualSD, numCases,
    numControls, subcohortSize, totalCohort, matchingRatio, clusterSize, icc,
    covariateR2, effectSymbol, effectLabel, tableData,
  } = data;

  const isCaseControl = studyDesign === 'case-control' || studyDesign === 'nested-case-control';

  const parameters: Record<string, number> = { covariateR2 };
  if (analysisType === 'cox') parameters.events = events;
  else if (!isCaseControl) parameters.sampleSize = sampleSize;
  if (isCaseControl) { parameters.cases = numCases; parameters.controls = numControls; }
  if (analysisType === 'linear' || analysisType === 'gee') parameters.residualSD = residualSD;
  if ((analysisType === 'logistic' || analysisType === 'poisson') && !isCaseControl) parameters.prevalence = prevalence;
  if (analysisType === 'cox' && studyDesign === 'case-cohort') { parameters.subcohortSize = subcohortSize; parameters.totalCohort = totalCohort; }
  if (analysisType === 'cox' && studyDesign === 'nested-case-control') parameters.matchingRatio = matchingRatio;
  if (analysisType === 'gee') { parameters.clusterSize = clusterSize; parameters.icc = icc; }

  const requiredKey = analysisType === 'cox' ? 'requiredEvents' : 'requiredN';

  const payload = {
    tool: 'Proteomics Power Calculator',
    generatedAt: new Date().toISOString(),
    disclaimer: 'Methodological planning tool; assumes a standardized (unit-variance) predictor and a two-sided Wald large-sample test. Not medical, regulatory, or statistical-consulting advice.',
    analysis: {
      type: analysisType,
      typeLabel: formatAnalysisType(analysisType),
      studyDesign,
      studyDesignLabel: formatStudyDesign(studyDesign),
      targetPower,
      multipleTesting: { method: correctionMethod, threshold: fdrQ },
      effect: { label: effectLabel, symbol: effectSymbol, value: effectSize },
    },
    parameters,
    scenarios: scenarios.map((s) => {
      // JSON cannot represent Infinity (JSON.stringify silently emits null),
      // so encode an unattainable required-N as an explicit null plus a note
      // a downstream consumer can distinguish from a missing field.
      const attainable = typeof s.sampleNeeded === 'number' && Number.isFinite(s.sampleNeeded);
      return {
        proteinsTested: s.proteinCount,
        effectiveAlpha: s.alpha,
        minDetectableEffect: Number.isFinite(s.minEffect) ? s.minEffect : null,
        powerAtInputEffect: s.powerAtInput,
        [requiredKey]: attainable ? s.sampleNeeded : null,
        ...(attainable ? {} : { [`${requiredKey}Note`]: 'not attainable (effect size equals the null value)' }),
      };
    }),
    powerByEffectSize: tableData.map((row) => {
      const power: Record<string, number> = {};
      scenarios.forEach((s) => { power[String(s.proteinCount)] = row[`power_${s.proteinCount}`] ?? 0; });
      return { effect: row.effect, power };
    }),
  };

  return JSON.stringify(payload, null, 2);
};

/**
 * Trigger browser download of a JSON file
 */
export const performJSONDownload = (json: string, filename: string) => {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
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
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  // No 'noopener' here: per the HTML spec, window.open() with noopener in the
  // feature string returns null even on success, which would make the
  // popup-blocked check below fire every time. The blob URL is same-origin
  // content we generated ourselves, so keeping the opener is safe.
  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    alert('Please allow popups to print the summary.');
    URL.revokeObjectURL(url);
    return;
  }

  try {
    printWindow.onload = () => {
      URL.revokeObjectURL(url);
    };
  } catch {
    // Fallback if the new window's handlers are inaccessible: revoke after the
    // document has had ample time to load.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
};

/**
 * Copy text to clipboard
 */
export const performCopy = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
};
