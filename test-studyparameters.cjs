/**
 * STUDY PARAMETERS UI TEST
 */

const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost'
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
// Polyfill requestAnimationFrame for React
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = id => clearTimeout(id);

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

// Compile the real TypeScript source to a CommonJS bundle and load it.
const SRC = path.join(__dirname, 'src', 'components', 'StudyParameters.tsx');
const entry = path.join(os.tmpdir(), `study-params-entry.${process.pid}.tsx`);
fs.writeFileSync(entry, `export { StudyParameters } from ${JSON.stringify(SRC)};\n`);

const out = esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react-dom/client', 'react-dom/test-utils', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  write: false,
  logLevel: 'silent',
});

const bundlePath = path.join(__dirname, `.study-params.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
const E = require(bundlePath);

process.on('exit', () => {
  try { fs.unlinkSync(bundlePath); } catch { /* ignore */ }
  try { fs.unlinkSync(entry); } catch { /* ignore */ }
});

const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');
const { StudyParameters } = E;

let total = 0, passed = 0;
const fails = [];
const ok = (cond, name, detail = '') => {
  total++;
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { fails.push({ name, detail }); console.log(`  ✗ ${name}  ${detail}`); }
};

console.log('\n' + '='.repeat(70));
console.log('STUDY PARAMETERS UI VERIFICATION');
console.log('='.repeat(70));

const baseProps = {
  analysisType: 'cox',
  studyDesign: 'cohort',
  sampleSize: 1000,
  setSampleSize: () => {},
  events: 400,
  setEvents: () => {},
  subcohortSize: 500,
  setSubcohortSize: () => {},
  totalCohort: 5000,
  setTotalCohort: () => {},
  matchingRatio: 4,
  setMatchingRatio: () => {},
  residualSD: 1,
  setResidualSD: () => {},
  prevalence: 0.1,
  setPrevalence: () => {},
  numCases: 200,
  setNumCases: () => {},
  numControls: 400,
  setNumControls: () => {},
  clusterSize: 5,
  setClusterSize: () => {},
  icc: 0.05,
  setICC: () => {},
  covariateR2: 0.1,
  setCovariateR2: () => {},
  correctionMethod: 'fdr',
  setCorrectionMethod: () => {},
  fdrQ: 0.05,
  setFdrQ: () => {},
  targetPower: 0.8,
  setTargetPower: () => {},
  effectSize: 1.2,
  setEffectSize: () => {},
  effectConfig: {
    label: 'Hazard Ratio',
    symbol: 'HR',
    min: 1.1,
    max: 3.0,
    default: 1.5,
    step: 0.01,
    inputLabel: 'Expected Hazard Ratio',
    inputDescription: 'Target effect size'
  },
  effectDecimals: 2,
};

try {
  console.log('\n1. Initial Render (Cox + Cohort)');
  const { unmount, container } = render(React.createElement(StudyParameters, baseProps));

  ok(container.innerHTML.includes('Study Parameters'), 'Renders component title');
  ok(container.innerHTML.includes('Sample Size (n)'), 'Renders Sample Size slider');
  ok(container.innerHTML.includes('Number of Events (d)'), 'Renders Events slider');
  ok(container.innerHTML.includes('Covariate R²'), 'Renders Covariate R2 slider');
  ok(container.innerHTML.includes('Target Power'), 'Renders Target Power slider');
  ok(container.innerHTML.includes('Expected Hazard Ratio'), 'Renders Effect Size slider');

  // Verify Correction Method Toggle
  ok(container.innerHTML.includes('FDR (BH)'), 'Renders FDR button');
  ok(container.innerHTML.includes('Bonferroni'), 'Renders Bonferroni button');
  ok(container.innerHTML.includes('FDR Threshold (q)'), 'Renders FDR threshold label');

  unmount();

  console.log('\n2. Study Design: Case-Cohort');
  const caseCohortProps = { ...baseProps, studyDesign: 'case-cohort' };
  const ccRender = render(React.createElement(StudyParameters, caseCohortProps));

  ok(ccRender.container.innerHTML.includes('Subcohort Size'), 'Renders Subcohort Size');
  ok(ccRender.container.innerHTML.includes('Total Cohort Size'), 'Renders Total Cohort Size');
  ccRender.unmount();

  console.log('\n3. Study Design: Nested Case-Control');
  const nccProps = { ...baseProps, studyDesign: 'nested-case-control' };
  const nccRender = render(React.createElement(StudyParameters, nccProps));

  ok(nccRender.container.innerHTML.includes('Matching Ratio'), 'Renders Matching Ratio');
  ok(nccRender.container.innerHTML.includes('Number of Cases'), 'Renders Number of Cases');
  ok(nccRender.container.innerHTML.includes('Number of Controls'), 'Renders Number of Controls');
  nccRender.unmount();

  console.log('\n4. Analysis Type: Linear');
  const linearProps = { ...baseProps, analysisType: 'linear' };
  const linearRender = render(React.createElement(StudyParameters, linearProps));

  ok(linearRender.container.innerHTML.includes('Residual SD'), 'Renders Residual SD');
  linearRender.unmount();

  console.log('\n5. Analysis Type: Logistic / Poisson');
  const logProps = { ...baseProps, analysisType: 'logistic' };
  const logRender = render(React.createElement(StudyParameters, logProps));

  ok(logRender.container.innerHTML.includes('Outcome Prevalence'), 'Renders Outcome Prevalence');
  logRender.unmount();

  console.log('\n6. Analysis Type: GEE');
  const geeProps = { ...baseProps, analysisType: 'gee' };
  const geeRender = render(React.createElement(StudyParameters, geeProps));

  ok(geeRender.container.innerHTML.includes('Cluster Size (m)'), 'Renders Cluster Size');
  ok(geeRender.container.innerHTML.includes('Intraclass Correlation (ICC)'), 'Renders ICC');
  geeRender.unmount();

  console.log('\n7. Callbacks Verification');
  let fdrCalled = false;
  const cbProps = {
    ...baseProps,
    setCorrectionMethod: (val) => { fdrCalled = val; }
  };
  const cbRender = render(React.createElement(StudyParameters, cbProps));

  const bonfButton = screen.getByText('Bonferroni');
  fireEvent.click(bonfButton);
  ok(fdrCalled === 'bonferroni', 'Clicking Bonferroni triggers setCorrectionMethod');
  cbRender.unmount();

} catch (e) {
  ok(false, 'Render test', e.message);
}

console.log('\n' + '='.repeat(70));
console.log(`STUDY PARAMETERS UI RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');

if (fails.length) {
  process.exit(1);
}
