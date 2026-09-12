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

/** Status hues (see the --color-good/warn/danger tokens in index.css). */
export const POWER_STATUS_COLORS = {
  adequate: '#1e7a3c', // good
  marginal: '#b7791f', // warning
  inadequate: '#b3323f', // danger
};

/** Inline text colouring for a power value (table cells). */
export const POWER_STATUS_TEXT_CLASSES = {
  adequate: 'status-text--adequate',
  marginal: 'status-text--marginal',
  inadequate: 'status-text--inadequate',
};

/** Pill badge for a power value on a light wash (grids and heatmap tables). */
export const POWER_STATUS_BG_CLASSES = {
  adequate: 'status-badge status-badge--adequate',
  marginal: 'status-badge status-badge--marginal',
  inadequate: 'status-badge status-badge--inadequate',
};

interface ParameterDescriptionParams {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  events: number;
  subcohortSize: number;
  totalCohort: number;
  matchingRatio: number;
  sampleSize: number;
  residualSD: number;
  numCases: number;
  numControls: number;
  prevalence: number;
  clusterSize: number;
  icc: number;
  covariateR2: number;
}

/**
 * Gets a formatted description of the parameters used for the power analysis subtitle.
 * Every parameter that changes the standard error for the selected model/design
 * must appear here, so the caption fully specifies the calculation.
 */
export function getParameterDescription({
  analysisType,
  studyDesign,
  events,
  subcohortSize,
  totalCohort,
  matchingRatio,
  sampleSize,
  residualSD,
  numCases,
  numControls,
  prevalence,
  clusterSize,
  icc,
  covariateR2,
}: ParameterDescriptionParams): string {
  // R²ₓ inflates every model's SE, so echo it whenever it is non-zero.
  const r2Suffix = covariateR2 > 0 ? `, R²ₓ = ${covariateR2.toFixed(2)}` : '';
  switch (analysisType) {
    case 'cox':
      if (studyDesign === 'case-cohort') {
        return `d = ${events} events, subcohort = ${subcohortSize}/${totalCohort}${r2Suffix}`;
      }
      if (studyDesign === 'nested-case-control') {
        return `d = ${events} events, ${matchingRatio}:1 matching${r2Suffix}`;
      }
      return `d = ${events} events${r2Suffix}`;
    case 'linear':
      return `n = ${sampleSize}, sigma = ${residualSD}${r2Suffix}`;
    case 'logistic':
      return studyDesign === 'case-control' || studyDesign === 'nested-case-control'
        ? `${numCases} cases, ${numControls} controls${r2Suffix}`
        : `n = ${sampleSize}, prevalence = ${(prevalence * 100).toFixed(0)}%${r2Suffix}`;
    case 'poisson':
      return `n = ${sampleSize}, prevalence = ${(prevalence * 100).toFixed(0)}%${r2Suffix}`;
    case 'gee':
      return `n = ${sampleSize} observations, cluster size = ${clusterSize}, ICC = ${icc.toFixed(2)}${r2Suffix}`;
    default:
      return '';
  }
}
