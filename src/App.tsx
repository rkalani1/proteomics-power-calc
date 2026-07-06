import { useState, useMemo } from 'react';
import { PowerFormula } from './components/MathEquation';
import MultiScenarioPowerChart from './components/MultiScenarioPowerChart';
import MultiScenarioResultsTable from './components/MultiScenarioResultsTable';
import PowerByProteinsChart from './components/PowerByProteinsChart';
import SensitivityAnalysis from './components/SensitivityAnalysis';
import ExportPanel from './components/ExportPanel';
import References from './components/References';
import AdvancedVisualizations from './components/AdvancedVisualizations';
import { Header } from './components/Header';
import { AnalysisFramework } from './components/AnalysisFramework';
import { StudyParameters } from './components/StudyParameters';
import {
  calculateEffectiveAlpha,
  calculateInflation,
  // Multi-model imports
  type AnalysisType,
  type StudyDesign,
  type CorrectionMethod,
  calculateCoxSE,
  calculateCoxCaseCohortSE,
  calculateCoxNestedCaseControlSE,
  calculateLinearSE,
  calculateLogisticSE,
  calculateLogisticCaseControlSE,
  calculatePoissonSE,
  // GEE/Mixed Effects imports
  calculateGEE_SE,
  calculateDesignEffect,
} from './utils/statistics';
import { usePowerCalculations } from './hooks/usePowerCalculations';


// Model configuration for UI
const ANALYSIS_TYPE_OPTIONS: { value: AnalysisType; label: string; description: string }[] = [
  { value: 'cox', label: 'Cox Proportional Hazards', description: 'Time-to-event outcomes (Hazard Ratio)' },
  { value: 'linear', label: 'Linear Regression', description: 'Continuous outcomes (Beta coefficient)' },
  { value: 'logistic', label: 'Logistic Regression', description: 'Binary outcomes (Odds Ratio)' },
  { value: 'poisson', label: 'Modified Poisson', description: 'Binary outcomes, prevalence >10% (Relative Risk)' },
  { value: 'gee', label: 'GEE/Mixed Effects', description: 'Clustered/longitudinal data (Beta with ICC)' },
];

const STUDY_DESIGN_OPTIONS: Record<AnalysisType, { value: StudyDesign; label: string; description: string }[]> = {
  cox: [
    { value: 'cohort', label: 'Cohort', description: 'Prospective or retrospective cohort study' },
    { value: 'case-cohort', label: 'Case-Cohort', description: 'Subcohort sampling from full cohort' },
    { value: 'nested-case-control', label: 'Nested Case-Control', description: 'Case-control within cohort' },
  ],
  linear: [
    { value: 'cohort', label: 'Cohort', description: 'Prospective or retrospective cohort study' },
    { value: 'cross-sectional', label: 'Cross-Sectional', description: 'Single time-point measurement' },
  ],
  logistic: [
    { value: 'cohort', label: 'Cohort', description: 'Prospective or retrospective cohort study' },
    { value: 'case-control', label: 'Case-Control', description: 'Case-control study design' },
    { value: 'cross-sectional', label: 'Cross-Sectional', description: 'Single time-point measurement' },
    { value: 'nested-case-control', label: 'Nested Case-Control', description: 'Case-control within cohort' },
  ],
  poisson: [
    { value: 'cohort', label: 'Cohort', description: 'Prospective or retrospective cohort study' },
    { value: 'cross-sectional', label: 'Cross-Sectional', description: 'Single time-point measurement' },
  ],
  gee: [
    { value: 'cohort', label: 'Longitudinal Cohort', description: 'Repeated measures over time' },
    { value: 'cross-sectional', label: 'Clustered Cross-Sectional', description: 'Observations clustered within groups' },
  ],
};

// Color palette for protein count scenarios
const SCENARIO_COLORS = [
  { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200', hex: '#10b981' },
  { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200', hex: '#3b82f6' },
  { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', border: 'border-purple-200', hex: '#8b5cf6' },
  { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', border: 'border-orange-200', hex: '#f97316' },
  { bg: 'bg-pink-500', text: 'text-pink-700', light: 'bg-pink-50', border: 'border-pink-200', hex: '#ec4899' },
  { bg: 'bg-teal-500', text: 'text-teal-700', light: 'bg-teal-50', border: 'border-teal-200', hex: '#14b8a6' },
];

// Effect size labels by analysis type
const EFFECT_SIZE_CONFIG: Record<AnalysisType, {
  label: string;
  symbol: string;
  min: number;
  max: number;
  default: number;
  step: number;
  inputLabel: string;
  inputDescription: string;
}> = {
  cox: {
    label: 'Hazard Ratio',
    symbol: 'HR',
    min: 1.0,
    max: 3.0,
    default: 1.2,
    step: 0.01,
    inputLabel: 'Target Hazard Ratio (HR)',
    inputDescription: '',
  },
  linear: {
    label: 'Standardized Beta',
    symbol: 'β',
    min: 0.0,
    max: 1.0,
    default: 0.2,
    step: 0.01,
    inputLabel: 'Target Beta (β)',
    inputDescription: '',
  },
  logistic: {
    label: 'Odds Ratio',
    symbol: 'OR',
    min: 1.0,
    max: 3.0,
    default: 1.3,
    step: 0.01,
    inputLabel: 'Target Odds Ratio (OR)',
    inputDescription: '',
  },
  poisson: {
    label: 'Relative Risk',
    symbol: 'RR',
    min: 1.0,
    max: 3.0,
    default: 1.2,
    step: 0.01,
    inputLabel: 'Target Relative Risk (RR)',
    inputDescription: '',
  },
  gee: {
    label: 'Standardized Beta',
    symbol: 'β',
    min: 0.0,
    max: 1.0,
    default: 0.2,
    step: 0.01,
    inputLabel: 'Target Beta (β)',
    inputDescription: '',
  },
};


/**
 * Proteomics Power Calculator
 *
 * Interactive web application for power calculations in proteome-wide
 * association studies supporting multiple regression frameworks:
 * - Cox Proportional Hazards (time-to-event)
 * - Linear Regression (continuous outcomes)
 * - Logistic Regression (binary outcomes, OR)
 * - Modified Poisson (binary outcomes, RR)
 *
 * Compares single-protein tests (α=0.05) with proteome-wide scans
 * using Benjamini-Hochberg FDR correction.
 */
function App() {
  // Model selection
  const [analysisType, setAnalysisType] = useState<AnalysisType>('cox');
  const [studyDesign, setStudyDesign] = useState<StudyDesign>('cohort');

  // Protein count - single value by default, array for comparison mode
  const [proteinCount, setProteinCount] = useState<number>(5000);
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);
  const [proteinCounts, setProteinCounts] = useState<number[]>([1, 5000]);
  const [newProteinCount, setNewProteinCount] = useState<string>('');

  // Effective protein counts based on mode (memoized so its identity is stable
  // when inputs are unchanged, which keeps the downstream memoization effective).
  const effectiveProteinCounts = useMemo(
    () => (comparisonMode ? proteinCounts : [proteinCount]),
    [comparisonMode, proteinCounts, proteinCount]
  );

  // Common parameters
  const [sampleSize, setSampleSize] = useState(1000);
  const [correctionMethod, setCorrectionMethod] = useState<CorrectionMethod>('fdr');
  const [fdrQ, setFdrQ] = useState(0.05); // Used for both FDR q-value and Bonferroni alpha
  const [targetPower, setTargetPower] = useState(0.80);

  // Cox-specific parameters
  const [events, setEvents] = useState(70);

  // Case-cohort parameters
  const [subcohortSize, setSubcohortSize] = useState(500);
  const [totalCohort, setTotalCohort] = useState(5000);

  // Nested case-control parameters
  const [matchingRatio, setMatchingRatio] = useState(4); // Controls per case

  // Linear regression parameters
  const [residualSD, setResidualSD] = useState(1.0);

  // Logistic/Poisson parameters (binary outcome)
  const [prevalence, setPrevalence] = useState(0.10);

  // Case-control parameters
  const [numCases, setNumCases] = useState(200);
  const [numControls, setNumControls] = useState(400);

  // GEE/Mixed Effects parameters
  const [clusterSize, setClusterSize] = useState(5); // Observations per cluster/subject
  const [icc, setICC] = useState(0.05); // Intraclass correlation coefficient

  // Covariate adjustment parameter (all models)
  // R² of protein ~ covariates: proportion of variance in protein explained by adjustment covariates
  const [covariateR2, setCovariateR2] = useState(0);

  // Effect size (dynamic based on analysis type)
  const [effectSize, setEffectSize] = useState(1.2);

  // Add a new protein count scenario
  const addProteinCount = () => {
    const count = parseInt(newProteinCount);
    if (!isNaN(count) && count >= 1 && count <= 100000 && !proteinCounts.includes(count)) {
      setProteinCounts([...proteinCounts, count].sort((a, b) => a - b));
      setNewProteinCount('');
    }
  };

  // Remove a protein count scenario
  const removeProteinCount = (count: number) => {
    if (proteinCounts.length > 1) {
      setProteinCounts(proteinCounts.filter(c => c !== count));
    }
  };

  // Reset effect size when analysis type changes
  const handleAnalysisTypeChange = (newType: AnalysisType) => {
    setAnalysisType(newType);
    setEffectSize(EFFECT_SIZE_CONFIG[newType].default);
    // Reset study design to first available option
    const availableDesigns = STUDY_DESIGN_OPTIONS[newType];
    if (!availableDesigns.find(d => d.value === studyDesign)) {
      setStudyDesign(availableDesigns[0].value);
    }
  };

  // Get current effect size config
  const effectConfig = EFFECT_SIZE_CONFIG[analysisType];

  // Total participants for the current design, used as the "current" reference
  // in the sample-size sensitivity views. Case-control / nested designs are sized
  // by cases + controls rather than the cohort sample-size input.
  const currentTotalSample =
    studyDesign === 'case-control' || studyDesign === 'nested-case-control'
      ? numCases + numControls
      : sampleSize;

  // Linear and GEE report an additive β (shown to 3 decimals); the ratio models
  // (Cox/logistic/Poisson) report HR/OR/RR to 2 decimals.
  const effectDecimals = analysisType === 'linear' || analysisType === 'gee' ? 3 : 2;

  // Setup generic power calculation hooks
  const {
    calculatePowerForEffect,
    calculatePowerAtSampleSize,
    calculateMinEffectForAlpha,
    calculateRequiredSampleForAlpha,
    calculateRequiredEventsForViz,
    calculateRequiredSampleSizeForViz,
  } = usePowerCalculations({
    analysisType,
    studyDesign,
    effectSize,
    targetPower,
    events,
    sampleSize,
    residualSD,
    prevalence,
    numCases,
    numControls,
    subcohortSize,
    totalCohort,
    matchingRatio,
    clusterSize,
    icc,
    covariateR2,
  });

  // Calculate SE (standard error) - independent of alpha/protein count
  const standardError = useMemo(() => {
    switch (analysisType) {
      case 'cox':
        if (studyDesign === 'case-cohort') {
          return calculateCoxCaseCohortSE(events, subcohortSize, totalCohort, covariateR2);
        } else if (studyDesign === 'nested-case-control') {
          return calculateCoxNestedCaseControlSE(events, matchingRatio, covariateR2);
        }
        return calculateCoxSE(events, covariateR2);
      case 'linear':
        return calculateLinearSE(sampleSize, residualSD, covariateR2);
      case 'logistic':
        return (studyDesign === 'case-control' || studyDesign === 'nested-case-control')
          ? calculateLogisticCaseControlSE(numCases, numControls, covariateR2)
          : calculateLogisticSE(sampleSize, prevalence, covariateR2);
      case 'poisson':
        return calculatePoissonSE(sampleSize, prevalence, covariateR2);
      case 'gee':
        return calculateGEE_SE(sampleSize, clusterSize, icc, residualSD, covariateR2);
      default:
        return 0;
    }
  }, [analysisType, studyDesign, sampleSize, events, subcohortSize, totalCohort, residualSD, prevalence, numCases, numControls, matchingRatio, clusterSize, icc, covariateR2]);

  // Helper functions for AdvancedVisualizations

  // Calculate results for each protein count scenario
  const scenarioResults = useMemo(() => {
    return effectiveProteinCounts.map((count, index) => {
      const alpha = calculateEffectiveAlpha(fdrQ, count, correctionMethod);
      const minEffect = calculateMinEffectForAlpha(alpha);
      const powerAtInput = calculatePowerForEffect(effectSize, alpha);
      const sampleNeeded = calculateRequiredSampleForAlpha(alpha);
      const color = SCENARIO_COLORS[index % SCENARIO_COLORS.length];

      return {
        proteinCount: count,
        alpha,
        minEffect,
        powerAtInput,
        sampleNeeded,
        color,
      };
    });
  }, [effectiveProteinCounts, fdrQ, correctionMethod, effectSize, calculateMinEffectForAlpha, calculatePowerForEffect, calculateRequiredSampleForAlpha]);

  // Generate power curves for all scenarios
  const powerCurves = useMemo(() => {
    const config = EFFECT_SIZE_CONFIG[analysisType];
    const numPoints = 100;
    const step = (config.max - config.min) / (numPoints - 1);

    // Create data points with power for each scenario
    const curveData: Array<Record<string, number>> = [];

    // Pre-calculate alphas outside the loop for performance
    const alphas = effectiveProteinCounts.map(count =>
      calculateEffectiveAlpha(fdrQ, count, correctionMethod)
    );

    for (let i = 0; i < numPoints; i++) {
      const effect = config.min + i * step;
      const dataPoint: Record<string, number> = { effect: Number(effect.toFixed(4)) };

      for (let j = 0; j < effectiveProteinCounts.length; j++) {
        const count = effectiveProteinCounts[j];
        const alpha = alphas[j];
        dataPoint[`power_${count}`] = calculatePowerForEffect(effect, alpha);
      }

      curveData.push(dataPoint);
    }

    return curveData;
  }, [effectiveProteinCounts, fdrQ, correctionMethod, analysisType, calculatePowerForEffect]);

  // Generate table data for all scenarios
  const tableData = useMemo(() => {
    const config = EFFECT_SIZE_CONFIG[analysisType];
    const effectValues = Array.from({ length: 11 }, (_, i) =>
      Number((config.min + (config.max - config.min) * (i / 10)).toFixed(2))
    );

    // Pre-calculate alphas outside the loop for performance
    const alphas = effectiveProteinCounts.map(count =>
      calculateEffectiveAlpha(fdrQ, count, correctionMethod)
    );

    return effectValues.map(effect => {
      const row: Record<string, number> = { effect };
      for (let j = 0; j < effectiveProteinCounts.length; j++) {
        const count = effectiveProteinCounts[j];
        const alpha = alphas[j];
        row[`power_${count}`] = calculatePowerForEffect(effect, alpha);
      }
      return row;
    });
  }, [effectiveProteinCounts, fdrQ, correctionMethod, analysisType, calculatePowerForEffect]);

  // Slider is defined at module scope (see top of file) so it keeps a stable
  // component identity across App re-renders. Defining it inline here would
  // remount it on every state change, breaking drag interactions and focus.

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/30">
      <Header
        analysisType={analysisType}
        studyDesign={studyDesign}
        comparisonMode={comparisonMode}
        proteinCounts={proteinCounts}
        proteinCount={proteinCount}
        ANALYSIS_TYPE_OPTIONS={ANALYSIS_TYPE_OPTIONS}
        STUDY_DESIGN_OPTIONS={STUDY_DESIGN_OPTIONS}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <AnalysisFramework
          analysisType={analysisType}
          studyDesign={studyDesign}
          comparisonMode={comparisonMode}
          proteinCount={proteinCount}
          proteinCounts={proteinCounts}
          newProteinCount={newProteinCount}
          fdrQ={fdrQ}
          correctionMethod={correctionMethod}
          ANALYSIS_TYPE_OPTIONS={ANALYSIS_TYPE_OPTIONS}
          STUDY_DESIGN_OPTIONS={STUDY_DESIGN_OPTIONS}
          handleAnalysisTypeChange={handleAnalysisTypeChange}
          setStudyDesign={setStudyDesign}
          setComparisonMode={setComparisonMode}
          setProteinCount={setProteinCount}
          setNewProteinCount={setNewProteinCount}
          addProteinCount={addProteinCount}
          removeProteinCount={removeProteinCount}
          calculateEffectiveAlpha={calculateEffectiveAlpha}
          SCENARIO_COLORS={SCENARIO_COLORS}
          setProteinCounts={setProteinCounts}
        />

        <StudyParameters
          analysisType={analysisType}
          studyDesign={studyDesign}
          sampleSize={sampleSize}
          setSampleSize={setSampleSize}
          events={events}
          setEvents={setEvents}
          subcohortSize={subcohortSize}
          setSubcohortSize={setSubcohortSize}
          totalCohort={totalCohort}
          setTotalCohort={setTotalCohort}
          matchingRatio={matchingRatio}
          setMatchingRatio={setMatchingRatio}
          residualSD={residualSD}
          setResidualSD={setResidualSD}
          prevalence={prevalence}
          setPrevalence={setPrevalence}
          numCases={numCases}
          setNumCases={setNumCases}
          numControls={numControls}
          setNumControls={setNumControls}
          clusterSize={clusterSize}
          setClusterSize={setClusterSize}
          icc={icc}
          setICC={setICC}
          covariateR2={covariateR2}
          setCovariateR2={setCovariateR2}
          correctionMethod={correctionMethod}
          setCorrectionMethod={setCorrectionMethod}
          fdrQ={fdrQ}
          setFdrQ={setFdrQ}
          targetPower={targetPower}
          setTargetPower={setTargetPower}
          effectSize={effectSize}
          setEffectSize={setEffectSize}
          effectConfig={effectConfig}
          effectDecimals={effectDecimals}
        />

        {/* Key Results Cards - Min Effect by Scenario */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Minimum Detectable {effectConfig.label} for {(targetPower * 100).toFixed(0)}% Power
          </h3>

          <div className={`grid grid-cols-1 sm:grid-cols-2 ${scenarioResults.length > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
            {scenarioResults.map((scenario) => (
              <div
                key={scenario.proteinCount}
                className={`p-4 rounded-lg border ${scenario.color.border} ${scenario.color.light}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${scenario.color.bg}`}></span>
                  <span className={`text-sm font-medium ${scenario.color.text}`}>
                    {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${scenario.color.text}`}>
                  {effectConfig.symbol} ≥ {scenario.minEffect.toFixed(effectDecimals)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  α ≈ {scenario.alpha.toExponential(1)}
                </p>
              </div>
            ))}
          </div>

          {/* Effect Size Inflation (comparing first vs last scenario) */}
          {scenarioResults.length >= 2 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="font-medium">Effect Size Inflation:</span>
                {(() => {
                  const first = scenarioResults[0];
                  const last = scenarioResults[scenarioResults.length - 1];
                  const inflation = calculateInflation(first.minEffect, last.minEffect);
                  return (
                    <span className="text-amber-600 font-semibold">
                      {isFinite(inflation) ? `~${inflation.toFixed(1)}%` : 'N/A'}
                      <span className="font-normal text-gray-500 ml-2">
                        ({first.proteinCount.toLocaleString()} → {last.proteinCount.toLocaleString()} proteins)
                      </span>
                    </span>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Standard Error - always show */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">
                {analysisType === 'linear' || analysisType === 'gee' ? 'SE(β)' : `SE(log ${effectConfig.symbol})`}:
              </span>
              <span className="text-purple-600 font-semibold">
                {isFinite(standardError) ? standardError.toFixed(4) : '∞'}
              </span>
              <span className="text-gray-500">
                {analysisType === 'cox'
                  ? `(${events} events)`
                  : analysisType === 'linear'
                  ? `(n = ${sampleSize})`
                  : analysisType === 'gee'
                  ? `(n = ${sampleSize}, m = ${clusterSize}, ICC = ${icc.toFixed(2)}, DE = ${calculateDesignEffect(clusterSize, icc).toFixed(2)})`
                  : (studyDesign === 'case-control' || studyDesign === 'nested-case-control')
                  ? `(${numCases} cases, ${numControls} controls)`
                  : `(n = ${sampleSize}, prev = ${(prevalence * 100).toFixed(0)}%)`}
              </span>
            </div>
          </div>
        </section>

        {/* Power at Input Effect Size */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Power for {effectConfig.symbol} = {effectSize.toFixed(effectDecimals)}
          </h3>

          {/* Power bars for each scenario */}
          <div className={`grid grid-cols-1 ${scenarioResults.length > 1 ? 'md:grid-cols-2' : ''} ${scenarioResults.length > 2 ? 'lg:grid-cols-3' : ''} gap-4`}>
            {scenarioResults.map((scenario) => (
              <div
                key={scenario.proteinCount}
                className={`rounded-lg p-4 border ${scenario.color.border} ${scenario.color.light}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${scenario.color.bg}`}></span>
                    <span className={`text-sm font-medium ${scenario.color.text}`}>
                      {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">α ≈ {scenario.alpha.toExponential(1)}</span>
                </div>
                <div className={`text-3xl font-bold ${scenario.color.text}`}>
                  {(scenario.powerAtInput * 100).toFixed(1)}%
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${scenario.color.bg} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(scenario.powerAtInput * 100, 100)}%` }}
                  />
                </div>
                <p className={`text-xs ${scenario.color.text} mt-2`}>
                  {scenario.powerAtInput >= targetPower
                    ? `✓ Meets ${(targetPower * 100).toFixed(0)}% target`
                    : scenario.powerAtInput >= 0.5
                    ? `⚠ Below ${(targetPower * 100).toFixed(0)}% target`
                    : '✗ Underpowered'}
                </p>
              </div>
            ))}
          </div>

          {/* Sample/Events needed */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {analysisType === 'cox' ? 'Events' : 'Sample Size'} Required for {(targetPower * 100).toFixed(0)}% Power at {effectConfig.symbol} = {effectSize.toFixed(effectDecimals)}
            </h4>
            <div className={`grid grid-cols-2 ${scenarioResults.length > 2 ? 'md:grid-cols-3' : ''} ${scenarioResults.length > 4 ? 'lg:grid-cols-6' : ''} gap-4`}>
              {scenarioResults.map((scenario) => (
                <div key={scenario.proteinCount} className="text-center">
                  <p className={`text-xl font-bold ${scenario.color.text}`}>
                    {typeof scenario.sampleNeeded === 'string'
                      ? scenario.sampleNeeded
                      : scenario.sampleNeeded === Infinity
                      ? '∞'
                      : typeof scenario.sampleNeeded === 'number'
                      ? scenario.sampleNeeded.toLocaleString()
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Power Chart - multi-scenario comparison */}
        <MultiScenarioPowerChart
          data={powerCurves}
          scenarios={scenarioResults}
          targetPower={targetPower}
          inputEffect={effectSize}
          effectLabel={effectConfig.label}
          effectSymbol={effectConfig.symbol}
          analysisType={analysisType}
        />

        {/* Results Table - show when comparing scenarios */}
        {scenarioResults.length >= 1 && (
          <MultiScenarioResultsTable
            data={tableData}
            scenarios={scenarioResults}
            effectLabel={effectConfig.label}
            analysisType={analysisType}
            targetPower={targetPower}
          />
        )}

        {/* Power by Number of Proteins - always show for comprehensive view */}
        <PowerByProteinsChart
          events={events}
          fdrQ={fdrQ}
          targetPower={targetPower}
          analysisType={analysisType}
          studyDesign={studyDesign}
          sampleSize={sampleSize}
          residualSD={residualSD}
          prevalence={prevalence}
          numCases={numCases}
          numControls={numControls}
          subcohortSize={subcohortSize}
          totalCohort={totalCohort}
          clusterSize={clusterSize}
          icc={icc}
          effectSymbol={effectConfig.symbol}
          correctionMethod={correctionMethod}
          calculatePower={calculatePowerForEffect}
        />

        {/* Sensitivity Analysis */}
        <SensitivityAnalysis
          analysisType={analysisType}
          targetPower={targetPower}
          fdrQ={fdrQ}
          currentSampleSize={currentTotalSample}
          currentEvents={events}
          currentEffectSize={effectSize}
          proteinCounts={effectiveProteinCounts}
          effectSymbol={effectConfig.symbol}
          effectLabel={effectConfig.label}
          calculatePowerForEffect={calculatePowerForEffect}
          calculatePowerAtSampleSize={calculatePowerAtSampleSize}
          correctionMethod={correctionMethod}
        />

        {/* Advanced Visualizations */}
        <AdvancedVisualizations
          analysisType={analysisType}
          targetPower={targetPower}
          scenarios={scenarioResults.map(s => ({
            proteinCount: s.proteinCount,
            alpha: s.alpha,
            minDetectableEffect: s.minEffect,
            color: s.color,
          }))}
          effectSymbol={effectConfig.symbol}
          effectLabel={effectConfig.label}
          currentEffectSize={effectSize}
          currentEvents={events}
          currentSampleSize={currentTotalSample}
          calculateRequiredEvents={calculateRequiredEventsForViz}
          calculateRequiredSampleSize={calculateRequiredSampleSizeForViz}
          calculatePower={calculatePowerAtSampleSize}
        />

        {/* Export Panel */}
        <ExportPanel
          analysisType={analysisType}
          studyDesign={studyDesign}
          scenarios={scenarioResults}
          targetPower={targetPower}
          effectSize={effectSize}
          effectLabel={effectConfig.label}
          effectSymbol={effectConfig.symbol}
          events={events}
          sampleSize={sampleSize}
          fdrQ={fdrQ}
          correctionMethod={correctionMethod}
          prevalence={prevalence}
          residualSD={residualSD}
          numCases={numCases}
          numControls={numControls}
          subcohortSize={subcohortSize}
          totalCohort={totalCohort}
          matchingRatio={matchingRatio}
          clusterSize={clusterSize}
          icc={icc}
          covariateR2={covariateR2}
          tableData={tableData}
        />

        {/* Power Formula Display */}
        <PowerFormula analysisType={analysisType} studyDesign={studyDesign} />

        {/* Methodology & References */}
        <References analysisType={analysisType} studyDesign={studyDesign} />
      </main>
    </div>
  );
}

export default App;
