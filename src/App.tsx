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

import { usePowerCalculator } from './hooks/usePowerCalculator';
import { calculateEffectiveAlpha } from './utils/statistics';
import { ANALYSIS_TYPE_OPTIONS, STUDY_DESIGN_OPTIONS, SCENARIO_COLORS } from './constants/config';

function App() {
  const {
    analysisType,
    studyDesign, setStudyDesign,
    proteinCount, setProteinCount,
    comparisonMode, setComparisonMode,
    proteinCounts, setProteinCounts,
    newProteinCount, setNewProteinCount,
    effectiveProteinCounts,
    sampleSize, setSampleSize,
    correctionMethod, setCorrectionMethod,
    fdrQ, setFdrQ,
    targetPower, setTargetPower,
    events, setEvents,
    subcohortSize, setSubcohortSize,
    totalCohort, setTotalCohort,
    matchingRatio, setMatchingRatio,
    residualSD, setResidualSD,
    prevalence, setPrevalence,
    numCases, setNumCases,
    numControls, setNumControls,
    clusterSize, setClusterSize,
    icc, setICC,
    covariateR2, setCovariateR2,
    effectSize, setEffectSize,
    addProteinCount, removeProteinCount,
    handleAnalysisTypeChange,
    effectConfig,
    currentTotalSample,
    effectDecimals,
    calculatePowerForEffect,
    calculatePowerAtSampleSize,
    calculateRequiredEventsForViz,
    calculateRequiredSampleSizeForViz,
    standardError,
    scenarioResults,
    powerCurves,
    tableData,
  } = usePowerCalculator();

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

        <MinEffectCards
          scenarioResults={scenarioResults}
          effectConfig={effectConfig}
          targetPower={targetPower}
          effectDecimals={effectDecimals}
          analysisType={analysisType}
          studyDesign={studyDesign}
          standardError={standardError}
          events={events}
          sampleSize={sampleSize}
          clusterSize={clusterSize}
          icc={icc}
          numCases={numCases}
          numControls={numControls}
          prevalence={prevalence}
        />

        <PowerAtInputCards
          scenarioResults={scenarioResults}
          effectConfig={effectConfig}
          effectSize={effectSize}
          effectDecimals={effectDecimals}
          targetPower={targetPower}
          analysisType={analysisType}
        />

        <MultiScenarioPowerChart
          data={powerCurves}
          scenarios={scenarioResults}
          targetPower={targetPower}
          inputEffect={effectSize}
          effectLabel={effectConfig.label}
          effectSymbol={effectConfig.symbol}
          analysisType={analysisType}
        />

        {scenarioResults.length >= 1 && (
          <MultiScenarioResultsTable
            data={tableData}
            scenarios={scenarioResults}
            effectLabel={effectConfig.label}
            analysisType={analysisType}
            targetPower={targetPower}
          />
        )}

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

        <PowerFormula analysisType={analysisType} studyDesign={studyDesign} />

        <References analysisType={analysisType} studyDesign={studyDesign} />
      </main>
    </div>
  );
}

export default App;
