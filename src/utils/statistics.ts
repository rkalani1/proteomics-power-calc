/**
 * Statistics utility functions for Cox Proportional Hazards power calculations
 *
 * These functions implement the standard power analysis formulas for Cox regression
 * with continuous exposures (e.g., standardized protein levels).
 *
 * Key assumptions:
 * - Predictor variable (protein level) is standardized with variance = 1
 * - Two-sided hypothesis tests
 * - Large sample approximations (Wald test based)
 */

import jstat from 'jstat';

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
 * Calculate the standard error of log(HR) estimate in Cox regression
 *
 * For a standardized continuous predictor (Var(X) = 1):
 * Var(β̂) = 1 / (d × Var(X)) = 1 / d
 * SE(β̂) = 1 / √d
 *
 * @param events - Number of events (d)
 * @returns Standard error of the log hazard ratio estimate
 */
export const calculateStandardError = (events: number): number => {
  if (events <= 0) return Infinity;
  return 1 / Math.sqrt(events);
};

/**
 * Calculate the effective per-test alpha for Benjamini-Hochberg FDR control
 *
 * Conservative approximation: α_effective ≈ q / m
 * This is the threshold for the first-ranked p-value in BH procedure
 *
 * @param fdrQ - Target FDR level (q)
 * @param numTests - Number of tests (m)
 * @returns Effective per-test alpha threshold
 */
export const calculateEffectiveAlpha = (fdrQ: number, numTests: number): number => {
  if (numTests <= 0) return fdrQ;
  return fdrQ / numTests;
};

/**
 * Calculate power for a two-sided Cox regression test
 *
 * Power = Φ(|log(HR)|/σ - z_{1-α/2}) + Φ(-|log(HR)|/σ - z_{1-α/2})
 *
 * where:
 * - σ = SE(log(HR)) = 1/√d
 * - z_{1-α/2} = critical value for two-sided test at level α
 * - Φ = standard normal CDF
 *
 * The second term accounts for the (typically negligible) probability
 * of detecting an effect in the opposite direction.
 *
 * @param hazardRatio - Hazard ratio to detect
 * @param events - Number of events
 * @param alpha - Significance level (two-sided)
 * @returns Statistical power (probability of rejecting H0 when Ha is true)
 */
export const calculatePower = (
  hazardRatio: number,
  events: number,
  alpha: number
): number => {
  if (hazardRatio <= 0 || events <= 0 || alpha <= 0 || alpha >= 1) {
    return 0;
  }

  const logHR = Math.log(hazardRatio);
  const se = calculateStandardError(events);
  const zAlpha = normalQuantile(1 - alpha / 2);

  // Non-centrality parameter (standardized effect size)
  const lambda = Math.abs(logHR) / se;

  // Two-sided power formula
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);
};

/**
 * Calculate the minimum detectable hazard ratio for a given power
 *
 * Solving for HR from the power equation:
 * For target power β, we need: |log(HR)| = (z_{1-α/2} + z_β) × σ
 *
 * Using one-sided approximation (second term negligible for reasonable power):
 * HR_min = exp((z_{1-α/2} + z_β) × σ)
 *
 * @param targetPower - Desired power level (e.g., 0.80)
 * @param events - Number of events
 * @param alpha - Significance level (two-sided)
 * @returns Minimum detectable hazard ratio (> 1)
 */
export const calculateMinDetectableHR = (
  targetPower: number,
  events: number,
  alpha: number
): number => {
  if (events <= 0 || alpha <= 0 || alpha >= 1 || targetPower <= 0 || targetPower >= 1) {
    return Infinity;
  }

  const se = calculateStandardError(events);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);

  // Minimum detectable log(HR)
  const minLogHR = (zAlpha + zBeta) * se;

  // Return HR > 1 (for protective effects, take reciprocal)
  return Math.exp(minLogHR);
};

/**
 * Calculate the effect size inflation due to multiple testing correction
 *
 * This measures how much larger the effect size needs to be to achieve
 * the same power under multiple testing correction vs. a single test.
 *
 * @param hrSingle - Min detectable HR for single test (α = 0.05)
 * @param hrMulti - Min detectable HR for multiple testing (α = q/m)
 * @returns Percentage inflation in hazard ratio
 */
export const calculateInflation = (hrSingle: number, hrMulti: number): number => {
  if (hrSingle <= 1 || hrMulti <= 1) return 0;
  return ((hrMulti / hrSingle) - 1) * 100;
};

/**
 * Generate power curve data for plotting
 *
 * @param events - Number of events
 * @param alpha - Significance level
 * @param hrMin - Minimum HR for curve (default 1.0)
 * @param hrMax - Maximum HR for curve (default 3.0)
 * @param numPoints - Number of points to generate (default 100)
 * @returns Array of {hr, power} objects
 */
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
    const power = calculatePower(hr, events, alpha);
    curve.push({ hr: Number(hr.toFixed(4)), power });
  }

  return curve;
};

/**
 * Generate table data for power comparison
 *
 * @param events - Number of events
 * @param alphaSingle - Alpha for single test (0.05)
 * @param alphaMulti - Alpha for multiple testing (q/m)
 * @param hrValues - Array of HR values to tabulate
 * @returns Array of table row objects
 */
export const generateTableData = (
  events: number,
  alphaSingle: number,
  alphaMulti: number,
  hrValues: number[] = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0]
): Array<{ hr: number; powerSingle: number; powerMulti: number }> => {
  return hrValues.map(hr => ({
    hr,
    powerSingle: calculatePower(hr, events, alphaSingle),
    powerMulti: calculatePower(hr, events, alphaMulti),
  }));
};

/**
 * Calculate required number of events for target power
 *
 * Solving d from: power = Φ(|log(HR)|×√d - z_{1-α/2})
 * We get: √d = (z_{1-α/2} + z_β) / |log(HR)|
 * Therefore: d = ((z_{1-α/2} + z_β) / |log(HR)|)²
 *
 * @param hazardRatio - Target hazard ratio to detect
 * @param targetPower - Desired power level
 * @param alpha - Significance level (two-sided)
 * @returns Required number of events
 */
export const calculateRequiredEvents = (
  hazardRatio: number,
  targetPower: number,
  alpha: number
): number => {
  if (hazardRatio <= 1 || targetPower <= 0 || targetPower >= 1 || alpha <= 0 || alpha >= 1) {
    return Infinity;
  }

  const logHR = Math.log(hazardRatio);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);

  const sqrtD = (zAlpha + zBeta) / Math.abs(logHR);
  return Math.ceil(sqrtD * sqrtD);
};
