/**
 * RUNTIME SMOKE TEST
 *
 * Server-renders the real <App/> to confirm the entire component tree mounts
 * without throwing after the refactors (prop wiring, hoisted Slider/tooltips,
 * memoized callbacks). React/ReactDOM are kept external so a single React
 * instance is used (otherwise hooks would error). This catches runtime render
 * errors that type-checking and the math suites cannot.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

const appPath = JSON.stringify(path.join(__dirname, 'src', 'App.tsx'));
const chartPath = JSON.stringify(path.join(__dirname, 'src', 'components', 'PowerByProteinsChart.tsx'));
const advizPath = JSON.stringify(path.join(__dirname, 'src', 'components', 'AdvancedVisualizations.tsx'));
const sensitivityPath = JSON.stringify(path.join(__dirname, 'src', 'utils', 'sensitivity.ts'));
const entry = path.join(os.tmpdir(), `app-entry.${process.pid}.tsx`);
fs.writeFileSync(entry,
  `export { default as App } from ${appPath};\n` +
  `export { default as PowerByProteinsChart } from ${chartPath};\n` +
  `export { default as AdvancedVisualizations } from ${advizPath};\n` +
  `export { normalizeSensitivityVariable } from ${sensitivityPath};\n`);

const out = esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  loader: { '.css': 'empty', '.svg': 'text' },
  external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  write: false,
  logLevel: 'silent',
});

// Written inside the project dir so Node resolves the external react/react-dom
// from the local node_modules (a single shared instance, required for hooks).
const bundlePath = path.join(__dirname, `.smoke-app.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
process.on('exit', () => {
  for (const p of [entry, bundlePath]) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
});

const React = require('react');
const { renderToString } = require('react-dom/server');
const { App, PowerByProteinsChart, AdvancedVisualizations, normalizeSensitivityVariable } = require(bundlePath);

let failed = false;
try {
  const html = renderToString(React.createElement(App));
  const checks = [
    ['renders the app title', html.includes('Proteomics Power Calculator')],
    ['renders the analysis framework section', html.includes('Analysis Framework')],
    ['renders study parameters', html.includes('Study Parameters')],
    ['renders a results section', /Minimum Detectable/.test(html)],
    ['produced non-trivial markup', html.length > 5000],
  ];
  for (const [name, cond] of checks) {
    console.log(`  ${cond ? '✓' : '✗'} ${name}`);
    if (!cond) failed = true;
  }
} catch (err) {
  console.error('  ✗ App threw during server render:');
  console.error(err && err.stack ? err.stack : err);
  failed = true;
}

const sensitivityVariableChecks = [
  ['cox keeps events', normalizeSensitivityVariable('cox', 'events') === 'events'],
  ['cox normalizes sampleSize to events', normalizeSensitivityVariable('cox', 'sampleSize') === 'events'],
  ['logistic normalizes events to sampleSize', normalizeSensitivityVariable('logistic', 'events') === 'sampleSize'],
  ['gee normalizes events to sampleSize', normalizeSensitivityVariable('gee', 'events') === 'sampleSize'],
  ['non-Cox keeps effectSize', normalizeSensitivityVariable('linear', 'effectSize') === 'effectSize'],
  ['non-Cox keeps proteinCount', normalizeSensitivityVariable('poisson', 'proteinCount') === 'proteinCount'],
];
for (const [name, cond] of sensitivityVariableChecks) {
  console.log(`  ${cond ? '✓' : '✗'} SensitivityAnalysis ${name}`);
  if (!cond) failed = true;
}

// Render the most-refactored component for every analysis type. Previously the
// GEE branch returned 0 for every cell; now it must render real values via the
// injected calculatePower. We assert it renders and is not uniformly 0%.
const symbols = { cox: 'HR', linear: 'β', logistic: 'OR', poisson: 'RR', gee: 'β' };
for (const analysisType of ['cox', 'linear', 'logistic', 'poisson', 'gee']) {
  try {
    const html = renderToString(React.createElement(PowerByProteinsChart, {
      events: 70, fdrQ: 0.05, targetPower: 0.8, analysisType, studyDesign: 'cohort',
      sampleSize: 1000, residualSD: 1, prevalence: 0.1, numCases: 200, numControls: 400,
      subcohortSize: 500, totalCohort: 5000, clusterSize: 5, icc: 0.05,
      effectSymbol: symbols[analysisType], correctionMethod: 'fdr',
      calculatePower: () => 0.73, // representative non-zero power
    }));
    // SSR inserts a comment node between {percentage} and the literal '%', so the
    // injected power (0.73 -> "73") is not contiguous with '%'. Check for "73".
    const renders = html.includes('Power Sensitivity') && html.includes('>73<');
    // GEE/linear are additive β models: effect-size headers must be β values
    // (e.g. 0.05), not the ratio values (e.g. 1.1) used by Cox/logistic/Poisson.
    const isBeta = analysisType === 'gee' || analysisType === 'linear';
    const effectHeadersOk = isBeta
      ? html.includes('0.05') && !html.includes('=1.1')
      : html.includes('1.1');
    console.log(`  ${renders ? '✓' : '✗'} PowerByProteinsChart renders for ${analysisType} (injected non-zero power shown)`);
    console.log(`  ${effectHeadersOk ? '✓' : '✗'} ${analysisType} shows ${isBeta ? 'β' : 'ratio'} effect headers`);
    if (!renders || !effectHeadersOk) failed = true;
  } catch (err) {
    console.error(`  ✗ PowerByProteinsChart threw for ${analysisType}:`);
    console.error(err && err.stack ? err.stack : err);
    failed = true;
  }
}

// Render the tab-hidden Advanced Visualizations (power grid + forest plot) for
// every model. The power grid is a plain HTML table (fully server-rendered), so
// we can confirm GEE/linear use additive β effect rows (0.10–0.50) while the
// ratio models use multiplicative rows (1.20–2.50).
const advizScenario = (analysisType) => ([{
  proteinCount: 5000, alpha: 1e-5,
  minDetectableEffect: analysisType === 'linear' || analysisType === 'gee' ? 0.2 : 1.5,
  color: { bg: '', text: '', light: '', border: '', hex: '#10b981' },
}]);
for (const analysisType of ['cox', 'linear', 'logistic', 'poisson', 'gee']) {
  const isBeta = analysisType === 'gee' || analysisType === 'linear';
  for (const initialViz of ['power-contour', 'forest-plot']) {
    try {
      const html = renderToString(React.createElement(AdvancedVisualizations, {
        analysisType, targetPower: 0.8, scenarios: advizScenario(analysisType),
        effectSymbol: symbols[analysisType], effectLabel: 'Effect',
        currentEffectSize: isBeta ? 0.2 : 1.5, currentEvents: 200, currentSampleSize: 1000,
        calculateRequiredEvents: () => 300, calculateRequiredSampleSize: () => 1500,
        calculatePower: () => 0.8, initialViz,
      }));
      let ok = html.length > 200;
      if (initialViz === 'power-contour') {
        // GEE/linear must show β effect rows (e.g. 0.10) not ratio rows (2.50).
        ok = ok && (isBeta ? (html.includes('0.10') && !html.includes('2.50'))
                           : (html.includes('2.50') && !html.includes('0.10')));
      }
      console.log(`  ${ok ? '✓' : '✗'} AdvancedVisualizations ${initialViz} renders for ${analysisType}`);
      if (!ok) failed = true;
    } catch (err) {
      console.error(`  ✗ AdvancedVisualizations ${initialViz} threw for ${analysisType}:`);
      console.error(err && err.stack ? err.stack : err);
      failed = true;
    }
  }
}

console.log(failed ? '\nSMOKE TEST FAILED\n' : '\nSMOKE TEST PASSED — <App/> renders without errors.\n');
process.exit(failed ? 1 : 0);
