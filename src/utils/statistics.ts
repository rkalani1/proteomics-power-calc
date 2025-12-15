/**
 * Statistics utility functions for proteomics power calculations
 *
 * =============================================================================
 * IMPORTANT ASSUMPTION: STANDARDIZED PROTEIN LEVELS
 * =============================================================================
 * All calculations assume protein levels are STANDARDIZED (mean = 0, variance = 1).
 * This is standard practice in proteomics association studies.
 *
 * Effect sizes are interpreted as:
 *   - HR/OR/RR: per 1 standard deviation increase in protein level
 *   - Beta: change in outcome per 1 SD increase in protein level
 *
 * If your proteins are not standardized, you should either:
 *   1. Plan to standardize them before analysis (recommended), or
 *   2. Adjust the effect sizes accordingly
 * =============================================================================
 *
 * Supports multiple regression frameworks:
 * - Cox Proportional Hazards (time-to-event outcomes)
 * - Linear Regression (continuous outcomes)
 * - Logistic Regression (binary outcomes, odds ratios)
 * - Modified Poisson/Log-binomial (binary outcomes, relative risks)
 * - GEE/Mixed Effects (clustered/longitudinal data)
 *
 * Study designs supported:
 * - Cohort (prospective/retrospective)
 * - Case-Control
 * - Cross-sectional
 * - Case-Cohort
 * - Nested Case-Control
 *
 * Key assumptions:
 * - Predictor variable (protein level) is standardized with Var(X) = 1
 * - Two-sided hypothesis tests
 * - Large sample approximations (Wald test based)
 * - Optional adjustment for covariate correlation via R²_x parameter
 *
 * References:
 * - Schoenfeld (1983) - Cox regression sample size
 * - Hsieh & Lavori (2000) - Covariate adjustment in survival analysis
 * - Benjamini & Hochberg (1995) - FDR correction
 */

import jstat from 'jstat';

// ============================================================================
// Type Definitions
// ============================================================================

export type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';
export type StudyDesign = 'cohort' | 'case-control' | 'cross-sectional' | 'case-cohort' | 'nested-case-control';
export type EffectMeasure = 'hr' | 'or' | 'rr' | 'beta' | 'r2';

export interface ModelConfig {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  effectMeasure: EffectMeasure;
  effectLabel: string;
  effectDescription: string;
}

export const MODEL_CONFIGS: Record<AnalysisType, ModelConfig> = {
  cox: {
    analysisType: 'cox',
    studyDesign: 'cohort',
    effectMeasure: 'hr',
    effectLabel: 'Hazard Ratio',
    effectDescription: 'Relative hazard per 1 SD increase in protein level',
  },
  linear: {
    analysisType: 'linear',
    studyDesign: 'cohort',
    effectMeasure: 'beta',
    effectLabel: 'Beta Coefficient',
    effectDescription: 'Change in outcome per 1 SD increase in protein level',
  },
  logistic: {
    analysisType: 'logistic',
    studyDesign: 'cohort',
    effectMeasure: 'or',
    effectLabel: 'Odds Ratio',
    effectDescription: 'Odds ratio per 1 SD increase in protein level',
  },
  poisson: {
    analysisType: 'poisson',
    studyDesign: 'cohort',
    effectMeasure: 'rr',
    effectLabel: 'Relative Risk',
    effectDescription: 'Relative risk per 1 SD increase in protein level',
  },
  gee: {
    analysisType: 'gee',
    studyDesign: 'cohort',
    effectMeasure: 'beta',
    effectLabel: 'Regression Coefficient',
    effectDescription: 'Coefficient per 1 SD increase in protein level (accounting for clustering)',
  },
};

// ============================================================================
// Core Statistical Functions
// ============================================================================

/**
 * Standard normal CDF (cumulative distribution function)
 * Φ(z) = P(Z ≤ z) where Z ~ N(0,1)
 */
export const normalCDF = (z: number): number => {
  return jstat.normal.cdf(z, 0, 1);
};

/**
 * Inverse standard normal CDF (quantile function)
 * Returns z such that P(Z ≤ z) = p
 */
export const normalQuantile = (p: number): number => {
  return jstat.normal.inv(p, 0, 1);
};

/**
 * Multiple testing correction methods
 */
export type CorrectionMethod = 'fdr' | 'bonferroni';

/**
 * Calculate the effective per-test alpha based on correction method
 *
 * FDR (Benjamini-Hochberg): Controls expected false discovery rate
 * - Conservative approximation: α_effective ≈ q / m
 * - More permissive, higher power, but allows some false positives among discoveries
 *
 * Bonferroni: Controls family-wise error rate (FWER)
 * - Exact: α_effective = α / m
 * - Most conservative, ensures P(any false positive) ≤ α
 *
 * @param threshold - FDR q-value or FWER alpha depending on method
 * @param numTests - Number of tests (proteins)
 * @param method - 'fdr' or 'bonferroni'
 */
export const calculateEffectiveAlpha = (
  threshold: number,
  numTests: number,
  _method: CorrectionMethod = 'fdr'
): number => {
  if (numTests <= 0) return threshold;

  // Both methods use the same formula: threshold / numTests
  // The difference is in interpretation:
  // - FDR: threshold is q (expected false discovery proportion)
  // - Bonferroni: threshold is α (family-wise error rate)
  // The _method parameter is kept for API clarity and potential future differentiation
  void _method; // Explicitly mark as intentionally unused
  return threshold / numTests;
};

// ============================================================================
// Cox Proportional Hazards Model
// ============================================================================

/**
 * Calculate SE for Cox regression with standardized predictor
 *
 * Full formula: SE(log(HR)) = 1 / √(d × Var(X) × (1 - R²_x))
 *
 * Where:
 *   d = number of events
 *   Var(X) = variance of predictor (assumed = 1 for standardized proteins)
 *   R²_x = proportion of variance in X explained by covariates in the model
 *
 * For standardized predictor (Var(X) = 1):
 *   SE(log(HR)) = 1 / √(d × (1 - R²_x))
 *
 * When R²_x = 0 (protein uncorrelated with covariates), simplifies to: 1/√d
 *
 * Reference: Schoenfeld (1983), Hsieh & Lavori (2000)
 *
 * @param events - Number of outcome events (d)
 * @param covariateR2 - R² of protein ~ covariates (default 0, range 0-1)
 */
export const calculateCoxSE = (events: number, covariateR2: number = 0): number => {
  if (events <= 0) return Infinity;
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0; // Sanitize
  return 1 / Math.sqrt(events * (1 - covariateR2));
};

/**
 * Calculate SE for Cox regression in case-cohort design
 * Uses Barlow's weighted approach with sampling fraction
 *
 * @param events - Number of outcome events
 * @param subcohortSize - Size of the random subcohort
 * @param totalCohort - Total cohort size
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateCoxCaseCohortSE = (
  events: number,
  subcohortSize: number,
  totalCohort: number,
  covariateR2: number = 0
): number => {
  if (events <= 0 || subcohortSize <= 0) return Infinity;
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;
  const samplingFraction = subcohortSize / totalCohort;
  // Variance inflation factor for case-cohort design
  const vif = 1 + (1 - samplingFraction) / samplingFraction;
  return Math.sqrt(vif) / Math.sqrt(events * (1 - covariateR2));
};

/**
 * Calculate power for Cox regression (two-sided test)
 * Power = Φ(|log(HR)|/σ - z_{1-α/2}) + Φ(-|log(HR)|/σ - z_{1-α/2})
 *
 * @param hazardRatio - The hazard ratio to detect
 * @param events - Number of outcome events
 * @param alpha - Significance level (per-test alpha after any correction)
 * @param caseCohort - Optional case-cohort design parameters
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateCoxPower = (
  hazardRatio: number,
  events: number,
  alpha: number,
  caseCohort?: { subcohortSize: number; totalCohort: number },
  covariateR2: number = 0
): number => {
  if (hazardRatio <= 0 || events <= 0 || alpha <= 0 || alpha >= 1) {
    return 0;
  }

  const logHR = Math.log(hazardRatio);
  const se = caseCohort
    ? calculateCoxCaseCohortSE(events, caseCohort.subcohortSize, caseCohort.totalCohort, covariateR2)
    : calculateCoxSE(events, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logHR) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);
};

/**
 * Calculate minimum detectable HR for Cox regression
 *
 * @param targetPower - Desired statistical power
 * @param events - Number of outcome events
 * @param alpha - Significance level
 * @param caseCohort - Optional case-cohort design parameters
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateCoxMinEffect = (
  targetPower: number,
  events: number,
  alpha: number,
  caseCohort?: { subcohortSize: number; totalCohort: number },
  covariateR2: number = 0
): number => {
  if (events <= 0 || alpha <= 0 || alpha >= 1 || targetPower <= 0 || targetPower >= 1) {
    return Infinity;
  }

  const se = caseCohort
    ? calculateCoxCaseCohortSE(events, caseCohort.subcohortSize, caseCohort.totalCohort, covariateR2)
    : calculateCoxSE(events, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const minLogHR = (zAlpha + zBeta) * se;

  return Math.exp(minLogHR);
};

/**
 * Calculate required events for Cox regression
 *
 * Formula: d = ((z_α + z_β) / |log(HR)|)² / (1 - R²_x)
 *
 * @param hazardRatio - Target hazard ratio to detect
 * @param targetPower - Desired statistical power
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateCoxRequiredEvents = (
  hazardRatio: number,
  targetPower: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (hazardRatio <= 1 || targetPower <= 0 || targetPower >= 1 || alpha <= 0 || alpha >= 1) {
    return Infinity;
  }
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;

  const logHR = Math.log(hazardRatio);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const sqrtD = (zAlpha + zBeta) / Math.abs(logHR);

  // Adjust for covariate correlation: need more events when protein correlates with covariates
  return Math.ceil((sqrtD * sqrtD) / (1 - covariateR2));
};

// ============================================================================
// Linear Regression Model
// ============================================================================

/**
 * Calculate SE for linear regression coefficient
 *
 * Full formula: SE(β) = σ_residual / √(n × Var(X) × (1 - R²_x))
 *
 * For standardized predictor (Var(X) = 1):
 *   SE(β) = σ_residual / √((n - 2) × (1 - R²_x))
 *
 * Where R²_x = proportion of variance in protein explained by other covariates
 *
 * @param sampleSize - Total sample size
 * @param residualSD - Standard deviation of residuals
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateLinearSE = (
  sampleSize: number,
  residualSD: number,
  covariateR2: number = 0
): number => {
  if (sampleSize <= 2) return Infinity;
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;
  // For standardized predictor, SE = residualSD / sqrt((n - 2) * (1 - R²_x))
  return residualSD / Math.sqrt((sampleSize - 2) * (1 - covariateR2));
};

/**
 * Calculate power for linear regression (testing β ≠ 0)
 * Uses t-distribution approximation for large samples
 *
 * @param beta - Effect size (standardized regression coefficient)
 * @param sampleSize - Total sample size
 * @param residualSD - Standard deviation of residuals
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateLinearPower = (
  beta: number,
  sampleSize: number,
  residualSD: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (sampleSize <= 2 || residualSD <= 0 || alpha <= 0 || alpha >= 1) {
    return 0;
  }

  const se = calculateLinearSE(sampleSize, residualSD, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(beta) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);
};

/**
 * Calculate power using f² effect size (Cohen's f²)
 * f² = R²/(1-R²) for single predictor
 */
export const calculateLinearPowerFromR2 = (
  r2: number,
  sampleSize: number,
  alpha: number
): number => {
  if (sampleSize <= 2 || r2 <= 0 || r2 >= 1 || alpha <= 0 || alpha >= 1) {
    return 0;
  }

  // Using non-central F approximation with normal approximation for large samples
  // For single predictor: f² = r²/(1-r²), λ = f² × n
  const f2 = r2 / (1 - r2);
  const lambda = f2 * sampleSize; // Non-centrality parameter

  const zAlpha = normalQuantile(1 - alpha / 2);
  // Approximate using normal distribution for large samples
  const power = normalCDF(Math.sqrt(lambda) - zAlpha);

  return Math.min(Math.max(power, 0), 1);
};

/**
 * Calculate minimum detectable β for linear regression
 *
 * @param targetPower - Desired statistical power
 * @param sampleSize - Total sample size
 * @param residualSD - Standard deviation of residuals
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateLinearMinEffect = (
  targetPower: number,
  sampleSize: number,
  residualSD: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (sampleSize <= 2 || residualSD <= 0 || alpha <= 0 || alpha >= 1 || targetPower <= 0 || targetPower >= 1) {
    return Infinity;
  }

  const se = calculateLinearSE(sampleSize, residualSD, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);

  return (zAlpha + zBeta) * se;
};

/**
 * Calculate required sample size for linear regression
 *
 * @param beta - Target effect size
 * @param targetPower - Desired statistical power
 * @param residualSD - Standard deviation of residuals
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateLinearRequiredN = (
  beta: number,
  targetPower: number,
  residualSD: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (beta === 0 || residualSD <= 0 || targetPower <= 0 || targetPower >= 1 || alpha <= 0 || alpha >= 1) {
    return Infinity;
  }
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;

  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  // Adjust for covariate correlation
  const n = Math.pow((zAlpha + zBeta) * residualSD / Math.abs(beta), 2) / (1 - covariateR2) + 2;

  return Math.ceil(n);
};

// ============================================================================
// Logistic Regression Model
// ============================================================================

/**
 * Calculate SE for logistic regression log(OR)
 * Using Hsieh's formula for continuous predictor
 *
 * Full formula: Var(β) ≈ 1 / (n × p × (1-p) × (1 - R²_x)) for standardized X
 *
 * @param sampleSize - Total sample size
 * @param prevalence - Outcome prevalence
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateLogisticSE = (
  sampleSize: number,
  prevalence: number,
  covariateR2: number = 0
): number => {
  if (sampleSize <= 0 || prevalence <= 0 || prevalence >= 1) return Infinity;
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;
  return 1 / Math.sqrt(sampleSize * prevalence * (1 - prevalence) * (1 - covariateR2));
};

/**
 * Calculate SE for case-control logistic regression
 *
 * @param cases - Number of cases
 * @param controls - Number of controls
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateLogisticCaseControlSE = (
  cases: number,
  controls: number,
  covariateR2: number = 0
): number => {
  if (cases <= 0 || controls <= 0) return Infinity;
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;
  // For matched/unmatched case-control, adjusted for covariate correlation
  return Math.sqrt((1/cases + 1/controls) / (1 - covariateR2));
};

/**
 * Calculate power for logistic regression
 *
 * @param oddsRatio - Target odds ratio to detect
 * @param sampleSize - Total sample size (for cohort designs)
 * @param prevalence - Outcome prevalence (for cohort designs)
 * @param alpha - Significance level
 * @param caseControl - Optional case-control design parameters
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateLogisticPower = (
  oddsRatio: number,
  sampleSize: number,
  prevalence: number,
  alpha: number,
  caseControl?: { cases: number; controls: number },
  covariateR2: number = 0
): number => {
  if (oddsRatio <= 0 || alpha <= 0 || alpha >= 1) {
    return 0;
  }

  const logOR = Math.log(oddsRatio);
  const se = caseControl
    ? calculateLogisticCaseControlSE(caseControl.cases, caseControl.controls, covariateR2)
    : calculateLogisticSE(sampleSize, prevalence, covariateR2);

  if (se === Infinity) return 0;

  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logOR) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);
};

/**
 * Calculate minimum detectable OR for logistic regression
 *
 * @param targetPower - Desired statistical power
 * @param sampleSize - Total sample size (for cohort designs)
 * @param prevalence - Outcome prevalence (for cohort designs)
 * @param alpha - Significance level
 * @param caseControl - Optional case-control design parameters
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateLogisticMinEffect = (
  targetPower: number,
  sampleSize: number,
  prevalence: number,
  alpha: number,
  caseControl?: { cases: number; controls: number },
  covariateR2: number = 0
): number => {
  if (alpha <= 0 || alpha >= 1 || targetPower <= 0 || targetPower >= 1) {
    return Infinity;
  }

  const se = caseControl
    ? calculateLogisticCaseControlSE(caseControl.cases, caseControl.controls, covariateR2)
    : calculateLogisticSE(sampleSize, prevalence, covariateR2);

  if (se === Infinity) return Infinity;

  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const minLogOR = (zAlpha + zBeta) * se;

  return Math.exp(minLogOR);
};

/**
 * Calculate required sample size for logistic regression
 *
 * @param oddsRatio - Target odds ratio to detect
 * @param targetPower - Desired statistical power
 * @param prevalence - Outcome prevalence
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateLogisticRequiredN = (
  oddsRatio: number,
  targetPower: number,
  prevalence: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (oddsRatio <= 1 || prevalence <= 0 || prevalence >= 1 ||
      targetPower <= 0 || targetPower >= 1 || alpha <= 0 || alpha >= 1) {
    return Infinity;
  }
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;

  const logOR = Math.log(oddsRatio);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  // Adjust for covariate correlation
  const n = Math.pow((zAlpha + zBeta) / Math.abs(logOR), 2) / (prevalence * (1 - prevalence) * (1 - covariateR2));

  return Math.ceil(n);
};

// ============================================================================
// Poisson/Log-binomial Regression (Relative Risk)
// ============================================================================

/**
 * Calculate SE for Poisson regression log(RR)
 * For modified Poisson with robust variance
 *
 * @param sampleSize - Total sample size
 * @param prevalence - Outcome prevalence
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculatePoissonSE = (
  sampleSize: number,
  prevalence: number,
  covariateR2: number = 0
): number => {
  if (sampleSize <= 0 || prevalence <= 0 || prevalence >= 1) return Infinity;
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;
  // Robust SE approximation for modified Poisson, adjusted for covariate correlation
  return Math.sqrt(1 / (sampleSize * prevalence * (1 - covariateR2)));
};

/**
 * Calculate power for Poisson/log-binomial regression
 *
 * @param relativeRisk - Target relative risk to detect
 * @param sampleSize - Total sample size
 * @param prevalence - Outcome prevalence
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculatePoissonPower = (
  relativeRisk: number,
  sampleSize: number,
  prevalence: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (relativeRisk <= 0 || sampleSize <= 0 || prevalence <= 0 || prevalence >= 1 ||
      alpha <= 0 || alpha >= 1) {
    return 0;
  }

  const logRR = Math.log(relativeRisk);
  const se = calculatePoissonSE(sampleSize, prevalence, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logRR) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);
};

/**
 * Calculate minimum detectable RR for Poisson regression
 *
 * @param targetPower - Desired statistical power
 * @param sampleSize - Total sample size
 * @param prevalence - Outcome prevalence
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculatePoissonMinEffect = (
  targetPower: number,
  sampleSize: number,
  prevalence: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (sampleSize <= 0 || prevalence <= 0 || prevalence >= 1 ||
      alpha <= 0 || alpha >= 1 || targetPower <= 0 || targetPower >= 1) {
    return Infinity;
  }

  const se = calculatePoissonSE(sampleSize, prevalence, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const minLogRR = (zAlpha + zBeta) * se;

  return Math.exp(minLogRR);
};

/**
 * Calculate required sample size for Poisson regression
 *
 * @param relativeRisk - Target relative risk to detect
 * @param targetPower - Desired statistical power
 * @param prevalence - Outcome prevalence
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculatePoissonRequiredN = (
  relativeRisk: number,
  targetPower: number,
  prevalence: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (relativeRisk <= 1 || prevalence <= 0 || prevalence >= 1 ||
      targetPower <= 0 || targetPower >= 1 || alpha <= 0 || alpha >= 1) {
    return Infinity;
  }
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;

  const logRR = Math.log(relativeRisk);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  // Adjust for covariate correlation
  const n = Math.pow((zAlpha + zBeta) / Math.abs(logRR), 2) / (prevalence * (1 - covariateR2));

  return Math.ceil(n);
};

// ============================================================================
// GEE/Mixed Effects Model (Clustered/Longitudinal Data)
// ============================================================================

/**
 * Calculate design effect for clustered data
 * DE = 1 + (m - 1) × ICC
 * where m = cluster size and ICC = intraclass correlation
 */
export const calculateDesignEffect = (
  clusterSize: number,
  icc: number
): number => {
  if (clusterSize <= 0 || icc < 0 || icc > 1) return 1;
  return 1 + (clusterSize - 1) * icc;
};

/**
 * Calculate effective sample size for GEE/Mixed Effects
 * n_eff = n / DE = n / (1 + (m - 1) × ICC)
 */
export const calculateEffectiveSampleSize = (
  totalObservations: number,
  clusterSize: number,
  icc: number
): number => {
  const de = calculateDesignEffect(clusterSize, icc);
  return totalObservations / de;
};

/**
 * Calculate SE for GEE regression coefficient
 * SE(β) = σ_residual × √DE / √(n × (1 - R²_x))
 * For standardized predictor: SE(β) = √DE / √((n - 2) × (1 - R²_x))
 *
 * @param totalObservations - Total number of observations
 * @param clusterSize - Average observations per cluster
 * @param icc - Intraclass correlation coefficient
 * @param residualSD - Standard deviation of residuals
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateGEE_SE = (
  totalObservations: number,
  clusterSize: number,
  icc: number,
  residualSD: number,
  covariateR2: number = 0
): number => {
  if (totalObservations <= 2 || clusterSize <= 0) return Infinity;
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;
  const de = calculateDesignEffect(clusterSize, icc);
  // SE for standardized predictor with clustering, adjusted for covariate correlation
  return residualSD * Math.sqrt(de) / Math.sqrt((totalObservations - 2) * (1 - covariateR2));
};

/**
 * Calculate power for GEE/Mixed Effects regression
 * Accounts for clustering via design effect
 *
 * @param beta - Target effect size
 * @param totalObservations - Total number of observations
 * @param clusterSize - Average observations per cluster
 * @param icc - Intraclass correlation coefficient
 * @param residualSD - Standard deviation of residuals
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateGEE_Power = (
  beta: number,
  totalObservations: number,
  clusterSize: number,
  icc: number,
  residualSD: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (totalObservations <= 2 || clusterSize <= 0 || residualSD <= 0 ||
      alpha <= 0 || alpha >= 1 || icc < 0 || icc > 1) {
    return 0;
  }

  const se = calculateGEE_SE(totalObservations, clusterSize, icc, residualSD, covariateR2);
  if (se === Infinity) return 0;

  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(beta) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);
};

/**
 * Calculate minimum detectable β for GEE/Mixed Effects
 *
 * @param targetPower - Desired statistical power
 * @param totalObservations - Total number of observations
 * @param clusterSize - Average observations per cluster
 * @param icc - Intraclass correlation coefficient
 * @param residualSD - Standard deviation of residuals
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateGEE_MinEffect = (
  targetPower: number,
  totalObservations: number,
  clusterSize: number,
  icc: number,
  residualSD: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (totalObservations <= 2 || clusterSize <= 0 || residualSD <= 0 ||
      alpha <= 0 || alpha >= 1 || targetPower <= 0 || targetPower >= 1 ||
      icc < 0 || icc > 1) {
    return Infinity;
  }

  const se = calculateGEE_SE(totalObservations, clusterSize, icc, residualSD, covariateR2);
  if (se === Infinity) return Infinity;

  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);

  return (zAlpha + zBeta) * se;
};

/**
 * Calculate required sample size (total observations) for GEE
 *
 * @param beta - Target effect size
 * @param targetPower - Desired statistical power
 * @param clusterSize - Average observations per cluster
 * @param icc - Intraclass correlation coefficient
 * @param residualSD - Standard deviation of residuals
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateGEE_RequiredN = (
  beta: number,
  targetPower: number,
  clusterSize: number,
  icc: number,
  residualSD: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  if (beta === 0 || clusterSize <= 0 || residualSD <= 0 ||
      targetPower <= 0 || targetPower >= 1 || alpha <= 0 || alpha >= 1 ||
      icc < 0 || icc > 1) {
    return Infinity;
  }
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;

  const de = calculateDesignEffect(clusterSize, icc);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);

  // n_eff = ((zα + zβ) × σ / |β|)² / (1 - R²_x) + 2
  // n = n_eff × DE
  const nEff = Math.pow((zAlpha + zBeta) * residualSD / Math.abs(beta), 2) / (1 - covariateR2) + 2;
  const n = nEff * de;

  return Math.ceil(n);
};

/**
 * Calculate required number of clusters for GEE
 *
 * @param beta - Target effect size
 * @param targetPower - Desired statistical power
 * @param clusterSize - Average observations per cluster
 * @param icc - Intraclass correlation coefficient
 * @param residualSD - Standard deviation of residuals
 * @param alpha - Significance level
 * @param covariateR2 - R² of protein ~ covariates (default 0)
 */
export const calculateGEE_RequiredClusters = (
  beta: number,
  targetPower: number,
  clusterSize: number,
  icc: number,
  residualSD: number,
  alpha: number,
  covariateR2: number = 0
): number => {
  const totalN = calculateGEE_RequiredN(beta, targetPower, clusterSize, icc, residualSD, alpha, covariateR2);
  if (!isFinite(totalN)) return Infinity;
  return Math.ceil(totalN / clusterSize);
};

// ============================================================================
// Unified Interface Functions
// ============================================================================

export interface PowerParams {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  effectSize: number; // HR, OR, RR, or beta depending on model
  alpha: number;
  // Cox parameters
  events?: number;
  // Linear parameters
  sampleSize?: number;
  residualSD?: number;
  // Logistic/Poisson parameters
  prevalence?: number;
  // Case-control parameters
  cases?: number;
  controls?: number;
  // Case-cohort parameters
  subcohortSize?: number;
  totalCohort?: number;
  // GEE/Mixed Effects parameters
  clusterSize?: number;
  icc?: number;
  // Covariate adjustment parameter (all models)
  // R² of protein ~ covariates: proportion of variance in predictor explained by adjustment variables
  covariateR2?: number;
}

/**
 * Unified power calculation function
 */
export const calculatePower = (params: PowerParams): number => {
  const { analysisType, studyDesign, effectSize, alpha, covariateR2 = 0 } = params;

  switch (analysisType) {
    case 'cox':
      if (studyDesign === 'case-cohort' && params.subcohortSize && params.totalCohort) {
        return calculateCoxPower(effectSize, params.events || 0, alpha, {
          subcohortSize: params.subcohortSize,
          totalCohort: params.totalCohort,
        }, covariateR2);
      }
      return calculateCoxPower(effectSize, params.events || 0, alpha, undefined, covariateR2);

    case 'linear':
      return calculateLinearPower(
        effectSize,
        params.sampleSize || 0,
        params.residualSD || 1,
        alpha,
        covariateR2
      );

    case 'logistic':
      if (studyDesign === 'case-control' && params.cases && params.controls) {
        return calculateLogisticPower(effectSize, 0, 0, alpha, {
          cases: params.cases,
          controls: params.controls,
        }, covariateR2);
      }
      return calculateLogisticPower(
        effectSize,
        params.sampleSize || 0,
        params.prevalence || 0.1,
        alpha,
        undefined,
        covariateR2
      );

    case 'poisson':
      return calculatePoissonPower(
        effectSize,
        params.sampleSize || 0,
        params.prevalence || 0.1,
        alpha,
        covariateR2
      );

    case 'gee':
      return calculateGEE_Power(
        effectSize,
        params.sampleSize || 0,
        params.clusterSize || 1,
        params.icc || 0,
        params.residualSD || 1,
        alpha,
        covariateR2
      );

    default:
      return 0;
  }
};

/**
 * Unified minimum detectable effect calculation
 */
export const calculateMinEffect = (
  params: Omit<PowerParams, 'effectSize'> & { targetPower: number }
): number => {
  const { analysisType, studyDesign, targetPower, alpha, covariateR2 = 0 } = params;

  switch (analysisType) {
    case 'cox':
      if (studyDesign === 'case-cohort' && params.subcohortSize && params.totalCohort) {
        return calculateCoxMinEffect(targetPower, params.events || 0, alpha, {
          subcohortSize: params.subcohortSize,
          totalCohort: params.totalCohort,
        }, covariateR2);
      }
      return calculateCoxMinEffect(targetPower, params.events || 0, alpha, undefined, covariateR2);

    case 'linear':
      return calculateLinearMinEffect(
        targetPower,
        params.sampleSize || 0,
        params.residualSD || 1,
        alpha,
        covariateR2
      );

    case 'logistic':
      if (studyDesign === 'case-control' && params.cases && params.controls) {
        return calculateLogisticMinEffect(targetPower, 0, 0, alpha, {
          cases: params.cases,
          controls: params.controls,
        }, covariateR2);
      }
      return calculateLogisticMinEffect(
        targetPower,
        params.sampleSize || 0,
        params.prevalence || 0.1,
        alpha,
        undefined,
        covariateR2
      );

    case 'poisson':
      return calculatePoissonMinEffect(
        targetPower,
        params.sampleSize || 0,
        params.prevalence || 0.1,
        alpha,
        covariateR2
      );

    case 'gee':
      return calculateGEE_MinEffect(
        targetPower,
        params.sampleSize || 0,
        params.clusterSize || 1,
        params.icc || 0,
        params.residualSD || 1,
        alpha,
        covariateR2
      );

    default:
      return Infinity;
  }
};

// ============================================================================
// Legacy exports for backward compatibility
// ============================================================================

export const calculateStandardError = calculateCoxSE;

export const calculateMinDetectableHR = (
  targetPower: number,
  events: number,
  alpha: number
): number => calculateCoxMinEffect(targetPower, events, alpha);

export const calculateInflation = (hrSingle: number, hrMulti: number): number => {
  if (hrSingle <= 1 || hrMulti <= 1) return 0;
  return ((hrMulti / hrSingle) - 1) * 100;
};

export const generatePowerCurve = (
  events: number,
  alpha: number,
  hrMin: number = 1.0,
  hrMax: number = 3.0,
  numPoints: number = 100
): Array<{ hr: number; power: number }> => {
  const curve: Array<{ hr: number; power: number }> = [];
  const step = (hrMax - hrMin) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const hr = hrMin + i * step;
    const power = calculateCoxPower(hr, events, alpha);
    curve.push({ hr: Number(hr.toFixed(4)), power });
  }

  return curve;
};

export const generateTableData = (
  events: number,
  alphaSingle: number,
  alphaMulti: number,
  hrValues: number[] = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0]
): Array<{ hr: number; powerSingle: number; powerMulti: number }> => {
  return hrValues.map(hr => ({
    hr,
    powerSingle: calculateCoxPower(hr, events, alphaSingle),
    powerMulti: calculateCoxPower(hr, events, alphaMulti),
  }));
};

// ============================================================================
// Two-Stage Design Functions
// ============================================================================

/**
 * Two-Stage Design Parameters
 *
 * Common in proteomics: discovery phase with FDR correction followed by
 * validation phase on a subset of promising candidates.
 *
 * References:
 * - Skol AD et al. Nat Genet. 2006;38:209-213
 * - Satagopan JM, Elston RC. Genet Epidemiol. 2003;25:149-157
 */
export interface TwoStageParams {
  /** Total proteins in Stage 1 discovery */
  stage1Proteins: number;
  /** Sample size for Stage 1 */
  stage1SampleSize: number;
  /** Sample size for Stage 2 validation */
  stage2SampleSize: number;
  /** FDR threshold for Stage 1 (typically liberal, 0.10-0.20) */
  stage1FDR: number;
  /** Alpha for Stage 2 validation (typically 0.05) */
  stage2Alpha: number;
  /** Expected number of true associations (for power estimation) */
  expectedHits?: number;
  /** Proportion of Stage 1 sample that overlaps with Stage 2 (0 for independent) */
  sampleOverlap?: number;
}

export interface TwoStageResult {
  /** Power in Stage 1 to detect a true effect */
  stage1Power: number;
  /** Effective alpha in Stage 1 after FDR correction */
  stage1Alpha: number;
  /** Power in Stage 2 for validation */
  stage2Power: number;
  /** Joint power (probability of success in both stages) */
  jointPower: number;
  /** Expected number of proteins advancing to Stage 2 */
  expectedAdvancing: number;
  /** Effective per-protein alpha at Stage 2 */
  stage2PerProteinAlpha: number;
  /** Cost efficiency relative to single-stage proteome-wide study */
  costEfficiency: number;
  /** Total sample size required (accounting for overlap) */
  totalSampleSize: number;
}

/**
 * Calculate effective alpha for Stage 1 using BH-FDR
 */
export const calculateStage1Alpha = (
  stage1FDR: number,
  stage1Proteins: number
): number => {
  return calculateEffectiveAlpha(stage1FDR, stage1Proteins);
};

/**
 * Calculate Two-Stage design power
 *
 * Joint power = P(pass Stage 1) × P(pass Stage 2 | true effect)
 *
 * For a true effect, this is approximately:
 * Joint Power ≈ Power_Stage1 × Power_Stage2
 */
export const calculateTwoStagePower = (
  effectSize: number,
  analysisType: AnalysisType,
  params: TwoStageParams,
  studyParams: Partial<PowerParams>
): TwoStageResult => {
  const {
    stage1Proteins,
    stage1SampleSize,
    stage2SampleSize,
    stage1FDR,
    stage2Alpha,
    expectedHits = 10,
    sampleOverlap = 0,
  } = params;

  // Stage 1: Calculate power with FDR-corrected alpha
  const stage1Alpha = calculateStage1Alpha(stage1FDR, stage1Proteins);

  // Power in Stage 1 depends on the analysis type
  const stage1PowerParams: PowerParams = {
    analysisType,
    studyDesign: studyParams.studyDesign || 'cohort',
    effectSize,
    alpha: stage1Alpha,
    sampleSize: stage1SampleSize,
    events: studyParams.events,
    residualSD: studyParams.residualSD || 1,
    prevalence: studyParams.prevalence,
    cases: studyParams.cases,
    controls: studyParams.controls,
    clusterSize: studyParams.clusterSize,
    icc: studyParams.icc,
  };

  const stage1Power = calculatePower(stage1PowerParams);

  // Expected number advancing: true positives + false positives
  // True positives: expectedHits × stage1Power
  // False positives: (stage1Proteins - expectedHits) × stage1FDR / stage1Proteins
  const expectedTruePositives = expectedHits * stage1Power;
  const nullProteins = stage1Proteins - expectedHits;
  // Under BH-FDR, expected false positives ≈ FDR × number of discoveries
  // Conservative estimate: use α for each null
  const expectedFalsePositives = nullProteins * stage1Alpha;
  const expectedAdvancing = expectedTruePositives + expectedFalsePositives;

  // Stage 2: Calculate power for validation
  // Account for sample overlap if any
  const effectiveStage2Size = sampleOverlap > 0
    ? stage2SampleSize * (1 - sampleOverlap * 0.5) // Penalize for overlap
    : stage2SampleSize;

  // Stage 2 per-protein alpha (typically just 0.05, but could be adjusted for multiple hits)
  const stage2PerProteinAlpha = expectedAdvancing > 1
    ? stage2Alpha / Math.max(1, Math.ceil(expectedAdvancing)) // Bonferroni for advancing proteins
    : stage2Alpha;

  const stage2PowerParams: PowerParams = {
    ...stage1PowerParams,
    alpha: stage2PerProteinAlpha,
    sampleSize: effectiveStage2Size,
  };

  const stage2Power = calculatePower(stage2PowerParams);

  // Joint power: probability of passing both stages
  const jointPower = stage1Power * stage2Power;

  // Total sample size accounting for overlap
  const totalSampleSize = sampleOverlap > 0
    ? stage1SampleSize + stage2SampleSize * (1 - sampleOverlap)
    : stage1SampleSize + stage2SampleSize;

  // Cost efficiency: compare to single-stage proteome-wide study
  // Single-stage would need N_single to achieve same power at α_proteome
  // Cost efficiency = N_single / totalSampleSize
  const singleStageAlpha = calculateEffectiveAlpha(0.05, stage1Proteins);
  const singleStagePowerParams: PowerParams = {
    ...stage1PowerParams,
    alpha: singleStageAlpha,
    sampleSize: totalSampleSize,
  };
  const singleStagePower = calculatePower(singleStagePowerParams);

  // Cost efficiency metric: how much better is two-stage?
  // If jointPower > singleStagePower with same total N, efficiency > 1
  const costEfficiency = singleStagePower > 0 ? jointPower / singleStagePower : 1;

  return {
    stage1Power,
    stage1Alpha,
    stage2Power,
    jointPower,
    expectedAdvancing: Math.round(expectedAdvancing * 10) / 10,
    stage2PerProteinAlpha,
    costEfficiency: Math.round(costEfficiency * 100) / 100,
    totalSampleSize: Math.ceil(totalSampleSize),
  };
};

/**
 * Calculate optimal Stage 1 FDR threshold for maximum joint power
 *
 * Too stringent Stage 1 → lose true positives
 * Too liberal Stage 1 → too many proteins to validate, Stage 2 underpowered
 */
export const findOptimalStage1FDR = (
  effectSize: number,
  analysisType: AnalysisType,
  baseParams: Omit<TwoStageParams, 'stage1FDR'>,
  studyParams: Partial<PowerParams>,
  fdrGrid: number[] = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50]
): { optimalFDR: number; maxJointPower: number; results: Array<{ fdr: number; jointPower: number }> } => {
  const results = fdrGrid.map(fdr => {
    const result = calculateTwoStagePower(
      effectSize,
      analysisType,
      { ...baseParams, stage1FDR: fdr },
      studyParams
    );
    return { fdr, jointPower: result.jointPower };
  });

  const best = results.reduce((a, b) => a.jointPower > b.jointPower ? a : b);

  return {
    optimalFDR: best.fdr,
    maxJointPower: best.jointPower,
    results,
  };
};

/**
 * Calculate required Stage 2 sample size for target joint power
 */
export const calculateRequiredStage2Size = (
  effectSize: number,
  analysisType: AnalysisType,
  targetJointPower: number,
  params: Omit<TwoStageParams, 'stage2SampleSize'>,
  studyParams: Partial<PowerParams>,
  maxIterations: number = 50
): number => {
  // Binary search for required Stage 2 sample size
  let low = 50;
  let high = 10000;

  for (let i = 0; i < maxIterations; i++) {
    const mid = Math.floor((low + high) / 2);
    const result = calculateTwoStagePower(
      effectSize,
      analysisType,
      { ...params, stage2SampleSize: mid },
      studyParams
    );

    if (Math.abs(result.jointPower - targetJointPower) < 0.005) {
      return mid;
    }

    if (result.jointPower < targetJointPower) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.ceil((low + high) / 2);
};

export const calculateRequiredEvents = calculateCoxRequiredEvents;

// ============================================================================
// Effect Size Conversion Utilities
// ============================================================================

/**
 * Convert OR to approximate RR given baseline prevalence
 * RR ≈ OR / (1 - p0 + p0 × OR) where p0 is baseline prevalence
 */
export const orToRR = (oddsRatio: number, baselinePrevalence: number): number => {
  return oddsRatio / (1 - baselinePrevalence + baselinePrevalence * oddsRatio);
};

/**
 * Convert RR to OR given baseline prevalence
 */
export const rrToOR = (relativeRisk: number, baselinePrevalence: number): number => {
  return relativeRisk * (1 - baselinePrevalence) / (1 - relativeRisk * baselinePrevalence);
};

/**
 * Convert beta to standardized beta (Cohen's d approximation)
 */
export const betaToCohenD = (beta: number, residualSD: number): number => {
  return beta / residualSD;
};

/**
 * Convert R² to Cohen's f²
 */
export const r2ToF2 = (r2: number): number => {
  if (r2 >= 1) return Infinity;
  return r2 / (1 - r2);
};
