/**
 * ExportPanel Error Handling Test
 *
 * Verifies that the ExportPanel component gracefully handles errors in performCSVDownload
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

const mockReact = {
  useState: (initial) => {
    // For isExporting
    if (typeof initial === 'boolean' && initial === false) {
      return [initial, (val) => setIsExportingArgs.push(val)];
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

let performCSVDownloadCalled = false;

const mockExportUtils = {
  generateCSV: () => {
    return "csv,data";
  },
  generatePrintHTML: () => "<html>",
  generateTextSummary: () => "text",
  performCSVDownload: () => {
    performCSVDownloadCalled = true;
    throw new Error('Forced CSV Download error');
  },
  performPrint: () => {},
  performCopy: () => Promise.resolve(),
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
console.log('='.repeat(70));
console.log('ExportPanel Error Handling Test');
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

let capturedError = null;
let capturedAlert = null;

const originalConsoleError = console.error;
console.error = (...args) => {
  capturedError = args.join(' ');
};

global.alert = (msg) => {
  capturedAlert = msg;
};

try {
  const element = ExportPanel(mockProps);

  let downloadCSVFunc = null;

  const findButton = (node) => {
    if (!node) return;
    if (node.type === 'button' && node.props && node.props.children && node.props.children.includes && node.props.children.includes('Download CSV')) {
        downloadCSVFunc = node.props.onClick;
    }
    if (node.children) {
        if (Array.isArray(node.children)) {
            node.children.forEach(findButton);
        } else {
            findButton(node.children);
        }
    }
    if (node.props && node.props.children) {
        if (Array.isArray(node.props.children)) {
            node.props.children.forEach(findButton);
        } else {
            findButton(node.props.children);
        }
    }
  };

  findButton(element);

  let caught = false;
  try {
      downloadCSVFunc();
  } catch (e) {
      caught = true;
  }

  const catchBlockPresent = caught === false && capturedError !== null;

  console.log(`  ${setIsExportingArgs[0] === true ? '✓' : '✗'} setIsExporting(true) was called`);
  console.log(`  ${performCSVDownloadCalled ? '✓' : '✗'} performCSVDownload was called and threw`);
  console.log(`  ${setIsExportingArgs[1] === false ? '✓' : '✗'} setIsExporting(false) was called in finally block`);

  if (catchBlockPresent) {
      console.log(`  ✓ Error was caught and logged to console`);
  } else {
      console.log(`  ✗ Error was NOT caught or logged to console`);
  }

  if (capturedAlert) {
      console.log(`  ✓ Alert was shown: ${capturedAlert}`);
  } else {
      console.log(`  ✗ Alert was NOT shown`);
  }

  let exitCode = 0;
  if (catchBlockPresent && capturedAlert && setIsExportingArgs[1] === false) {
    console.log('\n✓ TEST PASSED');
    exitCode = 0;
  } else {
    console.log('\n✗ TEST FAILED');
    exitCode = 1;
  }

  console.error = originalConsoleError;
  try { fs.unlinkSync(bundlePath); } catch (e) {}
  process.exit(exitCode);

} catch (err) {
  console.error = originalConsoleError;
  console.error('\n✗ Test threw an unexpected error:');
  console.error(err);
  try { fs.unlinkSync(bundlePath); } catch (e) {}
  process.exit(1);
}
