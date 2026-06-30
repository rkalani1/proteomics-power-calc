/**
 * SMOKE TEST for MultiScenarioPowerChart
 *
 * Verifies that the MultiScenarioPowerChart component renders correctly with Recharts
 * when rendered to a string using react-dom/server.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');
const React = require('react');
const { renderToString } = require('react-dom/server');

const chartPath = path.resolve(__dirname, 'src/components/MultiScenarioPowerChart.tsx');
const entry = path.join(os.tmpdir(), `multi-scenario-entry.${process.pid}.tsx`);
fs.writeFileSync(entry, `export { default as MultiScenarioPowerChart } from ${JSON.stringify(chartPath)};\n`);

const out = esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  loader: { '.css': 'empty', '.svg': 'text' },
  external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'recharts'],
  write: false,
  logLevel: 'silent',
});

const bundlePath = path.join(__dirname, `.smoke-multi-scenario.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
process.on('exit', () => {
  for (const p of [entry, bundlePath]) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
});

const { MultiScenarioPowerChart } = require(path.resolve(bundlePath));

console.log('='.repeat(70));
console.log('TESTING MultiScenarioPowerChart (Smoke Render)');
console.log('='.repeat(70));

let failed = false;

// Mock data
const scenarios = [
  { proteinCount: 1000, alpha: 0.05, color: { bg: '', text: '', light: '', border: '', hex: '#ff0000' } },
  { proteinCount: 5000, alpha: 0.01, color: { bg: '', text: '', light: '', border: '', hex: '#00ff00' } },
];
const data = [
  { effect: 1.0, power_1000: 0.1, power_5000: 0.05 },
  { effect: 1.5, power_1000: 0.5, power_5000: 0.3 },
  { effect: 2.0, power_1000: 0.9, power_5000: 0.8 },
];

try {
  // Test Cox Model Rendering
  const htmlCox = renderToString(React.createElement(MultiScenarioPowerChart, {
    data,
    scenarios,
    targetPower: 0.8,
    inputEffect: 1.5,
    effectLabel: 'Hazard Ratio',
    effectSymbol: 'HR',
    analysisType: 'cox'
  }));

  const checksCox = [
    ['renders title for Cox', htmlCox.includes('Power vs <!-- -->Hazard Ratio')],
    ['renders scenario descriptions', htmlCox.includes('1,000 proteins') && htmlCox.includes('5,000 proteins') && htmlCox.includes('Comparing')],
    ['renders target power threshold', htmlCox.includes('Target power threshold (<!-- -->80<!-- -->%)')],
    ['renders input effect label for Cox (2 decimals)', htmlCox.includes('Input <!-- -->HR<!-- --> = <!-- -->1.50')],
    ['produced reasonable markup length', htmlCox.length > 500]
  ];

  console.log('\n--- Cox Analysis ---');
  for (const [name, cond] of checksCox) {
    console.log(`  ${cond ? '✓' : '✗'} ${name}`);
    if (!cond) failed = true;
  }

  // Test Linear Model Rendering
  const htmlLinear = renderToString(React.createElement(MultiScenarioPowerChart, {
    data: data.map(d => ({ effect: d.effect - 1, power_1000: d.power_1000, power_5000: d.power_5000 })),
    scenarios,
    targetPower: 0.9,
    inputEffect: 0.5,
    effectLabel: 'Beta',
    effectSymbol: 'β',
    analysisType: 'linear'
  }));

  const checksLinear = [
    ['renders title for Linear', htmlLinear.includes('Power vs <!-- -->Beta')],
    ['renders input effect label for Linear (3 decimals)', htmlLinear.includes('Input <!-- -->β<!-- --> = <!-- -->0.500')],
    ['renders target power threshold', htmlLinear.includes('Target power threshold (<!-- -->90<!-- -->%)')],
  ];

  console.log('\n--- Linear Analysis ---');
  for (const [name, cond] of checksLinear) {
    console.log(`  ${cond ? '✓' : '✗'} ${name}`);
    if (!cond) failed = true;
  }

  // Test Edge Cases: Empty Data & Scenarios
  const htmlEmpty = renderToString(React.createElement(MultiScenarioPowerChart, {
    data: [],
    scenarios: [],
    targetPower: 0.8,
    inputEffect: 1.0,
    effectLabel: 'Effect',
    effectSymbol: 'E',
    analysisType: 'cox'
  }));

  const checksEmpty = [
    ['handles empty data gracefully', htmlEmpty.includes('Power vs <!-- -->Effect')],
    ['handles empty scenarios gracefully', htmlEmpty.includes('Comparing') && htmlEmpty.includes('0')],
  ];

  console.log('\n--- Empty Data ---');
  for (const [name, cond] of checksEmpty) {
    console.log(`  ${cond ? '✓' : '✗'} ${name}`);
    if (!cond) failed = true;
  }

} catch (err) {
  console.error('\n✗ MultiScenarioPowerChart threw during server render:');
  console.error(err && err.stack ? err.stack : err);
  failed = true;
}

console.log('\n' + '='.repeat(70));
if (failed) {
  console.error('✗ TEST FAILED');
  process.exit(1);
} else {
  console.log('✓ TEST PASSED');
  process.exit(0);
}
