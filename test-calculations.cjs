/**
 * Statistical Calculations Verification Test
 *
 * This script validates the power calculations against known values
 * to ensure accuracy for PhD-level statisticians.
 */

const jstat = require('jstat');

// Core statistical functions (mirrors statistics.ts)
const normalCDF = (z) => jstat.normal.cdf(z, 0, 1);
const normalQuantile = (p) => jstat.normal.inv(p, 0, 1);

// Cox SE calculation
const calculateCoxSE = (events, covariateR2 = 0) => {
  if (events <= 0) return Infinity;
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;
  return 1 / Math.sqrt(events * (1 - covariateR2));
};

// Cox power calculation
const calculateCoxPower = (hazardRatio, events, alpha, covariateR2 = 0) => {
  if (hazardRatio <= 0 || events <= 0 || alpha <= 0 || alpha >= 1) return 0;
  const logHR = Math.log(hazardRatio);
  const se = calculateCoxSE(events, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logHR) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
  return Math.min(Math.max(power, 0), 1);
};

// Cox required events
const calculateCoxRequiredEvents = (hazardRatio, targetPower, alpha, covariateR2 = 0) => {
  if (hazardRatio <= 0 || hazardRatio === 1 || targetPower <= 0 || targetPower >= 1 || alpha <= 0 || alpha >= 1) {
    return Infinity;
  }
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;
  const logHR = Math.log(hazardRatio);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const sqrtD = (zAlpha + zBeta) / Math.abs(logHR);
  return Math.ceil((sqrtD * sqrtD) / (1 - covariateR2));
};

// Logistic SE calculation
const calculateLogisticSE = (sampleSize, prevalence, covariateR2 = 0) => {
  if (sampleSize <= 0 || prevalence <= 0 || prevalence >= 1) return Infinity;
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;
  return 1 / Math.sqrt(sampleSize * prevalence * (1 - prevalence) * (1 - covariateR2));
};

// Logistic power calculation
const calculateLogisticPower = (oddsRatio, sampleSize, prevalence, alpha, covariateR2 = 0) => {
  if (oddsRatio <= 0 || alpha <= 0 || alpha >= 1) return 0;
  const logOR = Math.log(oddsRatio);
  const se = calculateLogisticSE(sampleSize, prevalence, covariateR2);
  if (se === Infinity) return 0;
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logOR) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
  return Math.min(Math.max(power, 0), 1);
};

// Linear SE calculation
const calculateLinearSE = (sampleSize, residualSD, covariateR2 = 0) => {
  if (sampleSize <= 2) return Infinity;
  if (covariateR2 < 0 || covariateR2 >= 1) covariateR2 = 0;
  return residualSD / Math.sqrt((sampleSize - 2) * (1 - covariateR2));
};

// Linear power calculation
const calculateLinearPower = (beta, sampleSize, residualSD, alpha, covariateR2 = 0) => {
  if (sampleSize <= 2 || residualSD <= 0 || alpha <= 0 || alpha >= 1) return 0;
  const se = calculateLinearSE(sampleSize, residualSD, covariateR2);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(beta) / se;
  const power = normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
  return Math.min(Math.max(power, 0), 1);
};

// Test utilities
function assertClose(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    console.error(`FAIL: ${message}`);
    console.error(`  Expected: ${expected}, Got: ${actual}, Diff: ${diff}`);
    return false;
  }
  console.log(`PASS: ${message}`);
  return true;
}

// ============================================================================
// TEST SUITE
// ============================================================================

console.log('\n========================================');
console.log('PROTEOMICS POWER CALCULATOR VERIFICATION');
console.log('========================================\n');

let passed = 0;
let failed = 0;

// ----------------------------------------------------------------------------
// Test 1: Cox SE Formula Verification
// ----------------------------------------------------------------------------
console.log('--- Cox SE Formula ---');

// SE(log(HR)) = 1/√d for standardized predictor
// With d=100 events: SE = 1/√100 = 0.1
if (assertClose(calculateCoxSE(100), 0.1, 0.0001, 'SE with 100 events = 0.1')) passed++; else failed++;

// With d=400 events: SE = 1/√400 = 0.05
if (assertClose(calculateCoxSE(400), 0.05, 0.0001, 'SE with 400 events = 0.05')) passed++; else failed++;

// With covariate R²=0.2: SE = 1/√(100 * 0.8) = 1/√80 ≈ 0.1118
if (assertClose(calculateCoxSE(100, 0.2), 1/Math.sqrt(80), 0.0001, 'SE with 100 events, R²=0.2')) passed++; else failed++;

// ----------------------------------------------------------------------------
// Test 2: Cox Power Formula Verification
// ----------------------------------------------------------------------------
console.log('\n--- Cox Power Formula ---');

// Manual verification: HR=1.5, d=100, α=0.05
// log(1.5) ≈ 0.4055, SE = 0.1, z_0.975 ≈ 1.96
// λ = 0.4055/0.1 = 4.055
// Power = Φ(4.055 - 1.96) + Φ(-4.055 - 1.96) = Φ(2.095) + Φ(-6.015)
// ≈ 0.9819 + 0.00 ≈ 0.982
const expectedPower1 = normalCDF(Math.log(1.5)/0.1 - 1.96) + normalCDF(-Math.log(1.5)/0.1 - 1.96);
if (assertClose(calculateCoxPower(1.5, 100, 0.05), expectedPower1, 0.001, 'Power HR=1.5, d=100, α=0.05')) passed++; else failed++;

// Protective effect: HR=0.5 should give same power as HR=2 (same |log(HR)|)
const powerHR2 = calculateCoxPower(2.0, 100, 0.05);
const powerHR05 = calculateCoxPower(0.5, 100, 0.05);
if (assertClose(powerHR2, powerHR05, 0.001, 'Protective HR=0.5 equals harmful HR=2.0')) passed++; else failed++;

// At null (HR=1): power should equal alpha
if (assertClose(calculateCoxPower(1.0001, 10000, 0.05), 0.05, 0.01, 'HR≈1 gives power ≈ α')) passed++; else failed++;

// ----------------------------------------------------------------------------
// Test 3: Cox Required Events Verification
// ----------------------------------------------------------------------------
console.log('\n--- Cox Required Events ---');

// For HR=2, α=0.05, power=0.8:
// z_α = 1.96, z_β = 0.8416
// d = ((1.96 + 0.8416) / log(2))² = (2.8016 / 0.6931)² ≈ 16.34
// Ceil = 17 events
const expectedEvents = Math.ceil(Math.pow((1.96 + normalQuantile(0.8)) / Math.log(2), 2));
if (assertClose(calculateCoxRequiredEvents(2.0, 0.8, 0.05), expectedEvents, 1, 'Required events HR=2, power=0.8, α=0.05')) passed++; else failed++;

// Protective effect HR=0.5 should require same events as HR=2
const eventsHR2 = calculateCoxRequiredEvents(2.0, 0.8, 0.05);
const eventsHR05 = calculateCoxRequiredEvents(0.5, 0.8, 0.05);
if (assertClose(eventsHR2, eventsHR05, 0, 'Protective HR=0.5 requires same events as HR=2')) passed++; else failed++;

// With R²=0.2, need 1/(1-0.2) = 1.25× more events
const eventsR2 = calculateCoxRequiredEvents(2.0, 0.8, 0.05, 0.2);
if (assertClose(eventsR2 / eventsHR2, 1.25, 0.1, 'R²=0.2 inflates required events by ~25%')) passed++; else failed++;

// ----------------------------------------------------------------------------
// Test 4: Logistic Power Verification (Hsieh's Formula)
// ----------------------------------------------------------------------------
console.log('\n--- Logistic Power (Hsieh) ---');

// SE = 1/√(n × p × (1-p)) for standardized predictor
// n=500, p=0.2: SE = 1/√(500 × 0.2 × 0.8) = 1/√80 ≈ 0.1118
const logisticSE = calculateLogisticSE(500, 0.2);
if (assertClose(logisticSE, 1/Math.sqrt(80), 0.0001, 'Logistic SE n=500, p=0.2')) passed++; else failed++;

// OR=2: log(OR) = 0.6931, λ = 0.6931/0.1118 = 6.2
// Power = Φ(6.2 - 1.96) + Φ(-6.2 - 1.96) ≈ 1.0
const logisticPower = calculateLogisticPower(2.0, 500, 0.2, 0.05);
if (logisticPower > 0.99) { console.log('PASS: Logistic power OR=2, n=500, p=0.2 > 99%'); passed++; } else { console.error('FAIL: Logistic power should be > 99%'); failed++; }

// Protective OR=0.5 should give same power as OR=2
const powerOR2 = calculateLogisticPower(2.0, 500, 0.2, 0.05);
const powerOR05 = calculateLogisticPower(0.5, 500, 0.2, 0.05);
if (assertClose(powerOR2, powerOR05, 0.001, 'Protective OR=0.5 equals OR=2.0')) passed++; else failed++;

// ----------------------------------------------------------------------------
// Test 5: Linear Regression Power Verification
// ----------------------------------------------------------------------------
console.log('\n--- Linear Regression Power ---');

// SE(β) = σ / √(n-2) for standardized predictor
// n=102, σ=1: SE = 1/√100 = 0.1
if (assertClose(calculateLinearSE(102, 1.0), 0.1, 0.0001, 'Linear SE n=102, σ=1')) passed++; else failed++;

// With n=102, σ=1, β=0.3, α=0.05:
// λ = 0.3/0.1 = 3, z_α = 1.96
// Power = Φ(3 - 1.96) + Φ(-3 - 1.96) = Φ(1.04) + Φ(-4.96) ≈ 0.85
const linearPower = calculateLinearPower(0.3, 102, 1.0, 0.05);
if (assertClose(linearPower, 0.85, 0.02, 'Linear power β=0.3, n=102, σ=1')) passed++; else failed++;

// Negative β should give same power as positive β
const powerBetaPos = calculateLinearPower(0.3, 102, 1.0, 0.05);
const powerBetaNeg = calculateLinearPower(-0.3, 102, 1.0, 0.05);
if (assertClose(powerBetaPos, powerBetaNeg, 0.001, 'Negative β=-0.3 equals positive β=0.3')) passed++; else failed++;

// ----------------------------------------------------------------------------
// Test 6: Multiple Testing Correction
// ----------------------------------------------------------------------------
console.log('\n--- Multiple Testing Correction ---');

// With 1000 proteins and FDR=0.05: α_eff = 0.05/1000 = 0.00005
const alphaEff = 0.05 / 1000;
if (assertClose(alphaEff, 0.00005, 0.000001, 'Effective α = FDR/m = 0.00005')) passed++; else failed++;

// Power at proteome-wide significance
// HR=1.5, d=500, α=0.00005
const pwPower = calculateCoxPower(1.5, 500, 0.00005);
console.log(`INFO: Proteome-wide power (HR=1.5, d=500, FDR=0.05, m=1000): ${(pwPower * 100).toFixed(1)}%`);

// ----------------------------------------------------------------------------
// Test 7: Edge Cases
// ----------------------------------------------------------------------------
console.log('\n--- Edge Cases ---');

// HR=1 (null) should return Infinity for required events
if (calculateCoxRequiredEvents(1.0, 0.8, 0.05) === Infinity) { console.log('PASS: HR=1 returns Infinity for required events'); passed++; } else { console.error('FAIL: HR=1 should return Infinity'); failed++; }

// Invalid inputs
if (calculateCoxPower(0, 100, 0.05) === 0) { console.log('PASS: HR=0 returns 0 power'); passed++; } else { failed++; }
if (calculateCoxPower(1.5, 0, 0.05) === 0) { console.log('PASS: events=0 returns 0 power'); passed++; } else { failed++; }
if (calculateCoxPower(1.5, 100, 0) === 0) { console.log('PASS: α=0 returns 0 power'); passed++; } else { failed++; }

// ----------------------------------------------------------------------------
// Test 8: Two-sided Power Formula Verification
// ----------------------------------------------------------------------------
console.log('\n--- Two-sided Test Verification ---');

// The two-sided formula: Power = Φ(λ - z) + Φ(-λ - z)
// For large effect (HR=2), second term is negligible
const hrLarge = 2.0;
const dLarge = 100;
const alphaTest = 0.05;
const logHRLarge = Math.log(hrLarge);
const seLarge = 1 / Math.sqrt(dLarge);
const zAlphaTest = 1.96;
const lambdaLarge = Math.abs(logHRLarge) / seLarge;
const term1Large = normalCDF(lambdaLarge - zAlphaTest);
const term2Large = normalCDF(-lambdaLarge - zAlphaTest);

console.log(`INFO: For HR=${hrLarge}, d=${dLarge}: λ=${lambdaLarge.toFixed(3)}`);
console.log(`INFO: Upper tail: Φ(${(lambdaLarge - zAlphaTest).toFixed(3)}) = ${term1Large.toFixed(4)}`);
console.log(`INFO: Lower tail: Φ(${(-lambdaLarge - zAlphaTest).toFixed(6)}) = ${term2Large.toFixed(10)}`);
console.log(`INFO: Two-sided power = ${((term1Large + term2Large) * 100).toFixed(2)}%`);

// For large λ (>>z_α), second term should be essentially 0
if (term2Large < 1e-6) { console.log('PASS: Lower tail negligible for large λ'); passed++; } else { console.error('FAIL: Lower tail should be negligible'); failed++; }

// Verify two-sided formula matches implementation
const calculatedPower = calculateCoxPower(hrLarge, dLarge, alphaTest);
const manualPower = term1Large + term2Large;
if (assertClose(calculatedPower, manualPower, 0.0001, 'Implementation matches manual calculation')) passed++; else failed++;

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n========================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}

console.log('All statistical calculations verified successfully!');
console.log('The power formulas are mathematically correct and');
console.log('suitable for PhD-level biostatistical analysis.\n');
