/**
 * ExportPanel Error Handling Test for Copy to Clipboard
 *
 * Verifies that the finally block in copyToClipboard correctly resets
 * isExporting to false even if performCopy throws an error.
 */

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const Module = require('module');

// Bundle ExportPanel but keep dependencies external to inject mocks
const SRC = path.join(__dirname, 'src', 'components', 'ExportPanel.tsx');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  external: ['react', '../utils/exportUtils', '../utils/statistics'],
  jsx: 'automatic',
  write: false,
  logLevel: 'silent',
});

const bundleText = out.outputFiles[0].text;
const bundlePath = path.join(__dirname, `.test-exportpanel-copy-err.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, bundleText);

// Setup Mocks
let stateHooks = [];
let hookIndex = 0;

const mockReact = {
  useState: (initial) => {
    const currentIndex = hookIndex++;
    if (!stateHooks[currentIndex]) {
      stateHooks[currentIndex] = {
        value: initial,
        setCalls: [],
        setter: (val) => {
          stateHooks[currentIndex].setCalls.push(val);
          stateHooks[currentIndex].value = val;
        }
      };
    }
    return [stateHooks[currentIndex].value, stateHooks[currentIndex].setter];
  },
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: Symbol('react.fragment'),
};

const mockReactRuntime = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
  jsxDEV: (type, props) => ({ type, props }),
};

let performCopyCalled = false;

const mockExportUtils = {
  generatePrintHTML: () => '<html>Mock HTML</html>',
  performPrint: () => {},
  generateCSV: () => '',
  performCSVDownload: () => {},
  generateTextSummary: () => 'Mock summary',
  performCopy: () => {
    performCopyCalled = true;
    return Promise.reject(new Error('Mocked copy error'));
  },
};

// Inject mocks into require cache
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return mockReact;
  if (request === 'react/jsx-runtime' || request === 'react/jsx-dev-runtime') return mockReactRuntime;
  if (request.includes('exportUtils')) return mockExportUtils;
  if (request.includes('statistics')) return {};
  return originalLoad.apply(this, arguments);
};

let ExportPanel;
try {
  const mod = require(bundlePath);
  ExportPanel = mod.default;
} finally {
  Module._load = originalLoad;
}

// Test Execution
console.log('='.repeat(70));
console.log('ExportPanel Copy Error Handling Test');
console.log('='.repeat(70));

let capturedAlert = null;
let capturedError = null;
global.alert = (msg) => {
  capturedAlert = msg;
};
const originalConsoleError = console.error;
console.error = (...args) => {
  capturedError = args.join(' ');
};

async function runTest() {
  let passed = false;
  try {
    // Render component to get the props (which includes the onClick handlers)
    const props = {
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

    hookIndex = 0; // Reset index before render
    const rendered = ExportPanel(props);

    // Find the copyToClipboard function.
    let copyFn = null;
    const findCopyHandler = (node) => {
      if (!node) return;

      // Look for button elements
      if (node.type === 'button' && node.props) {
        let text = '';
        if (node.props.children) {
          const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
          // Extract string text from children
          text = children.map(c => typeof c === 'string' ? c : '').join('');
        }
        if (text.includes('Copy Summary') || text.includes('Copy')) {
          copyFn = node.props.onClick;
        }
      }

      // Traverse children
      if (node.children) {
        const children = Array.isArray(node.children) ? node.children : [node.children];
        children.forEach(findCopyHandler);
      }
      if (node.props && node.props.children) {
        const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
        children.forEach(findCopyHandler);
      }
    };

    findCopyHandler(rendered);

    if (!copyFn) {
      throw new Error('Could not find Copy Summary button onClick handler');
    }

    // The first useState is isExporting (index 0)
    const isExportingHook = stateHooks[0];
    isExportingHook.setCalls = []; // Clear previous calls from render if any

    // Execute the copy function. ExportPanel should catch the mock error, alert,
    // and still reset the loading state in the finally block.
    let errorThrown = false;
    try {
      await copyFn(); // Important to await since copyToClipboard is async
    } catch (err) {
      errorThrown = true;
    }

    console.log(`  ${!errorThrown ? '✓' : '✗'} Error was caught inside copyToClipboard`);
    console.log(`  ${capturedError && capturedError.includes('Failed to copy:') ? '✓' : '✗'} Error was logged`);
    console.log(`  ${performCopyCalled ? '✓' : '✗'} performCopy was called`);
    console.log(`  ${isExportingHook.setCalls.length === 2 ? '✓' : '✗'} setIsExporting called twice`);

    if (isExportingHook.setCalls.length === 2) {
      console.log(`  ${isExportingHook.setCalls[0] === true ? '✓' : '✗'} First call sets to true`);
      console.log(`  ${isExportingHook.setCalls[1] === false ? '✓' : '✗'} Second call sets to false (in finally block)`);
    }

    if (!errorThrown &&
        capturedError && capturedError.includes('Failed to copy:') &&
        performCopyCalled &&
        isExportingHook.setCalls.length === 2 &&
        isExportingHook.setCalls[0] === true && isExportingHook.setCalls[1] === false) {
      passed = true;
    }
  } catch (err) {
    console.error('\n✗ Test threw an unexpected error:');
    console.error(err);
  } finally {
    console.error = originalConsoleError;
    try { fs.unlinkSync(bundlePath); } catch (e) {}
  }

  if (passed) {
    console.log('\n✓ TEST PASSED');
    process.exit(0);
  } else {
    console.log('\n✗ TEST FAILED');
    process.exit(1);
  }
}

runTest();
