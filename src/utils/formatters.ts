import type { AnalysisType, StudyDesign } from './statistics';

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};

/** Render an integer (or digit string) with Unicode superscript characters. */
export const toSuperscript = (value: number | string): string =>
  String(value).split('').map(ch => SUPERSCRIPT[ch] ?? ch).join('');

/**
 * Format a per-test significance level the way it is written in a methods
 * section: plain decimals down to 0.001 (0.05, 0.0125), scientific notation
 * with a true multiplication sign and superscript exponent below that
 * (1.00 × 10⁻⁵). `significant` controls the digits shown in either form.
 */
export function formatAlpha(alpha: number, significant = 3): string {
  if (!Number.isFinite(alpha) || alpha <= 0) return '—';
  if (alpha >= 0.001) return String(Number(alpha.toPrecision(significant)));
  const exponent = Math.floor(Math.log10(alpha));
  let mantissa = Number((alpha / 10 ** exponent).toFixed(significant - 1));
  let power = exponent;
  if (mantissa >= 10) {
    mantissa /= 10;
    power += 1;
  }
  return `${mantissa.toFixed(significant - 1)} × 10${toSuperscript(power)}`;
}

/** Human-readable model name. */
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

/** Human-readable study design name. */
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
