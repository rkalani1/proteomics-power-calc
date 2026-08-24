/**
 * ExportPanel Error Handling Test
 *
 * Verifies that the finally block in printSummary correctly resets
 * isExporting to false even if generatePrintHTML or performPrint throws an error.
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
const bundlePath = path.join(__dirname, `.test-exportpanel-err.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, bundleText);

function runTest(testName, setupMockExportUtils) {
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

  const mockExportUtils = setupMockExportUtils();

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
    // delete from cache if it exists
    delete require.cache[require.resolve(bundlePath)];
    const mod = require(bundlePath);
    ExportPanel = mod.default;
  } finally {
    Module._load = originalLoad;
  }

  // Test Execution
  console.log('='.repeat(70));
  console.log(`ExportPanel Error Handling Test: ${testName}`);
  console.log('='.repeat(70));

  let passed = false;
  let capturedAlert = null;
  let capturedError = null;
  global.alert = (msg) => {
    capturedAlert = msg;
  };
  const originalConsoleError = console.error;
  console.error = (...args) => {
    capturedError = args.join(' ');
  };

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

    // Find the printSummary function.
    let targetFn = null;
    const findHandler = (node) => {
      if (!node) return;

      // Look for button elements
      if (node.type === 'button' && node.props) {
        let text = '';
        if (node.props.children) {
          const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
          // Extract string text from children
          text = children.map(c => typeof c === 'string' ? c : '').join('');
        }
        if (testName.includes('copy')) {
          if (text.includes('Copy')) {
            targetFn = node.props.onClick;
          }
        } else {
          if (text.includes('Print / Save PDF') || text.includes('Print')) {
            targetFn = node.props.onClick;
          }
        }
      }

      // Traverse children
      if (node.children) {
        const children = Array.isArray(node.children) ? node.children : [node.children];
        children.forEach(findHandler);
      }
      if (node.props && node.props.children) {
        const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
        children.forEach(findHandler);
      }
    };

    findHandler(rendered);

    if (!targetFn) {
      throw new Error(`Could not find button onClick handler for ${testName}`);
    }

    // The first useState is isExporting (index 0)
    const isExportingHook = stateHooks[0];
    isExportingHook.setCalls = []; // Clear previous calls from render if any

    // Execute the function. ExportPanel should catch the mock error, alert,
    // and still reset the loading state in the finally block.
    let errorThrown = false;
    let promise = null;
    try {
      promise = targetFn();
    } catch (err) {
      errorThrown = true;
    }

    const verify = () => {
      let expectedErrorString = testName.includes('copy') ? 'Failed to copy' : 'Failed to print summary';

      console.log(`  ${!errorThrown ? '✓' : '✗'} Error was caught inside function`);
      console.log(`  ${capturedError && capturedError.includes(expectedErrorString) ? '✓' : '✗'} Error was logged`);
      console.log(`  ${isExportingHook.setCalls.length === 2 ? '✓' : '✗'} setIsExporting called twice`);

      if (isExportingHook.setCalls.length === 2) {
        console.log(`  ${isExportingHook.setCalls[0] === true ? '✓' : '✗'} First call sets to true`);
        console.log(`  ${isExportingHook.setCalls[1] === false ? '✓' : '✗'} Second call sets to false (in finally block)`);
      }

      if (!errorThrown &&
          capturedError && capturedError.includes(expectedErrorString) &&
          isExportingHook.setCalls.length === 2 &&
          isExportingHook.setCalls[0] === true && isExportingHook.setCalls[1] === false) {
        passed = true;
      }
    }

    if (promise && typeof promise.then === 'function') {
      return promise.then(() => {
        verify();
        console.error = originalConsoleError;
        return passed;
      }).catch((err) => {
        console.error('\n✗ Test threw an unexpected error (async):');
        console.error(err);
        console.error = originalConsoleError;
        return false;
      });
    } else {
      verify();
      console.error = originalConsoleError;
      return Promise.resolve(passed);
    }
  } catch (err) {
    console.error('\n✗ Test threw an unexpected error:');
    console.error(err);
    console.error = originalConsoleError;
    return Promise.resolve(false);
  }
}

async function runAllTests() {
  let allPassed = true;

  const testCases = [
    {
      name: 'printSummary performPrint error',
      mock: () => ({
        generatePrintHTML: () => '<html>Mock HTML</html>',
        performPrint: () => { throw new Error('Mocked print error'); },
        generateCSV: () => '',
        performCSVDownload: () => {},
        generateTextSummary: () => '',
        performCopy: () => Promise.resolve(),
      })
    },
    {
      name: 'printSummary generatePrintHTML error',
      mock: () => ({
        generatePrintHTML: () => { throw new Error('Mocked HTML gen error'); },
        performPrint: () => {},
        generateCSV: () => '',
        performCSVDownload: () => {},
        generateTextSummary: () => '',
        performCopy: () => Promise.resolve(),
      })
    },
    {
      name: 'copyToClipboard performCopy error',
      mock: () => ({
        generatePrintHTML: () => '',
        performPrint: () => {},
        generateCSV: () => '',
        performCSVDownload: () => {},
        generateTextSummary: () => 'text',
        performCopy: () => Promise.reject(new Error('Mocked copy error')),
      })
    },
    {
      name: 'copyToClipboard generateTextSummary error',
      mock: () => ({
        generatePrintHTML: () => '',
        performPrint: () => {},
        generateCSV: () => '',
        performCSVDownload: () => {},
        generateTextSummary: () => { throw new Error('Mocked text gen error'); },
        performCopy: () => Promise.resolve(),
      })
    }
  ];

  for (const tc of testCases) {
    const passed = await runTest(tc.name, tc.mock);
    if (!passed) {
      allPassed = false;
    }
  }

  try { fs.unlinkSync(bundlePath); } catch (e) {}

  if (allPassed) {
    console.log('\n✓ ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log('\n✗ SOME TESTS FAILED');
    process.exit(1);
  }
}

runAllTests();
