/** Generated R contract, parity, validation, and receipt tests. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const esbuild = require('esbuild');

const root = __dirname;
const entry = path.join(os.tmpdir(), `r-script-test-entry.${process.pid}.ts`);
const bundlePath = path.join(root, `.r-script-test.bundle.${process.pid}.cjs`);
fs.writeFileSync(entry, [
  `export * from ${JSON.stringify(path.join(root, 'src', 'utils', 'rScriptGenerator.ts'))};`,
  `export * from ${JSON.stringify(path.join(root, 'src', 'utils', 'statistics.ts'))};`,
  `export * from ${JSON.stringify(path.join(root, 'src', 'constants', 'analysisGrids.ts'))};`,
].join('\n'));
const built = esbuild.buildSync({
  entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', write: false, logLevel: 'silent',
});
fs.writeFileSync(bundlePath, built.outputFiles[0].text);
const M = require(bundlePath);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'proteomics-r-script-'));
process.on('exit', () => {
  for (const file of [entry, bundlePath]) {
    try { fs.unlinkSync(file); } catch { /* cleanup best effort */ }
  }
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch { /* cleanup best effort */ }
});

let total = 0;
let passed = 0;
const failures = [];
const ok = (condition, name, detail = '') => {
  total += 1;
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push({ name, detail });
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};
const close = (actual, expected, tolerance = 5e-10) =>
  Number.isFinite(actual) && Number.isFinite(expected)
  && Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected));

const base = {
  analysisType: 'cox', studyDesign: 'cohort', proteinCounts: [1, 250, 5000],
  effectSize: 1.35, targetPower: 0.8, fdrQ: 0.05, correctionMethod: 'fdr',
  sampleSize: 1800, events: 173, prevalence: 0.16, residualSD: 1.2,
  numCases: 320, numControls: 640, subcohortSize: 500, totalCohort: 5000,
  matchingRatio: 4, clusterSize: 6, icc: 0.08, covariateR2: 0.18,
};
const fixtures = [
  ['cox cohort', { analysisType: 'cox', studyDesign: 'cohort', effectSize: 1.35 }],
  ['cox case-cohort', { analysisType: 'cox', studyDesign: 'case-cohort', effectSize: 1.35 }],
  ['cox case-cohort clamped sampling', {
    analysisType: 'cox', studyDesign: 'case-cohort', effectSize: 1.35,
    subcohortSize: 6000, totalCohort: 5000,
  }],
  ['cox nested case-control', { analysisType: 'cox', studyDesign: 'nested-case-control', effectSize: 0.75 }],
  ['linear cohort', { analysisType: 'linear', studyDesign: 'cohort', effectSize: -0.18, residualSD: 1.4, sampleSize: 1200 }],
  ['linear cross-sectional', { analysisType: 'linear', studyDesign: 'cross-sectional', effectSize: 0.22 }],
  ['logistic cohort', { analysisType: 'logistic', studyDesign: 'cohort', effectSize: 1.4 }],
  ['logistic case-control', { analysisType: 'logistic', studyDesign: 'case-control', effectSize: 0.7 }],
  ['logistic cross-sectional', { analysisType: 'logistic', studyDesign: 'cross-sectional', effectSize: 1.3 }],
  ['logistic nested case-control', { analysisType: 'logistic', studyDesign: 'nested-case-control', effectSize: 1.45 }],
  ['poisson cohort', { analysisType: 'poisson', studyDesign: 'cohort', effectSize: 1.3 }],
  ['poisson cross-sectional', { analysisType: 'poisson', studyDesign: 'cross-sectional', effectSize: 0.8 }],
  ['gee cohort', { analysisType: 'gee', studyDesign: 'cohort', effectSize: 0.2 }],
  ['gee cross-sectional', { analysisType: 'gee', studyDesign: 'cross-sectional', effectSize: -0.2 }],
];
const noExtras = {
  includeSensitivity: false, includeVisualizations: false, includeCsv: false, includeSessionInfo: false,
};

const rCheck = spawnSync('Rscript', ['--version'], { encoding: 'utf8' });
const hasR = !rCheck.error && rCheck.status === 0;
if (!hasR && process.env.CI) ok(false, 'Rscript is mandatory in CI', rCheck.error?.message || rCheck.stderr);

const writeScript = (script, label, cwd = tempRoot) => {
  const scriptPath = path.join(cwd, `${label.replace(/[^a-z0-9-]/gi, '-')}.R`);
  fs.writeFileSync(scriptPath, script);
  return scriptPath;
};
const sourceWithExpression = (script, label, expression, cwd = tempRoot) => {
  const scriptPath = writeScript(script, label, cwd);
  const command = [
    'sink(tempfile())',
    `result <- source(${JSON.stringify(scriptPath)}, local = new.env())$value`,
    'sink()',
    expression,
  ].join('; ');
  return spawnSync('Rscript', ['--vanilla', '-e', command], { cwd, encoding: 'utf8' });
};
const commonParams = (data, alpha) => ({
  analysisType: data.analysisType, studyDesign: data.studyDesign, alpha,
  events: data.events, sampleSize: data.sampleSize, residualSD: data.residualSD,
  prevalence: data.prevalence, cases: data.numCases, controls: data.numControls,
  subcohortSize: data.subcohortSize, totalCohort: data.totalCohort,
  matchingRatio: data.matchingRatio, clusterSize: data.clusterSize, icc: data.icc,
  covariateR2: data.covariateR2,
});

console.log('\n' + '='.repeat(72));
console.log('R SCRIPT GENERATOR VERIFICATION');
console.log('='.repeat(72));

for (const [name, changes] of fixtures) {
  const data = { ...base, ...changes };
  const script = M.generateRScript(data, noExtras);
  ok(script.includes(`analysis_type <- "${data.analysisType}"`), `${name}: analysis type serialized`);
  ok(script.includes(`study_design <- "${data.studyDesign}"`), `${name}: study design serialized`);
  ok(!/undefined|NaN|\[object Object\]/.test(script), `${name}: no JavaScript artifacts`);
  if (!hasR) continue;

  const executed = sourceWithExpression(
    script,
    name,
    'cat(paste(apply(result$scenario_results[, c("effective_alpha", "power_at_input_effect", "minimum_detectable_effect", "required_dimension")], 1, paste, collapse="|"), collapse=";"))',
  );
  ok(executed.status === 0, `${name}: generated R executes`, executed.stderr.trim());
  if (executed.status !== 0) continue;
  const rows = executed.stdout.trim().split(';').map((row) => row.split('|').map(Number));
  ok(rows.length === data.proteinCounts.length, `${name}: every scenario row returned`);
  rows.forEach(([rAlpha, rPower, rMin, rRequired], index) => {
    const alpha = M.calculateEffectiveAlpha(data.fdrQ, data.proteinCounts[index], data.correctionMethod);
    const common = commonParams(data, alpha);
    const expectedPower = M.calculatePower({ ...common, effectSize: data.effectSize });
    const expectedMin = M.calculateMinEffect({ ...common, targetPower: data.targetPower });
    const expectedRequired = M.calculateRequiredSample({
      ...common, effectSize: data.effectSize, targetPower: data.targetPower,
      matchingRatio: data.analysisType === 'cox' ? data.matchingRatio : data.numControls / data.numCases,
    });
    ok(close(rAlpha, alpha), `${name}: scenario ${index + 1} alpha parity`, `${rAlpha} vs ${alpha}`);
    ok(close(rPower, expectedPower), `${name}: scenario ${index + 1} power parity`, `${rPower} vs ${expectedPower}`);
    ok(close(rMin, expectedMin), `${name}: scenario ${index + 1} minimum effect parity`, `${rMin} vs ${expectedMin}`);
    ok(rRequired === expectedRequired, `${name}: scenario ${index + 1} required dimension parity`, `${rRequired} vs ${expectedRequired}`);
  });
}

const completeScript = M.generateRScript(base);
const coreOnly = M.generateRScript(base, noExtras);
ok(completeScript.includes('One-way sensitivity analyses'), 'default includes sensitivity analyses');
ok(completeScript.includes('Six-panel visualization receipt'), 'default includes visualizations');
ok(completeScript.includes('Machine-readable output files'), 'default includes CSV outputs');
ok(completeScript.includes('Reproducibility receipt'), 'default includes sessionInfo receipt');
ok(!coreOnly.includes('One-way sensitivity analyses') && !coreOnly.includes('Six-panel visualization receipt'), 'core-only omits optional sections');
ok(!coreOnly.includes('Machine-readable output files'), 'core-only omits CSV output section');
ok(!coreOnly.includes('Reproducibility receipt'), 'core-only omits session-info section');
ok(coreOnly.includes('Completion manifest'), 'completion manifest is always included');
ok(completeScript.includes('tempfile(pattern = ".completion-manifest-"') && completeScript.includes('file.rename(temp_path, final_path)'), 'completion manifest is finalized from a temporary file');
ok(completeScript.includes('figure_temp_path <- tempfile') && completeScript.includes('finally = {'), 'visualization PDF uses unwind cleanup and temporary output');
const mixed = M.generateRScript(base, { ...noExtras, includeSensitivity: true, includeCsv: true });
ok(mixed.includes('sensitivity_effect.csv') && !mixed.includes('proteomics_power_visualizations.pdf'), 'mixed options include only selected outputs');
ok(M.getRScriptFilename(base) === 'proteomics-power-cox-cohort.R', 'filename identifies analysis and design');
ok(completeScript.includes(`protein_grid <- c(${M.SENSITIVITY_PROTEIN_GRID.join(', ')})`), 'R protein sensitivity grid exactly matches fixed page grid');
ok(!completeScript.includes('protein_grid <- sort(unique'), 'R protein sensitivity grid does not merge current scenarios');

const validationCases = [
  ['invalid model/design', { analysisType: 'linear', studyDesign: 'case-cohort' }, 'not supported'],
  ['invalid correction', { correctionMethod: 'holm' }, 'Correction method'],
  ['empty proteins', { proteinCounts: [] }, 'At least one'],
  ['duplicate proteins', { proteinCounts: [1, 1] }, 'unique'],
  ['fractional proteins', { proteinCounts: [1.5] }, 'integers'],
  ['protein below boundary', { proteinCounts: [0] }, 'integers from'],
  ['protein above boundary', { proteinCounts: [100001] }, 'integers from'],
  ['nonfinite input', { events: Infinity }, 'finite'],
  ['threshold zero', { fdrQ: 0 }, 'threshold'],
  ['target power one', { targetPower: 1 }, 'Target power'],
  ['R2 one', { covariateR2: 1 }, 'R-squared'],
  ['ratio effect zero', { effectSize: 0 }, 'Ratio effect'],
  ['Cox events zero', { events: 0 }, 'event'],
  ['case cohort size zero', { studyDesign: 'case-cohort', subcohortSize: 0 }, 'Case-cohort'],
  ['nested matching zero', { studyDesign: 'nested-case-control', matchingRatio: 0 }, 'controls-per-case'],
  ['linear sample boundary', { analysisType: 'linear', studyDesign: 'cohort', effectSize: 0, sampleSize: 2 }, 'more than two'],
  ['linear residual SD zero', { analysisType: 'linear', studyDesign: 'cohort', effectSize: 0, residualSD: 0 }, 'residual SD'],
  ['logistic cohort sample zero', { analysisType: 'logistic', studyDesign: 'cohort', sampleSize: 0 }, 'sample size'],
  ['logistic prevalence one', { analysisType: 'logistic', studyDesign: 'cohort', prevalence: 1 }, 'prevalence'],
  ['case-control cases zero', { analysisType: 'logistic', studyDesign: 'case-control', numCases: 0 }, 'case and control'],
  ['Poisson sample zero', { analysisType: 'poisson', studyDesign: 'cohort', sampleSize: 0 }, 'sample size'],
  ['GEE sample boundary', { analysisType: 'gee', studyDesign: 'cohort', effectSize: 0, sampleSize: 2 }, 'more than two'],
  ['GEE residual SD zero', { analysisType: 'gee', studyDesign: 'cohort', effectSize: 0, residualSD: 0 }, 'residual SD'],
  ['GEE cluster zero', { analysisType: 'gee', studyDesign: 'cohort', effectSize: 0, clusterSize: 0 }, 'cluster size'],
  ['GEE ICC above one', { analysisType: 'gee', studyDesign: 'cohort', effectSize: 0, icc: 1.01 }, 'ICC'],
];
for (const [name, changes, fragment] of validationCases) {
  const errors = M.validateRScriptInput({ ...base, ...changes });
  ok(errors.some((error) => error.includes(fragment)), `${name} rejected`, errors.join(' '));
}
ok(M.validateRScriptInput({ ...base, effectSize: 0.7 }).length === 0, 'protective ratio below one is valid');
ok(M.validateRScriptInput({ ...base, analysisType: 'linear', studyDesign: 'cohort', effectSize: -0.2 }).length === 0, 'negative additive effect is valid');
ok(M.validateRScriptInput({ ...base, studyDesign: 'case-cohort', subcohortSize: 6000, totalCohort: 5000 }).length === 0, 'case-cohort subcohort above cohort is accepted and clamped');

if (hasR) {
  const parity = sourceWithExpression(
    M.generateRScript(base, { ...noExtras, includeSensitivity: true }),
    'grid-parity',
    [
      'curve <- subset(result$power_curve, effect == 1.4 & proteins == 250)$power[1]',
      'table <- subset(result$power_by_proteins, effect == 1.5 & proteins == 500)$power[1]',
      'sensitivity <- subset(result$sensitivity_effect, effect == 1.35 & proteins == 250)$power[1]',
      'contour <- subset(result$power_contour, effect == 1.2 & dimension == 50)$power[1]',
      'cat(sprintf("%.17g|%.17g|%.17g|%.17g", curve, table, sensitivity, contour))',
    ].join('; '),
  );
  ok(parity.status === 0, 'representative grids execute', parity.stderr.trim());
  if (parity.status === 0) {
    const [curve, table, sensitivity, contour] = parity.stdout.trim().split('|').map(Number);
    const expected = (effect, proteins, dimension = base.events) => M.calculatePower({
      ...commonParams(base, M.calculateEffectiveAlpha(base.fdrQ, proteins, base.correctionMethod)),
      effectSize: effect, events: dimension,
    });
    ok(close(curve, expected(1.4, 250)), 'power curve representative parity');
    ok(close(table, expected(1.5, 500)), 'protein table representative parity');
    ok(close(sensitivity, expected(1.35, 250)), 'sensitivity representative parity');
    ok(close(contour, expected(1.2, 1, 50)), 'contour representative parity');
  }

  const nullSensitivity = sourceWithExpression(
    M.generateRScript(
      { ...base, analysisType: 'linear', studyDesign: 'cohort', effectSize: 0 },
      { ...noExtras, includeSensitivity: true },
    ),
    'null-additive-sensitivity',
    'cat(paste(sort(unique(result$sensitivity_effect$effect)), collapse=","))',
  );
  ok(nullSensitivity.status === 0, 'additive-null sensitivity executes', nullSensitivity.stderr.trim());
  ok(
    nullSensitivity.stdout.trim() === M.SENSITIVITY_ADDITIVE_EFFECT_GRID.join(','),
    'additive-null sensitivity grid exactly matches the page',
    nullSensitivity.stdout.trim(),
  );

  for (const [name, data] of [
    ['ratio null', { ...base, effectSize: 1 }],
    ['additive null', { ...base, analysisType: 'linear', studyDesign: 'cohort', effectSize: 0 }],
  ]) {
    const run = sourceWithExpression(
      M.generateRScript(data, noExtras),
      `${name}-properties`,
      'cat(sprintf("%.17g|%.17g|%s", result$scenario_results$effective_alpha[1], result$scenario_results$power_at_input_effect[1], is.infinite(result$scenario_results$required_dimension[1])))',
    );
    ok(run.status === 0, `${name}: generated R executes`, run.stderr.trim());
    if (run.status === 0) {
      const [alpha, power, infinite] = run.stdout.trim().split('|');
      ok(close(Number(power), Number(alpha)), `${name}: null power equals alpha`, `${power} vs ${alpha}`);
      ok(infinite === 'TRUE', `${name}: required dimension is infinite`, infinite);
    }
  }

  const editedValidation = [
    ['correction', base, 'correction_method <- "fdr"', 'correction_method <- "holm"', 'correction_method'],
    ['protein uniqueness', base, 'protein_counts <- c(1, 250, 5000)', 'protein_counts <- c(1, 1)', 'unique'],
    ['ratio null boundary', base, 'effect_size <- 1.35', 'effect_size <- 0', 'ratio effect_size'],
    ['Cox events boundary', base, 'events <- 173', 'events <- 0', 'events greater'],
    ['R2 boundary', base, 'covariate_r2 <- 0.18', 'covariate_r2 <- 1', 'covariate_r2'],
    ['linear residual SD', { ...base, analysisType: 'linear', studyDesign: 'cohort', effectSize: 0.2 }, 'residual_sd <- 1.2', 'residual_sd <- 0', 'residual_sd'],
    ['logistic prevalence', { ...base, analysisType: 'logistic', studyDesign: 'cohort', effectSize: 1.3 }, 'outcome_prevalence <- 0.16', 'outcome_prevalence <- 1', 'outcome_prevalence'],
    ['logistic cases', { ...base, analysisType: 'logistic', studyDesign: 'case-control', effectSize: 1.3 }, 'num_cases <- 320', 'num_cases <- 0', 'num_cases'],
    ['Poisson sample size', { ...base, analysisType: 'poisson', studyDesign: 'cohort', effectSize: 1.3 }, 'sample_size <- 1800', 'sample_size <- 0', 'sample_size'],
    ['GEE cluster size', { ...base, analysisType: 'gee', studyDesign: 'cohort', effectSize: 0.2 }, 'cluster_size <- 6', 'cluster_size <- 0', 'cluster_size'],
  ];
  for (const [name, data, from, to, message] of editedValidation) {
    const script = M.generateRScript(data, noExtras).replace(from, to);
    const run = spawnSync('Rscript', ['--vanilla', writeScript(script, `invalid-${name}`)], { cwd: tempRoot, encoding: 'utf8' });
    ok(run.status !== 0 && run.stderr.includes(message), `edited R input rejects ${name}`, run.stderr.trim());
  }

  const executableBoundaries = [
    ['ratio null', { ...base, effectSize: 1 }],
    ['additive null', { ...base, analysisType: 'linear', studyDesign: 'cohort', effectSize: 0 }],
    ['extreme proteins', { ...base, proteinCounts: [1, 100000], fdrQ: 0.999, targetPower: 0.01, covariateR2: 0.999 }],
    ['case-cohort oversized subcohort', { ...base, studyDesign: 'case-cohort', subcohortSize: 6000, totalCohort: 5000 }],
    ['GEE ICC boundaries', { ...base, analysisType: 'gee', studyDesign: 'cohort', effectSize: -0.2, icc: 1 }],
  ];
  for (const [name, data] of executableBoundaries) {
    const run = sourceWithExpression(M.generateRScript(data, noExtras), `boundary-${name}`, 'cat(result$completion_manifest)');
    ok(run.status === 0 && run.stdout.includes('completion-manifest.txt'), `${name} executes with completion manifest`, run.stderr.trim());
  }

  for (const [analysisType, studyDesign] of [
    ['cox', 'case-cohort'], ['linear', 'cross-sectional'], ['logistic', 'case-control'],
    ['poisson', 'cohort'], ['gee', 'cross-sectional'],
  ]) {
    const runDir = fs.mkdtempSync(path.join(tempRoot, `${analysisType}-full-`));
    const data = { ...base, analysisType, studyDesign };
    if (analysisType === 'linear' || analysisType === 'gee') data.effectSize = -0.2;
    const run = spawnSync('Rscript', ['--vanilla', writeScript(M.generateRScript(data), `${analysisType}-full`, runDir)], { cwd: runDir, encoding: 'utf8' });
    const rootDir = path.join(runDir, 'proteomics-power-results');
    const children = fs.existsSync(rootDir) ? fs.readdirSync(rootDir) : [];
    const outputDir = children.length === 1 ? path.join(rootDir, children[0]) : '';
    ok(run.status === 0, `${analysisType}: full optional script executes`, run.stderr.trim());
    ok(children.length === 1 && fs.existsSync(path.join(outputDir, 'completion-manifest.txt')), `${analysisType}: unique completed receipt directory`);
    ok(fs.existsSync(path.join(outputDir, 'scenario_results.csv')), `${analysisType}: CSV receipt`);
    ok(fs.existsSync(path.join(outputDir, 'proteomics_power_visualizations.pdf')), `${analysisType}: visualization receipt`);
    ok(fs.existsSync(path.join(outputDir, 'sessionInfo.txt')), `${analysisType}: session receipt`);
  }

  const sequentialDir = fs.mkdtempSync(path.join(tempRoot, 'sequential-'));
  const sequentialPath = writeScript(coreOnly, 'sequential', sequentialDir);
  const first = spawnSync('Rscript', ['--vanilla', sequentialPath], { cwd: sequentialDir, encoding: 'utf8' });
  const second = spawnSync('Rscript', ['--vanilla', sequentialPath], { cwd: sequentialDir, encoding: 'utf8' });
  const receiptRoot = path.join(sequentialDir, 'proteomics-power-results');
  const receipts = fs.existsSync(receiptRoot) ? fs.readdirSync(receiptRoot) : [];
  ok(first.status === 0 && second.status === 0, 'sequential executions both succeed');
  ok(receipts.length === 2 && new Set(receipts).size === 2, 'sequential executions create separate directories', receipts.join(', '));
  ok(receipts.every((dir) => fs.existsSync(path.join(receiptRoot, dir, 'completion-manifest.txt'))), 'each sequential run has a completion manifest');
} else {
  console.log('  - Rscript is unavailable locally; executable checks explicitly skipped.');
}

console.log('\n' + '='.repeat(72));
console.log(`R SCRIPT RESULTS: ${passed}/${total} passed, ${failures.length} failed`);
console.log('='.repeat(72) + '\n');
if (failures.length) process.exit(1);
