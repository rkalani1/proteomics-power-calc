import { useEffect, useMemo, useRef, useState } from 'react';
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
import { MinEffectCards } from './components/MinEffectCards';
import { PowerAtInputCards } from './components/PowerAtInputCards';
import {
  calculateEffectiveAlpha,
  // Multi-model imports
  type AnalysisType,
  type StudyDesign,
  type CorrectionMethod,
  type PowerParams,
  calculateCoxSE,
  calculateCoxCaseCohortSE,
  calculateCoxNestedCaseControlSE,
  calculateLinearSE,
  calculateLogisticSE,
  calculateLogisticCaseControlSE,
  calculatePoissonSE,
  calculatePower,
  // GEE/Mixed Effects imports
  calculateGEE_SE,
} from './utils/statistics';
import { usePowerCalculations } from './hooks/usePowerCalculations';
import { ANALYSIS_TYPE_OPTIONS, EFFECT_SIZE_CONFIG, SCENARIO_COLORS, STUDY_DESIGN_OPTIONS } from './constants/config';

const WORKFLOW_SECTIONS = [
  { id: 'setup', label: 'Setup' },
  { id: 'parameters', label: 'Parameters' },
  { id: 'results', label: 'Results' },
  { id: 'sensitivity', label: 'Sensitivity' },
  { id: 'export', label: 'Export' },
  { id: 'methods', label: 'Methods' },
] as const;

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
  const [currentSection, setCurrentSection] = useState<(typeof WORKFLOW_SECTIONS)[number]['id']>('setup');
  const activatedSectionRef = useRef<(typeof WORKFLOW_SECTIONS)[number]['id'] | null>(null);
  const activatedSectionReleaseRef = useRef<number | null>(null);
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

  // Keep every scenario insertion path on the same validity and ordering policy.
  const addProteinScenario = (count: number): boolean => {
    if (
      !Number.isInteger(count)
      || count < 1
      || count > 100000
      || proteinCounts.length >= 6
      || proteinCounts.includes(count)
    ) {
      return false;
    }
    setProteinCounts([...proteinCounts, count].sort((a, b) => a - b));
    return true;
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

  const currentScenario = scenarioResults.find(result => result.proteinCount === proteinCount) ?? scenarioResults[0];

  useEffect(() => {
    const updateCurrentSection = () => {
      if (activatedSectionRef.current) {
        setCurrentSection(activatedSectionRef.current);
        return;
      }

      if (window.scrollY < 80) {
        setCurrentSection('setup');
        return;
      }
      let activeSection: (typeof WORKFLOW_SECTIONS)[number]['id'] = 'setup';
      const activationLine = Math.min(220, window.innerHeight * 0.35);
      WORKFLOW_SECTIONS.forEach(section => {
        const element = document.getElementById(`${section.id}-section`);
        if (element && element.getBoundingClientRect().top <= activationLine) {
          activeSection = section.id;
        }
      });
      setCurrentSection(activeSection);
    };

    updateCurrentSection();
    window.addEventListener('scroll', updateCurrentSection, { passive: true });
    window.addEventListener('resize', updateCurrentSection);
    return () => {
      window.removeEventListener('scroll', updateCurrentSection);
      window.removeEventListener('resize', updateCurrentSection);
      if (activatedSectionReleaseRef.current !== null) {
        window.clearTimeout(activatedSectionReleaseRef.current);
      }
    };
  }, []);

  const activateSection = (sectionId: (typeof WORKFLOW_SECTIONS)[number]['id']) => {
    const section = document.getElementById(`${sectionId}-section`);
    if (!section) return;
    activatedSectionRef.current = sectionId;
    if (activatedSectionReleaseRef.current !== null) {
      window.clearTimeout(activatedSectionReleaseRef.current);
    }
    activatedSectionReleaseRef.current = window.setTimeout(() => {
      activatedSectionRef.current = null;
      activatedSectionReleaseRef.current = null;
    }, 900);
    setCurrentSection(sectionId);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      setCurrentSection(sectionId);
      const heading = section.querySelector<HTMLElement>('h2, h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }, 250);
  };

  // Generate power curves and table data for all scenarios together to avoid redundant computation
  const { powerCurves, tableData } = useMemo(() => {
    const config = EFFECT_SIZE_CONFIG[analysisType];
    const numPoints = 101; // 101 points so steps overlap nicely with 10% increments for the table
    const step = (config.max - config.min) / (numPoints - 1);

    // Create data points with power for each scenario
    const curveData: Array<Record<string, number>> = [];
    const tData: Array<Record<string, number>> = [];

    const numScenarios = effectiveProteinCounts.length;

    // Pre-calculate alphas and property keys outside the loop for performance
    const alphas = new Float64Array(numScenarios);
    const powerKeys = new Array<string>(numScenarios);

    for (let j = 0; j < numScenarios; j++) {
      const count = effectiveProteinCounts[j];
      alphas[j] = calculateEffectiveAlpha(fdrQ, count, correctionMethod);
      powerKeys[j] = `power_${count}`;
    }

    // Hoist base parameters outside the loops to avoid repeated object creation
    // and spread operations in the calculatePowerForEffect wrapper.
    const baseParams: PowerParams = {
      analysisType,
      studyDesign,
      effectSize: 0, // Will be mutated in loop
      alpha: 0,      // Will be mutated in loop
      events,
      sampleSize,
      residualSD,
      prevalence,
      cases: numCases,
      controls: numControls,
      subcohortSize,
      totalCohort,
      matchingRatio,
      clusterSize,
      icc,
      covariateR2,
    };

    for (let i = 0; i < numPoints; i++) {
      const effect = config.min + i * step;
      const dataPoint: Record<string, number> = { effect: Number(effect.toFixed(4)) };
      baseParams.effectSize = effect;

      for (let j = 0; j < numScenarios; j++) {
        baseParams.alpha = alphas[j];
        dataPoint[powerKeys[j]] = calculatePower(baseParams);
      }

      curveData.push(dataPoint);

      // Extract every 10th point for the table data (11 points total: 0, 10, ..., 100)
      if (i % 10 === 0) {
        tData.push({
          ...dataPoint,
          effect: Number(effect.toFixed(2)) // Keep 2 decimal format for the table
        });
      }
    }

    return { powerCurves: curveData, tableData: tData };
  }, [
    effectiveProteinCounts,
    fdrQ,
    correctionMethod,
    analysisType,
    studyDesign,
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
  ]);

  // Slider is defined at module scope (see top of file) so it keeps a stable
  // component identity across App re-renders. Defining it inline here would
  // remount it on every state change, breaking drag interactions and focus.

  return (
    <div className="assay-shell min-h-screen">
      <Header
        analysisType={analysisType}
        studyDesign={studyDesign}
        comparisonMode={comparisonMode}
        proteinCounts={proteinCounts}
        proteinCount={proteinCount}
        ANALYSIS_TYPE_OPTIONS={ANALYSIS_TYPE_OPTIONS}
        STUDY_DESIGN_OPTIONS={STUDY_DESIGN_OPTIONS}
      />

      <nav className="section-rail" aria-label="Calculator sections">
        <div className="section-rail-inner">
          {WORKFLOW_SECTIONS.map(section => (
            <button
              key={section.id}
              type="button"
              aria-current={currentSection === section.id ? 'location' : undefined}
              onClick={() => activateSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="assay-workspace max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="assay-inputs">
          <div id="setup-section" className="workflow-section">
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
          addProteinScenario={addProteinScenario}
          removeProteinCount={removeProteinCount}
          calculateEffectiveAlpha={calculateEffectiveAlpha}
          SCENARIO_COLORS={SCENARIO_COLORS}
          />
          </div>

          <div id="parameters-section" className="workflow-section">
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
          </div>
        </div>

        <div className="assay-results">
          {currentScenario && (
            <aside className="desktop-result-summary" aria-label="Current result summary">
              <div>
                <span className="desktop-result-summary__eyebrow">Current scenario</span>
                <strong>{currentScenario.proteinCount.toLocaleString()} protein{currentScenario.proteinCount !== 1 ? 's' : ''}</strong>
              </div>
              <div>
                <span>{effectConfig.symbol} {effectSize.toFixed(effectDecimals)}</span>
                <strong className={currentScenario.powerAtInput >= targetPower ? 'is-adequate' : 'is-underpowered'}>
                  {(currentScenario.powerAtInput * 100).toFixed(1)}% power
                </strong>
              </div>
              <span className={currentScenario.powerAtInput >= targetPower ? 'summary-status is-adequate' : 'summary-status is-underpowered'}>
                {currentScenario.powerAtInput >= targetPower
                  ? `Target ${(targetPower * 100).toFixed(0)}% attained`
                  : `${((targetPower - currentScenario.powerAtInput) * 100).toFixed(1)} points to target`}
              </span>
            </aside>
          )}

          <div id="results-section" className="workflow-section">
          <MinEffectCards
          analysisType={analysisType}
          effectConfig={effectConfig}
          effectDecimals={effectDecimals}
          events={events}
          icc={icc}
          clusterSize={clusterSize}
          numCases={numCases}
          numControls={numControls}
          prevalence={prevalence}
          sampleSize={sampleSize}
          subcohortSize={subcohortSize}
          totalCohort={totalCohort}
          matchingRatio={matchingRatio}
          scenarioResults={scenarioResults}
          standardError={standardError}
          studyDesign={studyDesign}
          targetPower={targetPower}
          />

          <PowerAtInputCards
          analysisType={analysisType}
          effectConfig={effectConfig}
          effectDecimals={effectDecimals}
          effectSize={effectSize}
          scenarioResults={scenarioResults}
          targetPower={targetPower}
          />

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

        {/* Results Table - only adds value when comparing multiple scenarios;
            the single-scenario curve is already shown by the chart above. */}
        {scenarioResults.length >= 2 && (
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
          matchingRatio={matchingRatio}
          clusterSize={clusterSize}
          icc={icc}
          covariateR2={covariateR2}
          effectSymbol={effectConfig.symbol}
          correctionMethod={correctionMethod}
          calculatePower={calculatePowerForEffect}
          />
          </div>

        {/* Sensitivity Analysis */}
          <div id="sensitivity-section" className="workflow-section">
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
          </div>

        {/* Export Panel */}
          <div id="export-section" className="workflow-section">
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
          </div>

        {/* Power Formula Display */}
          <div id="methods-section" className="workflow-section">
          <PowerFormula analysisType={analysisType} studyDesign={studyDesign} />

        {/* Methodology & References */}
          <References analysisType={analysisType} studyDesign={studyDesign} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
