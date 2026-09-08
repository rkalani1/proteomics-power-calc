/**
 * ExportPanel Error Handling Test
 *
 * Verifies that the ExportPanel component gracefully handles errors in performCSVDownload,
 * generateCSV, and performCopy.
 */

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const Module = require('module');

// 1. Bundle ExportPanel.tsx
const SRC = path.join(__dirname, 'src', 'components', 'ExportPanel.tsx');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  external: ['react', '../utils/statistics', '../utils/exportUtils'],
  jsx: 'automatic', // Ensure React is used for JSX if needed
  write: false,
  logLevel: 'silent',
});

const bundleText = out.outputFiles[0].text;
const bundlePath = path.join(__dirname, `.test-export-error.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, bundleText);

// 2. Setup mocks
let setIsExportingArgs = [];
let feedbackState = null;

const mockReact = {
  useState: (initial) => {
    // For isExporting
    if (typeof initial === 'boolean' && initial === false) {
      return [initial, (val) => setIsExportingArgs.push(val)];
    }
    // For feedback
    if (initial === null) {
      return [feedbackState, (val) => { feedbackState = typeof val === 'function' ? val(feedbackState) : val; }];
    }
    // For isExpanded
    return [initial, () => {}];
  },
  createElement: (type, props, ...children) => {
    return { type, props, children };
  },
  Fragment: Symbol('react.fragment'),
};

const mockReactRuntime = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
  jsxDEV: (type, props) => ({ type, props }),
};

// Flags for mocks
let mockBehavior = {
    generateCSVShouldThrow: false,
    performCSVDownloadShouldThrow: false,
    performCopyShouldThrow: false,
};

let performCSVDownloadCalled = false;
let performCopyCalled = false;
let generateCSVCalled = false;

const mockExportUtils = {
  generateCSV: () => {
    generateCSVCalled = true;
    if (mockBehavior.generateCSVShouldThrow) {
        throw new Error('Forced generateCSV error');
    }
    return "csv,data";
  },
  generatePrintHTML: () => "<html>",
  generateTextSummary: () => "text",
  performCSVDownload: () => {
    performCSVDownloadCalled = true;
    if (mockBehavior.performCSVDownloadShouldThrow) {
        throw new Error('Forced CSV Download error');
    }
  },
  performPrint: () => {},
  performCopy: () => {
      performCopyCalled = true;
      if (mockBehavior.performCopyShouldThrow) {
          return Promise.reject(new Error('Forced performCopy error'));
      }
      return Promise.resolve();
  },
};

// 3. Inject mocks into require cache
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return mockReact;
  if (request === 'react/jsx-runtime' || request === 'react/jsx-dev-runtime') return mockReactRuntime;
  if (request === '../utils/exportUtils') return mockExportUtils;
  if (request === '../utils/statistics') return {}; // Not needed for this test
  return originalLoad.apply(this, arguments);
};

// Global React mock for any code that expects it globally
global.React = mockReact;

let ExportPanel;
try {
  const mod = require(bundlePath);
  ExportPanel = mod.default;
} finally {
  // Restore original loader
  Module._load = originalLoad;
}

// 4. Test execution
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

let capturedError = null;
let capturedAlert = null;

const originalConsoleError = console.error;
console.error = (...args) => {
  capturedError = args.join(' ');
};

global.alert = (msg) => {
  capturedAlert = msg;
};

let exitCode = 0;

async function runTest(testName, setupBehavior, findHandler, verify) {
    console.log('='.repeat(70));
    console.log(`Testing: ${testName}`);
    console.log('='.repeat(70));

    // Reset state
    setIsExportingArgs = [];
    feedbackState = null;
    performCSVDownloadCalled = false;
    performCopyCalled = false;
    generateCSVCalled = false;
    capturedError = null;
    capturedAlert = null;
    mockBehavior = {
        generateCSVShouldThrow: false,
        performCSVDownloadShouldThrow: false,
        performCopyShouldThrow: false,
    };

    setupBehavior();

    try {
        const element = ExportPanel(mockProps);

        let targetFunc = null;
        const findButton = (node) => {
            if (!node) return;
            if (node.type === 'button' && node.props && node.props.children) {
                const text = Array.isArray(node.props.children)
                    ? node.props.children.map(c => typeof c === 'string' ? c : '').join('')
                    : (typeof node.props.children === 'string' ? node.props.children : '');

                if (findHandler(text)) {
                    targetFunc = node.props.onClick;
                }
            }
            if (node.children) {
                if (Array.isArray(node.children)) node.children.forEach(findButton);
                else findButton(node.children);
            }
            if (node.props && node.props.children) {
                if (Array.isArray(node.props.children)) node.props.children.forEach(findButton);
                else findButton(node.props.children);
            }
        };

        findButton(element);

        if (!targetFunc) {
            throw new Error(`Could not find handler for test: ${testName}`);
        }

        let caught = false;
        try {
            const res = targetFunc();
            if (res instanceof Promise) {
                await res;
            }
        } catch (e) {
            caught = true;
        }

        const passed = verify(caught);
        if (!passed) exitCode = 1;

    } catch (err) {
        console.error('\n✗ Test setup threw an unexpected error:');
        console.error(err);
        exitCode = 1;
    }
}

async function runAllTests() {
    try {
        await runTest(
            'performCSVDownload Error',
            () => { mockBehavior.performCSVDownloadShouldThrow = true; },
            (text) => text.includes('Download CSV'),
            (caught) => {
                const catchBlockPresent = caught === false && capturedError !== null;
                const feedbackCorrect = feedbackState && feedbackState.type === 'error' && feedbackState.message === 'Failed to download CSV. Please try again.';
                console.log(`  ${setIsExportingArgs[0] === true ? '✓' : '✗'} setIsExporting(true) was called`);
                console.log(`  ${performCSVDownloadCalled ? '✓' : '✗'} performCSVDownload was called and threw`);
                console.log(`  ${setIsExportingArgs[1] === false ? '✓' : '✗'} setIsExporting(false) was called in finally block`);
                if (catchBlockPresent) console.log(`  ✓ Error was caught and logged to console`);
                else console.log(`  ✗ Error was NOT caught or logged to console`);
                if (feedbackCorrect) console.log(`  ✓ Inline feedback error was set correctly`);
                else console.log(`  ✗ Inline feedback error was NOT set correctly. Got: ${JSON.stringify(feedbackState)}`);

                const passed = catchBlockPresent && feedbackCorrect && setIsExportingArgs[1] === false;
                console.log(passed ? '\n✓ TEST PASSED\n' : '\n✗ TEST FAILED\n');
                return passed;
            }
        );

        await runTest(
            'generateCSV Error',
            () => { mockBehavior.generateCSVShouldThrow = true; },
            (text) => text.includes('Download CSV'),
            (caught) => {
                const catchBlockPresent = caught === false && capturedError !== null;
                const feedbackCorrect = feedbackState && feedbackState.type === 'error' && feedbackState.message === 'Failed to download CSV. Please try again.';
                console.log(`  ${setIsExportingArgs[0] === true ? '✓' : '✗'} setIsExporting(true) was called`);
                console.log(`  ${generateCSVCalled ? '✓' : '✗'} generateCSV was called and threw`);
                console.log(`  ${!performCSVDownloadCalled ? '✓' : '✗'} performCSVDownload was NOT called`);
                console.log(`  ${setIsExportingArgs[1] === false ? '✓' : '✗'} setIsExporting(false) was called in finally block`);
                if (catchBlockPresent) console.log(`  ✓ Error was caught and logged to console`);
                else console.log(`  ✗ Error was NOT caught or logged to console`);
                if (feedbackCorrect) console.log(`  ✓ Inline feedback error was set correctly`);
                else console.log(`  ✗ Inline feedback error was NOT set correctly. Got: ${JSON.stringify(feedbackState)}`);

                const passed = catchBlockPresent && feedbackCorrect && setIsExportingArgs[1] === false && !performCSVDownloadCalled;
                console.log(passed ? '\n✓ TEST PASSED\n' : '\n✗ TEST FAILED\n');
                return passed;
            }
        );

        await runTest(
            'copyToClipboard Error',
            () => { mockBehavior.performCopyShouldThrow = true; },
            (text) => text.includes('Copy Summary'),
            (caught) => {
                const catchBlockPresent = caught === false && capturedError !== null;
                const feedbackCorrect = feedbackState && feedbackState.type === 'error' && feedbackState.message === 'Failed to copy to clipboard. Please try again.';
                console.log(`  ${setIsExportingArgs[0] === true ? '✓' : '✗'} setIsExporting(true) was called`);
                console.log(`  ${performCopyCalled ? '✓' : '✗'} performCopy was called and rejected`);
                console.log(`  ${setIsExportingArgs[1] === false ? '✓' : '✗'} setIsExporting(false) was called in finally block`);
                if (catchBlockPresent) console.log(`  ✓ Error was caught and logged to console`);
                else console.log(`  ✗ Error was NOT caught or logged to console`);
                if (feedbackCorrect) console.log(`  ✓ Inline feedback error was set correctly`);
                else console.log(`  ✗ Inline feedback error was NOT set correctly. Got: ${JSON.stringify(feedbackState)}`);

                const passed = catchBlockPresent && feedbackCorrect && setIsExportingArgs[1] === false;
                console.log(passed ? '\n✓ TEST PASSED\n' : '\n✗ TEST FAILED\n');
                return passed;
            }
        );

    } finally {
        console.error = originalConsoleError;
        try { fs.unlinkSync(bundlePath); } catch (e) {}
        process.exit(exitCode);
    }
}

runAllTests();
