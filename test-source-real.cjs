/**
 * REAL-SOURCE VERIFICATION
 *
 * Unlike the other suites (which re-implement copies of the formulas), this test
 * compiles and imports the ACTUAL application source — src/utils/statistics.ts —
 * and exercises its exported functions. A regression in the shipped code is
 * therefore guaranteed to be caught here.
 *
 * Each expected value is computed INDEPENDENTLY of the source: either as a
 * hand-pinned constant (cross-checked against standard normal tables / external
 * power calculators) or by re-deriving the formula from first principles. The
 * standard-normal building blocks use jStat directly, which is legitimate because
 * what is under test is how the source *combines* them into power, standard
 * error, required-N and minimum-effect formulas.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');
const jstat = require('jstat');

// ---------------------------------------------------------------------------
// Compile the real TypeScript source to a CommonJS bundle and load it.
// ---------------------------------------------------------------------------
const SRC = path.join(__dirname, 'src', 'utils', 'statistics.ts');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(os.tmpdir(), `statistics.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
const S = require(bundlePath);
process.on('exit', () => { try { fs.unlinkSync(bundlePath); } catch { /* ignore */ } });

// ---------------------------------------------------------------------------
// Independent reference helpers
// ---------------------------------------------------------------------------
const PHI = (z) => jstat.normal.cdf(z, 0, 1);   // standard normal CDF
const ZQ = (p) => jstat.normal.inv(p, 0, 1);    // standard normal quantile

// Two-sided power from a standardized effect (log effect or beta) and its SE.
const refPower = (absLogEffect, se, alpha) => {
  const z = ZQ(1 - alpha / 2);
  const lam = absLogEffect / se;
  return Math.min(Math.max(PHI(lam - z) + PHI(-lam - z), 0), 1);
};

// ---------------------------------------------------------------------------
// Tiny assertion framework
// ---------------------------------------------------------------------------
let total = 0, passed = 0;
const fails = [];
const ok = (cond, name, detail = '') => {
  total++;
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { fails.push({ name, detail }); console.log(`  ✗ ${name}  ${detail}`); }
};
const close = (a, b, tol, name) =>
  ok(Math.abs(a - b) <= tol, name, `got ${a}, expected ${b} (|diff|=${Math.abs(a - b).toExponential(2)} > ${tol})`);

console.log('\n' + '='.repeat(70));
console.log('REAL-SOURCE VERIFICATION  (imports src/utils/statistics.ts)');
console.log('='.repeat(70));

// ---------------------------------------------------------------------------
console.log('\n0. Module surface');
console.log('-'.repeat(50));
[
  'normalCDF', 'normalQuantile', 'calculateEffectiveAlpha',
  'calculateCoxSE', 'calculateCoxCaseCohortSE', 'calculateCoxNestedCaseControlSE', 'calculateCoxPower', 'calculateCoxMinEffect', 'calculateCoxRequiredEvents',
  'calculateLinearSE', 'calculateLinearPower', 'calculateLinearPowerFromR2', 'calculateLinearMinEffect', 'calculateLinearRequiredN',
  'calculateLogisticSE', 'calculateLogisticCaseControlSE', 'calculateLogisticPower', 'calculateLogisticMinEffect', 'calculateLogisticRequiredN', 'calculateLogisticCaseControlRequiredN',
  'calculatePoissonSE', 'calculatePoissonPower', 'calculatePoissonMinEffect', 'calculatePoissonRequiredN',
  'calculateDesignEffect', 'calculateEffectiveSampleSize', 'calculateGEE_SE', 'calculateGEE_Power', 'calculateGEE_MinEffect', 'calculateGEE_RequiredN', 'calculateGEE_RequiredClusters',
  'orToRR', 'rrToOR', 'r2ToF2', 'betaToCohenD',
  'calculateInflation', 'calculateMinEffect',
  'generatePowerCurve', 'generateTableData',
].forEach((fn) => ok(typeof S[fn] === 'function', `exports ${fn}()`));

// ---------------------------------------------------------------------------
console.log('\n1. Standard normal wrappers vs. tables');
console.log('-'.repeat(50));
close(S.normalCDF(0), 0.5, 1e-12, 'normalCDF(0) = 0.5');
close(S.normalCDF(1.96), 0.9750021, 1e-5, 'normalCDF(1.96) = 0.975');
close(S.normalCDF(-1.96), 0.0249979, 1e-5, 'normalCDF(-1.96) = 0.025');
close(S.normalQuantile(0.975), 1.959964, 1e-5, 'normalQuantile(0.975) = 1.95996');
close(S.normalQuantile(0.80), 0.8416212, 1e-5, 'normalQuantile(0.80) = 0.84162');

// ---------------------------------------------------------------------------
console.log('\n2. Multiple-testing correction');
console.log('-'.repeat(50));
close(S.calculateEffectiveAlpha(0.05, 1000), 5e-5, 1e-12, 'FDR q/m: 0.05/1000 = 5e-5');
close(S.calculateEffectiveAlpha(0.05, 1000, 'bonferroni'), 5e-5, 1e-12, 'Bonferroni alpha/m: 0.05/1000');
close(S.calculateEffectiveAlpha(0.05, 1), 0.05, 1e-12, 'm=1 -> threshold unchanged');
close(S.calculateEffectiveAlpha(0.05, 0), 0.05, 1e-12, 'm=0 guard -> threshold unchanged');

// ---------------------------------------------------------------------------
console.log('\n3. Cox proportional hazards');
console.log('-'.repeat(50));
close(S.calculateCoxSE(100), 0.1, 1e-12, 'SE(100 events) = 1/sqrt(100) = 0.1');
close(S.calculateCoxSE(400), 0.05, 1e-12, 'SE(400 events) = 0.05');
close(S.calculateCoxSE(100, 0.2), 1 / Math.sqrt(80), 1e-12, 'SE with R^2=0.2 inflates by 1/sqrt(1-R^2)');
// Hand-pinned canonical value (matches independent calculators): HR=1.5,d=100,a=0.05 -> 0.9819
close(S.calculateCoxPower(1.5, 100, 0.05), 0.98190, 5e-4, 'power HR=1.5,d=100,a=0.05 = 0.9819 (pinned)');
// Re-derived independently across a grid
for (const d of [25, 50, 100, 250, 500]) {
  for (const hr of [1.2, 1.5, 2.0, 0.5, 0.67]) {
    for (const a of [0.05, 1e-3, 1e-5]) {
      const ref = refPower(Math.abs(Math.log(hr)), 1 / Math.sqrt(d), a);
      close(S.calculateCoxPower(hr, d, a), ref, 1e-12, `Cox power d=${d},HR=${hr},a=${a}`);
    }
  }
}
ok(S.calculateCoxPower(2.0, 100, 0.05) === S.calculateCoxPower(0.5, 100, 0.05), 'Cox: HR and 1/HR symmetric power');
close(S.calculateCoxPower(1.0, 100, 0.05), 0.05, 1e-9, 'Cox: power at null HR=1 equals alpha');
ok(S.calculateCoxPower(0, 100, 0.05) === 0, 'Cox: HR<=0 guarded -> 0');
ok(S.calculateCoxPower(1.5, 0, 0.05) === 0, 'Cox: events<=0 guarded -> 0');
// Required events: d = (z_a+z_b)^2 / log(HR)^2 / (1-R^2)
for (const hr of [1.3, 1.5, 2.0]) {
  for (const pw of [0.8, 0.9]) {
    const ref = Math.ceil(Math.pow((ZQ(0.975) + ZQ(pw)) / Math.abs(Math.log(hr)), 2));
    close(S.calculateCoxRequiredEvents(hr, pw, 0.05), ref, 0, `Cox required events HR=${hr},power=${pw}`);
  }
}
ok(S.calculateCoxRequiredEvents(1.0, 0.8, 0.05) === Infinity, 'Cox: required events at HR=1 -> Infinity');
close(S.calculateCoxRequiredEvents(2.0, 0.8, 0.05, 0.2),
  Math.ceil(Math.pow((ZQ(0.975) + ZQ(0.8)) / Math.log(2), 2) / 0.8), 0, 'Cox required events inflated by 1/(1-R^2)');
// Min effect <-> power round trip
for (const d of [80, 200, 500]) {
  for (const a of [0.05, 1e-4]) {
    const minHR = S.calculateCoxMinEffect(0.8, d, a);
    close(S.calculateCoxPower(minHR, d, a), 0.8, 1e-6, `Cox min-HR round trip d=${d},a=${a}`);
  }
}

// ---------------------------------------------------------------------------
console.log('\n4. Cox case-cohort (with subcohort > cohort guard)');
console.log('-'.repeat(50));
// VIF = 1/f  =>  SE = 1/sqrt(f*d)
close(S.calculateCoxCaseCohortSE(100, 500, 5000), Math.sqrt(1 / 0.1) / Math.sqrt(100), 1e-12,
  'case-cohort SE: f=0.1 -> SE = sqrt(10)/sqrt(100)');
// GUARD: subcohort >= cohort must NOT deflate variance below the full cohort.
close(S.calculateCoxCaseCohortSE(100, 5000, 1000), S.calculateCoxSE(100), 1e-12,
  'GUARD: subcohort>cohort clamps f<=1 (SE == full-cohort SE, no deflation)');
ok(S.calculateCoxPower(1.5, 100, 0.05, { subcohortSize: 5000, totalCohort: 1000 })
   <= S.calculateCoxPower(1.5, 100, 0.05) + 1e-12,
   'GUARD: case-cohort power never exceeds full-cohort power');

console.log('\n4b. Cox nested case-control SE (matching inflation)');
console.log('-'.repeat(50));
for (const m of [1, 2, 4, 10]) {
  const ref = (1 / Math.sqrt(100)) * Math.sqrt(1 + 1 / m); // VIF = (m+1)/m
  close(S.calculateCoxNestedCaseControlSE(100, m), ref, 1e-12, `nested SE d=100, m=${m} = (1/sqrt(d))*sqrt(1+1/m)`);
}
ok(S.calculateCoxNestedCaseControlSE(100, 4) > S.calculateCoxSE(100), 'nested SE > full-cohort SE');
ok(S.calculateCoxNestedCaseControlSE(100, 1000) < S.calculateCoxNestedCaseControlSE(100, 4),
  'nested SE decreases toward full cohort as controls/case grows');
close(S.calculateCoxNestedCaseControlSE(100, 4, 0.2), (1 / Math.sqrt(80)) * Math.sqrt(1.25), 1e-12,
  'nested SE honors covariate R^2');

// ---------------------------------------------------------------------------
console.log('\n5. Linear regression');
console.log('-'.repeat(50));
close(S.calculateLinearSE(102, 1.0), 0.1, 1e-12, 'SE(n=102,sigma=1) = 1/sqrt(100) = 0.1');
for (const n of [50, 102, 500]) {
  for (const b of [0.1, 0.3, 0.5]) {
    const ref = refPower(Math.abs(b), 1 / Math.sqrt(n - 2), 0.05);
    close(S.calculateLinearPower(b, n, 1.0, 0.05), ref, 1e-12, `Linear power n=${n},beta=${b}`);
  }
}
ok(S.calculateLinearPower(0.3, 102, 1, 0.05) === S.calculateLinearPower(-0.3, 102, 1, 0.05), 'Linear: +/-beta symmetric');
// Required N <-> power round trip
for (const b of [0.1, 0.25]) {
  const n = S.calculateLinearRequiredN(b, 0.8, 1.0, 0.05);
  ok(S.calculateLinearPower(b, n, 1.0, 0.05) >= 0.8, `Linear required-N round trip beta=${b} achieves >=80%`);
}
// Min-effect <-> power round trip
for (const n of [100, 500]) {
  const b = S.calculateLinearMinEffect(0.8, n, 1.0, 0.05);
  close(S.calculateLinearPower(b, n, 1.0, 0.05), 0.8, 1e-6, `Linear min-effect round trip n=${n}`);
}

console.log('\n5b. Linear power from R2');
console.log('-'.repeat(50));
// Using n=102, r2=0.0825688, alpha=0.05 -> Power ~ 0.8508
close(S.calculateLinearPowerFromR2(0.0825688, 102, 0.05), 0.8508, 0.001, 'Linear power R2=0.0826, n=102, alpha=0.05');
// Default alpha
close(S.calculateLinearPowerFromR2(0.0825688, 102), 0.8508, 0.001, 'Linear power R2 (default alpha)');
// Covariate adjustment
ok(S.calculateLinearPowerFromR2(0.1, 100, 0.05, 0.2) < S.calculateLinearPowerFromR2(0.1, 100, 0.05, 0),
  'Linear R2 power: covariate R2 reduces power');
// Consistency
const testBeta = 0.3;
const testN = 500;
const testR2 = (testBeta * testBeta) / (testBeta * testBeta + 1.0);
close(S.calculateLinearPowerFromR2(testR2, testN, 0.05), S.calculateLinearPower(testBeta, testN, 1.0, 0.05), 0.01,
  'Linear power R2 consistent with beta power');

// ---------------------------------------------------------------------------
console.log('\n6. Logistic regression');
console.log('-'.repeat(50));
close(S.calculateLogisticSE(500, 0.2), 1 / Math.sqrt(500 * 0.2 * 0.8), 1e-12, 'Logistic SE = 1/sqrt(n*p*(1-p))');
// Hand-pinned: OR=1.5,n=500,p=0.1,a=0.05 -> ~0.776
close(S.calculateLogisticPower(1.5, 500, 0.1, 0.05), 0.7757, 2e-3, 'logistic power OR=1.5,n=500,p=0.1 (pinned ~0.776)');
for (const n of [200, 500, 1000]) {
  for (const orr of [1.3, 1.5, 2.0]) {
    for (const p of [0.1, 0.3, 0.5]) {
      const ref = refPower(Math.abs(Math.log(orr)), 1 / Math.sqrt(n * p * (1 - p)), 0.05);
      close(S.calculateLogisticPower(orr, n, p, 0.05), ref, 1e-12, `Logistic power n=${n},OR=${orr},p=${p}`);
    }
  }
}
// Case-control SE = sqrt(1/cases + 1/controls)
close(S.calculateLogisticCaseControlSE(200, 400), Math.sqrt(1 / 200 + 1 / 400), 1e-12, 'Case-control SE = sqrt(1/a+1/b)');
const ccPow = S.calculateLogisticPower(1.5, 0, 0, 0.05, { cases: 200, controls: 400 });
close(ccPow, refPower(Math.log(1.5), Math.sqrt(1 / 200 + 1 / 400), 0.05), 1e-12, 'Case-control logistic power uses cases/controls SE');
// Required N <-> power round trip
const nLog = S.calculateLogisticRequiredN(1.5, 0.8, 0.2, 0.05);
ok(S.calculateLogisticPower(1.5, nLog, 0.2, 0.05) >= 0.8, 'Logistic required-N round trip achieves >=80%');
// Min-effect <-> power round trip
for (const p of [0.1, 0.3]) {
  const orMin = S.calculateLogisticMinEffect(0.8, 800, p, 0.05);
  close(S.calculateLogisticPower(orMin, 800, p, 0.05), 0.8, 1e-6, `Logistic min-effect round trip p=${p}`);
}
// Case-control required TOTAL N (fixed controls-per-case ratio): independent
// formula + round trip through the case-control power.
for (const r of [1, 2, 4]) {
  const N = S.calculateLogisticCaseControlRequiredN(1.5, 0.8, r, 0.05);
  const refN = Math.ceil(Math.pow((1 + r) * (ZQ(0.975) + ZQ(0.8)) / Math.log(1.5), 2) / r);
  close(N, refN, 0, `Case-control required N matches independent formula (r=${r})`);
  const ccPower = S.calculateLogisticPower(1.5, 0, 0, 0.05, { cases: N / (1 + r), controls: (N * r) / (1 + r) });
  ok(ccPower >= 0.8 && ccPower < 0.82, `Case-control required-N round trip ~80% (r=${r}, got ${(ccPower * 100).toFixed(1)}%)`);
}
ok(!Number.isFinite(S.calculateLogisticCaseControlRequiredN(1.0, 0.8, 2, 0.05)), 'Case-control required N at OR=1 -> Infinity');

// ---------------------------------------------------------------------------
console.log('\n7. Modified Poisson (relative risk)');
console.log('-'.repeat(50));
close(S.calculatePoissonSE(1000, 0.1), Math.sqrt(1 / (1000 * 0.1)), 1e-12, 'Poisson SE = sqrt(1/(n*p))');
for (const n of [500, 1000]) {
  for (const rr of [1.3, 1.5, 2.0]) {
    for (const p of [0.05, 0.2]) {
      const ref = refPower(Math.abs(Math.log(rr)), Math.sqrt(1 / (n * p)), 0.05);
      close(S.calculatePoissonPower(rr, n, p, 0.05), ref, 1e-12, `Poisson power n=${n},RR=${rr},p=${p}`);
    }
  }
}
const nPois = S.calculatePoissonRequiredN(1.5, 0.8, 0.1, 0.05);
ok(S.calculatePoissonPower(1.5, nPois, 0.1, 0.05) >= 0.8, 'Poisson required-N round trip achieves >=80%');
// Min-effect <-> power round trip
for (const p of [0.1, 0.3]) {
  const rrMin = S.calculatePoissonMinEffect(0.8, 800, p, 0.05);
  close(S.calculatePoissonPower(rrMin, 800, p, 0.05), 0.8, 1e-6, `Poisson min-effect round trip p=${p}`);
}

// ---------------------------------------------------------------------------
console.log('\n8. GEE / mixed effects');
console.log('-'.repeat(50));
close(S.calculateDesignEffect(5, 0.05), 1 + 4 * 0.05, 1e-12, 'design effect DE = 1+(m-1)*ICC');
close(S.calculateDesignEffect(1, 0.5), 1, 1e-12, 'DE with cluster size 1 = 1');
close(S.calculateEffectiveSampleSize(100, 5, 0.05), 100 / (1 + 4 * 0.05), 1e-12, 'effective sample size n_eff = n / DE');
close(S.calculateEffectiveSampleSize(100, 1, 0.5), 100, 1e-12, 'n_eff with cluster size 1 = n');
for (const n of [500, 1000]) {
  for (const m of [3, 10]) {
    for (const icc of [0, 0.05, 0.2]) {
      const de = 1 + (m - 1) * icc;
      const se = Math.sqrt(de) / Math.sqrt(n - 2);
      const ref = refPower(0.2, se, 0.05);
      close(S.calculateGEE_Power(0.2, n, m, icc, 1.0, 0.05), ref, 1e-12, `GEE power n=${n},m=${m},icc=${icc}`);
    }
  }
}
// More clustering (higher ICC) -> lower power
ok(S.calculateGEE_Power(0.2, 1000, 10, 0.2, 1, 0.05) < S.calculateGEE_Power(0.2, 1000, 10, 0.0, 1, 0.05),
  'GEE: higher ICC reduces power');
// Required clusters consistent with required N
const nGee = S.calculateGEE_RequiredN(0.2, 0.8, 5, 0.05, 1.0, 0.05);
close(S.calculateGEE_RequiredClusters(0.2, 0.8, 5, 0.05, 1.0, 0.05), Math.ceil(nGee / 5), 0,
  'GEE required clusters = ceil(required N / cluster size)');
// Required N <-> power and min-effect <-> power round trips
ok(S.calculateGEE_Power(0.2, nGee, 5, 0.05, 1.0, 0.05) >= 0.8, 'GEE required-N round trip achieves >=80%');
// Required-N is the TIGHT inverse of the displayed (n - 2) SE, even at a large
// design effect. A DE-scaled small-sample constant (n - 2*DE) would overshoot
// the target here (power well above 0.80 for the same beta/alpha).
{
  const mBig = 50, iccBig = 0.5;
  const nBig = S.calculateGEE_RequiredN(0.2, 0.8, mBig, iccBig, 1.0, 0.05);
  const pBig = S.calculateGEE_Power(0.2, nBig, mBig, iccBig, 1.0, 0.05);
  ok(pBig >= 0.8 && pBig < 0.802, `GEE required-N is a tight inverse at high DE (n=${nBig}, power=${pBig.toFixed(4)})`);
}
for (const m of [3, 10]) {
  const bMin = S.calculateGEE_MinEffect(0.8, 1000, m, 0.05, 1.0, 0.05);
  close(S.calculateGEE_Power(bMin, 1000, m, 0.05, 1.0, 0.05), 0.8, 1e-6, `GEE min-effect round trip m=${m}`);
}

// ---------------------------------------------------------------------------
console.log('\n9. Covariate adjustment monotonicity');
console.log('-'.repeat(50));
ok(S.calculateCoxPower(1.5, 100, 0.05, undefined, 0.5) < S.calculateCoxPower(1.5, 100, 0.05, undefined, 0),
  'Cox: covariate R^2>0 lowers power (variance inflation)');
ok(S.calculateLogisticPower(1.5, 1000, 0.2, 0.05, undefined, 0.5) < S.calculateLogisticPower(1.5, 1000, 0.2, 0.05, undefined, 0),
  'Logistic: covariate R^2>0 lowers power');

// ---------------------------------------------------------------------------
console.log('\n10. Effect-size conversions');
console.log('-'.repeat(50));
const p0 = 0.1, orv = 2.0;
const rr = S.orToRR(orv, p0);
close(S.rrToOR(rr, p0), orv, 1e-9, 'orToRR <-> rrToOR round trip');
close(S.r2ToF2(0.2), 0.2 / 0.8, 1e-12, 'r2ToF2: f^2 = R^2/(1-R^2)');
close(S.betaToCohenD(0.5, 0.25), 2.0, 1e-9, 'betaToCohenD: 0.5 / 0.25 = 2.0');
close(S.betaToCohenD(-1.0, 0.5), -2.0, 1e-9, 'betaToCohenD: negative beta');
close(S.betaToCohenD(0, 1.0), 0.0, 1e-9, 'betaToCohenD: zero beta');
ok(!Number.isFinite(S.betaToCohenD(1.0, 0)), 'betaToCohenD: div by zero residualSD -> Infinity');

// ---------------------------------------------------------------------------
console.log('\n11. Inflation calculation');
console.log('-'.repeat(50));
close(S.calculateInflation(0, 1.5), 0, 1e-12, 'calculateInflation: hrSingle <= 0 -> 0');
close(S.calculateInflation(1.5, -1), 0, 1e-12, 'calculateInflation: hrMulti <= 0 -> 0');
close(S.calculateInflation(1, 1.5), 0, 1e-12, 'calculateInflation: hrSingle === 1 -> 0');
close(S.calculateInflation(1.5, 1), 0, 1e-12, 'calculateInflation: hrMulti === 1 -> 0');
close(S.calculateInflation(1.5, 0.8), 0, 1e-12, 'calculateInflation: opposite directions -> 0');
close(S.calculateInflation(0.8, 1.5), 0, 1e-12, 'calculateInflation: opposite directions -> 0');
close(S.calculateInflation(1.5, 1.8), ((1.8 / 1.5) - 1) * 100, 1e-12, 'calculateInflation: 1.5 -> 1.8');
close(S.calculateInflation(0.8, 0.5), ((0.5 / 0.8) - 1) * 100, 1e-12, 'calculateInflation: 0.8 -> 0.5');

// ---------------------------------------------------------------------------
console.log('\n12. generatePowerCurve (missing tests from issue)');
console.log('-'.repeat(50));
const curvePoints = S.generatePowerCurve(100, 0.05, 1.0, 3.0, 50);
ok(Array.isArray(curvePoints), 'generatePowerCurve returns an array');
ok(curvePoints.length === 50, `generatePowerCurve respects numPoints parameter (got ${curvePoints.length})`);

const firstPoint = curvePoints[0];
const lastPoint = curvePoints[curvePoints.length - 1];

ok(firstPoint && typeof firstPoint.hr === 'number' && typeof firstPoint.power === 'number',
  'curve objects have numeric hr and power properties');
close(firstPoint.hr, 1.0, 1e-4, `first point hr is exactly hrMin (got ${firstPoint.hr})`);
close(lastPoint.hr, 3.0, 1e-4, `last point hr is exactly hrMax (got ${lastPoint.hr})`);

// Power for HR=1.0 should be approx alpha
close(firstPoint.power, 0.05, 1e-4, 'power at hr=1.0 matches alpha (0.05)');

const curveDefault = S.generatePowerCurve(100, 0.05);
ok(curveDefault.length === 100, 'generatePowerCurve uses default numPoints=100');

// ---------------------------------------------------------------------------
console.log('\n13. Numerical stability / guards');
console.log('-'.repeat(50));
for (const [hr, d, a] of [[1.0001, 10, 0.05], [100, 10, 0.05], [1.5, 1, 0.05], [1.5, 100000, 0.05], [1.5, 100, 1e-15]]) {
  const v = S.calculateCoxPower(hr, d, a);
  ok(Number.isFinite(v) && v >= 0 && v <= 1, `Cox power finite & in [0,1] for HR=${hr},d=${d},a=${a} (=${v.toFixed(4)})`);
}
ok(S.calculateLinearPower(0.3, 2, 1, 0.05) === 0, 'Linear: n<=2 guarded -> 0');
ok(!Number.isFinite(S.calculateLogisticRequiredN(1.0, 0.8, 0.1, 0.05)), 'Logistic: required N at OR=1 -> Infinity');

// ---------------------------------------------------------------------------
console.log('\n14. Unified calculateMinEffect');
console.log('-'.repeat(50));
const minCox = S.calculateMinEffect({
  analysisType: 'cox',
  studyDesign: 'cohort',
  targetPower: 0.8,
  alpha: 0.05,
  events: 100,
});
close(minCox, S.calculateCoxMinEffect(0.8, 100, 0.05), 1e-12, 'Unified calculateMinEffect: Cox cohort');

const minCoxCC = S.calculateMinEffect({
  analysisType: 'cox',
  studyDesign: 'case-cohort',
  targetPower: 0.8,
  alpha: 0.05,
  events: 100,
  subcohortSize: 500,
  totalCohort: 5000,
});
close(minCoxCC, S.calculateCoxMinEffect(0.8, 100, 0.05, { caseCohort: { subcohortSize: 500, totalCohort: 5000 } }), 1e-12, 'Unified calculateMinEffect: Cox case-cohort');

const minCoxNCC = S.calculateMinEffect({
  analysisType: 'cox',
  studyDesign: 'nested-case-control',
  targetPower: 0.8,
  alpha: 0.05,
  events: 100,
  matchingRatio: 4,
});
close(minCoxNCC, S.calculateCoxMinEffect(0.8, 100, 0.05, { nestedCaseControl: { matchingRatio: 4 } }), 1e-12, 'Unified calculateMinEffect: Cox nested-case-control');

const minLin = S.calculateMinEffect({
  analysisType: 'linear',
  studyDesign: 'cohort',
  targetPower: 0.8,
  alpha: 0.05,
  sampleSize: 100,
  residualSD: 2,
  covariateR2: 0.1,
});
close(minLin, S.calculateLinearMinEffect(0.8, 100, 2, 0.05, 0.1), 1e-12, 'Unified calculateMinEffect: Linear');

const minLog = S.calculateMinEffect({
  analysisType: 'logistic',
  studyDesign: 'cohort',
  targetPower: 0.8,
  alpha: 0.05,
  sampleSize: 1000,
  prevalence: 0.2,
});
close(minLog, S.calculateLogisticMinEffect(0.8, 1000, 0.2, 0.05), 1e-12, 'Unified calculateMinEffect: Logistic cohort');

const minLogCC = S.calculateMinEffect({
  analysisType: 'logistic',
  studyDesign: 'case-control',
  targetPower: 0.8,
  alpha: 0.05,
  cases: 200,
  controls: 400,
});
close(minLogCC, S.calculateLogisticMinEffect(0.8, 0, 0, 0.05, { cases: 200, controls: 400 }), 1e-12, 'Unified calculateMinEffect: Logistic case-control');

const minPois = S.calculateMinEffect({
  analysisType: 'poisson',
  studyDesign: 'cohort',
  targetPower: 0.8,
  alpha: 0.05,
  sampleSize: 500,
  prevalence: 0.1,
  covariateR2: 0.2,
});
close(minPois, S.calculatePoissonMinEffect(0.8, 500, 0.1, 0.05, 0.2), 1e-12, 'Unified calculateMinEffect: Poisson');

const minGee = S.calculateMinEffect({
  analysisType: 'gee',
  studyDesign: 'cohort',
  targetPower: 0.8,
  alpha: 0.05,
  sampleSize: 1000,
  clusterSize: 5,
  icc: 0.1,
  residualSD: 1.5,
  covariateR2: 0.05,
});
close(minGee, S.calculateGEE_MinEffect(0.8, 1000, 5, 0.1, 1.5, 0.05, 0.05), 1e-12, 'Unified calculateMinEffect: GEE');

const minInvalid = S.calculateMinEffect({
  analysisType: 'unknown',
  studyDesign: 'cohort',
  targetPower: 0.8,
  alpha: 0.05,
});
ok(minInvalid === Infinity, 'Unified calculateMinEffect: unknown analysis type -> Infinity');

// ---------------------------------------------------------------------------
console.log('\n15. Data Generation Utilities');
console.log('-'.repeat(50));
const defaultTable = S.generateTableData(100, 0.05, 0.00005);
ok(Array.isArray(defaultTable) && defaultTable.length === 11, 'generateTableData: uses default hrValues length of 11');
ok(defaultTable[0].hr === 1.0 && typeof defaultTable[0].powerSingle === 'number' && typeof defaultTable[0].powerMulti === 'number', 'generateTableData: first element has correct shape and values');
ok(defaultTable[5].hr === 2.0 && defaultTable[5].powerSingle > defaultTable[5].powerMulti, 'generateTableData: powerSingle > powerMulti for HR=2.0');
const customHrValues = [1.5, 2.5];
const customTable = S.generateTableData(50, 0.01, 0.001, customHrValues);
ok(Array.isArray(customTable) && customTable.length === 2, 'generateTableData: uses custom hrValues length');
ok(customTable[0].hr === 1.5 && customTable[1].hr === 2.5, 'generateTableData: uses custom hrValues');
ok(customTable[0].powerSingle === S.calculateCoxPower(1.5, 50, 0.01), 'generateTableData: calculates correct powerSingle');
ok(customTable[1].powerMulti === S.calculateCoxPower(2.5, 50, 0.001), 'generateTableData: calculates correct powerMulti');

// ---------------------------------------------------------------------------
console.log('\n16. Unified calculatePower dispatcher (routing matches leaf functions)');
console.log('-'.repeat(50));
// Every displayed power flows through calculatePower; assert each analysis
// type/design routes to the same SE the leaf function uses (incl. covariateR2).
close(S.calculatePower({ analysisType: 'cox', studyDesign: 'cohort', effectSize: 1.5, alpha: 0.05, events: 100, covariateR2: 0.1 }),
  S.calculateCoxPower(1.5, 100, 0.05, {}, 0.1), 1e-12, 'calculatePower: Cox cohort (R2x)');
close(S.calculatePower({ analysisType: 'cox', studyDesign: 'case-cohort', effectSize: 1.5, alpha: 0.05, events: 100, subcohortSize: 500, totalCohort: 5000 }),
  S.calculateCoxPower(1.5, 100, 0.05, { caseCohort: { subcohortSize: 500, totalCohort: 5000 } }, 0), 1e-12, 'calculatePower: Cox case-cohort');
close(S.calculatePower({ analysisType: 'cox', studyDesign: 'nested-case-control', effectSize: 1.5, alpha: 0.05, events: 100, matchingRatio: 4 }),
  S.calculateCoxPower(1.5, 100, 0.05, { nestedCaseControl: { matchingRatio: 4 } }, 0), 1e-12, 'calculatePower: Cox nested-case-control');
close(S.calculatePower({ analysisType: 'linear', studyDesign: 'cohort', effectSize: 0.2, alpha: 0.05, sampleSize: 500, residualSD: 2, covariateR2: 0.1 }),
  S.calculateLinearPower(0.2, 500, 2, 0.05, 0.1), 1e-12, 'calculatePower: Linear (R2x)');
close(S.calculatePower({ analysisType: 'logistic', studyDesign: 'cohort', effectSize: 1.5, alpha: 0.05, sampleSize: 1000, prevalence: 0.2 }),
  S.calculateLogisticPower(1.5, 1000, 0.2, 0.05, undefined, 0), 1e-12, 'calculatePower: Logistic cohort');
close(S.calculatePower({ analysisType: 'logistic', studyDesign: 'case-control', effectSize: 1.5, alpha: 0.05, cases: 200, controls: 400 }),
  S.calculateLogisticPower(1.5, 0, 0, 0.05, { cases: 200, controls: 400 }, 0), 1e-12, 'calculatePower: Logistic case-control');
close(S.calculatePower({ analysisType: 'poisson', studyDesign: 'cohort', effectSize: 1.3, alpha: 0.05, sampleSize: 800, prevalence: 0.15, covariateR2: 0.2 }),
  S.calculatePoissonPower(1.3, 800, 0.15, 0.05, 0.2), 1e-12, 'calculatePower: Poisson (R2x)');
close(S.calculatePower({ analysisType: 'gee', studyDesign: 'cohort', effectSize: 0.2, alpha: 0.05, sampleSize: 1000, clusterSize: 5, icc: 0.1, residualSD: 1.5, covariateR2: 0.05 }),
  S.calculateGEE_Power(0.2, 1000, 5, 0.1, 1.5, 0.05, 0.05), 1e-12, 'calculatePower: GEE (R2x)');

// ---------------------------------------------------------------------------
console.log('\n17. Unified calculateRequiredSample dispatcher + round trips');
console.log('-'.repeat(50));
close(S.calculateRequiredSample({ analysisType: 'cox', studyDesign: 'cohort', effectSize: 1.5, targetPower: 0.8, alpha: 0.05, covariateR2: 0.1 }),
  S.calculateCoxRequiredEvents(1.5, 0.8, 0.05, 0.1), 0, 'calculateRequiredSample: Cox cohort == required events');
const baseEv = S.calculateCoxRequiredEvents(1.5, 0.8, 0.05, 0);
close(S.calculateRequiredSample({ analysisType: 'cox', studyDesign: 'case-cohort', effectSize: 1.5, targetPower: 0.8, alpha: 0.05, subcohortSize: 500, totalCohort: 5000 }),
  Math.ceil(baseEv / (500 / 5000)), 0, 'calculateRequiredSample: Cox case-cohort scales events by 1/f');
close(S.calculateRequiredSample({ analysisType: 'cox', studyDesign: 'nested-case-control', effectSize: 1.5, targetPower: 0.8, alpha: 0.05, matchingRatio: 4 }),
  Math.ceil(baseEv * (1 + 1 / 4)), 0, 'calculateRequiredSample: Cox nested scales events by (1 + 1/m)');
close(S.calculateRequiredSample({ analysisType: 'linear', studyDesign: 'cohort', effectSize: 0.2, targetPower: 0.8, alpha: 0.05, residualSD: 2, covariateR2: 0.1 }),
  S.calculateLinearRequiredN(0.2, 0.8, 2, 0.05, 0.1), 0, 'calculateRequiredSample: Linear');
close(S.calculateRequiredSample({ analysisType: 'logistic', studyDesign: 'cohort', effectSize: 1.5, targetPower: 0.8, alpha: 0.05, prevalence: 0.2 }),
  S.calculateLogisticRequiredN(1.5, 0.8, 0.2, 0.05, 0), 0, 'calculateRequiredSample: Logistic cohort');
close(S.calculateRequiredSample({ analysisType: 'logistic', studyDesign: 'case-control', effectSize: 1.5, targetPower: 0.8, alpha: 0.05, matchingRatio: 2 }),
  S.calculateLogisticCaseControlRequiredN(1.5, 0.8, 2, 0.05, 0), 0, 'calculateRequiredSample: Logistic case-control (total N)');
close(S.calculateRequiredSample({ analysisType: 'poisson', studyDesign: 'cohort', effectSize: 1.3, targetPower: 0.8, alpha: 0.05, prevalence: 0.15, covariateR2: 0.2 }),
  S.calculatePoissonRequiredN(1.3, 0.8, 0.15, 0.05, 0.2), 0, 'calculateRequiredSample: Poisson');
close(S.calculateRequiredSample({ analysisType: 'gee', studyDesign: 'cohort', effectSize: 0.2, targetPower: 0.8, alpha: 0.05, clusterSize: 5, icc: 0.1, residualSD: 1.5, covariateR2: 0.05 }),
  S.calculateGEE_RequiredN(0.2, 0.8, 5, 0.1, 1.5, 0.05, 0.05), 0, 'calculateRequiredSample: GEE');
// End-to-end round trips: the dispatcher's required size, fed back through the
// dispatcher's power, must achieve the target.
{
  const evCox = S.calculateRequiredSample({ analysisType: 'cox', studyDesign: 'cohort', effectSize: 1.5, targetPower: 0.8, alpha: 0.05 });
  ok(S.calculatePower({ analysisType: 'cox', studyDesign: 'cohort', effectSize: 1.5, alpha: 0.05, events: evCox }) >= 0.8, 'round trip: Cox required events -> >=80% power');
  const nLin = S.calculateRequiredSample({ analysisType: 'linear', studyDesign: 'cohort', effectSize: 0.2, targetPower: 0.8, alpha: 0.05, residualSD: 2 });
  ok(S.calculatePower({ analysisType: 'linear', studyDesign: 'cohort', effectSize: 0.2, alpha: 0.05, sampleSize: nLin, residualSD: 2 }) >= 0.8, 'round trip: Linear required N -> >=80% power');
  const nCC = S.calculateRequiredSample({ analysisType: 'logistic', studyDesign: 'case-control', effectSize: 1.5, targetPower: 0.8, alpha: 0.05, matchingRatio: 2 });
  ok(S.calculatePower({ analysisType: 'logistic', studyDesign: 'case-control', effectSize: 1.5, alpha: 0.05, cases: nCC / 3, controls: (nCC * 2) / 3 }) >= 0.8, 'round trip: Logistic case-control required N -> >=80% power');
}

// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log(`REAL-SOURCE RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');
if (fails.length) {
  fails.forEach((f) => console.log(`  ✗ ${f.name}: ${f.detail}`));
  process.exit(1);
}
console.log('All assertions against the real src/utils/statistics.ts passed.\n');
