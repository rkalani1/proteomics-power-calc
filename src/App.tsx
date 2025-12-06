import { useState, useMemo } from 'react';
import { PowerFormula } from './components/MathEquation';
import MultiScenarioPowerChart from './components/MultiScenarioPowerChart';
import MultiScenarioResultsTable from './components/MultiScenarioResultsTable';
import PowerByProteinsChart from './components/PowerByProteinsChart';
import SensitivityAnalysis from './components/SensitivityAnalysis';
import ExportPanel from './components/ExportPanel';
import References from './components/References';
import TwoStagePanel from './components/TwoStagePanel';
import AdvancedVisualizations from './components/AdvancedVisualizations';
import {
  calculateEffectiveAlpha,
  calculateInflation,
  // Multi-model imports
  type AnalysisType,
  type StudyDesign,
  type CorrectionMethod,
  calculateCoxPower,
  calculateCoxMinEffect,
  calculateCoxRequiredEvents,
  calculateCoxSE,
  calculateCoxCaseCohortSE,
  calculateLinearPower,
  calculateLinearMinEffect,
  calculateLinearRequiredN,
  calculateLinearSE,
  calculateLogisticPower,
  calculateLogisticMinEffect,
  calculateLogisticRequiredN,
  calculateLogisticSE,
  calculateLogisticCaseControlSE,
  calculatePoissonPower,
  calculatePoissonMinEffect,
  calculatePoissonRequiredN,
  calculatePoissonSE,
  // GEE/Mixed Effects imports
  calculateGEE_Power,
  calculateGEE_MinEffect,
  calculateGEE_RequiredN,
  calculateGEE_SE,
  calculateDesignEffect,
} from './utils/statistics';

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
    inputDescription: 'HR per 1-SD increase in protein level. HR=1.2 means 20% higher hazard rate.',
  },
  linear: {
    label: 'Standardized Beta',
    symbol: 'β',
    min: 0.0,
    max: 1.0,
    default: 0.2,
    step: 0.01,
    inputLabel: 'Target Beta (β)',
    inputDescription: 'SD change in outcome per 1-SD increase in protein. β=0.2 is a small-moderate effect.',
  },
  logistic: {
    label: 'Odds Ratio',
    symbol: 'OR',
    min: 1.0,
    max: 3.0,
    default: 1.3,
    step: 0.01,
    inputLabel: 'Target Odds Ratio (OR)',
    inputDescription: 'OR per 1-SD increase in protein level. OR=1.3 means 30% higher odds.',
  },
  poisson: {
    label: 'Relative Risk',
    symbol: 'RR',
    min: 1.0,
    max: 3.0,
    default: 1.2,
    step: 0.01,
    inputLabel: 'Target Relative Risk (RR)',
    inputDescription: 'RR per 1-SD increase in protein level. RR=1.2 means 20% higher risk.',
  },
  gee: {
    label: 'Standardized Beta',
    symbol: 'β',
    min: 0.0,
    max: 1.0,
    default: 0.2,
    step: 0.01,
    inputLabel: 'Target Beta (β)',
    inputDescription: 'SD change in outcome per 1-SD increase in protein (clustering-adjusted).',
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

  // Effective protein counts based on mode
  const effectiveProteinCounts = comparisonMode ? proteinCounts : [proteinCount];

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

  // Two-Stage Design parameters
  const [twoStageEnabled, setTwoStageEnabled] = useState(false);
  const [stage1Proteins, setStage1Proteins] = useState(5000);
  const [stage1SampleSize, setStage1SampleSize] = useState(500);
  const [stage2SampleSize, setStage2SampleSize] = useState(1000);
  const [stage1FDR, setStage1FDR] = useState(0.10);
  const [stage2Alpha, setStage2Alpha] = useState(0.05);
  const [expectedHits, setExpectedHits] = useState(10);
  const [sampleOverlap, setSampleOverlap] = useState(0);

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

  // Helper function to calculate power for a given effect size and alpha
  const calculatePowerForEffect = (effect: number, alpha: number): number => {
    switch (analysisType) {
      case 'cox':
        return studyDesign === 'case-cohort'
          ? calculateCoxPower(effect, events, alpha, { subcohortSize, totalCohort })
          : calculateCoxPower(effect, events, alpha);
      case 'linear':
        return calculateLinearPower(effect, sampleSize, residualSD, alpha);
      case 'logistic':
        return (studyDesign === 'case-control' || studyDesign === 'nested-case-control')
          ? calculateLogisticPower(effect, 0, 0, alpha, { cases: numCases, controls: numControls })
          : calculateLogisticPower(effect, sampleSize, prevalence, alpha);
      case 'poisson':
        return calculatePoissonPower(effect, sampleSize, prevalence, alpha);
      case 'gee':
        return calculateGEE_Power(effect, sampleSize, clusterSize, icc, residualSD, alpha);
      default:
        return 0;
    }
  };

  // Helper function to calculate min effect for a given alpha
  const calculateMinEffectForAlpha = (alpha: number): number => {
    switch (analysisType) {
      case 'cox':
        return studyDesign === 'case-cohort'
          ? calculateCoxMinEffect(targetPower, events, alpha, { subcohortSize, totalCohort })
          : calculateCoxMinEffect(targetPower, events, alpha);
      case 'linear':
        return calculateLinearMinEffect(targetPower, sampleSize, residualSD, alpha);
      case 'logistic':
        return (studyDesign === 'case-control' || studyDesign === 'nested-case-control')
          ? calculateLogisticMinEffect(targetPower, 0, 0, alpha, { cases: numCases, controls: numControls })
          : calculateLogisticMinEffect(targetPower, sampleSize, prevalence, alpha);
      case 'poisson':
        return calculatePoissonMinEffect(targetPower, sampleSize, prevalence, alpha);
      case 'gee':
        return calculateGEE_MinEffect(targetPower, sampleSize, clusterSize, icc, residualSD, alpha);
      default:
        return Infinity;
    }
  };

  // Helper function to calculate required sample/events for a given alpha
  const calculateRequiredSampleForAlpha = (alpha: number): number | string => {
    switch (analysisType) {
      case 'cox':
        return calculateCoxRequiredEvents(effectSize, targetPower, alpha);
      case 'linear':
        return calculateLinearRequiredN(effectSize, targetPower, residualSD, alpha);
      case 'logistic':
        return (studyDesign === 'case-control' || studyDesign === 'nested-case-control')
          ? `${numCases}:${numControls}`
          : calculateLogisticRequiredN(effectSize, targetPower, prevalence, alpha);
      case 'poisson':
        return calculatePoissonRequiredN(effectSize, targetPower, prevalence, alpha);
      case 'gee':
        return calculateGEE_RequiredN(effectSize, targetPower, clusterSize, icc, residualSD, alpha);
      default:
        return Infinity;
    }
  };

  // Calculate SE (standard error) - independent of alpha/protein count
  const standardError = useMemo(() => {
    switch (analysisType) {
      case 'cox':
        if (studyDesign === 'case-cohort') {
          return calculateCoxCaseCohortSE(events, subcohortSize, totalCohort);
        } else if (studyDesign === 'nested-case-control') {
          return calculateCoxSE(events) * Math.sqrt(1 + 1/matchingRatio);
        }
        return calculateCoxSE(events);
      case 'linear':
        return calculateLinearSE(sampleSize, residualSD);
      case 'logistic':
        return (studyDesign === 'case-control' || studyDesign === 'nested-case-control')
          ? calculateLogisticCaseControlSE(numCases, numControls)
          : calculateLogisticSE(sampleSize, prevalence);
      case 'poisson':
        return calculatePoissonSE(sampleSize, prevalence);
      case 'gee':
        return calculateGEE_SE(sampleSize, clusterSize, icc, residualSD);
      default:
        return 0;
    }
  }, [analysisType, studyDesign, sampleSize, events, subcohortSize, totalCohort, residualSD, prevalence, numCases, numControls, matchingRatio, clusterSize, icc]);

  // Helper functions for AdvancedVisualizations
  const calculateRequiredEventsForViz = (effect: number, alpha: number, power: number): number => {
    return calculateCoxRequiredEvents(effect, power, alpha);
  };

  const calculateRequiredSampleSizeForViz = (effect: number, alpha: number, power: number): number => {
    switch (analysisType) {
      case 'linear':
        return calculateLinearRequiredN(effect, power, residualSD, alpha);
      case 'logistic':
        return calculateLogisticRequiredN(effect, power, prevalence, alpha);
      case 'poisson':
        return calculatePoissonRequiredN(effect, power, prevalence, alpha);
      case 'gee':
        return calculateGEE_RequiredN(effect, power, clusterSize, icc, residualSD, alpha);
      default:
        return Infinity;
    }
  };

  const calculatePowerForViz = (effect: number, alpha: number, n: number): number => {
    switch (analysisType) {
      case 'cox':
        return calculateCoxPower(effect, n, alpha);
      case 'linear':
        return calculateLinearPower(effect, n, residualSD, alpha);
      case 'logistic':
        return calculateLogisticPower(effect, n, prevalence, alpha);
      case 'poisson':
        return calculatePoissonPower(effect, n, prevalence, alpha);
      case 'gee':
        return calculateGEE_Power(effect, n, clusterSize, icc, residualSD, alpha);
      default:
        return 0;
    }
  };

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
  }, [effectiveProteinCounts, fdrQ, correctionMethod, targetPower, effectSize, analysisType, studyDesign, sampleSize, events, subcohortSize, totalCohort, residualSD, prevalence, numCases, numControls, clusterSize, icc]);

  // Generate power curves for all scenarios
  const powerCurves = useMemo(() => {
    const config = EFFECT_SIZE_CONFIG[analysisType];
    const numPoints = 100;
    const step = (config.max - config.min) / (numPoints - 1);

    // Create data points with power for each scenario
    const curveData: Array<Record<string, number>> = [];

    for (let i = 0; i < numPoints; i++) {
      const effect = config.min + i * step;
      const dataPoint: Record<string, number> = { effect: Number(effect.toFixed(4)) };

      effectiveProteinCounts.forEach((count) => {
        const alpha = calculateEffectiveAlpha(fdrQ, count, correctionMethod);
        dataPoint[`power_${count}`] = calculatePowerForEffect(effect, alpha);
      });

      curveData.push(dataPoint);
    }

    return curveData;
  }, [effectiveProteinCounts, fdrQ, correctionMethod, analysisType, studyDesign, sampleSize, events, subcohortSize, totalCohort, residualSD, prevalence, numCases, numControls, clusterSize, icc]);

  // Generate table data for all scenarios
  const tableData = useMemo(() => {
    const config = EFFECT_SIZE_CONFIG[analysisType];
    const effectValues = Array.from({ length: 11 }, (_, i) =>
      Number((config.min + (config.max - config.min) * (i / 10)).toFixed(2))
    );

    return effectValues.map(effect => {
      const row: Record<string, number> = { effect };
      effectiveProteinCounts.forEach((count) => {
        const alpha = calculateEffectiveAlpha(fdrQ, count, correctionMethod);
        row[`power_${count}`] = calculatePowerForEffect(effect, alpha);
      });
      return row;
    });
  }, [effectiveProteinCounts, fdrQ, correctionMethod, analysisType, studyDesign, sampleSize, events, subcohortSize, totalCohort, residualSD, prevalence, numCases, numControls, clusterSize, icc]);

  // Slider component with improved UX
  const Slider = ({
    label,
    value,
    onChange,
    min,
    max,
    step,
    unit = '',
    description = '',
    decimals = 0,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    unit?: string;
    description?: string;
    decimals?: number;
  }) => {
    // Handle direct input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        // Clamp value to valid range
        const clampedValue = Math.min(max, Math.max(min, newValue));
        onChange(clampedValue);
      }
    };

    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={decimals > 0 ? value.toFixed(decimals) : value}
            onChange={handleInputChange}
            className="w-24 px-2 py-1 text-right text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-slider"
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>{decimals > 0 ? min.toFixed(decimals) : min.toLocaleString()}{unit}</span>
          <span>{decimals > 0 ? max.toFixed(decimals) : max.toLocaleString()}{unit}</span>
        </div>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Proteomics Power Calculator
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Statistical power analysis for high-throughput proteomics studies</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 rounded-full font-medium border border-indigo-200/50 shadow-sm">
                {ANALYSIS_TYPE_OPTIONS.find(o => o.value === analysisType)?.label}
              </span>
              <span className="px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-full font-medium border border-purple-200/50 shadow-sm">
                {STUDY_DESIGN_OPTIONS[analysisType].find(o => o.value === studyDesign)?.label}
              </span>
              <span className="px-3 py-1.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 rounded-full font-medium border border-amber-200/50 shadow-sm">
                {comparisonMode
                  ? `Comparing ${proteinCounts.length} scenario${proteinCounts.length !== 1 ? 's' : ''}`
                  : `${proteinCount.toLocaleString()} proteins`
                }
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Model Selection */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Analysis Framework
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Analysis Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
              <div className="grid grid-cols-2 gap-2">
                {ANALYSIS_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnalysisTypeChange(option.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      analysisType === option.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                        : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Study Design */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Study Design</label>
              <div className="grid grid-cols-1 gap-2">
                {STUDY_DESIGN_OPTIONS[analysisType].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStudyDesign(option.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      studyDesign === option.value
                        ? 'border-purple-500 bg-purple-50 text-purple-900'
                        : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Protein Count */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Number of Proteins
              </label>
              <button
                onClick={() => setComparisonMode(!comparisonMode)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  comparisonMode
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {comparisonMode ? 'Comparison On' : 'Compare Scenarios'}
              </button>
            </div>

            {!comparisonMode ? (
              /* Single protein count mode */
              <div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={proteinCount}
                    onChange={(e) => setProteinCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-sm text-gray-500">
                    Effective α ≈ {calculateEffectiveAlpha(fdrQ, proteinCount, correctionMethod).toExponential(2)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 mr-2">Presets:</span>
                  {[1, 100, 1000, 3000, 5000, 7000].map(n => (
                    <button
                      key={n}
                      onClick={() => setProteinCount(n)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        proteinCount === n
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'
                      }`}
                    >
                      {n.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Comparison mode */
              <div>
                <p className="text-xs text-gray-500 mb-4">
                  Compare power across different protein counts (e.g., targeted panel vs. proteome-wide).
                </p>

                {/* Current protein counts */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {proteinCounts.map((count, index) => {
                    const color = SCENARIO_COLORS[index % SCENARIO_COLORS.length];
                    return (
                      <div
                        key={count}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${color.border} ${color.light}`}
                      >
                        <span className={`w-3 h-3 rounded-full ${color.bg}`}></span>
                        <span className={`font-medium ${color.text}`}>
                          {count.toLocaleString()} protein{count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-500">
                          (α≈{calculateEffectiveAlpha(fdrQ, count, correctionMethod).toExponential(1)})
                        </span>
                        {proteinCounts.length > 1 && (
                          <button
                            onClick={() => removeProteinCount(count)}
                            className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add new protein count */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={newProteinCount}
                    onChange={(e) => setNewProteinCount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addProteinCount()}
                    placeholder="Enter protein count..."
                    className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={addProteinCount}
                    disabled={!newProteinCount || proteinCounts.length >= 6}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                  {proteinCounts.length >= 6 && (
                    <span className="text-xs text-amber-600">Maximum 6 scenarios</span>
                  )}
                </div>

                {/* Quick add presets */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 mr-2">Quick add:</span>
                  {[1, 50, 100, 500, 1000, 3000, 5000, 7000].filter(n => !proteinCounts.includes(n)).slice(0, 5).map(n => (
                    <button
                      key={n}
                      onClick={() => {
                        if (proteinCounts.length < 6) {
                          setProteinCounts([...proteinCounts, n].sort((a, b) => a - b));
                        }
                      }}
                      disabled={proteinCounts.length >= 6}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {n.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Study Parameters */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Study Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Sample Size - shown for most designs except case-control/nested-case-control */}
            {studyDesign !== 'case-control' && studyDesign !== 'nested-case-control' && (
              <Slider
                label="Sample Size (n)"
                value={sampleSize}
                onChange={setSampleSize}
                min={100}
                max={50000}
                step={100}
                description="Total participants in study"
              />
            )}

            {/* Cox-specific: Number of Events */}
            {analysisType === 'cox' && (
              <Slider
                label="Number of Events (d)"
                value={events}
                onChange={setEvents}
                min={10}
                max={1000}
                step={1}
                description="Outcome events observed"
              />
            )}

            {/* Case-cohort: Subcohort size and Total cohort */}
            {analysisType === 'cox' && studyDesign === 'case-cohort' && (
              <>
                <Slider
                  label="Subcohort Size"
                  value={subcohortSize}
                  onChange={setSubcohortSize}
                  min={100}
                  max={5000}
                  step={50}
                  description="Random sample from full cohort"
                />
                <Slider
                  label="Total Cohort Size"
                  value={totalCohort}
                  onChange={setTotalCohort}
                  min={1000}
                  max={100000}
                  step={500}
                  description="Full cohort before sampling"
                />
              </>
            )}

            {/* Nested case-control: Matching ratio */}
            {studyDesign === 'nested-case-control' && analysisType === 'cox' && (
              <Slider
                label="Matching Ratio (Controls per Case)"
                value={matchingRatio}
                onChange={setMatchingRatio}
                min={1}
                max={10}
                step={1}
                description={`${matchingRatio}:1 matching (${events} cases × ${matchingRatio} controls)`}
              />
            )}

            {/* Linear regression: Residual SD */}
            {analysisType === 'linear' && (
              <Slider
                label="Residual SD"
                value={residualSD}
                onChange={setResidualSD}
                min={0.1}
                max={5.0}
                step={0.1}
                decimals={1}
                description="Standard deviation of residuals"
              />
            )}

            {/* Logistic/Poisson: Prevalence (for cohort/cross-sectional designs) */}
            {(analysisType === 'logistic' || analysisType === 'poisson') &&
             studyDesign !== 'case-control' && studyDesign !== 'nested-case-control' && (
              <Slider
                label="Outcome Prevalence"
                value={prevalence}
                onChange={setPrevalence}
                min={0.01}
                max={0.50}
                step={0.01}
                decimals={2}
                description={`${(prevalence * 100).toFixed(0)}% of sample has outcome`}
              />
            )}

            {/* Case-control / Nested case-control: Cases and Controls */}
            {(studyDesign === 'case-control' || studyDesign === 'nested-case-control') && (
              <>
                <Slider
                  label="Number of Cases"
                  value={numCases}
                  onChange={setNumCases}
                  min={50}
                  max={5000}
                  step={10}
                  description="Participants with outcome"
                />
                <Slider
                  label="Number of Controls"
                  value={numControls}
                  onChange={setNumControls}
                  min={50}
                  max={10000}
                  step={10}
                  description="Participants without outcome"
                />
              </>
            )}

            {/* GEE/Mixed Effects: Cluster size and ICC */}
            {analysisType === 'gee' && (
              <>
                <Slider
                  label="Cluster Size (m)"
                  value={clusterSize}
                  onChange={setClusterSize}
                  min={2}
                  max={50}
                  step={1}
                  description={`Observations per cluster/subject (DE = ${calculateDesignEffect(clusterSize, icc).toFixed(2)})`}
                />
                <Slider
                  label="Intraclass Correlation (ICC)"
                  value={icc}
                  onChange={setICC}
                  min={0.00}
                  max={0.50}
                  step={0.01}
                  decimals={2}
                  description="Correlation between observations in same cluster"
                />
                <Slider
                  label="Residual SD"
                  value={residualSD}
                  onChange={setResidualSD}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  decimals={1}
                  description="Standard deviation of residuals"
                />
              </>
            )}

            {/* Multiple Testing Correction */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Multiple Testing Correction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCorrectionMethod('fdr')}
                    className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                      correctionMethod === 'fdr'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                        : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm">FDR (BH)</div>
                    <div className="text-xs text-gray-500">False Discovery Rate</div>
                  </button>
                  <button
                    onClick={() => setCorrectionMethod('bonferroni')}
                    className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                      correctionMethod === 'bonferroni'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                        : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm">Bonferroni</div>
                    <div className="text-xs text-gray-500">Family-Wise Error Rate</div>
                  </button>
                </div>
              </div>
              <Slider
                label={correctionMethod === 'fdr' ? 'FDR Threshold (q)' : 'FWER Alpha (α)'}
                value={fdrQ}
                onChange={setFdrQ}
                min={0.01}
                max={0.20}
                step={0.01}
                decimals={2}
                description={
                  correctionMethod === 'fdr'
                    ? 'Benjamini-Hochberg: Controls expected false discovery proportion'
                    : 'Bonferroni: Controls probability of any false positive'
                }
              />
            </div>

            {/* Target Power */}
            <Slider
              label="Target Power"
              value={targetPower}
              onChange={setTargetPower}
              min={0.50}
              max={0.99}
              step={0.01}
              decimals={2}
              description={`${(targetPower * 100).toFixed(0)}% probability of detecting true effect`}
            />

            {/* Dynamic Effect Size Slider */}
            <Slider
              label={effectConfig.inputLabel}
              value={effectSize}
              onChange={setEffectSize}
              min={effectConfig.min}
              max={effectConfig.max}
              step={effectConfig.step}
              decimals={analysisType === 'linear' ? 3 : 2}
              description={effectConfig.inputDescription}
            />
          </div>
        </section>

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
                  {effectConfig.symbol} ≥ {analysisType === 'linear'
                    ? scenario.minEffect.toFixed(3)
                    : scenario.minEffect.toFixed(2)}
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
                {analysisType === 'linear' ? 'SE(β)' : `SE(log ${effectConfig.symbol})`}:
              </span>
              <span className="text-purple-600 font-semibold">
                {isFinite(standardError) ? standardError.toFixed(4) : '∞'}
              </span>
              <span className="text-gray-500">
                {analysisType === 'cox'
                  ? `(${events} events)`
                  : analysisType === 'linear'
                  ? `(n = ${sampleSize})`
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
            Power for {effectConfig.symbol} = {effectSize.toFixed(analysisType === 'linear' ? 3 : 2)}
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
                  {scenario.powerAtInput >= 0.8 ? '✓ Adequately powered' :
                   scenario.powerAtInput >= 0.5 ? '⚠ Marginally powered' : '✗ Underpowered'}
                </p>
              </div>
            ))}
          </div>

          {/* Sample/Events needed */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {analysisType === 'cox' ? 'Events' : 'Sample Size'} Required for {(targetPower * 100).toFixed(0)}% Power at {effectConfig.symbol} = {effectSize.toFixed(analysisType === 'linear' ? 3 : 2)}
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
          effectSymbol={effectConfig.symbol}
          correctionMethod={correctionMethod}
        />

        {/* Two-Stage Design Analysis */}
        <TwoStagePanel
          enabled={twoStageEnabled}
          onToggle={setTwoStageEnabled}
          analysisType={analysisType}
          effectSize={effectSize}
          stage1Proteins={stage1Proteins}
          onStage1ProteinsChange={setStage1Proteins}
          stage1SampleSize={stage1SampleSize}
          onStage1SampleSizeChange={setStage1SampleSize}
          stage2SampleSize={stage2SampleSize}
          onStage2SampleSizeChange={setStage2SampleSize}
          stage1FDR={stage1FDR}
          onStage1FDRChange={setStage1FDR}
          stage2Alpha={stage2Alpha}
          onStage2AlphaChange={setStage2Alpha}
          expectedHits={expectedHits}
          onExpectedHitsChange={setExpectedHits}
          sampleOverlap={sampleOverlap}
          onSampleOverlapChange={setSampleOverlap}
          studyParams={{
            studyDesign,
            events,
            residualSD,
            prevalence,
            cases: numCases,
            controls: numControls,
            clusterSize,
            icc,
          }}
        />

        {/* Sensitivity Analysis */}
        <SensitivityAnalysis
          analysisType={analysisType}
          targetPower={targetPower}
          fdrQ={fdrQ}
          currentSampleSize={sampleSize}
          currentEvents={events}
          currentEffectSize={effectSize}
          proteinCounts={effectiveProteinCounts}
          effectSymbol={effectConfig.symbol}
          effectLabel={effectConfig.label}
          calculatePowerForEffect={calculatePowerForEffect}
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
          currentSampleSize={sampleSize}
          calculateRequiredEvents={calculateRequiredEventsForViz}
          calculateRequiredSampleSize={calculateRequiredSampleSizeForViz}
          calculatePower={calculatePowerForViz}
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
          prevalence={prevalence}
          residualSD={residualSD}
          numCases={numCases}
          numControls={numControls}
          tableData={tableData}
        />

        {/* Power Formula Display */}
        <PowerFormula analysisType={analysisType} />

        {/* Methodology & References */}
        <References analysisType={analysisType} studyDesign={studyDesign} />
      </main>
    </div>
  );
}

export default App;
