/**
 * Test for calculateRequiredStage2Size
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

// ---------------------------------------------------------------------------
// Compile the real TypeScript source to a CommonJS bundle and load it.
// ---------------------------------------------------------------------------
const SRC = path.join(__dirname, 'src', 'utils', 'statistics.ts');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(os.tmpdir(), `statistics.test.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
const S = require(bundlePath);
process.on('exit', () => { try { fs.unlinkSync(bundlePath); } catch { /* ignore */ } });

// ---------------------------------------------------------------------------
// Tiny assertion framework
// ---------------------------------------------------------------------------
let total = 0, passed = 0;
const fails = [];
const ok = (cond, name, detail = '') => {
  total++;
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { fails.push({ name, detail }); console.log(`  ✗ ${name}  ${detail}`); }
};
const close = (a, b, tol, name) =>
  ok(Math.abs(a - b) <= tol, name, `got ${a}, expected ${b} (|diff|=${Math.abs(a - b).toExponential(2)} > ${tol})`);

console.log('\n' + '='.repeat(70));
console.log('TESTING calculateRequiredStage2Size');
console.log('='.repeat(70));

// Test Case 1: Basic functionality for Cox
console.log('\n1. Basic functionality (Cox)');
const effectSize = 1.15;
const analysisType = 'cox';
const targetJointPower = 0.5;
const twoStageParams = {
  stage1Proteins: 1000,
  stage1SampleSize: 800,
  stage1FDR: 0.1,
  stage2Alpha: 0.05,
  expectedHits: 1,
  sampleOverlap: 0
};
const studyParams = {
  events: 800,
  studyDesign: 'cohort'
};

const requiredN = S.calculateRequiredStage2Size(
  effectSize,
  analysisType,
  targetJointPower,
  twoStageParams,
  studyParams
);

console.log(`  Required Stage 2 N: ${requiredN}`);
ok(requiredN > 0, 'Required N should be positive');

// Round-trip verification
const result = S.calculateTwoStagePower(
  effectSize,
  analysisType,
  { ...twoStageParams, stage2SampleSize: requiredN },
  studyParams
);

console.log(`  Stage 1 Power: ${result.stage1Power}`);
console.log(`  Stage 2 Power: ${result.stage2Power}`);
console.log(`  Achieved Joint Power: ${result.jointPower}`);
close(result.jointPower, targetJointPower, 0.02, 'Achieved power should be close to target power');

// Test Case 2: Monotonicity
console.log('\n2. Monotonicity');
const targetPowerHigh = 0.6;
const requiredNHigh = S.calculateRequiredStage2Size(
  effectSize,
  analysisType,
  targetPowerHigh,
  twoStageParams,
  studyParams
);
console.log(`  Required N for 0.5 power: ${requiredN}`);
console.log(`  Required N for 0.6 power: ${requiredNHigh}`);
ok(requiredNHigh > requiredN, 'Higher target power should require larger sample size');

// Test Case 3: Analysis Type: Linear
console.log('\n3. Analysis Type: Linear');
const linearEffect = 0.2;
const linearAnalysis = 'linear';
const linearTwoStageParams = {
    ...twoStageParams,
    stage1SampleSize: 1000,
}
const linearStudyParams = {
  residualSD: 1.0
};
const requiredNLinear = S.calculateRequiredStage2Size(
  linearEffect,
  linearAnalysis,
  0.8,
  linearTwoStageParams,
  linearStudyParams
);
console.log(`  Required Stage 2 N (Linear): ${requiredNLinear}`);
const resultLinear = S.calculateTwoStagePower(
  linearEffect,
  linearAnalysis,
  { ...linearTwoStageParams, stage2SampleSize: requiredNLinear },
  linearStudyParams
);
console.log(`  Stage 1 Power (Linear): ${resultLinear.stage1Power}`);
console.log(`  Stage 2 Power (Linear): ${resultLinear.stage2Power}`);
console.log(`  Achieved Joint Power (Linear): ${resultLinear.jointPower}`);
close(resultLinear.jointPower, 0.8, 0.02, 'Achieved linear power should be close to target');

// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');
if (fails.length) {
  fails.forEach((f) => console.log(`  ✗ ${f.name}: ${f.detail}`));
  process.exit(1);
}
console.log('calculateRequiredStage2Size tests passed successfully!\n');
