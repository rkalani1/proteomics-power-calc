/**
 * EQUATION RENDERING VERIFICATION
 *
 * Compiles the real MathEquation component module and renders every displayed
 * equation — the power formula, the minimum-effect formula, and the variable
 * definitions for every model AND every study-design variant — through KaTeX
 * with throwOnError enabled. A malformed equation (which would render as broken
 * markup in a grant/paper figure) therefore fails the build.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');
const katex = require('katex');

const SRC = path.join(__dirname, 'src', 'constants', 'formulas.ts');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(__dirname, `.eq.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
process.on('exit', () => { try { fs.unlinkSync(bundlePath); } catch { /* ignore */ } });

const { FORMULA_CONFIGS, coxDefinitions, logisticDefinitions } = require(bundlePath);

let total = 0, passed = 0;
const fails = [];
const render = (latex, name) => {
  total++;
  try {
    const html = katex.renderToString(latex, { displayMode: true, throwOnError: true, strict: false, trust: false });
    if (typeof html === 'string' && html.length > 0) { passed++; console.log(`  ✓ ${name}`); }
    else { fails.push({ name, err: 'empty render' }); console.log(`  ✗ ${name}: empty render`); }
  } catch (e) {
    fails.push({ name, err: e.message });
    console.log(`  ✗ ${name}: ${e.message}`);
  }
};

console.log('\n' + '='.repeat(70));
console.log('EQUATION RENDERING VERIFICATION (KaTeX, throwOnError)');
console.log('='.repeat(70) + '\n');

const designs = ['cohort', 'case-control', 'cross-sectional', 'case-cohort', 'nested-case-control'];

for (const [type, cfg] of Object.entries(FORMULA_CONFIGS)) {
  render(cfg.mainFormula, `${type}: power formula`);
  render(cfg.minEffectFormula, `${type}: minimum-effect formula`);
  if (type !== 'cox' && type !== 'logistic') {
    render(cfg.definitions, `${type}: definitions`);
  }
}

for (const d of designs) {
  render(coxDefinitions(d), `cox definitions [${d}]`);
  render(logisticDefinitions(d), `logistic definitions [${d}]`);
}

console.log('\n' + '='.repeat(70));
console.log(`EQUATION RESULTS: ${passed}/${total} rendered, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');
if (fails.length) {
  fails.forEach((f) => console.log(`  ✗ ${f.name}: ${f.err}`));
  process.exit(1);
}
console.log('All displayed equations render as valid KaTeX.\n');
