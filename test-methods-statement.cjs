/**
 * METHODS STATEMENT TEST
 *
 * Verifies that src/utils/methodsStatement.ts composes a protocol-ready
 * paragraph that names the model, the design, every quantity that sets the
 * standard error, the multiplicity correction, and each scenario's headline
 * results, using scientific notation for per-test alpha.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

const SRC = path.join(__dirname, 'src', 'utils', 'methodsStatement.ts');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(os.tmpdir(), `methodsStatement.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
const M = require(bundlePath);
process.on('exit', () => { try { fs.unlinkSync(bundlePath); } catch { /* ignore */ } });

let total = 0;
let passed = 0;
let failed = false;
const ok = (cond, name) => {
  total++;
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed = true; console.log(`  ✗ ${name}`); }
};

const base = {
  analysisType: 'cox',
  studyDesign: 'cohort',
  scenarios: [{ proteinCount: 5000, alpha: 0.00001, minEffect: 1.87, powerAtInput: 0.002, sampleNeeded: 832 }],
  effectSize: 1.2,
  targetPower: 0.8,
  fdrQ: 0.05,
  correctionMethod: 'fdr',
  sampleSize: 1000,
  events: 70,
  prevalence: 0.1,
  residualSD: 1,
  numCases: 200,
  numControls: 400,
  subcohortSize: 500,
  totalCohort: 5000,
  matchingRatio: 4,
  clusterSize: 5,
  icc: 0.05,
  covariateR2: 0,
  effectSymbol: 'HR',
  effectLabel: 'Hazard Ratio',
};

console.log('\nMETHODS STATEMENT');

console.log('\n1. Cox cohort, single scenario, FDR');
const cox = M.generateMethodsStatement(base);
ok(cox.includes('tested across 5,000 proteins'), 'names the number of proteins tested');
ok(cox.includes('Benjamini–Hochberg false-discovery-rate control at q = 0.05'), 'names the FDR correction and q');
ok(cox.includes('per-test α ≈ 1.00 × 10⁻⁵'), 'reports the per-test alpha in scientific notation');
ok(cox.includes('Cox proportional-hazards model in a cohort design with d = 70 events'), 'describes the model, design and events');
ok(cox.includes('standardized to unit variance'), 'states the standardization assumption');
ok(!cox.includes('R²ₓ'), 'omits the covariate clause when R² is zero');
ok(cox.includes('has 0.2% power to detect a hazard ratio of 1.20'), 'reports power at the input effect');
ok(cox.includes('would be required to detect HR = 1.20 with 80% power'), 'names the effect with its symbol in the required-size clause');
ok(cox.includes('minimum detectable HR at 80% power is 1.87'), 'reports the minimum detectable effect');
ok(cox.includes('832 events would be required'), 'reports the required events');
ok(cox.includes('Schoenfeld 1983') && cox.includes('Benjamini & Hochberg 1995'), 'cites the model and correction references');
ok(cox.startsWith('Statistical power was estimated') && cox.endsWith('.'), 'reads as a complete paragraph');

console.log('\n2. Covariate adjustment and Bonferroni');
const adj = M.generateMethodsStatement({ ...base, covariateR2: 0.2, correctionMethod: 'bonferroni', fdrQ: 0.05 });
ok(adj.includes('explain 20% of the variance in protein level (R²ₓ = 0.20)'), 'describes covariate R² when non-zero');
ok(adj.includes('Bonferroni correction at a family-wise error rate of 0.05'), 'names Bonferroni with the FWER');
ok(!adj.includes('Benjamini & Hochberg'), 'does not cite BH under Bonferroni');

console.log('\n3. Multiple scenarios');
const multi = M.generateMethodsStatement({
  ...base,
  scenarios: [
    { proteinCount: 1, alpha: 0.05, minEffect: 1.4, powerAtInput: 0.332, sampleNeeded: 237 },
    { proteinCount: 1000, alpha: 0.00005, minEffect: 1.8, powerAtInput: 0.006, sampleNeeded: 722 },
    { proteinCount: 5000, alpha: 0.00001, minEffect: 1.87, powerAtInput: 0.002, sampleNeeded: 832 },
  ],
});
ok(multi.includes('across 1, 1,000, and 5,000 proteins in separate scenarios'), 'lists every scenario in the scope sentence');
ok(multi.includes('With 1 protein (per-test α ≈ 0.05), the study has 33.2% power'), 'singular protein and plain-decimal alpha for one protein');
ok(multi.includes('With 1,000 proteins (per-test α ≈ 5.00 × 10⁻⁵)'), 'per-scenario alpha in scientific notation');
ok((multi.match(/would be required/g) || []).length === 3, 'one result sentence per scenario');

console.log('\n4. Other models and designs');
const linear = M.generateMethodsStatement({ ...base, analysisType: 'linear', effectSymbol: 'β', effectLabel: 'Per-SD Beta', effectSize: 0.2,
  scenarios: [{ proteinCount: 5000, alpha: 0.00001, minEffect: 0.2015, powerAtInput: 0.78, sampleNeeded: 1050 }] });
ok(linear.includes('linear regression model in a cohort design with n = 1,000 participants and a residual standard deviation of 1'), 'linear: n and residual SD');
ok(linear.includes('minimum detectable |β| at 80% power is 0.202'), 'beta models report |β| to three decimals');
ok(linear.includes('1,050 participants would be required'), 'linear: participants noun');
ok(linear.includes('Hsieh, Bloch & Larsen 1998'), 'linear: cites Hsieh, Bloch & Larsen');

const cc = M.generateMethodsStatement({ ...base, analysisType: 'logistic', studyDesign: 'case-control', effectSymbol: 'OR', effectLabel: 'Odds Ratio', effectSize: 1.3 });
ok(cc.includes('logistic regression model in a case-control design with 200 cases and 400 controls'), 'logistic case-control: cases and controls');

const caseCohort = M.generateMethodsStatement({ ...base, studyDesign: 'case-cohort' });
ok(caseCohort.includes('case-cohort design with d = 70 events and a subcohort of 500 sampled from a full cohort of 5,000'), 'Cox case-cohort: subcohort and cohort');
ok(caseCohort.includes('Prentice 1986'), 'Cox case-cohort: cites Prentice');

const nested = M.generateMethodsStatement({ ...base, studyDesign: 'nested-case-control' });
ok(nested.includes('nested case-control design with d = 70 cases and 4 matched controls per case'), 'Cox nested: cases and matching ratio');
ok(nested.includes('832 cases would be required'), 'Cox nested: required quantity is cases');

const poisson = M.generateMethodsStatement({ ...base, analysisType: 'poisson', effectSymbol: 'RR', effectLabel: 'Relative Risk' });
ok(poisson.includes('modified Poisson regression model with robust variance (relative risk) in a cohort design with n = 1,000 participants and an outcome prevalence of 10%'), 'Poisson: n and prevalence');
ok(poisson.includes('Zou 2004'), 'Poisson: cites Zou');

const gee = M.generateMethodsStatement({ ...base, analysisType: 'gee', effectSymbol: 'β', effectLabel: 'Per-SD Beta', effectSize: 0.2,
  scenarios: [{ proteinCount: 5000, alpha: 0.00001, minEffect: 0.25, powerAtInput: 0.5, sampleNeeded: 2400 }] });
ok(gee.includes('clusters of 5 (intraclass correlation 0.05, design effect 1.20)'), 'GEE: cluster size, ICC and design effect');
ok(gee.includes('2,400 observations would be required'), 'GEE: observations noun');

console.log('\n5. Non-finite results');
const nullEffect = M.generateMethodsStatement({ ...base, effectSize: 1, scenarios: [{ proteinCount: 5000, alpha: 0.00001, minEffect: 1.87, powerAtInput: 0.00001, sampleNeeded: Infinity }] });
ok(nullEffect.includes('no finite number of events would be required'), 'infinite required size is stated in words');

console.log(`\nMETHODS STATEMENT RESULTS: ${passed}/${total} passed`);
if (failed) { console.log('SOME METHODS STATEMENT TESTS FAILED'); process.exit(1); }
console.log('All methods statement tests passed.');
