import type { AnalysisType, StudyDesign } from './statistics';

export type PowerStatus = 'adequate' | 'marginal' | 'inadequate';

/**
 * Determines the status of a power value based on target thresholds.
 * @param power The statistical power value (0 to 1)
 * @param targetPower The target power threshold (e.g. 0.8)
 * @param marginalThreshold The threshold for marginal power (default: 0.5)
 * @returns The power status
 */
export const getPowerStatus = (
  power: number,
  targetPower: number,
  marginalThreshold: number = 0.5
): PowerStatus => {
  if (power >= targetPower) return 'adequate';
  if (power >= marginalThreshold) return 'marginal';
  return 'inadequate';
};

export const POWER_STATUS_COLORS = {
  adequate: '#10b981', // green
  marginal: '#f59e0b', // amber
  inadequate: '#ef4444', // red
};

export const POWER_STATUS_TEXT_CLASSES = {
  adequate: 'text-green-600 font-semibold',
  marginal: 'text-amber-600',
  inadequate: 'text-red-600',
};

export const POWER_STATUS_BG_CLASSES = {
  adequate: 'bg-green-100 text-green-800',
  marginal: 'bg-amber-100 text-amber-800',
  inadequate: 'bg-red-100 text-red-800',
};

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
      return `n = ${sampleSize}, sigma = ${residualSD}`;
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
