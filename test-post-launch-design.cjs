/**
 * POST-LAUNCH INTERACTION AND ACCESSIBILITY TESTS
 *
 * Covers the controlled chart range, scenario focus continuity, normalization
 * feedback, explicit power status, compact method selection, and mobile setup
 * disclosure introduced by OBS-036 through OBS-042.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { JSDOM } = require('jsdom');

const componentPaths = {
  AnalysisFramework: path.join(__dirname, 'src', 'components', 'AnalysisFramework.tsx'),
  MultiScenarioPowerChart: path.join(__dirname, 'src', 'components', 'MultiScenarioPowerChart.tsx'),
  PowerAtInputCards: path.join(__dirname, 'src', 'components', 'PowerAtInputCards.tsx'),
  Header: path.join(__dirname, 'src', 'components', 'Header.tsx'),
};
const entry = path.join(os.tmpdir(), `post-launch-design-entry.${process.pid}.tsx`);
fs.writeFileSync(
  entry,
  Object.entries(componentPaths)
    .map(([name, source]) => `export { ${name === 'MultiScenarioPowerChart' ? 'default as ' : ''}${name} } from ${JSON.stringify(source)};`)
    .join('\n')
);

const out = esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'recharts'],
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(__dirname, `.post-launch-design.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
process.on('exit', () => {
  for (const file of [entry, bundlePath]) {
    try { fs.unlinkSync(file); } catch { /* ignore */ }
  }
});

const {
  AnalysisFramework,
  MultiScenarioPowerChart,
  PowerAtInputCards,
  Header,
} = require(bundlePath);

let total = 0;
let passed = 0;
const failures = [];
function ok(condition, name, detail = '') {
  total += 1;
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push({ name, detail });
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const methods = [
  { value: 'cox', label: 'Cox Proportional Hazards', description: 'Time-to-event outcomes' },
  { value: 'linear', label: 'Linear Regression', description: 'Continuous outcomes' },
  { value: 'logistic', label: 'Logistic Regression', description: 'Binary outcomes' },
  { value: 'poisson', label: 'Modified Poisson', description: 'Relative risk' },
  { value: 'gee', label: 'GEE/Mixed Effects', description: 'Clustered outcomes' },
];
const designs = {
  cox: [{ value: 'cohort', label: 'Cohort', description: 'Full cohort' }],
  linear: [{ value: 'cohort', label: 'Cohort', description: 'Full cohort' }],
  logistic: [{ value: 'cohort', label: 'Cohort', description: 'Full cohort' }],
  poisson: [{ value: 'cohort', label: 'Cohort', description: 'Full cohort' }],
  gee: [{ value: 'cohort', label: 'Cohort', description: 'Full cohort' }],
};
const colors = [
  { bg: 'bg-cyan-600', text: 'text-cyan-800', light: 'bg-cyan-50', border: 'border-cyan-200', hex: '#0891b2' },
  { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200', hex: '#3b82f6' },
  { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', border: 'border-purple-200', hex: '#8b5cf6' },
];

console.log('\nPOST-LAUNCH DESIGN VERIFICATION');

const chartHtml = renderToString(React.createElement(MultiScenarioPowerChart, {
  data: [
    { effect: 1, power_1: 0.1 },
    { effect: 1.5, power_1: 0.5 },
    { effect: 2, power_1: 0.9 },
  ],
  scenarios: [{ proteinCount: 1, alpha: 0.05, color: colors[0] }],
  targetPower: 0.8,
  inputEffect: 1.2,
  effectLabel: 'Hazard Ratio',
  effectSymbol: 'HR',
  analysisType: 'cox',
}));
const chartDom = new JSDOM(chartHtml).window.document;
const rangeControls = [...chartDom.querySelectorAll('input[type="range"]')];
ok(rangeControls.length === 2, 'chart exposes two controlled native range controls');
ok(
  rangeControls.every(control =>
    control.getAttribute('min') !== 'undefined'
    && control.getAttribute('max') !== 'undefined'
    && control.getAttribute('value') !== 'undefined'
    && control.getAttribute('aria-valuenow') !== 'undefined'
  ),
  'chart ranges expose concrete minimum, maximum, and current values'
);
ok(chartHtml.includes('Hazard Ratio range 1.00 to 2.00'), 'chart announces the affected visible range');
ok(!chartHtml.includes('recharts-brush'), 'inaccessible Recharts brush is absent');

const powerHtml = renderToString(React.createElement(PowerAtInputCards, {
  analysisType: 'cox',
  effectConfig: { symbol: 'HR' },
  effectDecimals: 2,
  effectSize: 1.2,
  scenarioResults: [
    { proteinCount: 1000, alpha: 0.00005, powerAtInput: 0.2, sampleNeeded: 300, color: colors[0] },
    { proteinCount: 1, alpha: 0.05, powerAtInput: 0.9, sampleNeeded: 80, color: colors[1] },
  ],
  targetPower: 0.8,
}));
ok(powerHtml.includes('power-status-band--danger') && powerHtml.includes('Underpowered'), 'underpowered output has explicit danger status');
ok(powerHtml.includes('60.0 percentage points needed'), 'underpowered output states its target delta');
ok(powerHtml.includes('power-status-band--adequate') && powerHtml.includes('Target attained'), 'only attaining output receives adequate status');

const headerHtml = renderToString(React.createElement(Header, {
  analysisType: 'cox',
  studyDesign: 'cohort',
  comparisonMode: true,
  proteinCounts: [1, 5000],
  proteinCount: 5000,
  ANALYSIS_TYPE_OPTIONS: methods,
  STUDY_DESIGN_OPTIONS: designs,
}));
ok(headerHtml.includes('aria-expanded="false"') && headerHtml.includes('Current setup'), 'mobile Current setup disclosure starts collapsed with explicit state');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test/' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.IS_REACT_ACT_ENVIRONMENT = true;
const { render, fireEvent, waitFor, cleanup } = require('@testing-library/react');

function FrameworkHarness() {
  const [analysisType, setAnalysisType] = React.useState('cox');
  const [comparisonMode, setComparisonMode] = React.useState(false);
  const [proteinCount, setProteinCount] = React.useState(5000);
  const [proteinCounts, setProteinCounts] = React.useState([1, 5000]);
  const [newProteinCount, setNewProteinCount] = React.useState('');
  const addProteinScenario = count => {
    if (count >= 1 && count <= 100000 && proteinCounts.length < 6 && !proteinCounts.includes(count)) {
      setProteinCounts([...proteinCounts, count].sort((a, b) => a - b));
      return true;
    }
    return false;
  };
  return React.createElement(AnalysisFramework, {
    analysisType,
    studyDesign: 'cohort',
    comparisonMode,
    proteinCount,
    proteinCounts,
    newProteinCount,
    fdrQ: 0.05,
    correctionMethod: 'fdr',
    ANALYSIS_TYPE_OPTIONS: methods,
    STUDY_DESIGN_OPTIONS: designs,
    handleAnalysisTypeChange: setAnalysisType,
    setStudyDesign: () => {},
    setComparisonMode,
    setProteinCount,
    setNewProteinCount,
    addProteinScenario,
    removeProteinCount: count => setProteinCounts(proteinCounts.filter(value => value !== count)),
    calculateEffectiveAlpha: (alpha, count) => alpha / count,
    SCENARIO_COLORS: colors,
  });
}

(async () => {
  const view = render(React.createElement(FrameworkHarness));
  const proteinInput = view.getByLabelText('Number of Proteins');
  proteinInput.focus();
  fireEvent.change(proteinInput, { target: { value: '0' } });
  // Normalization is deferred to blur so the user can clear the field and
  // retype without the value being force-rewritten on every keystroke.
  ok(proteinInput.value === '0', 'out-of-range typing is not rewritten mid-edit (deferred to blur)');
  ok(document.activeElement === proteinInput, 'editing preserves input focus');
  fireEvent.blur(proteinInput);
  ok(proteinInput.value === '1', 'zero proteins normalizes to the minimum value 1 on blur');
  ok(view.getByText('Protein count normalized to the minimum value of 1.') != null, 'normalization is visibly and politely reported');

  const methodButtons = methods.map(method => view.getByRole('button', { name: new RegExp(method.label) }));
  ok(methodButtons.length === 5, 'all five compact methods remain explicitly named');
  fireEvent.click(methodButtons[2]);
  ok(methodButtons[2].getAttribute('aria-pressed') === 'true', 'method selection updates explicit pressed state');

  fireEvent.click(view.getByRole('button', { name: 'Compare Scenarios' }));
  const quickAdd = view.getByRole('button', { name: '1,000' });
  fireEvent.click(quickAdd);
  await waitFor(() => {
    const focused = document.activeElement;
    if (!focused || focused.getAttribute('aria-label') !== 'Remove 1,000 protein scenario') {
      throw new Error('new scenario Remove control has not received focus');
    }
  });
  ok(document.activeElement.getAttribute('aria-label') === 'Remove 1,000 protein scenario', 'quick-add moves focus to the new named Remove control');
  ok(view.getByText('Scenario added. Now comparing 3 scenarios.') != null, 'quick-add announces the updated scenario count');
  cleanup();

  console.log(`\nPOST-LAUNCH DESIGN RESULTS: ${passed}/${total} passed`);
  if (failures.length) process.exit(1);
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
