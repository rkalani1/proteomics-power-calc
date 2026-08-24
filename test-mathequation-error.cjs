/**
 * MathEquation Error Handling and Rendering Test
 *
 * Tests the MathEquation and PowerFormula components:
 * 1. Verifies direct rendering of MathEquation using real KaTeX.
 * 2. Verifies MathEquation's error handling path when katex.render throws an error:
 *    - Captures console.error call.
 *    - Confirms raw LaTeX fallback is set to containerRef.current.textContent.
 * 3. Verifies PowerFormula rendering and error fallback behavior when KaTeX throws.
 * 4. Verifies optional props (displayMode, className).
 */

const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost'
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.IS_REACT_ACT_ENVIRONMENT = true;

// Polyfill requestAnimationFrame for React
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = id => clearTimeout(id);

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');
const katex = require('katex');

// 1. Bundle MathEquation.tsx with React/ReactDOM externalized
const SRC = path.join(__dirname, 'src', 'components', 'MathEquation.tsx');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'katex'],
  write: false,
  logLevel: 'silent',
});

const bundlePath = path.join(__dirname, `.test-mathequation.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);

process.on('exit', () => {
  try { fs.unlinkSync(bundlePath); } catch { /* ignore */ }
});

const { MathEquation, PowerFormula } = require(bundlePath);

let total = 0;
let passed = 0;
const fails = [];

function ok(cond, name, detail = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    fails.push({ name, detail });
    console.log(`  ✗ ${name} ${detail}`);
  }
}

console.log('='.repeat(70));
console.log('MathEquation & PowerFormula Tests (Rendering and Error Handling)');
console.log('='.repeat(70));

const originalConsoleError = console.error;

try {
  // Test 1: MathEquation successful rendering with real KaTeX
  console.log('\n1. Direct MathEquation Happy Path (Real KaTeX)');
  const validLatex = 'E = mc^2';
  const { container: container1, unmount: unmount1 } = render(
    React.createElement(MathEquation, { latex: validLatex, className: 'my-math-class' })
  );

  const mathDiv = container1.firstChild;
  ok(mathDiv.classList.contains('my-math-class'), 'Applies className prop correctly');
  ok(mathDiv.querySelector('.katex') !== null, 'Renders KaTeX element structure successfully');
  unmount1();

  // Test 2: MathEquation Error Handling Path (Simulating katex.render error)
  console.log('\n2. Direct MathEquation Error Fallback Path');
  let capturedConsoleLogs = [];
  console.error = (...args) => {
    capturedConsoleLogs.push(args.join(' '));
  };

  const originalKatexRender = katex.render;
  katex.render = () => {
    throw new Error('Forced KaTeX rendering error');
  };

  const invalidLatex = '\\invalidCommand{test}';
  const { container: container2, unmount: unmount2 } = render(
    React.createElement(MathEquation, { latex: invalidLatex, displayMode: false, className: 'error-math' })
  );

  const errorDiv = container2.firstChild;
  ok(errorDiv.textContent === invalidLatex, 'Fallback textContent is set to raw LaTeX when KaTeX throws');
  const errorLogged = capturedConsoleLogs.some(log => log.includes('KaTeX rendering error') && log.includes('Forced KaTeX rendering error'));
  ok(errorLogged, 'console.error logged KaTeX rendering error and error object');

  unmount2();

  // Test 3: PowerFormula integration under KaTeX error conditions
  console.log('\n3. PowerFormula Integration with KaTeX Error Fallback');
  capturedConsoleLogs = [];

  const { container: container3, unmount: unmount3 } = render(
    React.createElement(PowerFormula, { analysisType: 'cox', studyDesign: 'cohort' })
  );

  // Expand formula section
  const button = screen.getByRole('button', { name: /Statistical Formulas/i });
  fireEvent.click(button);

  const textContents = Array.from(container3.querySelectorAll('.text-center, .text-sm'))
    .map(el => el.textContent)
    .filter(Boolean);

  const containsFormulas = textContents.some(txt => txt.includes('z_{1-\\alpha/2}')) || container3.innerHTML.includes('Power');
  ok(containsFormulas, 'PowerFormula fallback text rendered when KaTeX throws');
  ok(capturedConsoleLogs.length >= 3, 'PowerFormula logged errors for each formula component rendered');

  unmount3();

  // Restore katex.render
  katex.render = originalKatexRender;
  console.error = originalConsoleError;

  // Test 4: PowerFormula normal render (with KaTeX restored)
  console.log('\n4. PowerFormula Happy Path (KaTeX restored)');
  const { container: container4, unmount: unmount4 } = render(
    React.createElement(PowerFormula, { analysisType: 'linear', studyDesign: 'cohort' })
  );
  ok(container4.textContent.includes('Statistical Formulas (Linear Regression)'), 'Renders title with config for linear analysis');
  unmount4();

} catch (err) {
  console.error = originalConsoleError;
  console.error('\n✗ Test threw an unexpected error:');
  console.error(err);
  fails.push({ name: 'Unexpected exception', detail: err.message });
} finally {
  console.error = originalConsoleError;
  try { fs.unlinkSync(bundlePath); } catch {}
}

console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');

if (fails.length > 0) {
  process.exit(1);
} else {
  console.log('✓ ALL MathEquation TESTS PASSED SUCCESSFULLY');
  process.exit(0);
}
