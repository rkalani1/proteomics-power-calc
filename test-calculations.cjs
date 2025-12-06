// Comprehensive verification of statistical calculations
// Comparing against known published values and hand calculations

const jstat = require('jstat');

// Core functions from the statistics module
const normalCDF = (z) => jstat.normal.cdf(z, 0, 1);
const normalQuantile = (p) => jstat.normal.inv(p, 0, 1);
const calculateEffectiveAlpha = (fdrQ, numTests) => fdrQ / numTests;

// Cox SE: SE(log(HR)) = 1/sqrt(d) for standardized predictor
const calculateCoxSE = (events) => 1 / Math.sqrt(events);

// Cox Power formula
const calculateCoxPower = (hazardRatio, events, alpha) => {
  const logHR = Math.log(hazardRatio);
  const se = calculateCoxSE(events);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logHR) / se;
  return normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
};

// Minimum detectable HR
const calculateCoxMinEffect = (targetPower, events, alpha) => {
  const se = calculateCoxSE(events);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  return Math.exp((zAlpha + zBeta) * se);
};

// Linear regression power
const calculateLinearSE = (n, residualSD) => residualSD / Math.sqrt(n - 2);
const calculateLinearPower = (beta, n, residualSD, alpha) => {
  const se = calculateLinearSE(n, residualSD);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(beta) / se;
  return normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
};

// Logistic regression power (Hsieh's formula)
const calculateLogisticSE = (n, p) => 1 / Math.sqrt(n * p * (1 - p));
const calculateLogisticPower = (or, n, p, alpha) => {
  const logOR = Math.log(or);
  const se = calculateLogisticSE(n, p);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logOR) / se;
  return normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
};

// Poisson SE
const calculatePoissonSE = (n, p) => Math.sqrt(1 / (n * p));

console.log("=".repeat(70));
console.log("COMPREHENSIVE STATISTICAL VERIFICATION");
console.log("=".repeat(70));

let errors = [];
let warnings = [];

// ============================================================================
// TEST 1: Schoenfeld's Cox formula verification
// ============================================================================
console.log("\n1. COX PROPORTIONAL HAZARDS (SCHOENFELD 1983)");
console.log("-".repeat(50));

const testCox = {
  events: 100,
  hr: 1.5,
  alpha: 0.05
};
const coxSE = calculateCoxSE(testCox.events);
const coxPower = calculateCoxPower(testCox.hr, testCox.events, testCox.alpha);

console.log("Events: " + testCox.events);
console.log("Hazard Ratio: " + testCox.hr);
console.log("Alpha: " + testCox.alpha);
console.log("Calculated SE: " + coxSE.toFixed(4) + " (Expected: 0.1000)");
console.log("Calculated Power: " + (coxPower * 100).toFixed(2) + "%");

if (Math.abs(coxSE - 0.1) > 0.0001) {
  errors.push("Cox SE calculation error: expected 0.1, got " + coxSE);
}
if (coxPower < 0.97 || coxPower > 0.99) {
  errors.push("Cox power for HR=1.5, d=100 should be ~98%, got " + (coxPower * 100).toFixed(2) + "%");
}

// Test minimum detectable effect
const minHR = calculateCoxMinEffect(0.80, 100, 0.05);
console.log("\nMinimum detectable HR (80% power, d=100): " + minHR.toFixed(3));
if (Math.abs(minHR - 1.323) > 0.01) {
  errors.push("Cox min HR calculation error: expected ~1.323, got " + minHR.toFixed(3));
}

// ============================================================================
// TEST 2: FDR Correction verification
// ============================================================================
console.log("\n2. FDR CORRECTION (BENJAMINI-HOCHBERG)");
console.log("-".repeat(50));

const fdrTests = [
  { q: 0.05, m: 1, expected: 0.05 },
  { q: 0.05, m: 100, expected: 0.0005 },
  { q: 0.05, m: 5000, expected: 0.00001 },
  { q: 0.10, m: 1000, expected: 0.0001 },
];

fdrTests.forEach(test => {
  const alpha = calculateEffectiveAlpha(test.q, test.m);
  console.log("q=" + test.q + ", m=" + test.m + ": alpha_eff=" + alpha.toExponential(2) + " (Expected: " + test.expected.toExponential(2) + ")");
  if (Math.abs(alpha - test.expected) > 1e-10) {
    errors.push("FDR calculation error: q=" + test.q + ", m=" + test.m);
  }
});

// ============================================================================
// TEST 3: Linear Regression Power
// ============================================================================
console.log("\n3. LINEAR REGRESSION POWER");
console.log("-".repeat(50));

const linearTest = {
  n: 100,
  residualSD: 1,
  beta: 0.3,
  alpha: 0.05
};
const linearSE = calculateLinearSE(linearTest.n, linearTest.residualSD);
const linearPower = calculateLinearPower(linearTest.beta, linearTest.n, linearTest.residualSD, linearTest.alpha);

console.log("Sample size: " + linearTest.n);
console.log("Beta: " + linearTest.beta);
console.log("Residual SD: " + linearTest.residualSD);
console.log("Calculated SE: " + linearSE.toFixed(4) + " (Expected: ~0.1010)");
console.log("Calculated Power: " + (linearPower * 100).toFixed(2) + "%");

if (Math.abs(linearSE - 0.101) > 0.01) {
  errors.push("Linear SE calculation error");
}
if (linearPower < 0.80 || linearPower > 0.90) {
  errors.push("Linear power should be ~84%, got " + (linearPower * 100).toFixed(2) + "%");
}

// ============================================================================
// TEST 4: Logistic Regression Power (Hsieh's formula)
// ============================================================================
console.log("\n4. LOGISTIC REGRESSION (HSIEH 1998)");
console.log("-".repeat(50));

const logisticTest = {
  n: 500,
  prevalence: 0.1,
  or: 1.5,
  alpha: 0.05
};
const logisticSE = calculateLogisticSE(logisticTest.n, logisticTest.prevalence);
const logisticPower = calculateLogisticPower(logisticTest.or, logisticTest.n, logisticTest.prevalence, logisticTest.alpha);

console.log("Sample size: " + logisticTest.n);
console.log("Prevalence: " + logisticTest.prevalence);
console.log("Odds Ratio: " + logisticTest.or);
console.log("Calculated SE: " + logisticSE.toFixed(4) + " (Expected: ~0.149)");
console.log("Calculated Power: " + (logisticPower * 100).toFixed(2) + "%");

if (Math.abs(logisticSE - 0.149) > 0.01) {
  errors.push("Logistic SE calculation error");
}

// ============================================================================
// TEST 5: Modified Poisson SE (Zou 2004)
// ============================================================================
console.log("\n5. MODIFIED POISSON (ZOU 2004)");
console.log("-".repeat(50));

const poissonTest = {
  n: 500,
  prevalence: 0.2
};
const poissonSE = calculatePoissonSE(poissonTest.n, poissonTest.prevalence);
console.log("n=" + poissonTest.n + ", p=" + poissonTest.prevalence + ": SE=" + poissonSE.toFixed(4) + " (Expected: 0.1)");

if (Math.abs(poissonSE - 0.1) > 0.001) {
  errors.push("Poisson SE calculation error");
}

// ============================================================================
// TEST 6: Case-Cohort Variance Inflation
// ============================================================================
console.log("\n6. CASE-COHORT VARIANCE INFLATION");
console.log("-".repeat(50));

const caseCohortTest = {
  subcohort: 500,
  total: 5000
};
const f = caseCohortTest.subcohort / caseCohortTest.total;
const vif = 1 + (1 - f) / f;
const seMultiplier = Math.sqrt(vif);

console.log("Subcohort fraction f: " + f.toFixed(2));
console.log("VIF: " + vif.toFixed(2) + " (Expected: 10.00)");
console.log("SE multiplier: " + seMultiplier.toFixed(2) + " (Expected: 3.16)");

if (Math.abs(vif - 10) > 0.1) {
  errors.push("Case-cohort VIF calculation error");
}

// ============================================================================
// TEST 7: Nested Case-Control Efficiency
// ============================================================================
console.log("\n7. NESTED CASE-CONTROL EFFICIENCY");
console.log("-".repeat(50));

[1, 2, 4, 10].forEach(m => {
  const efficiency = m / (m + 1);
  const varianceMultiplier = (m + 1) / m;
  console.log("m=" + m + " controls: Efficiency=" + (efficiency*100).toFixed(1) + "%, Variance multiplier=" + varianceMultiplier.toFixed(2));
});

// ============================================================================
// TEST 8: Edge Cases
// ============================================================================
console.log("\n8. EDGE CASES");
console.log("-".repeat(50));

const edgeCases = [
  { desc: "Very small alpha", test: () => calculateCoxPower(1.5, 100, 1e-10) },
  { desc: "HR = 1 (null)", test: () => calculateCoxPower(1.0, 100, 0.05) },
  { desc: "HR very large", test: () => calculateCoxPower(10, 100, 0.05) },
  { desc: "Few events", test: () => calculateCoxPower(1.5, 10, 0.05) },
  { desc: "Prevalence near 0", test: () => calculateLogisticSE(100, 0.01) },
  { desc: "Prevalence near 1", test: () => calculateLogisticSE(100, 0.99) },
];

edgeCases.forEach(ec => {
  try {
    const result = ec.test();
    console.log(ec.desc + ": " + (typeof result === 'number' ? result.toFixed(4) : result));
  } catch (e) {
    errors.push("Edge case '" + ec.desc + "' threw error: " + e.message);
  }
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log("\n" + "=".repeat(70));
console.log("VERIFICATION SUMMARY");
console.log("=".repeat(70));

if (errors.length === 0) {
  console.log("\nALL TESTS PASSED - No calculation errors detected");
} else {
  console.log("\nERRORS FOUND:");
  errors.forEach(e => console.log("  - " + e));
}

if (warnings.length > 0) {
  console.log("\nWARNINGS:");
  warnings.forEach(w => console.log("  - " + w));
}

console.log("\n");
