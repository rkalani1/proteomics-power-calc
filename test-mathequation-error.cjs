/**
 * MathEquation Unit & Error Handling Test
 *
 * Verifies that the MathEquation component:
 * 1. Correctly catches KaTeX rendering errors, logs them to console.error, and falls back to raw LaTeX text.
 * 2. Calls katex.render with the correct options on happy paths (displayMode, throwOnError: false, strict: false, trust: false).
 * 3. Handles custom className props and displayMode toggles.
 * 4. Gracefully degrades when used inside parent components like PowerFormula.
 */

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const Module = require('module');

// 1. Bundle MathEquation.tsx keeping react, katex, and formulas external
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

// 2. State & Mocks
let katexShouldThrow = false;
const katexCalls = [];
let capturedConsoleErrors = [];

const mockKatex = {
  render: (latex, container, options) => {
    katexCalls.push({ latex, container, options });
    if (katexShouldThrow) {
      throw new Error(`Forced KaTeX error for "${latex}"`);
    }
    container.innerHTML = `<span class="katex-rendered">${latex}</span>`;
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

// React Mock Setup
let currentRef = null;
let effectCallbacks = [];

const mockReact = {
  useRef: (initialValue) => {
    const refObj = { current: initialValue || { textContent: '', innerHTML: '' } };
    currentRef = refObj;
    return refObj;
  },
  useEffect: (callback, deps) => {
    effectCallbacks.push({ callback, deps });
  },
  useState: (initial) => [initial, () => {}],
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: Symbol('react.fragment'),
};

const mockReactRuntime = {
  jsx: (type, props) => {
    if (typeof type === 'function') {
      return type(props);
    }
    return { type, props };
  },
  jsxs: (type, props) => {
    if (typeof type === 'function') {
      return type(props);
    }
    return { type, props };
  },
  jsxDEV: (type, props) => {
    if (typeof type === 'function') {
      return type(props);
    }
    return { type, props };
  },
};

// 3. Inject Mocks into Module Loader
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return mockReact;
  if (request === 'react/jsx-runtime' || request === 'react/jsx-dev-runtime') return mockReactRuntime;
  if (request === 'katex') return mockKatex;
  if (request.endsWith('../constants/formulas')) return mockFormulas;
  return originalLoad.apply(this, arguments);
};

global.React = mockReact;

let MathEquation, PowerFormula;
try {
  const mod = require(bundlePath);
  MathEquation = mod.MathEquation;
  PowerFormula = mod.PowerFormula;
} finally {
  Module._load = originalLoad;
}

// Intercept console.error
const originalConsoleError = console.error;
console.error = (...args) => {
  capturedConsoleErrors.push(args.map(a => (a instanceof Error ? a.message : String(a))).join(' '));
};

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    totalPassed++;
    console.log(`  ✓ ${message}`);
  } else {
    totalFailed++;
    console.log(`  ✗ ${message} ${details}`);
  }
}

console.log('='.repeat(70));
console.log('MathEquation Component & Error Path Unit Tests');
console.log('='.repeat(70));

try {
  // Test 1: MathEquation Direct Error Handling Path
  console.log('\n1. MathEquation Direct Error Path Test');
  katexShouldThrow = true;
  katexCalls.length = 0;
  capturedConsoleErrors.length = 0;
  effectCallbacks.length = 0;

  const testContainer = { textContent: 'initial', innerHTML: '' };
  mockReact.useRef = () => ({ current: testContainer });

  MathEquation({ latex: '\\invalid{latex_test}', displayMode: true, className: 'my-math-class' });

  // Execute effect
  effectCallbacks.forEach(({ callback }) => callback());

  assert(
    testContainer.textContent === '\\invalid{latex_test}',
    'Fallback textContent correctly set to latex prop on rendering error'
  );

  assert(
    capturedConsoleErrors.some(err => err.includes('KaTeX rendering error:')),
    'Console error includes "KaTeX rendering error:" prefix'
  );

  assert(
    capturedConsoleErrors.some(err => err.includes('Forced KaTeX error for "\\invalid{latex_test}"')),
    'Console error logs the thrown error details'
  );

  // Test 2: MathEquation Happy Path & KaTeX Options Verification
  console.log('\n2. MathEquation Happy Path & KaTeX Options Test');
  katexShouldThrow = false;
  katexCalls.length = 0;
  capturedConsoleErrors.length = 0;
  effectCallbacks.length = 0;

  const happyContainer = { textContent: '', innerHTML: '' };
  mockReact.useRef = () => ({ current: happyContainer });

  const element = MathEquation({ latex: 'E = mc^2', displayMode: false, className: 'formula-style' });

  assert(element.props.className === 'formula-style', 'Component forwards className prop to container div');

  // Execute effect
  effectCallbacks.forEach(({ callback }) => callback());

  assert(katexCalls.length === 1, 'katex.render called exactly once');
  if (katexCalls.length > 0) {
    const call = katexCalls[0];
    assert(call.latex === 'E = mc^2', 'katex.render called with correct latex string');
    assert(call.container === happyContainer, 'katex.render called with container element');
    assert(call.options.displayMode === false, 'katex.render options displayMode matches prop (false)');
    assert(call.options.throwOnError === false, 'katex.render options throwOnError is explicitly false');
    assert(call.options.strict === false, 'katex.render options strict is false');
    assert(call.options.trust === false, 'katex.render options trust is false (security policy)');
  }
  assert(happyContainer.innerHTML.includes('E = mc^2'), 'KaTeX rendered HTML output into container on happy path');
  assert(capturedConsoleErrors.length === 0, 'No console errors logged on happy path');

  // Test 3: Default Prop Values Test
  console.log('\n3. MathEquation Default Props Test');
  katexCalls.length = 0;
  effectCallbacks.length = 0;

  const defaultContainer = { textContent: '', innerHTML: '' };
  mockReact.useRef = () => ({ current: defaultContainer });

  const defaultElement = MathEquation({ latex: 'a^2 + b^2 = c^2' });

  assert(defaultElement.props.className === '', 'Default className prop is empty string');

  effectCallbacks.forEach(({ callback }) => callback());

  assert(katexCalls.length === 1, 'katex.render called for default props');
  if (katexCalls.length > 0) {
    assert(katexCalls[0].options.displayMode === true, 'Default displayMode is true');
  }

  // Test 4: PowerFormula Integration Error Fallback Test
  console.log('\n4. PowerFormula Integration Error Fallback Test');
  katexShouldThrow = true;
  katexCalls.length = 0;
  capturedConsoleErrors.length = 0;
  effectCallbacks.length = 0;

  const formulaContainers = [];
  mockReact.useRef = () => {
    const c = { textContent: '', innerHTML: '' };
    formulaContainers.push(c);
    return { current: c };
  };

  PowerFormula({ analysisType: 'cox', studyDesign: 'cohort' });

  effectCallbacks.forEach(({ callback }) => callback());

  const fallback1 = formulaContainers[0]?.textContent === '\\invalid{main}';
  const fallback2 = formulaContainers[1]?.textContent === '\\invalid{min}';
  const fallback3 = formulaContainers[2]?.textContent === '\\invalid{def}';

  assert(fallback1 && fallback2 && fallback3, 'PowerFormula fallback text rendered for all nested equations');
  assert(capturedConsoleErrors.length >= 3, 'Errors logged for all failing nested equations');

  console.log('\n' + '='.repeat(70));
  console.log(`RESULTS: ${totalPassed} passed, ${totalFailed} failed`);
  console.log('='.repeat(70));

  console.error = originalConsoleError;
  try { fs.unlinkSync(bundlePath); } catch {}

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
} catch (err) {
  console.error = originalConsoleError;
  console.error('\n✗ Test suite threw an unexpected exception:');
  console.error(err);
  try { fs.unlinkSync(bundlePath); } catch {}
  process.exit(1);
}
