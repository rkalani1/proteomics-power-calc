/**
 * Test for findOptimalStage1FDR
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
function assertEqual(actual, expected, msg) {
  total++;
  const actStr = typeof actual === 'object' ? JSON.stringify(actual) : String(actual);
  const expStr = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
  if (actStr === expStr) {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  } else {
    console.error(`❌ FAIL: ${msg}`);
    console.error(`   Expected: ${expStr}`);
    console.error(`   Actual:   ${actStr}`);
    process.exitCode = 1;
  }
}

function assertClose(actual, expected, tol, msg) {
  total++;
  if (Math.abs(actual - expected) < tol) {
    passed++;
    console.log(`✅ PASS: ${msg} (actual: ${actual.toFixed(4)}, expected: ${expected.toFixed(4)})`);
  } else {
    console.error(`❌ FAIL: ${msg}`);
    console.error(`   Expected: ${expected} (±${tol})`);
    console.error(`   Actual:   ${actual}`);
    process.exitCode = 1;
  }
}

function assert(condition, msg) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  } else {
    console.error(`❌ FAIL: ${msg}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
console.log('Testing findOptimalStage1FDR...\n');

// Set up mock inputs
const effectSize = 1.5; // Example hazard ratio
const analysisType = 'cox'; // AnalysisType is lowercase 'cox'

// We use realistic sample size / events to ensure powers vary across the FDR grid
const baseParams = {
  stage1Proteins: 1000,
  expectedHits: 50,
  stage1SampleSize: 200,
  stage2SampleSize: 200,
  sampleOverlap: 0, // No overlap
  stage2Alpha: 0.05
};

const studyParams = {
  events: 60, // Limit events to keep power below 1.0, so there is a unique maximum
};

// Test 1: Default grid
const defaultGridResult = S.findOptimalStage1FDR(
  effectSize,
  analysisType,
  baseParams,
  studyParams
);

assertEqual(
  defaultGridResult.results.length,
  8, // Default grid has 8 values: [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50]
  'Default fdrGrid should contain 8 values'
);

assertEqual(
  typeof defaultGridResult.optimalFDR,
  'number',
  'optimalFDR should be a number'
);

assertEqual(
  typeof defaultGridResult.maxJointPower,
  'number',
  'maxJointPower should be a number'
);

assert(
  defaultGridResult.maxJointPower > 0,
  'maxJointPower should be greater than 0 with these parameters'
);

assert(
  defaultGridResult.maxJointPower < 1,
  'maxJointPower should be less than 1.0 to ensure meaningful grid search'
);

// We verify that the maximum joint power returned matches the max in the results array
const maxPowerInResults = defaultGridResult.results.reduce(
  (max, res) => Math.max(max, res.jointPower), 0
);
assertClose(defaultGridResult.maxJointPower, maxPowerInResults, 1e-6, 'maxJointPower should equal the max power in results array');

// Note: If multiple FDR values yield the exact same power, the function returns the last one
// because `reduce((a, b) => a.jointPower > b.jointPower ? a : b)` returns `b` when they are equal.
// We use a custom reduce check here to match that exact behavior to ensure stability.
const optimalFDRFromResults = defaultGridResult.results.reduce(
  (a, b) => a.jointPower > b.jointPower ? a : b
).fdr;
assertEqual(defaultGridResult.optimalFDR, optimalFDRFromResults, 'optimalFDR should match the fdr of the max power in results array logic');


// Test 2: Custom grid
const customGrid = [0.01, 0.5, 0.99];
const customGridResult = S.findOptimalStage1FDR(
  effectSize,
  analysisType,
  baseParams,
  studyParams,
  customGrid
);

assertEqual(
  customGridResult.results.length,
  3,
  'Custom fdrGrid length should match the provided array length'
);
assertEqual(customGridResult.results[0].fdr, 0.01, 'Custom grid value 1 matches');
assertEqual(customGridResult.results[1].fdr, 0.5, 'Custom grid value 2 matches');
assertEqual(customGridResult.results[2].fdr, 0.99, 'Custom grid value 3 matches');

// Test 3: Edge case - high expected hits (all hits) vs no hits
const baseParamsAllHits = {
  ...baseParams,
  expectedHits: 1000
};
const resultAllHits = S.findOptimalStage1FDR(
  effectSize,
  analysisType,
  baseParamsAllHits,
  studyParams,
  [0.05, 0.2, 0.5]
);
assertEqual(
  resultAllHits.results.length,
  3,
  'Grid should process normally with expectedHits = stage1Proteins'
);


console.log(`\nTests completed: ${passed}/${total} passed.`);
if (passed !== total) {
  process.exitCode = 1;
}
