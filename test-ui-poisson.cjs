/**
 * MODIFIED POISSON UI VALUE VERIFICATION
 */

const jstat = require('jstat');

const normalCDF = (z) => jstat.normal.cdf(z, 0, 1);
const normalQuantile = (p) => jstat.normal.inv(p, 0, 1);
const calculateEffectiveAlpha = (fdrQ, numTests) => fdrQ / numTests;

const calculatePoissonSE = (n, prev) => Math.sqrt(1 / (n * prev));

const calculatePoissonPower = (rr, n, prev, alpha) => {
  const logRR = Math.log(rr);
  const se = calculatePoissonSE(n, prev);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logRR) / se;
  return normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
};

const calculatePoissonMinEffect = (targetPower, n, prev, alpha) => {
  const se = calculatePoissonSE(n, prev);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  return Math.exp((zAlpha + zBeta) * se);
};

const calculatePoissonRequiredN = (rr, targetPower, prev, alpha) => {
  const logRR = Math.log(rr);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const n = Math.pow((zAlpha + zBeta) / Math.abs(logRR), 2) / prev;
  return Math.ceil(n);
};

console.log('='.repeat(70));
console.log('MODIFIED POISSON UI VERIFICATION');
console.log('='.repeat(70));

// UI Parameters:
const proteins = 5000;
const n = 1000;
const prev = 0.10;
const rr = 1.20;
const fdrQ = 0.05;
const targetPower = 0.80;
const alpha = calculateEffectiveAlpha(fdrQ, proteins);

console.log(`\nParameters: n=${n}, prevalence=${prev}, RR=${rr}, ${proteins} proteins`);

console.log('\n1. SE(log RR)');
const se = calculatePoissonSE(n, prev);
console.log(`   UI: 0.1000, Calc: ${se.toFixed(4)} ${Math.abs(se - 0.1000) < 0.0001 ? '✓' : '✗'}`);

console.log('\n2. Power for RR=1.20');
const power = calculatePoissonPower(rr, n, prev, alpha);
console.log(`   UI: 0.5%, Calc: ${(power*100).toFixed(1)}% ${Math.abs(power*100 - 0.5) < 0.1 ? '✓' : '✗'}`);

console.log('\n3. Min RR for 80% power');
const minRR = calculatePoissonMinEffect(targetPower, n, prev, alpha);
console.log(`   UI: RR ≥ 1.69, Calc: ${minRR.toFixed(2)} ${Math.abs(minRR - 1.69) < 0.01 ? '✓' : '✗'}`);

console.log('\n4. Sample size required for 80% power at RR=1.20');
const reqN = calculatePoissonRequiredN(rr, targetPower, prev, alpha);
console.log(`   UI: 8,320, Calc: ${reqN} ${reqN === 8320 ? '✓' : '✗'}`);

console.log('\n5. Power table verification');
const tableRRs = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0];
const uiValues = [0.0, 0.5, 14.6, 61.1, 92.8, 99.4, 100.0, 100.0, 100.0, 100.0, 100.0];

let allMatch = true;
tableRRs.forEach((testRR, i) => {
  const calcPower = calculatePoissonPower(testRR, n, prev, alpha) * 100;
  const match = Math.abs(calcPower - uiValues[i]) < 0.15;
  if (!match) allMatch = false;
  console.log(`   RR=${testRR.toFixed(1)}: UI=${uiValues[i].toFixed(1)}%, Calc=${calcPower.toFixed(1)}% ${match ? '✓' : '✗'}`);
});

console.log('\n' + '='.repeat(70));
console.log(allMatch ? '✓ ALL MODIFIED POISSON VALUES VERIFIED' : '✗ SOME VALUES DO NOT MATCH');
console.log('='.repeat(70) + '\n');
