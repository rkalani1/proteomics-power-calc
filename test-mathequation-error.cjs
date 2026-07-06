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

// 1. Bundle MathEquation.tsx but keep react, katex, and formulas external
const SRC = path.join(__dirname, 'src', 'components', 'MathEquation.tsx');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  external: ['react', 'katex', '../constants/formulas'],
  jsx: 'automatic',
  write: false,
  logLevel: 'silent',
});

const bundleText = out.outputFiles[0].text;
const bundlePath = path.join(__dirname, `.test-mathequation-err.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, bundleText);

// 2. Setup mocks
const containers = [];
const mockReact = {
  useRef: () => {
    const container = { textContent: '', innerHTML: '' };
    containers.push(container);
    return { current: container };
  },
  effects: [],
  useEffect: (fn, deps) => {
    mockReact.effects.push(fn);
  },
  useState: (initial) => [initial, () => {}],
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: Symbol('react.fragment'),
};

const mockReactRuntime = {
  jsx: (type, props) => {
    // When PowerFormula renders MathEquation, we just call it directly to simulate rendering
    if (typeof type === 'function') {
      type(props);
    }
    return { type, props };
  },
  jsxs: (type, props) => {
    if (typeof type === 'function') {
      type(props);
    }
    return { type, props };
  },
  jsxDEV: (type, props) => {
    if (typeof type === 'function') {
      type(props);
    }
    return { type, props };
  },
};

const mockKatex = {
  render: () => {
    throw new Error('Forced KaTeX error');
  }
};

const mockFormulas = {
  FORMULA_CONFIGS: {
    cox: {
      title: 'Cox',
      mainFormula: '\\invalid{main}',
      minEffectLabel: 'Min Effect',
      minEffectFormula: '\\invalid{min}',
    }
  },
  definitionsFor: () => '\\invalid{def}'
};

// 3. Inject mocks into require cache
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return mockReact;
  if (request === 'react/jsx-runtime' || request === 'react/jsx-dev-runtime') return mockReactRuntime;
  if (request === 'katex') return mockKatex;
  if (request.endsWith('../constants/formulas')) return mockFormulas;
  return originalLoad.apply(this, arguments);
};

global.React = mockReact;

let PowerFormula;
try {
  const mod = require(bundlePath);
  PowerFormula = mod.PowerFormula;
} finally {
  Module._load = originalLoad;
}

// 4. Test execution
console.log('='.repeat(70));
console.log('MathEquation Error Handling Test (via PowerFormula)');
console.log('='.repeat(70));

let capturedError = '';
const originalConsoleError = console.error;
console.error = (...args) => {
  capturedError += args.join(' ') + '\n';
};

try {
  // Trigger "render"
  PowerFormula({ analysisType: 'cox', studyDesign: 'cohort' });

  // Run the effects manually
  mockReact.effects.forEach(fn => fn());

  // We expect 3 MathEquations to be rendered
  const fallbackOk1 = containers[0]?.textContent === '\\invalid{main}';
  const fallbackOk2 = containers[1]?.textContent === '\\invalid{min}';
  const fallbackOk3 = containers[2]?.textContent === '\\invalid{def}';

  const fallbackOk = fallbackOk1 && fallbackOk2 && fallbackOk3;
  const errorLoggedOk = capturedError.includes('KaTeX rendering error');

  console.log(`  ${fallbackOk ? '✓' : '✗'} Fallback text rendered correctly`);
  if (!fallbackOk) {
    console.log(`    Expected fallbacks not found. Containers:`, containers.map(c => c.textContent));
  }

  console.log(`  ${errorLoggedOk ? '✓' : '✗'} Error was logged to console`);
  if (!errorLoggedOk) {
    console.log(`    Captured log: ${capturedError}`);
  }

  let exitCode = 0;
  if (fallbackOk && errorLoggedOk) {
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
