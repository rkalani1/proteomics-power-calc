/**
 * FORMATTERS TEST
 *
 * Verifies that utility functions and constants in src/utils/formatters.ts
 * produce correct formatting, thresholds, and descriptions.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

// Compile the real TypeScript source to a CommonJS bundle and load it.
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

let total = 0;
let passed = 0;
const fails = [];

const ok = (cond, name, detail = '') => {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    fails.push({ name, detail });
    console.log(`  ✗ ${name}  ${detail}`);
  }
};

try {
  const F = require(bundlePath);

  console.log('\n' + '='.repeat(70));
  console.log('FORMATTERS VERIFICATION');
  console.log('='.repeat(70));

  // 1. getPowerStatus Tests
  console.log('\n1. getPowerStatus');
  ok(F.getPowerStatus(0.85, 0.8) === 'adequate', 'Returns adequate when power >= targetPower');
  ok(F.getPowerStatus(0.8, 0.8) === 'adequate', 'Returns adequate when power equals targetPower exactly');
  ok(F.getPowerStatus(0.6, 0.8) === 'marginal', 'Returns marginal when power < targetPower and >= default marginalThreshold (0.5)');
  ok(F.getPowerStatus(0.5, 0.8) === 'marginal', 'Returns marginal when power equals default marginalThreshold (0.5) exactly');
  ok(F.getPowerStatus(0.49, 0.8) === 'inadequate', 'Returns inadequate when power < default marginalThreshold (0.5)');
  ok(F.getPowerStatus(0.0, 0.8) === 'inadequate', 'Returns inadequate when power is 0');

  // Custom marginalThreshold
  ok(F.getPowerStatus(0.65, 0.8, 0.7) === 'inadequate', 'Honors custom marginalThreshold (0.65 < 0.7 is inadequate)');
  ok(F.getPowerStatus(0.7, 0.8, 0.7) === 'marginal', 'Honors custom marginalThreshold (0.7 >= 0.7 is marginal)');

  // 2. Exported Constants Verification
  console.log('\n2. Exported Power Status Constants');
  ok(F.POWER_STATUS_COLORS.adequate === '#10b981', 'POWER_STATUS_COLORS has adequate color');
  ok(F.POWER_STATUS_COLORS.marginal === '#f59e0b', 'POWER_STATUS_COLORS has marginal color');
  ok(F.POWER_STATUS_COLORS.inadequate === '#ef4444', 'POWER_STATUS_COLORS has inadequate color');

  ok(F.POWER_STATUS_TEXT_CLASSES.adequate.includes('text-green-600'), 'POWER_STATUS_TEXT_CLASSES adequate class');
  ok(F.POWER_STATUS_TEXT_CLASSES.marginal.includes('text-amber-600'), 'POWER_STATUS_TEXT_CLASSES marginal class');
  ok(F.POWER_STATUS_TEXT_CLASSES.inadequate.includes('text-red-600'), 'POWER_STATUS_TEXT_CLASSES inadequate class');

  ok(F.POWER_STATUS_BG_CLASSES.adequate.includes('bg-green-100'), 'POWER_STATUS_BG_CLASSES adequate bg');
  ok(F.POWER_STATUS_BG_CLASSES.marginal.includes('bg-amber-100'), 'POWER_STATUS_BG_CLASSES marginal bg');
  ok(F.POWER_STATUS_BG_CLASSES.inadequate.includes('bg-red-100'), 'POWER_STATUS_BG_CLASSES inadequate bg');

  // 3. getParameterDescription Tests
  console.log('\n3. getParameterDescription');

  const baseParams = {
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

  // Cox - Standard Cohort
  ok(
    F.getParameterDescription(baseParams) === 'd = 300 events',
    'Cox standard cohort description'
  );

  // Cox - Case-Cohort
  ok(
    F.getParameterDescription({ ...baseParams, studyDesign: 'case-cohort' }) ===
      'd = 300 events, subcohort = 100/1000',
    'Cox case-cohort description'
  );

  // Cox - Nested Case-Control
  ok(
    F.getParameterDescription({ ...baseParams, studyDesign: 'nested-case-control' }) ===
      'd = 300 events, 2:1 matching',
    'Cox nested case-control description'
  );

  // Linear
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'linear' }) ===
      'n = 500, sigma = 1.2',
    'Linear description'
  );

  // Logistic - Standard Cohort
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'logistic', studyDesign: 'cohort' }) ===
      'n = 500, prevalence = 20%',
    'Logistic cohort description with percentage prevalence'
  );

  // Logistic - Case-Control
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'logistic', studyDesign: 'case-control' }) ===
      '150 cases, 350 controls',
    'Logistic case-control description'
  );

  // Logistic - Nested Case-Control
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'logistic', studyDesign: 'nested-case-control' }) ===
      '150 cases, 350 controls',
    'Logistic nested case-control description'
  );

  // Poisson
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'poisson' }) ===
      'n = 500, prevalence = 20%',
    'Poisson description with percentage prevalence'
  );

  // GEE
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'gee' }) ===
      'n = 500 observations, cluster size = 4, ICC = 0.05',
    'GEE description'
  );

  // Default / Unknown analysisType
  ok(
    F.getParameterDescription({ ...baseParams, analysisType: 'unknown' }) === '',
    'Unknown analysisType returns empty string'
  );

  // Covariate R2 Suffix Tests (covariateR2 > 0)
  console.log('\n4. Covariate R² Suffix formatting');
  const r2Params = { ...baseParams, covariateR2: 0.15 };

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

  if (fails.length) {
    process.exit(1);
  }
} finally {
  try {
    fs.unlinkSync(bundlePath);
  } catch {
    /* ignore */
  }
}
