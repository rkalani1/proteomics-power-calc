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
  'calculateLinearSE', 'calculateLinearPower', 'calculateLinearMinEffect', 'calculateLinearRequiredN',
  'calculateLogisticSE', 'calculateLogisticCaseControlSE', 'calculateLogisticPower', 'calculateLogisticMinEffect', 'calculateLogisticRequiredN', 'calculateLogisticCaseControlRequiredN',
  'calculatePoissonSE', 'calculatePoissonPower', 'calculatePoissonMinEffect', 'calculatePoissonRequiredN',
  'calculateDesignEffect', 'calculateGEE_SE', 'calculateGEE_Power', 'calculateGEE_MinEffect', 'calculateGEE_RequiredN', 'calculateGEE_RequiredClusters',
  'orToRR', 'rrToOR', 'r2ToF2',
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

// ---------------------------------------------------------------------------
console.log('\n11. Numerical stability / guards');
console.log('-'.repeat(50));
for (const [hr, d, a] of [[1.0001, 10, 0.05], [100, 10, 0.05], [1.5, 1, 0.05], [1.5, 100000, 0.05], [1.5, 100, 1e-15]]) {
  const v = S.calculateCoxPower(hr, d, a);
  ok(Number.isFinite(v) && v >= 0 && v <= 1, `Cox power finite & in [0,1] for HR=${hr},d=${d},a=${a} (=${v.toFixed(4)})`);
}
ok(S.calculateLinearPower(0.3, 2, 1, 0.05) === 0, 'Linear: n<=2 guarded -> 0');
ok(!Number.isFinite(S.calculateLogisticRequiredN(1.0, 0.8, 0.1, 0.05)), 'Logistic: required N at OR=1 -> Infinity');

// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log(`REAL-SOURCE RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');
if (fails.length) {
  fails.forEach((f) => console.log(`  ✗ ${f.name}: ${f.detail}`));
  process.exit(1);
}
console.log('All assertions against the real src/utils/statistics.ts passed.\n');
