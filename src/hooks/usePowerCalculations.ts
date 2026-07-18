import { useCallback } from 'react';
import {
  calculatePower,
  calculateMinEffect,
  calculateRequiredSample,
} from '../utils/statistics';
import type { AnalysisType, StudyDesign, PowerParams } from '../utils/statistics';

export interface UsePowerCalculationsParams {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  effectSize: number;
  targetPower: number;
  events: number;
  sampleSize: number;
  residualSD: number;
  prevalence: number;
  numCases: number;
  numControls: number;
  subcohortSize: number;
  totalCohort: number;
  matchingRatio: number;
  clusterSize: number;
  icc: number;
  covariateR2: number;
}

export function usePowerCalculations({
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
}: UsePowerCalculationsParams) {

  // Helper function to calculate power for a given effect size and alpha
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

  // Power as a function of the primary sample dimension (events for Cox, total
  // sample size otherwise), holding every other parameter fixed. Used by the
  // sensitivity analysis so its curves use the exact same design-aware power
  // formula as the headline results rather than an approximation.
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

  // Helper function to calculate min effect for a given alpha
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

  // Helper function to calculate required sample/events for a given alpha.
  // Must stay consistent with the SE used for power / minimum-effect: in
  // particular the case-cohort and nested-case-control variance inflation must
  // be applied so the "required" number actually achieves the target power.
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
      // The matching-ratio input is Cox-only (the slider is hidden for other
      // models), so only Cox nested-case-control should size from it. Every
      // other design — including logistic nested-case-control — derives the
      // controls-per-case ratio from the case/control counts the user set, so
      // that required-N inverts the same SE shown for power and min-effect.
      matchingRatio: analysisType === 'cox' && studyDesign === 'nested-case-control'
        ? matchingRatio
        : numControls / numCases,
      clusterSize,
      icc,
      covariateR2,
    });
  }, [analysisType, studyDesign, effectSize, targetPower, covariateR2, residualSD, numCases, numControls, prevalence, clusterSize, icc, subcohortSize, totalCohort, matchingRatio]);

  // Helper functions for AdvancedVisualizations
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
      // Cox-only matching-ratio input (see calculateRequiredSampleForAlpha);
      // other models derive the ratio from the case/control counts.
      matchingRatio: analysisType === 'cox' && studyDesign === 'nested-case-control'
        ? matchingRatio
        : numControls / numCases,
      clusterSize,
      icc,
      covariateR2,
    });
  }, [analysisType, studyDesign, residualSD, prevalence, clusterSize, icc, covariateR2, numCases, numControls, matchingRatio]);

  return {
    calculatePowerForEffect,
    calculatePowerAtSampleSize,
    calculateMinEffectForAlpha,
    calculateRequiredSampleForAlpha,
    calculateRequiredEventsForViz,
    calculateRequiredSampleSizeForViz,
  };
}
