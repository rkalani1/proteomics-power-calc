/**
 * ANALYSIS FRAMEWORK UI TEST
 *
 * Verifies that the AnalysisFramework component renders correctly.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

// ---------------------------------------------------------------------------
// Compile the real TypeScript source to a CommonJS bundle and load it.
// ---------------------------------------------------------------------------
const SRC = path.join(__dirname, 'src', 'components', 'AnalysisFramework.tsx');

const entry = path.join(os.tmpdir(), `analysis-framework-entry.${process.pid}.tsx`);
fs.writeFileSync(entry, `export { AnalysisFramework } from ${JSON.stringify(SRC)};\n`);

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
const bundlePath = path.join(__dirname, `.analysis-framework.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
const E = require(bundlePath);
process.on('exit', () => {
  try { fs.unlinkSync(bundlePath); } catch { /* ignore */ }
  try { fs.unlinkSync(entry); } catch { /* ignore */ }
});

const React = require('react');
const { renderToString } = require('react-dom/server');
const { AnalysisFramework } = E;

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
console.log('ANALYSIS FRAMEWORK UI VERIFICATION');
console.log('='.repeat(70));

const ANALYSIS_TYPE_OPTIONS = [
  { value: 'cox', label: 'Cox Proportional Hazards', description: 'Time-to-event' },
  { value: 'logistic', label: 'Logistic Regression', description: 'Binary outcome' }
];

const STUDY_DESIGN_OPTIONS = {
  cox: [{ value: 'cohort', label: 'Cohort', description: 'Full cohort' }],
  logistic: [{ value: 'case-control', label: 'Case-Control', description: 'Case-control' }]
};

const SCENARIO_COLORS = [
  { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200', hex: '#10b981' },
];

const mockProps = {
  analysisType: 'cox',
  studyDesign: 'cohort',
  comparisonMode: false,
  proteinCount: 5000,
  proteinCounts: [5000],
  newProteinCount: '',
  fdrQ: 0.05,
  correctionMethod: 'fdr',
  ANALYSIS_TYPE_OPTIONS,
  STUDY_DESIGN_OPTIONS,
  handleAnalysisTypeChange: () => {},
  setStudyDesign: () => {},
  setComparisonMode: () => {},
  setProteinCount: () => {},
  setNewProteinCount: () => {},
  addProteinScenario: () => true,
  removeProteinCount: () => {},
  calculateEffectiveAlpha: (alpha, m, method) => 0.05 / 5000,
  SCENARIO_COLORS,
};

try {
  console.log('\n1. Initial Render (Single Mode)');
  const html = renderToString(React.createElement(AnalysisFramework, mockProps));

  ok(html.includes('Analysis Framework'), 'Renders component title');
  ok(html.includes('Cox Proportional Hazards'), 'Renders analysis type options');
  ok(html.includes('Logistic Regression'), 'Renders alternative analysis types');
  ok(html.includes('Number of Proteins'), 'Renders Number of Proteins input label');
  ok(html.includes('Compare Scenarios'), 'Renders Compare Scenarios button text');
  ok(html.includes('5000'), 'Renders current proteinCount in presets');

  console.log('\n2. Render (Comparison Mode)');
  const comparisonProps = { ...mockProps, comparisonMode: true, proteinCounts: [1000, 5000] };
  const htmlComparison = renderToString(React.createElement(AnalysisFramework, comparisonProps));

  ok(htmlComparison.includes('Comparison On'), 'Renders Comparison On button text');
  ok(htmlComparison.includes('1,000 protein') || htmlComparison.includes('1,000<!-- --> protein'), 'Renders 1000 scenario');
  ok(htmlComparison.includes('5,000 protein') || htmlComparison.includes('5,000<!-- --> protein'), 'Renders 5000 scenario');
  ok(htmlComparison.includes('Add'), 'Renders Add button');
  ok(htmlComparison.includes('Quick add:'), 'Renders Quick add section');

} catch (e) {
  ok(false, 'Render test', e.message);
}

console.log('\n' + '='.repeat(70));
console.log(`ANALYSIS FRAMEWORK RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');

if (fails.length) {
  process.exit(1);
}
