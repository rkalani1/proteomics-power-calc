/**
 * UI VALUE VERIFICATION TEST
 *
 * Verifies that specific values shown in the UI match expected calculations.
 * These are the exact values displayed on screen.
 */

const jstat = require('jstat');

// Core functions
const normalCDF = (z) => jstat.normal.cdf(z, 0, 1);
const normalQuantile = (p) => jstat.normal.inv(p, 0, 1);

const calculateEffectiveAlpha = (fdrQ, numTests) => fdrQ / numTests;
const calculateCoxSE = (events) => 1 / Math.sqrt(events);

const calculateCoxPower = (hr, events, alpha) => {
  const logHR = Math.log(hr);
  const se = calculateCoxSE(events);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logHR) / se;
  return normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
};

const calculateCoxMinEffect = (targetPower, events, alpha) => {
  const se = calculateCoxSE(events);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  return Math.exp((zAlpha + zBeta) * se);
};

const calculateCoxRequiredEvents = (hr, targetPower, alpha) => {
  const logHR = Math.log(hr);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const sqrtD = (zAlpha + zBeta) / Math.abs(logHR);
  return Math.ceil(sqrtD * sqrtD);
};

console.log('='.repeat(70));
console.log('UI VALUE VERIFICATION');
console.log('='.repeat(70));

// UI Parameters from screenshot:
const proteins = 5000;
const events = 70;
const fdrQ = 0.05;
const hr = 1.20;
const targetPower = 0.80;

// Calculate effective alpha
const alpha = calculateEffectiveAlpha(fdrQ, proteins);
console.log(`\nParameters: ${proteins} proteins, ${events} events, FDR q=${fdrQ}, HR=${hr}`);
console.log(`Effective α = ${fdrQ} / ${proteins} = ${alpha.toExponential(2)}`);

console.log('\n' + '-'.repeat(50));
console.log('1. EFFECTIVE ALPHA');
console.log('-'.repeat(50));
console.log(`  UI displays: α ≈ 1.00e-5`);
console.log(`  Calculated:  α = ${alpha.toExponential(2)}`);
console.log(`  Match: ${Math.abs(alpha - 1e-5) < 1e-10 ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n' + '-'.repeat(50));
console.log('2. STANDARD ERROR');
console.log('-'.repeat(50));
const se = calculateCoxSE(events);
console.log(`  UI displays: SE(log HR) = 0.1195`);
console.log(`  Calculated:  SE = 1/√${events} = ${se.toFixed(4)}`);
console.log(`  Match: ${Math.abs(se - 0.1195) < 0.0005 ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n' + '-'.repeat(50));
console.log('3. POWER FOR HR=1.20');
console.log('-'.repeat(50));
const power = calculateCoxPower(hr, events, alpha);
console.log(`  UI displays: 0.2%`);
console.log(`  Calculated:  ${(power * 100).toFixed(1)}%`);
console.log(`  Match: ${Math.abs(power * 100 - 0.2) < 0.1 ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n' + '-'.repeat(50));
console.log('4. MINIMUM DETECTABLE HR (80% power)');
console.log('-'.repeat(50));
const minHR = calculateCoxMinEffect(targetPower, events, alpha);
console.log(`  UI displays: HR ≥ 1.87`);
console.log(`  Calculated:  HR = ${minHR.toFixed(2)}`);
console.log(`  Match: ${Math.abs(minHR - 1.87) < 0.01 ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n' + '-'.repeat(50));
console.log('5. EVENTS REQUIRED (80% power at HR=1.20)');
console.log('-'.repeat(50));
const reqEvents = calculateCoxRequiredEvents(hr, targetPower, alpha);
console.log(`  UI displays: 832`);
console.log(`  Calculated:  ${reqEvents}`);
console.log(`  Match: ${reqEvents === 832 ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n' + '-'.repeat(50));
console.log('6. POWER TABLE VALUES');
console.log('-'.repeat(50));

const tableHRs = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0];
const uiValues = [0.0, 0.2, 5.5, 31.4, 69.2, 91.7, 98.5, 99.8, 100.0, 100.0, 100.0];

let tablePass = true;
tableHRs.forEach((testHR, i) => {
  const calcPower = calculateCoxPower(testHR, events, alpha) * 100;
  const uiPower = uiValues[i];
  const match = Math.abs(calcPower - uiPower) < 0.1;
  if (!match) tablePass = false;
  console.log(`  HR=${testHR.toFixed(2)}: UI=${uiPower.toFixed(1)}%, Calc=${calcPower.toFixed(1)}% ${match ? '✓' : '✗'}`);
});
console.log(`  Table Match: ${tablePass ? '✓ PASS' : '✗ FAIL'}`);

console.log('\n' + '-'.repeat(50));
console.log('7. SENSITIVITY MATRIX SAMPLE');
console.log('-'.repeat(50));

// Test sensitivity matrix: 1 protein, HR=1.4, should be 80%
const sensAlpha1 = calculateEffectiveAlpha(0.05, 1);
const sensPower1 = calculateCoxPower(1.4, 70, sensAlpha1) * 100;
console.log(`  1 protein, HR=1.4: UI=80%, Calc=${Math.round(sensPower1)}% ${Math.round(sensPower1) === 80 ? '✓' : '✗'}`);

// 5 proteins, HR=1.5, should be 79%
const sensAlpha5 = calculateEffectiveAlpha(0.05, 5);
const sensPower5 = calculateCoxPower(1.5, 70, sensAlpha5) * 100;
console.log(`  5 proteins, HR=1.5: UI=79%, Calc=${Math.round(sensPower5)}% ${Math.round(sensPower5) === 79 ? '✓' : '✗'}`);

// 100 proteins, HR=1.8, should be 92%
const sensAlpha100 = calculateEffectiveAlpha(0.05, 100);
const sensPower100 = calculateCoxPower(1.8, 70, sensAlpha100) * 100;
console.log(`  100 proteins, HR=1.8: UI=92%, Calc=${Math.round(sensPower100)}% ${Math.round(sensPower100) === 92 ? '✓' : '✗'}`);

// 5000 proteins, HR=2.0, should be 92%
const sensAlpha5000 = calculateEffectiveAlpha(0.05, 5000);
const sensPower5000 = calculateCoxPower(2.0, 70, sensAlpha5000) * 100;
console.log(`  5000 proteins, HR=2.0: UI=92%, Calc=${Math.round(sensPower5000)}% ${Math.round(sensPower5000) === 92 ? '✓' : '✗'}`);

console.log('\n' + '='.repeat(70));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(70));
console.log('\n');
