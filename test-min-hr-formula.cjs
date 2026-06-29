/**
 * MIN HR FORMULA COMPONENT TEST
 *
 * Verifies that the MinHRFormula component renders correctly.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

const mathEquationPath = JSON.stringify(path.join(__dirname, 'src', 'components', 'MathEquation.tsx'));
const entry = path.join(os.tmpdir(), `minhr-entry.${process.pid}.tsx`);
fs.writeFileSync(entry, `export { MinHRFormula } from ${mathEquationPath};\n`);

const out = esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  loader: { '.css': 'empty', '.svg': 'text' },
  external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'katex'],
  write: false,
  logLevel: 'silent',
});

const bundlePath = path.join(__dirname, `.minhr.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
process.on('exit', () => {
  for (const p of [entry, bundlePath]) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
});

const React = require('react');
const { renderToString } = require('react-dom/server');
const { MinHRFormula } = require(bundlePath);

console.log('='.repeat(70));
console.log('MIN HR FORMULA COMPONENT TEST');
console.log('='.repeat(70));

let failed = false;
try {
  const html = renderToString(React.createElement(MinHRFormula));
  const checks = [
    ['renders the title', html.includes('Minimum Detectable Effect Size')],
    ['renders the variable definition', html.includes('target power')],
    ['contains a container for the equation', html.includes('class="text-sm"')],
  ];

  for (const [name, cond] of checks) {
    console.log(`  ${cond ? '✓' : '✗'} ${name}`);
    if (!cond) failed = true;
  }
} catch (err) {
  console.error('  ✗ MinHRFormula threw during server render:');
  console.error(err && err.stack ? err.stack : err);
  failed = true;
}

if (failed) {
  console.log('\nMIN HR FORMULA TEST FAILED\n');
  process.exit(1);
} else {
  console.log('\nMIN HR FORMULA TEST PASSED\n');
}
