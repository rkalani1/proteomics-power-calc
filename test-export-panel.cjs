/**
 * EXPORT PANEL UI TEST
 *
 * Verifies that the ExportPanel component renders correctly.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

// ---------------------------------------------------------------------------
// Compile the real TypeScript source to a CommonJS bundle and load it.
// ---------------------------------------------------------------------------
const SRC = path.join(__dirname, 'src', 'components', 'ExportPanel.tsx');

const entry = path.join(os.tmpdir(), `export-panel-entry.${process.pid}.tsx`);
fs.writeFileSync(entry, `export { default as ExportPanel } from ${JSON.stringify(SRC)};\n`);

const out = esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(__dirname, `.export-panel.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
const E = require(bundlePath);
process.on('exit', () => {
  try { fs.unlinkSync(bundlePath); } catch { /* ignore */ }
  try { fs.unlinkSync(entry); } catch { /* ignore */ }
});

const React = require('react');
const { renderToString } = require('react-dom/server');
const { ExportPanel } = E;

// ---------------------------------------------------------------------------
// Tiny assertion framework
// ---------------------------------------------------------------------------
let total = 0, passed = 0;
const fails = [];
const ok = (cond, name, detail = '') => {
  total++;
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { fails.push({ name, detail }); console.log(`  ✗ ${name}  ${detail}`); }
};

console.log('\n' + '='.repeat(70));
console.log('EXPORT PANEL UI VERIFICATION');
console.log('='.repeat(70));

const mockProps = {
  analysisType: 'cox',
  studyDesign: 'cohort',
  scenarios: [],
  effectSize: 1.2,
  targetPower: 0.8,
  fdrQ: 0.05,
  correctionMethod: 'fdr',
  sampleSize: 1000,
  events: 400,
  prevalence: 0.1,
  residualSD: 1,
  numCases: 200,
  numControls: 400,
  subcohortSize: 500,
  totalCohort: 5000,
  matchingRatio: 4,
  clusterSize: 5,
  icc: 0.05,
  covariateR2: 0.1,
  effectSymbol: 'HR',
  effectLabel: 'Hazard Ratio',
  tableData: []
};

try {
  console.log('\n1. Initial Render');
  const html = renderToString(React.createElement(ExportPanel, mockProps));

  ok(html.includes('Export Results'), 'Renders component title');
  ok(html.includes('Download CSV'), 'Renders CSV button');
  ok(html.includes('Print / Save PDF'), 'Renders Print button');
  ok(html.includes('Copy Summary'), 'Renders Copy button');
  ok(html.includes('max-h-0'), 'Starts collapsed (max-h-0)');
  ok(!html.includes('max-h-[500px]'), 'Does not have expanded class initially');

} catch (e) {
  ok(false, 'Render test', e.message);
}

console.log('\n' + '='.repeat(70));
console.log(`EXPORT PANEL RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');

if (fails.length) {
  process.exit(1);
}
