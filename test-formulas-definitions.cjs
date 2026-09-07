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
const bundlePath = path.join(os.tmpdir(), `.def.bundle.${process.pid}.cjs`);
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

  // 1. FORMULA_CONFIGS completeness and structure (from PR #106)
  console.log('1. FORMULA_CONFIGS Structure');
  for (const type of analysisTypes) {
    const config = FORMULA_CONFIGS[type];
    assert(Boolean(config), `FORMULA_CONFIGS contains entry for '${type}'`);
    assert(typeof config.title === 'string' && config.title.length > 0, `'${type}' has non-empty title`);
    assert(typeof config.mainFormula === 'string' && config.mainFormula.length > 0, `'${type}' has non-empty mainFormula`);
    assert(typeof config.minEffectFormula === 'string' && config.minEffectFormula.length > 0, `'${type}' has non-empty minEffectFormula`);
    assert(typeof config.minEffectLabel === 'string' && config.minEffectLabel.length > 0, `'${type}' has non-empty minEffectLabel`);
    assert(typeof config.definitions === 'string', `'${type}' has definitions string`);

    if (type === 'linear' || type === 'poisson' || type === 'gee') {
      assert(config.definitions.length > 0, `'${type}' static definitions string is non-empty`);
    } else {
      assert(config.definitions === '', `'${type}' static definitions string is empty (built dynamically)`);
    }
  }

  // 2. coxDefinitions — PR coverage plus main's exact LaTeX assertions (#96)
  console.log('\n2. coxDefinitions Output');

  const caseCohortCox = coxDefinitions('case-cohort');
  assert(caseCohortCox.includes('case-cohort SE of'), 'case-cohort Cox includes case-cohort SE formula');
  assert(caseCohortCox.includes('f \\cdot d'), 'case-cohort Cox includes subcohort sampling fraction variable f');
  assert(caseCohortCox.includes('subcohort size'), 'case-cohort Cox includes subcohort size description');
  assert(caseCohortCox.includes('\\sigma &= \\frac{1}{\\sqrt{f \\cdot d \\cdot (1 - R^2_x)}}'), 'Cox case-cohort includes sampling fraction formula');
  assert(caseCohortCox.includes('f &='), 'Cox case-cohort includes subcohort sampling fraction variable definition');
  assert(caseCohortCox.includes('d &='), 'Cox case-cohort includes number of events variable definition');

  const nestedCcCox = coxDefinitions('nested-case-control');
  assert(nestedCcCox.includes('nested case-control SE of'), 'nested-case-control Cox includes nested CC SE formula');
  assert(nestedCcCox.includes(String.raw`\sqrt{\tfrac{m+1}{m}}`), 'nested-case-control Cox includes variance inflation factor (m+1)/m');
  assert(nestedCcCox.includes('controls matched per case'), 'nested-case-control Cox defines m as controls matched per case');
  assert(nestedCcCox.includes('\\sigma &= \\sqrt{\\tfrac{m+1}{m}}'), 'Cox nested-case-control includes matching ratio factor');
  assert(nestedCcCox.includes('m &='), 'Cox nested-case-control includes controls matched per case variable definition');

  for (const design of ['cohort', 'case-control', 'cross-sectional']) {
    const stdCox = coxDefinitions(design);
    assert(stdCox.includes(String.raw`standard error of } \log(\text{HR})`), `standard Cox (${design}) includes standard SE formula`);
    assert(!stdCox.includes('subcohort size'), `standard Cox (${design}) does not include subcohort parameters`);
    assert(!stdCox.includes('controls matched per case'), `standard Cox (${design}) does not include matching ratio m`);
    assert(stdCox.includes('\\sigma &= \\frac{1}{\\sqrt{d \\cdot (1 - R^2_x)}}'), `Cox ${design} includes standard HR SE formula`);
  }

  const cohortCox = coxDefinitions('cohort');
  assert(!cohortCox.includes('f &='), 'Cox cohort excludes subcohort sampling fraction');
  assert(!cohortCox.includes('m &='), 'Cox cohort excludes matched controls variable');

  for (const design of studyDesigns) {
    const def = coxDefinitions(design);
    assert(def.includes(String.raw`d &= \text{number of events}`), `coxDefinitions (${design}) defines event count d`);
    assert(def.includes('R^2_x'), `coxDefinitions (${design}) includes covariate adjustment R^2_x`);
    assert(def.includes('z_{1-\\alpha/2}'), `coxDefinitions (${design}) includes critical value z_{1-alpha/2}`);
  }

  // 3. logisticDefinitions — PR coverage plus main's design-specific checks (#96)
  console.log('\n3. logisticDefinitions Output');

  for (const design of ['case-control', 'nested-case-control']) {
    const ccLog = logisticDefinitions(design);
    assert(ccLog.includes(String.raw`case-control SE of } \log(\text{OR})`), `logistic (${design}) uses case-control SE`);
    assert(ccLog.includes(String.raw`1/n_{\text{cases}} + 1/n_{\text{controls}}`), `logistic (${design}) includes case/control cell counts`);
    assert(ccLog.includes(String.raw`n_{\text{cases}} &= \text{number of cases}`), `logistic (${design}) defines n_cases`);
    assert(!ccLog.includes("Hsieh's formula"), `logistic (${design}) does not use Hsieh's formula`);
    assert(ccLog.includes('n_{\\text{cases}}') && ccLog.includes('n_{\\text{controls}}'), `Logistic ${design} uses explicit case/control counts`);
  }

  for (const design of ['cohort', 'cross-sectional', 'case-cohort']) {
    const stdLog = logisticDefinitions(design);
    assert(stdLog.includes("Hsieh's formula with covariate adjustment"), `logistic (${design}) uses Hsieh's formula`);
    assert(stdLog.includes(String.raw`p &= \text{outcome prevalence}`), `logistic (${design}) defines outcome prevalence p`);
    assert(!stdLog.includes('n_{\\text{cases}}'), `logistic (${design}) does not include n_cases`);
    assert(stdLog.includes('Hsieh') && stdLog.includes('p \\cdot (1-p)'), `Logistic ${design} uses Hsieh formula with prevalence p`);
  }

  for (const design of studyDesigns) {
    const def = logisticDefinitions(design);
    assert(def.includes('R^2_x'), `logisticDefinitions (${design}) includes covariate adjustment R^2_x`);
    assert(def.includes(String.raw`\Phi(z)`), `logisticDefinitions (${design}) includes standard normal CDF`);
  }

  // 4. definitionsFor routing across all analysisType x studyDesign combinations
  console.log('\n4. definitionsFor Matrix Routing');

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
    console.log('All formula definition tests passed successfully.\n');
  }

} finally {
  try { fs.unlinkSync(bundlePath); } catch { /* ignore */ }
}
