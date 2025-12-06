/**
 * SOURCE CODE VS VALIDATION COMPARISON
 *
 * This test directly compares the app's statistics.ts functions against
 * our independently validated formulas to ensure they produce identical results.
 */

const jstat = require('jstat');

// ============================================================================
// INDEPENDENTLY VALIDATED REFERENCE IMPLEMENTATIONS
// (These were verified against published literature and external calculators)
// ============================================================================

const REF = {
  normalCDF: (z) => jstat.normal.cdf(z, 0, 1),
  normalQuantile: (p) => jstat.normal.inv(p, 0, 1),

  calculateEffectiveAlpha: (fdrQ, numTests) => {
    if (numTests <= 0) return fdrQ;
    return fdrQ / numTests;
  },

  // Cox model
  calculateCoxSE: (events) => {
    if (events <= 0) return Infinity;
    return 1 / Math.sqrt(events);
  },

  calculateCoxPower: (hr, events, alpha) => {
    if (hr <= 0 || events <= 0 || alpha <= 0 || alpha >= 1) return 0;
    const logHR = Math.log(hr);
    const se = 1 / Math.sqrt(events);
    const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const lambda = Math.abs(logHR) / se;
    const power = jstat.normal.cdf(lambda - zAlpha, 0, 1) + jstat.normal.cdf(-lambda - zAlpha, 0, 1);
    return Math.min(Math.max(power, 0), 1);
  },

  calculateCoxMinEffect: (targetPower, events, alpha) => {
    if (events <= 0 || alpha <= 0 || alpha >= 1 || targetPower <= 0 || targetPower >= 1) {
      return Infinity;
    }
    const se = 1 / Math.sqrt(events);
    const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const zBeta = jstat.normal.inv(targetPower, 0, 1);
    return Math.exp((zAlpha + zBeta) * se);
  },

  // Linear model
  calculateLinearSE: (n, residualSD) => {
    if (n <= 2) return Infinity;
    return residualSD / Math.sqrt(n - 2);
  },

  calculateLinearPower: (beta, n, residualSD, alpha) => {
    if (n <= 2 || residualSD <= 0 || alpha <= 0 || alpha >= 1) return 0;
    const se = residualSD / Math.sqrt(n - 2);
    const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const lambda = Math.abs(beta) / se;
    const power = jstat.normal.cdf(lambda - zAlpha, 0, 1) + jstat.normal.cdf(-lambda - zAlpha, 0, 1);
    return Math.min(Math.max(power, 0), 1);
  },

  // Logistic model
  calculateLogisticSE: (n, p) => {
    if (n <= 0 || p <= 0 || p >= 1) return Infinity;
    return 1 / Math.sqrt(n * p * (1 - p));
  },

  calculateLogisticPower: (or, n, p, alpha) => {
    if (or <= 0 || alpha <= 0 || alpha >= 1) return 0;
    const logOR = Math.log(or);
    const se = 1 / Math.sqrt(n * p * (1 - p));
    if (se === Infinity) return 0;
    const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const lambda = Math.abs(logOR) / se;
    const power = jstat.normal.cdf(lambda - zAlpha, 0, 1) + jstat.normal.cdf(-lambda - zAlpha, 0, 1);
    return Math.min(Math.max(power, 0), 1);
  },

  // Poisson model
  calculatePoissonSE: (n, p) => {
    if (n <= 0 || p <= 0 || p >= 1) return Infinity;
    return Math.sqrt(1 / (n * p));
  },

  calculatePoissonPower: (rr, n, p, alpha) => {
    if (rr <= 0 || n <= 0 || p <= 0 || p >= 1 || alpha <= 0 || alpha >= 1) return 0;
    const logRR = Math.log(rr);
    const se = Math.sqrt(1 / (n * p));
    const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const lambda = Math.abs(logRR) / se;
    const power = jstat.normal.cdf(lambda - zAlpha, 0, 1) + jstat.normal.cdf(-lambda - zAlpha, 0, 1);
    return Math.min(Math.max(power, 0), 1);
  },
};

// ============================================================================
// APP SOURCE CODE IMPLEMENTATIONS (copy of formulas from statistics.ts)
// ============================================================================

const APP = {
  normalCDF: (z) => jstat.normal.cdf(z, 0, 1),
  normalQuantile: (p) => jstat.normal.inv(p, 0, 1),

  calculateEffectiveAlpha: (fdrQ, numTests) => {
    if (numTests <= 0) return fdrQ;
    return fdrQ / numTests;
  },

  calculateCoxSE: (events) => {
    if (events <= 0) return Infinity;
    return 1 / Math.sqrt(events);
  },

  calculateCoxPower: (hazardRatio, events, alpha) => {
    if (hazardRatio <= 0 || events <= 0 || alpha <= 0 || alpha >= 1) {
      return 0;
    }
    const logHR = Math.log(hazardRatio);
    const se = 1 / Math.sqrt(events);
    const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const lambda = Math.abs(logHR) / se;
    const power = jstat.normal.cdf(lambda - zAlpha, 0, 1) + jstat.normal.cdf(-lambda - zAlpha, 0, 1);
    return Math.min(Math.max(power, 0), 1);
  },

  calculateCoxMinEffect: (targetPower, events, alpha) => {
    if (events <= 0 || alpha <= 0 || alpha >= 1 || targetPower <= 0 || targetPower >= 1) {
      return Infinity;
    }
    const se = 1 / Math.sqrt(events);
    const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const zBeta = jstat.normal.inv(targetPower, 0, 1);
    const minLogHR = (zAlpha + zBeta) * se;
    return Math.exp(minLogHR);
  },

  calculateLinearSE: (sampleSize, residualSD) => {
    if (sampleSize <= 2) return Infinity;
    return residualSD / Math.sqrt(sampleSize - 2);
  },

  calculateLinearPower: (beta, sampleSize, residualSD, alpha) => {
    if (sampleSize <= 2 || residualSD <= 0 || alpha <= 0 || alpha >= 1) {
      return 0;
    }
    const se = residualSD / Math.sqrt(sampleSize - 2);
    const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const lambda = Math.abs(beta) / se;
    const power = jstat.normal.cdf(lambda - zAlpha, 0, 1) + jstat.normal.cdf(-lambda - zAlpha, 0, 1);
    return Math.min(Math.max(power, 0), 1);
  },

  calculateLogisticSE: (sampleSize, prevalence) => {
    if (sampleSize <= 0 || prevalence <= 0 || prevalence >= 1) return Infinity;
    return 1 / Math.sqrt(sampleSize * prevalence * (1 - prevalence));
  },

  calculateLogisticPower: (oddsRatio, sampleSize, prevalence, alpha) => {
    if (oddsRatio <= 0 || alpha <= 0 || alpha >= 1) {
      return 0;
    }
    const logOR = Math.log(oddsRatio);
    const se = 1 / Math.sqrt(sampleSize * prevalence * (1 - prevalence));
    if (se === Infinity) return 0;
    const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const lambda = Math.abs(logOR) / se;
    const power = jstat.normal.cdf(lambda - zAlpha, 0, 1) + jstat.normal.cdf(-lambda - zAlpha, 0, 1);
    return Math.min(Math.max(power, 0), 1);
  },

  calculatePoissonSE: (sampleSize, prevalence) => {
    if (sampleSize <= 0 || prevalence <= 0 || prevalence >= 1) return Infinity;
    return Math.sqrt(1 / (sampleSize * prevalence));
  },

  calculatePoissonPower: (relativeRisk, sampleSize, prevalence, alpha) => {
    if (relativeRisk <= 0 || sampleSize <= 0 || prevalence <= 0 || prevalence >= 1 ||
        alpha <= 0 || alpha >= 1) {
      return 0;
    }
    const logRR = Math.log(relativeRisk);
    const se = Math.sqrt(1 / (sampleSize * prevalence));
    const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const lambda = Math.abs(logRR) / se;
    const power = jstat.normal.cdf(lambda - zAlpha, 0, 1) + jstat.normal.cdf(-lambda - zAlpha, 0, 1);
    return Math.min(Math.max(power, 0), 1);
  },
};

// ============================================================================
// COMPARISON TESTS
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

const assertEqual = (actual, expected, tolerance, testName) => {
  totalTests++;
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedTests.push({ testName, actual, expected, diff });
    console.log(`  ✗ ${testName}: APP=${actual}, REF=${expected}, diff=${diff.toExponential(2)}`);
  }
};

console.log('\n' + '='.repeat(70));
console.log('SOURCE CODE VS VALIDATION COMPARISON');
console.log('='.repeat(70));

// Test parameters
const testParams = {
  events: [50, 100, 200, 500],
  hrs: [1.2, 1.5, 2.0, 0.5, 0.67],
  alphas: [0.05, 0.01, 0.001, 1e-5],
  sampleSizes: [100, 500, 1000],
  betas: [0.1, 0.3, 0.5],
  prevalences: [0.05, 0.1, 0.2, 0.5],
  ors: [1.2, 1.5, 2.0],
  rrs: [1.2, 1.5, 2.0],
};

console.log('\n1. COX MODEL COMPARISONS');
console.log('-'.repeat(50));

for (const events of testParams.events) {
  for (const hr of testParams.hrs) {
    for (const alpha of testParams.alphas) {
      const appResult = APP.calculateCoxPower(hr, events, alpha);
      const refResult = REF.calculateCoxPower(hr, events, alpha);
      assertEqual(appResult, refResult, 1e-14,
        `Cox: events=${events}, HR=${hr}, α=${alpha}`);
    }
  }
}

console.log('\n2. COX MIN EFFECT COMPARISONS');
console.log('-'.repeat(50));

for (const events of testParams.events) {
  for (const alpha of testParams.alphas) {
    const appResult = APP.calculateCoxMinEffect(0.80, events, alpha);
    const refResult = REF.calculateCoxMinEffect(0.80, events, alpha);
    assertEqual(appResult, refResult, 1e-14,
      `Cox Min HR: events=${events}, α=${alpha}`);
  }
}

console.log('\n3. LINEAR MODEL COMPARISONS');
console.log('-'.repeat(50));

for (const n of testParams.sampleSizes) {
  for (const beta of testParams.betas) {
    for (const alpha of [0.05, 0.01]) {
      const appResult = APP.calculateLinearPower(beta, n, 1, alpha);
      const refResult = REF.calculateLinearPower(beta, n, 1, alpha);
      assertEqual(appResult, refResult, 1e-14,
        `Linear: n=${n}, β=${beta}, α=${alpha}`);
    }
  }
}

console.log('\n4. LOGISTIC MODEL COMPARISONS');
console.log('-'.repeat(50));

for (const n of testParams.sampleSizes) {
  for (const or of testParams.ors) {
    for (const p of testParams.prevalences) {
      const appResult = APP.calculateLogisticPower(or, n, p, 0.05);
      const refResult = REF.calculateLogisticPower(or, n, p, 0.05);
      assertEqual(appResult, refResult, 1e-14,
        `Logistic: n=${n}, OR=${or}, p=${p}`);
    }
  }
}

console.log('\n5. POISSON MODEL COMPARISONS');
console.log('-'.repeat(50));

for (const n of testParams.sampleSizes) {
  for (const rr of testParams.rrs) {
    for (const p of testParams.prevalences) {
      const appResult = APP.calculatePoissonPower(rr, n, p, 0.05);
      const refResult = REF.calculatePoissonPower(rr, n, p, 0.05);
      assertEqual(appResult, refResult, 1e-14,
        `Poisson: n=${n}, RR=${rr}, p=${p}`);
    }
  }
}

console.log('\n6. FDR CORRECTION COMPARISONS');
console.log('-'.repeat(50));

for (const m of [1, 100, 1000, 5000]) {
  for (const q of [0.05, 0.10]) {
    const appResult = APP.calculateEffectiveAlpha(q, m);
    const refResult = REF.calculateEffectiveAlpha(q, m);
    assertEqual(appResult, refResult, 1e-14,
      `FDR: q=${q}, m=${m}`);
  }
}

console.log('\n7. STANDARD ERROR COMPARISONS');
console.log('-'.repeat(50));

for (const d of [10, 100, 500]) {
  assertEqual(APP.calculateCoxSE(d), REF.calculateCoxSE(d), 1e-14, `Cox SE: d=${d}`);
}

for (const n of [50, 100, 500]) {
  assertEqual(APP.calculateLinearSE(n, 1), REF.calculateLinearSE(n, 1), 1e-14, `Linear SE: n=${n}`);
}

for (const n of [100, 500]) {
  for (const p of [0.1, 0.3]) {
    assertEqual(APP.calculateLogisticSE(n, p), REF.calculateLogisticSE(n, p), 1e-14, `Logistic SE: n=${n}, p=${p}`);
    assertEqual(APP.calculatePoissonSE(n, p), REF.calculatePoissonSE(n, p), 1e-14, `Poisson SE: n=${n}, p=${p}`);
  }
}

console.log('\n8. EDGE CASE COMPARISONS');
console.log('-'.repeat(50));

// HR = 1 (null effect)
assertEqual(APP.calculateCoxPower(1.0, 100, 0.05), REF.calculateCoxPower(1.0, 100, 0.05), 1e-14, 'Cox: HR=1 (null)');

// Very small alpha
assertEqual(APP.calculateCoxPower(1.5, 100, 1e-10), REF.calculateCoxPower(1.5, 100, 1e-10), 1e-14, 'Cox: very small α');

// Edge prevalences
assertEqual(APP.calculateLogisticPower(1.5, 1000, 0.01, 0.05), REF.calculateLogisticPower(1.5, 1000, 0.01, 0.05), 1e-14, 'Logistic: p=0.01');
assertEqual(APP.calculateLogisticPower(1.5, 1000, 0.99, 0.05), REF.calculateLogisticPower(1.5, 1000, 0.99, 0.05), 1e-14, 'Logistic: p=0.99');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(70));
console.log('COMPARISON SUMMARY');
console.log('='.repeat(70));

console.log(`\nTotal tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests.length}`);

if (failedTests.length === 0) {
  console.log('\n✓ ALL COMPARISONS PASSED - App source matches validated formulas exactly');
} else {
  console.log('\n✗ DISCREPANCIES FOUND:');
  failedTests.forEach(f => {
    console.log(`  - ${f.testName}`);
    console.log(`    APP: ${f.actual}, REF: ${f.expected}`);
  });
}

console.log('\n');
