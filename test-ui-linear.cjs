/**
 * LINEAR REGRESSION UI VALUE VERIFICATION
 */

const jstat = require('jstat');

const normalCDF = (z) => jstat.normal.cdf(z, 0, 1);
const normalQuantile = (p) => jstat.normal.inv(p, 0, 1);
const calculateEffectiveAlpha = (fdrQ, numTests) => fdrQ / numTests;

const calculateLinearSE = (n, residualSD) => residualSD / Math.sqrt(n - 2);

const calculateLinearPower = (beta, n, residualSD, alpha) => {
  const se = calculateLinearSE(n, residualSD);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(beta) / se;
  return normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
};

const calculateLinearMinEffect = (targetPower, n, residualSD, alpha) => {
  const se = calculateLinearSE(n, residualSD);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  return (zAlpha + zBeta) * se;
};

const calculateLinearRequiredN = (beta, targetPower, residualSD, alpha) => {
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const n = Math.pow((zAlpha + zBeta) * residualSD / Math.abs(beta), 2) + 2;
  return Math.ceil(n);
};

console.log('='.repeat(70));
console.log('LINEAR REGRESSION UI VERIFICATION');
console.log('='.repeat(70));

// UI Parameters:
const proteins = 5000;
const n = 1000;
const residualSD = 1.0;
const beta = 0.200;
const fdrQ = 0.05;
const targetPower = 0.80;
const alpha = calculateEffectiveAlpha(fdrQ, proteins);

console.log(`\nParameters: n=${n}, σ=${residualSD}, β=${beta}, ${proteins} proteins`);

console.log('\n1. SE(β)');
const se = calculateLinearSE(n, residualSD);
console.log(`   UI: 0.0317, Calc: ${se.toFixed(4)} ${Math.abs(se - 0.0317) < 0.0001 ? '✓' : '✗'}`);

console.log('\n2. Power for β=0.200');
const power = calculateLinearPower(beta, n, residualSD, alpha);
console.log(`   UI: 97.1%, Calc: ${(power*100).toFixed(1)}% ${Math.abs(power*100 - 97.1) < 0.1 ? '✓' : '✗'}`);

console.log('\n3. Min β for 80% power');
const minBeta = calculateLinearMinEffect(targetPower, n, residualSD, alpha);
console.log(`   UI: β ≥ 0.166, Calc: ${minBeta.toFixed(3)} ${Math.abs(minBeta - 0.166) < 0.001 ? '✓' : '✗'}`);

console.log('\n4. Sample size required for 80% power at β=0.200');
const reqN = calculateLinearRequiredN(beta, targetPower, residualSD, alpha);
console.log(`   UI: 694, Calc: ${reqN} ${reqN === 694 ? '✓' : '✗'}`);

console.log('\n5. Power table verification');
const tableBetas = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const uiValues = [0.0, 10.4, 97.1, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0];

let allMatch = true;
tableBetas.forEach((b, i) => {
  const calcPower = calculateLinearPower(b, n, residualSD, alpha) * 100;
  const match = Math.abs(calcPower - uiValues[i]) < 0.15;
  if (!match) allMatch = false;
  console.log(`   β=${b.toFixed(1)}: UI=${uiValues[i].toFixed(1)}%, Calc=${calcPower.toFixed(1)}% ${match ? '✓' : '✗'}`);
});

console.log('\n' + '='.repeat(70));
console.log(allMatch ? '✓ ALL LINEAR REGRESSION VALUES VERIFIED' : '✗ SOME VALUES DO NOT MATCH');
console.log('='.repeat(70) + '\n');
