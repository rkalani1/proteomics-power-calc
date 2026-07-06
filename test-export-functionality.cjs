/**
 * EXPORT FUNCTIONALITY TEST
 *
 * Verifies that the export utilities correctly generate CSV, HTML, and text summaries.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

// ---------------------------------------------------------------------------
// Compile the real TypeScript source to a CommonJS bundle and load it.
// ---------------------------------------------------------------------------
const SRC = path.join(__dirname, 'src', 'utils', 'exportUtils.ts');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(os.tmpdir(), `exportUtils.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
const E = require(bundlePath);
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

console.log('\n' + '='.repeat(70));
console.log('EXPORT FUNCTIONALITY VERIFICATION');
console.log('='.repeat(70));

const mockData = {
  analysisType: 'cox',
  studyDesign: 'cohort',
  scenarios: [
    {
      proteinCount: 1000,
      alpha: 0.00005,
      minEffect: 1.5,
      powerAtInput: 0.8,
      sampleNeeded: 400
    }
  ],
  effectSize: 1.2,
  targetPower: 0.8,
  fdrQ: 0.05,
  correctionMethod: 'fdr',
  sampleSize: 1000,
  events: 400,
  prevalence: 0.1,
  residualSD: 1,
  numCases: 200,
  numControls: 400,
  subcohortSize: 500,
  totalCohort: 5000,
  matchingRatio: 4,
  clusterSize: 5,
  icc: 0.05,
  covariateR2: 0.1,
  effectSymbol: 'HR',
  effectLabel: 'Hazard Ratio',
  tableData: [
    { effect: 1.1, power_1000: 0.5 }
  ]
};

// 1. Test generateCSV
console.log('\n1. generateCSV');
const csv = E.generateCSV(mockData);
ok(csv.includes('Proteomics Power Calculator - Analysis Results'), 'CSV includes title');
ok(csv.includes('Analysis Type,Cox Proportional Hazards'), 'CSV includes analysis type');
ok(csv.includes('Hazard Ratio (HR),1.2'), 'CSV includes effect size');
ok(csv.includes('1000,5.000e-5,1.5000,80.0%,400'), 'CSV includes scenario results');
ok(csv.includes('Covariate R² (protein ~ covariates),0.1'), 'CSV includes design params (covariate R2)');

// 2. Test generatePrintHTML
console.log('\n2. generatePrintHTML');
const html = E.generatePrintHTML(mockData);
ok(html.includes('<h1>Proteomics Power Analysis</h1>'), 'HTML includes title');
ok(html.includes('<td>Cox Proportional Hazards</td>'), 'HTML includes analysis type');
ok(html.includes('<td>1,000</td>'), 'HTML includes formatted protein count');
ok(html.includes('power-good'), 'HTML includes power status class');
ok(html.includes('Covariate R² (protein ~ covariates)'), 'HTML includes design params');

// 3. Test generateTextSummary
console.log('\n3. generateTextSummary');
const text = E.generateTextSummary(mockData);
ok(text.includes('PROTEOMICS POWER ANALYSIS SUMMARY'), 'Text includes title');
ok(text.includes('Analysis: Cox Proportional Hazards (Cohort)'), 'Text includes analysis and design');
ok(text.includes('Events: 400'), 'Text includes events for Cox');
ok(text.includes('- 1,000 proteins: Power=80.0%, Min HR=1.500'), 'Text includes scenario summary');

// 4. Test Case-Control Specifics
console.log('\n4. Case-Control Specifics');
const ccData = { ...mockData, studyDesign: 'case-control', analysisType: 'logistic' };
const ccCsv = E.generateCSV(ccData);
ok(ccCsv.includes('Study Design,Case-Control'), 'CC CSV includes study design');
ok(ccCsv.includes('Number of Cases,200'), 'CC CSV includes cases');
ok(ccCsv.includes('Number of Controls,400'), 'CC CSV includes controls');

const ccText = E.generateTextSummary(ccData);
ok(ccText.includes('Cases/Controls: 200/400'), 'CC text summary includes cases/controls');

// 5. Test GEE Specifics
console.log('\n5. GEE Specifics');
const geeData = { ...mockData, analysisType: 'gee' };
const geeCsv = E.generateCSV(geeData);
ok(geeCsv.includes('Cluster Size (m),5'), 'GEE CSV includes cluster size');
ok(geeCsv.includes('Intraclass Correlation (ICC),0.05'), 'GEE CSV includes ICC');

// 6. Test performPrint success and error fallback paths
console.log('\n6. performPrint Fallback Path');

// Setup global mocks
let revokeUrlArgs = [];
let setTimeoutArgs = [];
let alertArgs = [];

global.URL = {
  createObjectURL: (blob) => 'mock-blob-url',
  revokeObjectURL: (url) => revokeUrlArgs.push(url),
};
global.Blob = class Blob {
  constructor(content, options) {
    this.content = content;
    this.options = options;
  }
};
global.alert = (msg) => alertArgs.push(msg);

const originalSetTimeout = global.setTimeout;
global.setTimeout = (cb, delay) => {
  setTimeoutArgs.push({ cb, delay });
  return 1; // Return a dummy timer ID to avoid hanging the event loop for 60 seconds
};

// 6a. Test successful window.open without onload error
let mockWindow = {};
global.window = {
  open: (url, target) => {
    mockWindow = { onload: null };
    return mockWindow;
  }
};

revokeUrlArgs = [];
setTimeoutArgs = [];
E.performPrint('<html></html>');

ok(setTimeoutArgs.length === 0, 'setTimeout is not called on successful print initialization');
if (typeof mockWindow.onload === 'function') {
  mockWindow.onload();
  ok(revokeUrlArgs.includes('mock-blob-url'), 'revokeObjectURL is called from onload');
} else {
  ok(false, 'onload handler was not assigned', 'Expected function, got ' + typeof mockWindow.onload);
}

// 6b. Test window.open returning null (popup blocker)
global.window.open = () => null;
revokeUrlArgs = [];
alertArgs = [];
E.performPrint('<html></html>');
ok(alertArgs.length > 0 && alertArgs[0].includes('allow popups'), 'alert is called when window is null');
ok(revokeUrlArgs.includes('mock-blob-url'), 'revokeObjectURL is called when window is null');


// 6c. Test error when assigning to printWindow.onload
global.window.open = () => {
  return {
    get onload() { return null; },
    set onload(val) {
      throw new Error('Cross-origin restriction mock error');
    }
  };
};

revokeUrlArgs = [];
setTimeoutArgs = [];
E.performPrint('<html></html>');

ok(setTimeoutArgs.length === 1, 'setTimeout fallback is called on onload error');
if (setTimeoutArgs.length === 1) {
  ok(setTimeoutArgs[0].delay === 60000, 'setTimeout fallback uses 60000ms delay');

  // trigger the callback
  setTimeoutArgs[0].cb();
  ok(revokeUrlArgs.includes('mock-blob-url'), 'revokeObjectURL is called from setTimeout fallback callback');
}

// restore
global.setTimeout = originalSetTimeout;


console.log('\n' + '='.repeat(70));
console.log(`EXPORT RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');

if (fails.length) {
  process.exit(1);
}
