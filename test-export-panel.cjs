/**
 * EXPORT PANEL TEST
 *
 * Verifies that the ExportPanel component handles error paths correctly,
 * specifically the clipboard copy functionality.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

// ---------------------------------------------------------------------------
// Compile the real TypeScript component to a CommonJS bundle and load it.
// ---------------------------------------------------------------------------
const entry = path.join(os.tmpdir(), `export-panel-entry.${process.pid}.tsx`);
fs.writeFileSync(entry,
  `export { default as ExportPanel } from ${JSON.stringify(path.join(__dirname, 'src', 'components', 'ExportPanel.tsx'))};\n`
);

const out = esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  loader: { '.css': 'empty', '.svg': 'text' },
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  write: false,
  logLevel: 'silent',
});

const bundlePath = path.join(__dirname, `.test-export-panel.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
process.on('exit', () => {
  for (const p of [entry, bundlePath]) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
});

const React = require('react');

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
console.log('EXPORT PANEL VERIFICATION');
console.log('='.repeat(70));

// Setup global mocks
global.navigator = {
  clipboard: {
    writeText: async () => { throw new Error('Clipboard error simulated for testing'); }
  }
};

let alertCalled = false;
global.alert = () => { alertCalled = true; };

let consoleErrorCalled = false;
const origConsoleError = console.error;
console.error = (...args) => { consoleErrorCalled = true; };

// Setup React mock to capture setState for isExporting
let setExportingStates = [];
React.useState = (initial) => {
  let state = initial;
  const setState = (newState) => {
    state = newState;
    if (typeof newState === 'boolean') {
      setExportingStates.push(newState);
    }
  };
  return [state, setState];
};

const { ExportPanel } = require(bundlePath);

const mockData = {
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

// Render component to get the tree
const element = ExportPanel(mockData);

// Walk tree to find button
function findButtonWithText(node, text) {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findButtonWithText(child, text);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === 'object' && node.props) {
    if (node.type === 'button') {
      const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
      if (children.some(child => typeof child === 'string' && child.includes(text))) {
        return node;
      }
    }
    return findButtonWithText(node.props.children, text);
  }
  return null;
}

const runTest = async () => {
  console.log('\n1. Test Clipboard Error Path');

  const copyBtn = findButtonWithText(element, 'Copy Summary');
  ok(copyBtn !== null, 'Found "Copy Summary" button');

  if (copyBtn) {
    // Reset state and run handler
    setExportingStates = [];
    alertCalled = false;
    consoleErrorCalled = false;

    await copyBtn.props.onClick();

    // Check results
    ok(setExportingStates.length >= 2, 'setIsExporting was called during handler');
    ok(setExportingStates[0] === true, 'setIsExporting(true) was called at start');
    ok(setExportingStates[setExportingStates.length - 1] === false, 'setIsExporting(false) was called in finally block');
    ok(alertCalled, 'Error alert was shown to user');
    ok(consoleErrorCalled, 'Error was logged to console');
  }

  // Restore console
  console.error = origConsoleError;

  console.log('\n' + '='.repeat(70));
  console.log(`EXPORT PANEL RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
  console.log('='.repeat(70) + '\n');

  if (fails.length) {
    process.exit(1);
  }
};

runTest();
