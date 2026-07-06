import type { AnalysisType, StudyDesign } from './statistics';

interface ParameterDescriptionParams {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  events: number;
  subcohortSize: number;
  totalCohort: number;
  sampleSize: number;
  residualSD: number;
  numCases: number;
  numControls: number;
  prevalence: number;
  clusterSize: number;
  icc: number;
}

/**
 * Gets a formatted description of the parameters used for the power analysis subtitle.
 */
export function getParameterDescription({
  analysisType,
  studyDesign,
  events,
  subcohortSize,
  totalCohort,
  sampleSize,
  residualSD,
  numCases,
  numControls,
  prevalence,
  clusterSize,
  icc,
}: ParameterDescriptionParams): string {
  switch (analysisType) {
    case 'cox':
      return studyDesign === 'case-cohort'
        ? `d = ${events} events, subcohort = ${subcohortSize}/${totalCohort}`
        : `d = ${events} events`;
    case 'linear':
      return `n = ${sampleSize}, σ = ${residualSD}`;
    case 'logistic':
      return studyDesign === 'case-control'
        ? `${numCases} cases, ${numControls} controls`
        : `n = ${sampleSize}, prevalence = ${(prevalence * 100).toFixed(0)}%`;
    case 'poisson':
      return `n = ${sampleSize}, prevalence = ${(prevalence * 100).toFixed(0)}%`;
    case 'gee':
      return `n = ${sampleSize}, cluster size = ${clusterSize}, ICC = ${icc.toFixed(2)}`;
    default:
      return '';
  }
}
