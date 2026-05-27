/**
 * LOGISTIC REGRESSION UI VALUE VERIFICATION
 */

const jstat = require('jstat');

const normalCDF = (z) => jstat.normal.cdf(z, 0, 1);
const normalQuantile = (p) => jstat.normal.inv(p, 0, 1);
const calculateEffectiveAlpha = (fdrQ, numTests) => fdrQ / numTests;

const calculateLogisticSE = (n, prev) => 1 / Math.sqrt(n * prev * (1 - prev));

const calculateLogisticPower = (or, n, prev, alpha) => {
  const logOR = Math.log(or);
  const se = calculateLogisticSE(n, prev);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const lambda = Math.abs(logOR) / se;
  return normalCDF(lambda - zAlpha) + normalCDF(-lambda - zAlpha);
};

const calculateLogisticMinEffect = (targetPower, n, prev, alpha) => {
  const se = calculateLogisticSE(n, prev);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  return Math.exp((zAlpha + zBeta) * se);
};

const calculateLogisticRequiredN = (or, targetPower, prev, alpha) => {
  const logOR = Math.log(or);
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(targetPower);
  const n = Math.pow((zAlpha + zBeta) / Math.abs(logOR), 2) / (prev * (1 - prev));
  return Math.ceil(n);
};

console.log('='.repeat(70));
console.log('LOGISTIC REGRESSION UI VERIFICATION');
console.log('='.repeat(70));

// UI Parameters:
const proteins = 5000;
const n = 1000;
const prev = 0.10;
const or = 1.30;
const fdrQ = 0.05;
const targetPower = 0.80;
const alpha = calculateEffectiveAlpha(fdrQ, proteins);

console.log(`\nParameters: n=${n}, prevalence=${prev}, OR=${or}, ${proteins} proteins`);

console.log('\n1. SE(log OR)');
const se = calculateLogisticSE(n, prev);
console.log(`   UI: 0.1054, Calc: ${se.toFixed(4)} ${Math.abs(se - 0.1054) < 0.0001 ? '✓' : '✗'}`);

console.log('\n2. Power for OR=1.30');
const power = calculateLogisticPower(or, n, prev, alpha);
console.log(`   UI: 2.7%, Calc: ${(power*100).toFixed(1)}% ${Math.abs(power*100 - 2.7) < 0.1 ? '✓' : '✗'}`);

console.log('\n3. Min OR for 80% power');
const minOR = calculateLogisticMinEffect(targetPower, n, prev, alpha);
console.log(`   UI: OR ≥ 1.74, Calc: ${minOR.toFixed(2)} ${Math.abs(minOR - 1.74) < 0.01 ? '✓' : '✗'}`);

console.log('\n4. Sample size required for 80% power at OR=1.30');
const reqN = calculateLogisticRequiredN(or, targetPower, prev, alpha);
console.log(`   UI: 4,464, Calc: ${reqN} ${reqN === 4464 ? '✓' : '✗'}`);

console.log('\n5. Power table verification');
const tableORs = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0];
const uiValues = [0.0, 0.4, 11.0, 51.7, 87.7, 98.5, 99.9, 100.0, 100.0, 100.0, 100.0];

let allMatch = true;
tableORs.forEach((testOR, i) => {
  const calcPower = calculateLogisticPower(testOR, n, prev, alpha) * 100;
  const match = Math.abs(calcPower - uiValues[i]) < 0.15;
  if (!match) allMatch = false;
  console.log(`   OR=${testOR.toFixed(1)}: UI=${uiValues[i].toFixed(1)}%, Calc=${calcPower.toFixed(1)}% ${match ? '✓' : '✗'}`);
});

console.log('\n' + '='.repeat(70));
console.log(allMatch ? '✓ ALL LOGISTIC REGRESSION VALUES VERIFIED' : '✗ SOME VALUES DO NOT MATCH');
console.log('='.repeat(70) + '\n');
