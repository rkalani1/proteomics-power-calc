/**
 * MathEquation Error Handling Test
 *
 * Verifies that the MathEquation component correctly catches KaTeX rendering
 * errors and falls back to displaying the raw LaTeX text.
 */

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const Module = require('module');

// 1. Bundle MathEquation.tsx but keep react and katex external
const SRC = path.join(__dirname, 'src', 'components', 'MathEquation.tsx');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  external: ['react', 'katex'],
  jsx: 'automatic', // Ensure React is used for JSX if needed
  write: false,
  logLevel: 'silent',
});

const bundleText = out.outputFiles[0].text;
const bundlePath = path.join(__dirname, `.test-mathequation-err.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, bundleText);

// 2. Setup mocks
const container = {
  textContent: '',
  innerHTML: ''
};

const mockReact = {
  useRef: () => ({ current: container }),
  useEffect: (fn, deps) => {
    // Store the effect to run it manually
    mockReact.lastEffect = fn;
  },
  useState: (initial) => [initial, () => {}],
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: Symbol('react.fragment'),
};

const mockReactRuntime = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
  jsxDEV: (type, props) => ({ type, props }),
};

const mockKatex = {
  render: () => {
    throw new Error('Forced KaTeX error');
  }
};

// 3. Inject mocks into require cache
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return mockReact;
  if (request === 'react/jsx-runtime' || request === 'react/jsx-dev-runtime') return mockReactRuntime;
  if (request === 'katex') return mockKatex;
  return originalLoad.apply(this, arguments);
};

// Global React mock for any code that expects it globally (though it should be imported)
global.React = mockReact;

let MathEquation;
try {
  const mod = require(bundlePath);
  MathEquation = mod.default;
} finally {
  // Restore original loader
  Module._load = originalLoad;
}

// 4. Test execution
console.log('='.repeat(70));
console.log('MathEquation Error Handling Test');
console.log('='.repeat(70));

let capturedError = null;
const originalConsoleError = console.error;
console.error = (...args) => {
  capturedError = args.join(' ');
};

try {
  const testLatex = '\\invalid{latex}';

  // Trigger "render" (calls the component function)
  // This will call useRef and useEffect
  MathEquation({ latex: testLatex });

  // Run the effect manually
  if (typeof mockReact.lastEffect === 'function') {
    mockReact.lastEffect();
  } else {
    throw new Error('useEffect was not called by the component');
  }

  const fallbackOk = container.textContent === testLatex;
  const errorLoggedOk = capturedError && capturedError.includes('KaTeX rendering error');
  const errorObjectLoggedOk = capturedError && capturedError.includes('Error: Forced KaTeX error');

  console.log(`  ${fallbackOk ? '✓' : '✗'} Fallback text rendered correctly`);
  if (!fallbackOk) {
    console.log(`    Expected: "${testLatex}", Got: "${container.textContent}"`);
  }

  console.log(`  ${errorLoggedOk ? '✓' : '✗'} Error was logged to console`);
  if (!errorLoggedOk) {
    console.log(`    Captured log: ${capturedError}`);
  }

  console.log(`  ${errorObjectLoggedOk ? '✓' : '✗'} Actual error object was logged`);
  if (!errorObjectLoggedOk) {
    console.log(`    Captured log didn't contain "Error: Forced KaTeX error": ${capturedError}`);
  }

  let exitCode = 0;
  if (fallbackOk && errorLoggedOk && errorObjectLoggedOk) {
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
