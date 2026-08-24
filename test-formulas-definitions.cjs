const path = require('path');
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
process.exitCode = 0;

try {
  const { FORMULA_CONFIGS, coxDefinitions, logisticDefinitions, definitionsFor } = require(bundlePath);

  const analysisTypes = ['cox', 'linear', 'logistic', 'poisson', 'gee'];
  const studyDesigns = ['cohort', 'case-control', 'cross-sectional', 'case-cohort', 'nested-case-control'];

  console.log('\n' + '='.repeat(70));
  console.log('FORMULAS.TS DEFINITIONS & UTILITIES VERIFICATION');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ ${message}`);
    } else {
      failed = true;
      console.error(`  ✗ ${message}`);
    }
  }

  // Section 1: coxDefinitions specific study design tests
  console.log('1. coxDefinitions tests');

  const caseCohortCox = coxDefinitions('case-cohort');
  assert(caseCohortCox.includes('\\sigma &= \\frac{1}{\\sqrt{f \\cdot d \\cdot (1 - R^2_x)}}'), 'Cox case-cohort includes sampling fraction formula');
  assert(caseCohortCox.includes('f &='), 'Cox case-cohort includes subcohort sampling fraction variable definition');
  assert(caseCohortCox.includes('d &='), 'Cox case-cohort includes number of events variable definition');

  const nestedCcCox = coxDefinitions('nested-case-control');
  assert(nestedCcCox.includes('\\sigma &= \\sqrt{\\tfrac{m+1}{m}}'), 'Cox nested-case-control includes matching ratio factor');
  assert(nestedCcCox.includes('m &='), 'Cox nested-case-control includes controls matched per case variable definition');

  const cohortCox = coxDefinitions('cohort');
  assert(cohortCox.includes('\\sigma &= \\frac{1}{\\sqrt{d \\cdot (1 - R^2_x)}}'), 'Cox cohort includes standard HR SE formula');
  assert(!cohortCox.includes('f &='), 'Cox cohort excludes subcohort sampling fraction');
  assert(!cohortCox.includes('m &='), 'Cox cohort excludes matched controls variable');

  const caseControlCox = coxDefinitions('case-control');
  assert(caseControlCox.includes('\\sigma &= \\frac{1}{\\sqrt{d \\cdot (1 - R^2_x)}}'), 'Cox case-control uses standard HR SE formula');

  const crossSectionalCox = coxDefinitions('cross-sectional');
  assert(crossSectionalCox.includes('\\sigma &= \\frac{1}{\\sqrt{d \\cdot (1 - R^2_x)}}'), 'Cox cross-sectional uses standard HR SE formula');

  // Section 2: logisticDefinitions specific study design tests
  console.log('\n2. logisticDefinitions tests');

  const ccLogistic = logisticDefinitions('case-control');
  assert(ccLogistic.includes('n_{\\text{cases}}') && ccLogistic.includes('n_{\\text{controls}}'), 'Logistic case-control uses explicit case/control counts');

  const nestedCcLogistic = logisticDefinitions('nested-case-control');
  assert(nestedCcLogistic.includes('n_{\\text{cases}}') && nestedCcLogistic.includes('n_{\\text{controls}}'), 'Logistic nested-case-control uses explicit case/control counts');

  const cohortLogistic = logisticDefinitions('cohort');
  assert(cohortLogistic.includes('Hsieh') && cohortLogistic.includes('p \\cdot (1-p)'), 'Logistic cohort uses Hsieh formula with prevalence p');

  const crossSectionalLogistic = logisticDefinitions('cross-sectional');
  assert(crossSectionalLogistic.includes('Hsieh') && crossSectionalLogistic.includes('p \\cdot (1-p)'), 'Logistic cross-sectional uses Hsieh formula');

  const caseCohortLogistic = logisticDefinitions('case-cohort');
  assert(caseCohortLogistic.includes('Hsieh') && caseCohortLogistic.includes('p \\cdot (1-p)'), 'Logistic case-cohort uses Hsieh formula');

  // Section 3: definitionsFor integration tests across all analysisType x studyDesign combinations
  console.log('\n3. definitionsFor integration tests');

  for (const analysisType of analysisTypes) {
    for (const studyDesign of studyDesigns) {
      const result = definitionsFor(analysisType, studyDesign);

      let expected;
      if (analysisType === 'cox') {
        expected = coxDefinitions(studyDesign);
      } else if (analysisType === 'logistic') {
        expected = logisticDefinitions(studyDesign);
      } else {
        expected = FORMULA_CONFIGS[analysisType].definitions;
      }

      assert(result === expected, `definitionsFor returns correct definitions for ${analysisType} [${studyDesign}]`);
    }
  }

  console.log(`\nFORMULAS.TS DEFINITIONS RESULTS: ${passed}/${total} assertions passed`);

  if (failed) {
    console.error('\nSome assertions failed. Check output above.');
    process.exitCode = 1;
  } else {
    console.log('All formulas and definitions tests passed successfully.\n');
  }

} finally {
  try { fs.unlinkSync(bundlePath); } catch { /* ignore */ }
}
