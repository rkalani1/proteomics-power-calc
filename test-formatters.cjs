/**
 * FORMATTERS UTILITIES VERIFICATION TEST
 *
 * Verifies that the UI formatters and status helper functions in src/utils/formatters.ts
 * produce predictable, accurate outputs across all analysis types, study designs, and edge cases.
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

try {
  const F = require(bundlePath);

  // ---------------------------------------------------------------------------
  // Assertion framework
  // ---------------------------------------------------------------------------
  let total = 0, passed = 0;
  const fails = [];
  const ok = (cond, name, detail = '') => {
    total++;
    if (cond) { passed++; console.log(`  ✓ ${name}`); }
    else { fails.push({ name, detail }); console.log(`  ✗ ${name}  ${detail}`); failed = true; }
  };

  console.log('\n' + '='.repeat(70));
  console.log('FORMATTERS UTILITIES VERIFICATION');
  console.log('='.repeat(70));

  // 1. getPowerStatus
  console.log('\n1. getPowerStatus');
  ok(F.getPowerStatus(0.85, 0.8) === 'adequate', 'Returns adequate when power > targetPower');
  ok(F.getPowerStatus(0.80, 0.8) === 'adequate', 'Returns adequate when power === targetPower (boundary)');
  ok(F.getPowerStatus(0.79, 0.8) === 'marginal', 'Returns marginal when power < targetPower but >= default marginalThreshold (0.5)');
  ok(F.getPowerStatus(0.50, 0.8) === 'marginal', 'Returns marginal when power === default marginalThreshold (0.5)');
  ok(F.getPowerStatus(0.49, 0.8) === 'inadequate', 'Returns inadequate when power < default marginalThreshold (0.5)');
  ok(F.getPowerStatus(0.10, 0.8) === 'inadequate', 'Returns inadequate for low power');

  // getPowerStatus with custom marginalThreshold
  ok(F.getPowerStatus(0.65, 0.8, 0.6) === 'marginal', 'Returns marginal when power >= custom marginalThreshold (0.6)');
  ok(F.getPowerStatus(0.55, 0.8, 0.6) === 'inadequate', 'Returns inadequate when power < custom marginalThreshold (0.6)');

  // 2. POWER_STATUS style maps
  console.log('\n2. POWER_STATUS style maps');
  ok(F.POWER_STATUS_COLORS.adequate === '#10b981', 'POWER_STATUS_COLORS adequate color');
  ok(F.POWER_STATUS_COLORS.marginal === '#f59e0b', 'POWER_STATUS_COLORS marginal color');
  ok(F.POWER_STATUS_COLORS.inadequate === '#ef4444', 'POWER_STATUS_COLORS inadequate color');

  ok(F.POWER_STATUS_TEXT_CLASSES.adequate === 'text-green-600 font-semibold', 'POWER_STATUS_TEXT_CLASSES adequate class');
  ok(F.POWER_STATUS_TEXT_CLASSES.marginal === 'text-amber-600', 'POWER_STATUS_TEXT_CLASSES marginal class');
  ok(F.POWER_STATUS_TEXT_CLASSES.inadequate === 'text-red-600', 'POWER_STATUS_TEXT_CLASSES inadequate class');

  ok(F.POWER_STATUS_BG_CLASSES.adequate === 'bg-green-100 text-green-800', 'POWER_STATUS_BG_CLASSES adequate class');
  ok(F.POWER_STATUS_BG_CLASSES.marginal === 'bg-amber-100 text-amber-800', 'POWER_STATUS_BG_CLASSES marginal class');
  ok(F.POWER_STATUS_BG_CLASSES.inadequate === 'bg-red-100 text-red-800', 'POWER_STATUS_BG_CLASSES inadequate class');

  // 3. getParameterDescription
  console.log('\n3. getParameterDescription');
  const baseParams = {
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

  // Cox Cohort
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'cox', studyDesign: 'cohort' }) === 'd = 400 events',
    'Cox cohort parameter description'
  );
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'cox', studyDesign: 'cohort', covariateR2: 0.15 }) === 'd = 400 events, R²ₓ = 0.15',
    'Cox cohort parameter description with covariate R2'
  );

  // Cox Case-Cohort
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'cox', studyDesign: 'case-cohort' }) === 'd = 400 events, subcohort = 500/5000',
    'Cox case-cohort parameter description'
  );
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'cox', studyDesign: 'case-cohort', covariateR2: 0.2 }) === 'd = 400 events, subcohort = 500/5000, R²ₓ = 0.20',
    'Cox case-cohort parameter description with covariate R2'
  );

  // Cox Nested Case-Control
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'cox', studyDesign: 'nested-case-control' }) === 'd = 400 events, 4:1 matching',
    'Cox nested case-control parameter description'
  );
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'cox', studyDesign: 'nested-case-control', covariateR2: 0.05 }) === 'd = 400 events, 4:1 matching, R²ₓ = 0.05',
    'Cox nested case-control parameter description with covariate R2'
  );

  // Linear Regression
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'linear', studyDesign: 'cohort' }) === 'n = 1000, sigma = 1',
    'Linear parameter description'
  );
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'linear', studyDesign: 'cohort', covariateR2: 0.1 }) === 'n = 1000, sigma = 1, R²ₓ = 0.10',
    'Linear parameter description with covariate R2'
  );

  // Logistic Case-Control
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'logistic', studyDesign: 'case-control' }) === '200 cases, 400 controls',
    'Logistic case-control parameter description'
  );
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'logistic', studyDesign: 'nested-case-control' }) === '200 cases, 400 controls',
    'Logistic nested case-control parameter description'
  );

  // Logistic Cohort
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'logistic', studyDesign: 'cohort' }) === 'n = 1000, prevalence = 15%',
    'Logistic cohort parameter description'
  );
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'logistic', studyDesign: 'cohort', covariateR2: 0.25 }) === 'n = 1000, prevalence = 15%, R²ₓ = 0.25',
    'Logistic cohort parameter description with covariate R2'
  );

  // Poisson Regression
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'poisson', studyDesign: 'cohort' }) === 'n = 1000, prevalence = 15%',
    'Poisson parameter description'
  );
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'poisson', studyDesign: 'cohort', covariateR2: 0.3 }) === 'n = 1000, prevalence = 15%, R²ₓ = 0.30',
    'Poisson parameter description with covariate R2'
  );

  // GEE / Mixed Effects
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'gee', studyDesign: 'cohort' }) === 'n = 1000 observations, cluster size = 5, ICC = 0.05',
    'GEE parameter description'
  );
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'gee', studyDesign: 'cohort', covariateR2: 0.12 }) === 'n = 1000 observations, cluster size = 5, ICC = 0.05, R²ₓ = 0.12',
    'GEE parameter description with covariate R2'
  );

  // Default / Unknown analysisType
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'unknown' }) === '',
    'Unknown analysisType returns empty string'
  );

  console.log('\n' + '='.repeat(70));
  console.log(`FORMATTERS RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
  console.log('='.repeat(70) + '\n');

  if (failed) {
    process.exitCode = 1;
  }
} finally {
  try { fs.unlinkSync(bundlePath); } catch { /* ignore */ }
}
