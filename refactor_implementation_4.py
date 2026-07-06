import re

with open('src/utils/statistics.ts', 'r') as f:
    content = f.read()

# 2. Refactor Cox Power
cox_power_orig = """  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logHR) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);"""
cox_power_new = """  return calculatePowerFromSE(Math.abs(logHR), se, alpha);"""
content = content.replace(cox_power_orig, cox_power_new)


# 3. Refactor Cox Min Effect
cox_min_orig = """  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const minLogHR = (zAlpha + zBeta) * se;

  return Math.exp(minLogHR);"""
cox_min_new = """  const minLogHR = calculateMinEffectFromSE(se, targetPower, alpha);
  return Math.exp(minLogHR);"""
content = content.replace(cox_min_orig, cox_min_new)

# 4. Refactor Cox Required Events
cox_req_orig = """  const logHR = Math.log(hazardRatio);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const sqrtD = (zAlpha + zBeta) / Math.abs(logHR);

  // Adjust for covariate correlation: need more events when protein correlates with covariates
  return Math.ceil((sqrtD * sqrtD) / (1 - covariateR2));"""
cox_req_new = """  const logHR = Math.log(hazardRatio);
  // Adjust for covariate correlation: need more events when protein correlates with covariates
  const varianceFactor = 1 / (1 - covariateR2);
  return calculateRequiredNFromVariance(Math.abs(logHR), targetPower, alpha, varianceFactor);"""
content = content.replace(cox_req_orig, cox_req_new)

# 5. Refactor Linear Power
linear_power_orig = """  const se = calculateLinearSE(sampleSize, residualSD, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(beta) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);"""
linear_power_new = """  const se = calculateLinearSE(sampleSize, residualSD, covariateR2);
  return calculatePowerFromSE(Math.abs(beta), se, alpha);"""
content = content.replace(linear_power_orig, linear_power_new)

# 6. Refactor Linear Min Effect
linear_min_orig = """  const se = calculateLinearSE(sampleSize, residualSD, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);

  return (zAlpha + zBeta) * se;"""
linear_min_new = """  const se = calculateLinearSE(sampleSize, residualSD, covariateR2);
  return calculateMinEffectFromSE(se, targetPower, alpha);"""
content = content.replace(linear_min_orig, linear_min_new)

# 7. Refactor Linear Required N
linear_req_orig = """  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  // Adjust for covariate correlation
  const n = Math.pow((zAlpha + zBeta) * residualSD / Math.abs(beta), 2) / (1 - covariateR2) + 2;

  return Math.ceil(n);"""
linear_req_new = """  // Adjust for covariate correlation
  const varianceFactor = (residualSD * residualSD) / (1 - covariateR2);
  return calculateRequiredNFromVariance(Math.abs(beta), targetPower, alpha, varianceFactor, 2);"""
content = content.replace(linear_req_orig, linear_req_new)

# 8. Refactor Logistic Power
logistic_power_orig = """  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logOR) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);"""
logistic_power_new = """  return calculatePowerFromSE(Math.abs(logOR), se, alpha);"""
content = content.replace(logistic_power_orig, logistic_power_new)


# 9. Refactor Logistic Min Effect
logistic_min_orig = """  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const minLogOR = (zAlpha + zBeta) * se;

  return Math.exp(minLogOR);"""
logistic_min_new = """  const minLogOR = calculateMinEffectFromSE(se, targetPower, alpha);
  return Math.exp(minLogOR);"""
content = content.replace(logistic_min_orig, logistic_min_new)


# 10. Refactor Logistic Required N
logistic_req_orig = """  const logOR = Math.log(oddsRatio);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  // Adjust for covariate correlation
  const n = Math.pow((zAlpha + zBeta) / Math.abs(logOR), 2) / (prevalence * (1 - prevalence) * (1 - covariateR2));

  return Math.ceil(n);"""
logistic_req_new = """  const logOR = Math.log(oddsRatio);
  // Adjust for covariate correlation
  const varianceFactor = 1 / (prevalence * (1 - prevalence) * (1 - covariateR2));
  return calculateRequiredNFromVariance(Math.abs(logOR), targetPower, alpha, varianceFactor);"""
content = content.replace(logistic_req_orig, logistic_req_new)

# 11. Refactor Logistic Case Control Required N
logistic_cc_req_orig = """  const logOR = Math.log(oddsRatio);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const n = Math.pow((1 + r) * (zAlpha + zBeta) / Math.abs(logOR), 2) / (r * (1 - covariateR2));

  return Math.ceil(n);"""
logistic_cc_req_new = """  const logOR = Math.log(oddsRatio);
  const varianceFactor = Math.pow(1 + r, 2) / (r * (1 - covariateR2));
  return calculateRequiredNFromVariance(Math.abs(logOR), targetPower, alpha, varianceFactor);"""
content = content.replace(logistic_cc_req_orig, logistic_cc_req_new)


# 12. Refactor Poisson Power
poisson_power_orig = """  const logRR = Math.log(relativeRisk);
  const se = calculatePoissonSE(sampleSize, prevalence, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logRR) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);"""
poisson_power_new = """  const logRR = Math.log(relativeRisk);
  const se = calculatePoissonSE(sampleSize, prevalence, covariateR2);
  return calculatePowerFromSE(Math.abs(logRR), se, alpha);"""
content = content.replace(poisson_power_orig, poisson_power_new)

# 13. Refactor Poisson Min Effect
poisson_min_orig = """  const se = calculatePoissonSE(sampleSize, prevalence, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const minLogRR = (zAlpha + zBeta) * se;

  return Math.exp(minLogRR);"""
poisson_min_new = """  const se = calculatePoissonSE(sampleSize, prevalence, covariateR2);
  const minLogRR = calculateMinEffectFromSE(se, targetPower, alpha);
  return Math.exp(minLogRR);"""
content = content.replace(poisson_min_orig, poisson_min_new)


# 14. Refactor Poisson Required N
poisson_req_orig = """  const logRR = Math.log(relativeRisk);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  // Adjust for covariate correlation
  const n = Math.pow((zAlpha + zBeta) / Math.abs(logRR), 2) / (prevalence * (1 - covariateR2));

  return Math.ceil(n);"""
poisson_req_new = """  const logRR = Math.log(relativeRisk);
  // Adjust for covariate correlation
  const varianceFactor = 1 / (prevalence * (1 - covariateR2));
  return calculateRequiredNFromVariance(Math.abs(logRR), targetPower, alpha, varianceFactor);"""
content = content.replace(poisson_req_orig, poisson_req_new)

# 15. Refactor GEE Power
gee_power_orig = """  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(beta) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);

  return Math.min(Math.max(power, 0), 1);"""
gee_power_new = """  return calculatePowerFromSE(Math.abs(beta), se, alpha);"""
content = content.replace(gee_power_orig, gee_power_new)


# 16. Refactor GEE Min Effect
gee_min_orig = """  const se = calculateGEE_SE(totalObservations, clusterSize, icc, residualSD, covariateR2);
  if (se === Infinity) return Infinity;

  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);

  return (zAlpha + zBeta) * se;"""
gee_min_new = """  const se = calculateGEE_SE(totalObservations, clusterSize, icc, residualSD, covariateR2);
  return calculateMinEffectFromSE(se, targetPower, alpha);"""
content = content.replace(gee_min_orig, gee_min_new)

# 17. Refactor GEE Required N
gee_req_orig = """  const de = calculateDesignEffect(clusterSize, icc);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);

  // n_eff = ((zα + zβ) × σ / |β|)² / (1 - R²_x) + 2
  // n = n_eff × DE
  const nEff = Math.pow((zAlpha + zBeta) * residualSD / Math.abs(beta), 2) / (1 - covariateR2) + 2;
  const n = nEff * de;

  return Math.ceil(n);"""
gee_req_new = """  const de = calculateDesignEffect(clusterSize, icc);
  const varianceFactor = (residualSD * residualSD) / (1 - covariateR2) * de;
  const additiveConstant = 2 * de; // Because n = n_eff * DE, and n_eff has + 2

  return calculateRequiredNFromVariance(Math.abs(beta), targetPower, alpha, varianceFactor, additiveConstant);"""
content = content.replace(gee_req_orig, gee_req_new)

with open('src/utils/statistics.ts', 'w') as f:
    f.write(content)

print("Replacement complete.")
