import { useState, useMemo, useCallback } from 'react';
import {
  calculateEffectiveAlpha,

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
  calculateMinEffect,
  calculateRequiredSample,
  calculateGEE_SE,
} from '../utils/statistics';
import { EFFECT_SIZE_CONFIG, STUDY_DESIGN_OPTIONS, SCENARIO_COLORS } from '../constants/config';

export function usePowerCalculator() {
  // Model selection
  const [analysisType, setAnalysisType] = useState<AnalysisType>('cox');
  const [studyDesign, setStudyDesign] = useState<StudyDesign>('cohort');

  // Protein count
  const [proteinCount, setProteinCount] = useState<number>(5000);
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);
  const [proteinCounts, setProteinCounts] = useState<number[]>([1, 5000]);
  const [newProteinCount, setNewProteinCount] = useState<string>('');

  const effectiveProteinCounts = useMemo(
    () => (comparisonMode ? proteinCounts : [proteinCount]),
    [comparisonMode, proteinCounts, proteinCount]
  );

  // Common parameters
  const [sampleSize, setSampleSize] = useState(1000);
  const [correctionMethod, setCorrectionMethod] = useState<CorrectionMethod>('fdr');
  const [fdrQ, setFdrQ] = useState(0.05);
  const [targetPower, setTargetPower] = useState(0.80);

  // Specific parameters
  const [events, setEvents] = useState(70);
  const [subcohortSize, setSubcohortSize] = useState(500);
  const [totalCohort, setTotalCohort] = useState(5000);
  const [matchingRatio, setMatchingRatio] = useState(4);
  const [residualSD, setResidualSD] = useState(1.0);
  const [prevalence, setPrevalence] = useState(0.10);
  const [numCases, setNumCases] = useState(200);
  const [numControls, setNumControls] = useState(400);
  const [clusterSize, setClusterSize] = useState(5);
  const [icc, setICC] = useState(0.05);
  const [covariateR2, setCovariateR2] = useState(0);
  const [effectSize, setEffectSize] = useState(1.2);

  const addProteinCount = () => {
    const count = parseInt(newProteinCount);
    if (!isNaN(count) && count >= 1 && count <= 100000 && !proteinCounts.includes(count)) {
      setProteinCounts([...proteinCounts, count].sort((a, b) => a - b));
      setNewProteinCount('');
    }
  };

  const removeProteinCount = (count: number) => {
    if (proteinCounts.length > 1) {
      setProteinCounts(proteinCounts.filter(c => c !== count));
    }
  };

  const handleAnalysisTypeChange = (newType: AnalysisType) => {
    setAnalysisType(newType);
    setEffectSize(EFFECT_SIZE_CONFIG[newType].default);
    const availableDesigns = STUDY_DESIGN_OPTIONS[newType];
    if (!availableDesigns.find(d => d.value === studyDesign)) {
      setStudyDesign(availableDesigns[0].value);
    }
  };

  const effectConfig = EFFECT_SIZE_CONFIG[analysisType];

  const currentTotalSample =
    studyDesign === 'case-control' || studyDesign === 'nested-case-control'
      ? numCases + numControls
      : sampleSize;

  const effectDecimals = analysisType === 'linear' || analysisType === 'gee' ? 3 : 2;

  const calculatePowerForEffect = useCallback((effect: number, alpha: number): number => {
    return calculatePower({
      analysisType,
      studyDesign,
      effectSize: effect,
      alpha,
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
    });
  }, [analysisType, studyDesign, events, subcohortSize, totalCohort, covariateR2, matchingRatio, sampleSize, residualSD, numCases, numControls, prevalence, clusterSize, icc]);

  const calculatePowerAtSampleSize = useCallback((effect: number, alpha: number, dimension: number): number => {
    const params: PowerParams = {
      analysisType,
      studyDesign,
      effectSize: effect,
      alpha,
      residualSD,
      prevalence,
      subcohortSize,
      totalCohort,
      matchingRatio,
      clusterSize,
      icc,
      covariateR2,
    };

    if (analysisType === 'cox') {
      params.events = dimension;
    } else if (studyDesign === 'case-control' || studyDesign === 'nested-case-control') {
      const r = numControls / numCases;
      params.cases = dimension / (1 + r);
      params.controls = (dimension * r) / (1 + r);
    } else {
      params.sampleSize = dimension;
    }

    return calculatePower(params);
  }, [analysisType, studyDesign, subcohortSize, totalCohort, covariateR2, matchingRatio, residualSD, numCases, numControls, prevalence, clusterSize, icc]);

  const calculateMinEffectForAlpha = useCallback((alpha: number): number => {
    return calculateMinEffect({
      analysisType,
      studyDesign,
      targetPower,
      alpha,
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
    });
  }, [analysisType, studyDesign, targetPower, events, subcohortSize, totalCohort, covariateR2, matchingRatio, sampleSize, residualSD, numCases, numControls, prevalence, clusterSize, icc]);

  const calculateRequiredSampleForAlpha = useCallback((alpha: number): number => {
    return calculateRequiredSample({
      analysisType,
      studyDesign,
      effectSize,
      targetPower,
      alpha,
      residualSD,
      prevalence,
      subcohortSize,
      totalCohort,
      matchingRatio: studyDesign === 'nested-case-control' ? matchingRatio : numControls / numCases,
      clusterSize,
      icc,
      covariateR2,
    });
  }, [analysisType, studyDesign, effectSize, targetPower, covariateR2, residualSD, numCases, numControls, prevalence, clusterSize, icc, subcohortSize, totalCohort, matchingRatio]);

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

  const calculateRequiredEventsForViz = useCallback((effect: number, alpha: number, power: number): number => {
    return calculateRequiredSample({
      analysisType,
      studyDesign,
      effectSize: effect,
      targetPower: power,
      alpha,
      subcohortSize,
      totalCohort,
      matchingRatio,
      covariateR2,
    });
  }, [analysisType, studyDesign, subcohortSize, totalCohort, matchingRatio, covariateR2]);

  const calculateRequiredSampleSizeForViz = useCallback((effect: number, alpha: number, power: number): number => {
    return calculateRequiredSample({
      analysisType,
      studyDesign,
      effectSize: effect,
      targetPower: power,
      alpha,
      residualSD,
      prevalence,
      matchingRatio: studyDesign === 'nested-case-control' ? matchingRatio : numControls / numCases,
      clusterSize,
      icc,
      covariateR2,
    });
  }, [analysisType, studyDesign, residualSD, prevalence, clusterSize, icc, covariateR2, numCases, numControls, matchingRatio]);

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

  const powerCurves = useMemo(() => {
    const config = EFFECT_SIZE_CONFIG[analysisType];
    const numPoints = 100;
    const step = (config.max - config.min) / (numPoints - 1);
    const curveData: Array<Record<string, number>> = [];
    const alphas = effectiveProteinCounts.map(count => calculateEffectiveAlpha(fdrQ, count, correctionMethod));

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

  const tableData = useMemo(() => {
    const config = EFFECT_SIZE_CONFIG[analysisType];
    const effectValues = Array.from({ length: 11 }, (_, i) => Number((config.min + (config.max - config.min) * (i / 10)).toFixed(2)));
    const alphas = effectiveProteinCounts.map(count => calculateEffectiveAlpha(fdrQ, count, correctionMethod));

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

  return {
    analysisType, setAnalysisType,
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
  };
}
