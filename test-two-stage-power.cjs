/**
 * Test for calculateTwoStagePower
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
console.log('TESTING calculateTwoStagePower');
console.log('='.repeat(70));

// Base parameters for tests
const baseTwoStageParams = {
  stage1Proteins: 1000,
  stage1SampleSize: 800,
  stage2SampleSize: 400,
  stage1FDR: 0.1,
  stage2Alpha: 0.05,
  expectedHits: 10,
  sampleOverlap: 0
};
const studyParams = {
  events: 800,
  studyDesign: 'cohort'
};

// 1. Basic properties and logic
console.log('\n1. Basic Output and Math Logic (Cox)');
const resultBasic = S.calculateTwoStagePower(1.2, 'cox', baseTwoStageParams, studyParams);
ok(typeof resultBasic.stage1Power === 'number', 'stage1Power is a number');
ok(typeof resultBasic.stage2Power === 'number', 'stage2Power is a number');
ok(typeof resultBasic.jointPower === 'number', 'jointPower is a number');
close(resultBasic.jointPower, resultBasic.stage1Power * resultBasic.stage2Power, 1e-6, 'Joint power = stage1Power * stage2Power');
ok(resultBasic.stage1Alpha === baseTwoStageParams.stage1FDR / baseTwoStageParams.stage1Proteins, 'stage1Alpha uses simplified FDR approximation (threshold / tests)');

// Calculate expected advancing manually
const expectedTruePos = baseTwoStageParams.expectedHits * resultBasic.stage1Power;
const expectedFalsePos = (baseTwoStageParams.stage1Proteins - baseTwoStageParams.expectedHits) * resultBasic.stage1Alpha;
const expectedAdv = Math.round((expectedTruePos + expectedFalsePos) * 10) / 10;
close(resultBasic.expectedAdvancing, expectedAdv, 1e-6, 'expectedAdvancing math is correct');

ok(resultBasic.costEfficiency > 0, 'Cost efficiency is positive');
ok(resultBasic.totalSampleSize === baseTwoStageParams.stage1SampleSize + baseTwoStageParams.stage2SampleSize, 'Total sample size matches sum when no overlap');


// 2. Overlap behavior
console.log('\n2. Overlap Behavior');
const paramsOverlap1 = { ...baseTwoStageParams, sampleOverlap: 1 };
const resultOverlap1 = S.calculateTwoStagePower(1.2, 'cox', paramsOverlap1, studyParams);
ok(resultOverlap1.totalSampleSize === baseTwoStageParams.stage1SampleSize, 'Total sample size equals stage1 size when 100% overlap');

const paramsOverlapHalf = { ...baseTwoStageParams, sampleOverlap: 0.5 };
const resultOverlapHalf = S.calculateTwoStagePower(1.2, 'cox', paramsOverlapHalf, studyParams);
ok(resultOverlapHalf.totalSampleSize === baseTwoStageParams.stage1SampleSize + 0.5 * baseTwoStageParams.stage2SampleSize, 'Total sample size handles 50% overlap properly');

const linearStudyParams = { residualSD: 1.0, studyDesign: 'cohort' };
const resultLinear0 = S.calculateTwoStagePower(0.2, 'linear', baseTwoStageParams, linearStudyParams);
const resultLinear1 = S.calculateTwoStagePower(0.2, 'linear', paramsOverlap1, linearStudyParams);

// Since overlap reduces effective Stage 2 size (penalization), stage 2 power should be lower when overlap = 1 vs overlap = 0 (for sample size based analysis like linear)
ok(resultLinear1.stage2Power < resultLinear0.stage2Power, 'Stage 2 power is reduced when overlap = 1 due to effective sample size penalization (Linear)');


// 3. Different Analysis Types
console.log('\n3. Other Analysis Types (Linear)');
ok(typeof resultLinear0.jointPower === 'number' && resultLinear0.jointPower >= 0 && resultLinear0.jointPower <= 1, 'Calculates valid joint power for linear models');


// 4. Expected hits / Multiple testing correction in Stage 2
console.log('\n4. Stage 2 Multiple Testing Correction');
// If expected advancing > 1, stage2PerProteinAlpha = stage2Alpha / Math.ceil(expectedAdvancing)
const expectedAdvancingCeil = Math.ceil(resultBasic.expectedAdvancing);
if (expectedAdvancingCeil > 1) {
  close(resultBasic.stage2PerProteinAlpha, baseTwoStageParams.stage2Alpha / expectedAdvancingCeil, 1e-6, 'Stage 2 alpha is Bonferroni corrected based on expected advancing hits');
} else {
  ok(resultBasic.stage2PerProteinAlpha === baseTwoStageParams.stage2Alpha, 'Stage 2 alpha is uncorrected if expected advancing <= 1');
}

// What if expected hits is low and advancing < 1?
const lowHitsParams = { ...baseTwoStageParams, expectedHits: 0, stage1Proteins: 10, stage1FDR: 0.05 };
const resultLowHits = S.calculateTwoStagePower(1.2, 'cox', lowHitsParams, studyParams);
if (Math.ceil(resultLowHits.expectedAdvancing) <= 1) {
    ok(resultLowHits.stage2PerProteinAlpha === lowHitsParams.stage2Alpha, 'Stage 2 alpha is uncorrected when expected advancing <= 1');
}


console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');
if (fails.length) {
  fails.forEach((f) => console.log(`  ✗ ${f.name}: ${f.detail}`));
  process.exit(1);
}
console.log('calculateTwoStagePower tests passed successfully!\n');
