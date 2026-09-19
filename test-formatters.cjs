/**
 * FORMATTERS UTILITIES VERIFICATION TEST
 *
 * Verifies that the UI formatters and status helper functions in src/utils/formatters.ts
 * produce predictable, accurate outputs across all analysis types, study designs, and edge cases.
 * Combines coverage from the PR formatter suite and the suite already on main.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

// ---------------------------------------------------------------------------
// Compile the real TypeScript source to a CommonJS bundle and load it.
// ---------------------------------------------------------------------------
const SRC = path.join(__dirname, 'src', 'utils', 'formatters.ts');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(os.tmpdir(), `formatters.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);

let failed = false;
let total = 0;
let passed = 0;
const fails = [];

const ok = (cond, name, detail = '') => {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed = true;
    fails.push({ name, detail });
    console.log(`  ✗ ${name}  ${detail}`);
  }
};

try {
  const F = require(bundlePath);

  console.log('\n' + '='.repeat(70));
  console.log('FORMATTERS UTILITIES VERIFICATION');
  console.log('='.repeat(70));

  // 1. getPowerStatus
  console.log('\n1. getPowerStatus');
  ok(F.getPowerStatus(0.85, 0.8) === 'adequate', 'Returns adequate when power > targetPower');
  ok(F.getPowerStatus(0.80, 0.8) === 'adequate', 'Returns adequate when power === targetPower (boundary)');
  ok(F.getPowerStatus(0.8, 0.8) === 'adequate', 'Returns adequate when power equals targetPower exactly');
  ok(F.getPowerStatus(0.79, 0.8) === 'marginal', 'Returns marginal when power < targetPower but >= default marginalThreshold (0.5)');
  ok(F.getPowerStatus(0.6, 0.8) === 'marginal', 'Returns marginal when power < targetPower and >= default marginalThreshold (0.5)');
  ok(F.getPowerStatus(0.50, 0.8) === 'marginal', 'Returns marginal when power === default marginalThreshold (0.5)');
  ok(F.getPowerStatus(0.5, 0.8) === 'marginal', 'Returns marginal when power equals default marginalThreshold (0.5) exactly');
  ok(F.getPowerStatus(0.49, 0.8) === 'inadequate', 'Returns inadequate when power < default marginalThreshold (0.5)');
  ok(F.getPowerStatus(0.10, 0.8) === 'inadequate', 'Returns inadequate for low power');
  ok(F.getPowerStatus(0.0, 0.8) === 'inadequate', 'Returns inadequate when power is 0');

  // getPowerStatus with custom marginalThreshold
  ok(F.getPowerStatus(0.65, 0.8, 0.6) === 'marginal', 'Returns marginal when power >= custom marginalThreshold (0.6)');
  ok(F.getPowerStatus(0.55, 0.8, 0.6) === 'inadequate', 'Returns inadequate when power < custom marginalThreshold (0.6)');
  ok(F.getPowerStatus(0.65, 0.8, 0.7) === 'inadequate', 'Honors custom marginalThreshold (0.65 < 0.7 is inadequate)');
  ok(F.getPowerStatus(0.7, 0.8, 0.7) === 'marginal', 'Honors custom marginalThreshold (0.7 >= 0.7 is marginal)');

  // 1b. formatAlpha: scientific notation for per-test significance levels
  console.log('\n1b. formatAlpha');
  ok(F.formatAlpha(0.05) === '0.05', 'formatAlpha keeps plain decimals at or above 0.001 (0.05)');
  ok(F.formatAlpha(0.0125) === '0.0125', 'formatAlpha keeps three significant digits for decimals (0.0125)');
  ok(F.formatAlpha(0.001) === '0.001', 'formatAlpha treats 0.001 as the last plain decimal');
  ok(F.formatAlpha(0.00001) === '1.00 × 10⁻⁵', 'formatAlpha renders 1e-5 as 1.00 × 10⁻⁵');
  ok(F.formatAlpha(0.00005) === '5.00 × 10⁻⁵', 'formatAlpha renders 5e-5 as 5.00 × 10⁻⁵');
  ok(F.formatAlpha(0.05 / 7000) === '7.14 × 10⁻⁶', 'formatAlpha rounds the mantissa to three significant digits');
  ok(F.formatAlpha(0.0009996) === '1.00 × 10⁻³', 'formatAlpha carries a mantissa that rounds to 10 into the exponent');
  ok(F.formatAlpha(0.00001, 2) === '1.0 × 10⁻⁵', 'formatAlpha honours a custom significant-digit count');
  ok(F.formatAlpha(0) === '—' && F.formatAlpha(NaN) === '—', 'formatAlpha returns a dash for non-positive or non-finite input');
  ok(F.toSuperscript(-12) === '⁻¹²', 'toSuperscript converts digits and the minus sign');
  ok(F.formatAnalysisType('poisson') === 'Modified Poisson Regression', 'formatAnalysisType is exported from formatters');
  ok(F.formatStudyDesign('nested-case-control') === 'Nested Case-Control', 'formatStudyDesign is exported from formatters');

  // 2. POWER_STATUS style maps
  console.log('\n2. POWER_STATUS style maps');
  ok(F.POWER_STATUS_COLORS.adequate === '#1e7a3c', 'POWER_STATUS_COLORS adequate color');
  ok(F.POWER_STATUS_COLORS.marginal === '#b7791f', 'POWER_STATUS_COLORS marginal color');
  ok(F.POWER_STATUS_COLORS.inadequate === '#b3323f', 'POWER_STATUS_COLORS inadequate color');

  ok(F.POWER_STATUS_TEXT_CLASSES.adequate === 'status-text--adequate', 'POWER_STATUS_TEXT_CLASSES adequate class');
  ok(F.POWER_STATUS_TEXT_CLASSES.marginal === 'status-text--marginal', 'POWER_STATUS_TEXT_CLASSES marginal class');
  ok(F.POWER_STATUS_TEXT_CLASSES.inadequate === 'status-text--inadequate', 'POWER_STATUS_TEXT_CLASSES inadequate class');
  ok(new Set(Object.values(F.POWER_STATUS_TEXT_CLASSES)).size === 3, 'POWER_STATUS_TEXT_CLASSES are distinct per status');

  ok(F.POWER_STATUS_BG_CLASSES.adequate === 'status-badge status-badge--adequate', 'POWER_STATUS_BG_CLASSES adequate class');
  ok(F.POWER_STATUS_BG_CLASSES.marginal === 'status-badge status-badge--marginal', 'POWER_STATUS_BG_CLASSES marginal class');
  ok(F.POWER_STATUS_BG_CLASSES.inadequate === 'status-badge status-badge--inadequate', 'POWER_STATUS_BG_CLASSES inadequate class');
  ok(Object.values(F.POWER_STATUS_BG_CLASSES).every(c => c.startsWith('status-badge ')), 'POWER_STATUS_BG_CLASSES share the base badge class');
  ok(new Set(Object.values(F.POWER_STATUS_BG_CLASSES)).size === 3, 'POWER_STATUS_BG_CLASSES are distinct per status');

  // 3. getParameterDescription — PR fixture (events=400, n=1000, …)
  console.log('\n3. getParameterDescription (PR fixture)');
  const prParams = {
    analysisType: 'cox',
    studyDesign: 'cohort',
    events: 400,
    subcohortSize: 500,
    totalCohort: 5000,
    matchingRatio: 4,
    sampleSize: 1000,
    residualSD: 1,
    numCases: 200,
    numControls: 400,
    prevalence: 0.15,
    clusterSize: 5,
    icc: 0.05,
    covariateR2: 0,
  };

  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'cox', studyDesign: 'cohort' }) === 'd = 400 events',
    'Cox cohort parameter description'
  );
  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'cox', studyDesign: 'cohort', covariateR2: 0.15 }) === 'd = 400 events, R²ₓ = 0.15',
    'Cox cohort parameter description with covariate R2'
  );

  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'cox', studyDesign: 'case-cohort' }) === 'd = 400 events, subcohort = 500/5000',
    'Cox case-cohort parameter description'
  );
  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'cox', studyDesign: 'case-cohort', covariateR2: 0.2 }) === 'd = 400 events, subcohort = 500/5000, R²ₓ = 0.20',
    'Cox case-cohort parameter description with covariate R2'
  );

  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'cox', studyDesign: 'nested-case-control' }) === 'd = 400 events, 4:1 matching',
    'Cox nested case-control parameter description'
  );
  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'cox', studyDesign: 'nested-case-control', covariateR2: 0.05 }) === 'd = 400 events, 4:1 matching, R²ₓ = 0.05',
    'Cox nested case-control parameter description with covariate R2'
  );

  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'linear', studyDesign: 'cohort' }) === 'n = 1000, sigma = 1',
    'Linear parameter description'
  );
  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'linear', studyDesign: 'cohort', covariateR2: 0.1 }) === 'n = 1000, sigma = 1, R²ₓ = 0.10',
    'Linear parameter description with covariate R2'
  );

  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'logistic', studyDesign: 'case-control' }) === '200 cases, 400 controls',
    'Logistic case-control parameter description'
  );
  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'logistic', studyDesign: 'nested-case-control' }) === '200 cases, 400 controls',
    'Logistic nested case-control parameter description'
  );

  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'logistic', studyDesign: 'cohort' }) === 'n = 1000, prevalence = 15%',
    'Logistic cohort parameter description'
  );
  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'logistic', studyDesign: 'cohort', covariateR2: 0.25 }) === 'n = 1000, prevalence = 15%, R²ₓ = 0.25',
    'Logistic cohort parameter description with covariate R2'
  );

  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'poisson', studyDesign: 'cohort' }) === 'n = 1000, prevalence = 15%',
    'Poisson parameter description'
  );
  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'poisson', studyDesign: 'cohort', covariateR2: 0.3 }) === 'n = 1000, prevalence = 15%, R²ₓ = 0.30',
    'Poisson parameter description with covariate R2'
  );

  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'gee', studyDesign: 'cohort' }) === 'n = 1000 observations, cluster size = 5, ICC = 0.05',
    'GEE parameter description'
  );
  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'gee', studyDesign: 'cohort', covariateR2: 0.12 }) === 'n = 1000 observations, cluster size = 5, ICC = 0.05, R²ₓ = 0.12',
    'GEE parameter description with covariate R2'
  );

  ok(
    F.getParameterDescription({ ...prParams, analysisType: 'unknown' }) === '',
    'Unknown analysisType returns empty string'
  );

  // 4. getParameterDescription — main fixture (events=300, n=500, …)
  console.log('\n4. getParameterDescription (main fixture)');
  const mainParams = {
    analysisType: 'cox',
    studyDesign: 'cohort',
    events: 300,
    subcohortSize: 100,
    totalCohort: 1000,
    matchingRatio: 2,
    sampleSize: 500,
    residualSD: 1.2,
    numCases: 150,
    numControls: 350,
    prevalence: 0.2,
    clusterSize: 4,
    icc: 0.05,
    covariateR2: 0,
  };

  ok(
    F.getParameterDescription(mainParams) === 'd = 300 events',
    'Cox standard cohort description'
  );
  ok(
    F.getParameterDescription({ ...mainParams, studyDesign: 'case-cohort' }) ===
      'd = 300 events, subcohort = 100/1000',
    'Cox case-cohort description'
  );
  ok(
    F.getParameterDescription({ ...mainParams, studyDesign: 'nested-case-control' }) ===
      'd = 300 events, 2:1 matching',
    'Cox nested case-control description'
  );
  ok(
    F.getParameterDescription({ ...mainParams, analysisType: 'linear' }) ===
      'n = 500, sigma = 1.2',
    'Linear description'
  );
  ok(
    F.getParameterDescription({ ...mainParams, analysisType: 'logistic', studyDesign: 'cohort' }) ===
      'n = 500, prevalence = 20%',
    'Logistic cohort description with percentage prevalence'
  );
  ok(
    F.getParameterDescription({ ...mainParams, analysisType: 'logistic', studyDesign: 'case-control' }) ===
      '150 cases, 350 controls',
    'Logistic case-control description'
  );
  ok(
    F.getParameterDescription({ ...mainParams, analysisType: 'logistic', studyDesign: 'nested-case-control' }) ===
      '150 cases, 350 controls',
    'Logistic nested case-control description'
  );
  ok(
    F.getParameterDescription({ ...mainParams, analysisType: 'poisson' }) ===
      'n = 500, prevalence = 20%',
    'Poisson description with percentage prevalence'
  );
  ok(
    F.getParameterDescription({ ...mainParams, analysisType: 'gee' }) ===
      'n = 500 observations, cluster size = 4, ICC = 0.05',
    'GEE description'
  );
  ok(
    F.getParameterDescription({ ...mainParams, analysisType: 'unknown' }) === '',
    'Unknown analysisType returns empty string (main fixture)'
  );

  console.log('\n5. Covariate R² suffix formatting (main fixture)');
  const r2Params = { ...mainParams, covariateR2: 0.15 };

  ok(
    F.getParameterDescription(r2Params) === 'd = 300 events, R²ₓ = 0.15',
    'Cox description with R² suffix'
  );
  ok(
    F.getParameterDescription({ ...r2Params, studyDesign: 'case-cohort' }) ===
      'd = 300 events, subcohort = 100/1000, R²ₓ = 0.15',
    'Cox case-cohort description with R² suffix'
  );
  ok(
    F.getParameterDescription({ ...r2Params, analysisType: 'linear' }) ===
      'n = 500, sigma = 1.2, R²ₓ = 0.15',
    'Linear description with R² suffix'
  );
  ok(
    F.getParameterDescription({ ...r2Params, analysisType: 'gee' }) ===
      'n = 500 observations, cluster size = 4, ICC = 0.05, R²ₓ = 0.15',
    'GEE description with R² suffix'
  );

  console.log('\n' + '='.repeat(70));
  console.log(`FORMATTERS RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
  console.log('='.repeat(70) + '\n');

  if (failed || fails.length) {
    process.exitCode = 1;
  }
} finally {
  try {
    fs.unlinkSync(bundlePath);
  } catch {
    /* ignore */
  }
}
