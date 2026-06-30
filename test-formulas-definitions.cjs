const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

const SRC = path.join(__dirname, 'src', 'constants', 'formulas.ts');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(__dirname, `.def.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);

let failed = false;

try {
  const { FORMULA_CONFIGS, coxDefinitions, logisticDefinitions, definitionsFor } = require(bundlePath);

  const analysisTypes = ['cox', 'linear', 'logistic', 'poisson', 'gee'];
  const studyDesigns = ['cohort', 'case-control', 'cross-sectional', 'case-cohort', 'nested-case-control'];

  console.log('\n' + '='.repeat(70));
  console.log('FORMULAS.TS DEFINITIONSFOR FUNCTION VERIFICATION');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let total = 0;

  for (const analysisType of analysisTypes) {
    for (const studyDesign of studyDesigns) {
      total++;
      const result = definitionsFor(analysisType, studyDesign);

      let expected;
      if (analysisType === 'cox') {
        expected = coxDefinitions(studyDesign);
      } else if (analysisType === 'logistic') {
        expected = logisticDefinitions(studyDesign);
      } else {
        expected = FORMULA_CONFIGS[analysisType].definitions;
      }

      if (result === expected) {
        passed++;
      } else {
        console.error(`  ✗ Failed for analysisType=${analysisType}, studyDesign=${studyDesign}`);
        console.error(`    Expected: ${expected}`);
        console.error(`    Received: ${result}`);
        failed = true;
      }
    }
  }

  console.log(`\nDEFINITIONSFOR RESULTS: ${passed}/${total} assertions passed`);

  if (failed) {
    console.error('\nSome assertions failed. Check output above.');
    process.exit(1);
  } else {
    console.log('\nAll tests passed successfully.\n');
  }

} finally {
  try { fs.unlinkSync(bundlePath); } catch { /* ignore */ }
}
