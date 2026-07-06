import re

with open('src/utils/statistics.ts', 'r') as f:
    content = f.read()

helpers = """// ============================================================================
// Internal Core Math Helpers (Abstracted to reduce duplication)
// ============================================================================

/**
 * Core generic calculation for statistical power using large sample approximation (Wald test).
 * Power = Φ(|effect|/SE - z_{1-α/2}) + Φ(-|effect|/SE - z_{1-α/2})
 */
export const calculatePowerFromSE = (absoluteEffect: number, se: number, alpha: number): number => {
  if (se === Infinity || se <= 0) return 0;
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = absoluteEffect / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
  return Math.min(Math.max(power, 0), 1);
};

/**
 * Core generic calculation for minimum detectable effect (on the scale of the SE).
 * Returns |effect| = (z_{1-α/2} + z_β) * SE
 */
export const calculateMinEffectFromSE = (se: number, targetPower: number, alpha: number): number => {
  if (se === Infinity || se <= 0) return Infinity;
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  return (zAlpha + zBeta) * se;
};

/**
 * Core generic calculation for required sample size (or events).
 * Base formula: N = ((z_{1-α/2} + z_β) / |effect|)² * VarianceFactor + AdditiveConstant
 */
export const calculateRequiredNFromVariance = (
  absoluteEffect: number,
  targetPower: number,
  alpha: number,
  varianceFactor: number,
  additiveConstant: number = 0
): number => {
  if (varianceFactor === Infinity || varianceFactor <= 0 || absoluteEffect <= 0) return Infinity;
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const n = Math.pow((zAlpha + zBeta) / absoluteEffect, 2) * varianceFactor + additiveConstant;
  return Math.ceil(n);
};

// ============================================================================
// Effect Size Conversion Utilities
// ============================================================================
"""

# Let's place it safely right after the normal math helpers (normalCDF, normalQuantile)
content = content.replace("// ============================================================================\n// Effect Size Conversion Utilities\n// ============================================================================", helpers)

with open('src/utils/statistics.ts', 'w') as f:
    f.write(content)

print("Added helpers.")
