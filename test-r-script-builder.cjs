/** RScriptBuilder browser interaction and failure-path tests. */
const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');
const React = require('react');
const { JSDOM } = require('jsdom');

const src = path.join(__dirname, 'src', 'components', 'RScriptBuilder.tsx');
const entry = path.join(os.tmpdir(), `r-script-builder-entry.${process.pid}.tsx`);
const bundlePath = path.join(__dirname, `.r-script-builder.bundle.${process.pid}.cjs`);
fs.writeFileSync(entry, `export { default as RScriptBuilder } from ${JSON.stringify(src)};\n`);
const built = esbuild.buildSync({
  entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  write: false, logLevel: 'silent',
});
fs.writeFileSync(bundlePath, built.outputFiles[0].text);
const { RScriptBuilder } = require(bundlePath);
process.on('exit', () => {
  for (const file of [entry, bundlePath]) {
    try { fs.unlinkSync(file); } catch { /* cleanup best effort */ }
  }
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test/' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLAnchorElement = dom.window.HTMLAnchorElement;
global.Node = dom.window.Node;
global.Blob = Blob;
global.IS_REACT_ACT_ENVIRONMENT = true;
const { render, fireEvent, waitFor, cleanup, act } = require('@testing-library/react');

const base = {
  analysisType: 'cox', studyDesign: 'cohort', proteinCounts: [5000],
  effectSize: 1.2, targetPower: 0.8, fdrQ: 0.05, correctionMethod: 'fdr',
  sampleSize: 1000, events: 70, prevalence: 0.1, residualSD: 1,
  numCases: 200, numControls: 400, subcohortSize: 500, totalCohort: 5000,
  matchingRatio: 4, clusterSize: 5, icc: 0.05, covariateR2: 0,
};
const changed = {
  ...base, analysisType: 'linear', studyDesign: 'cross-sectional', proteinCounts: [1, 250],
  effectSize: -0.2,
};

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
const setClipboard = (writeText) => {
  Object.defineProperty(global.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
};

console.log('\nR SCRIPT BUILDER INTERACTION VERIFICATION');

(async () => {
  {
    const view = render(React.createElement(RScriptBuilder, base));
    const editor = view.container.querySelector('#generated-r-script');
    const sensitivity = [...view.container.querySelectorAll('label')]
      .find((label) => label.textContent.includes('Sensitivity analyses')).querySelector('input');
    ok(sensitivity.checked && editor.value.includes('One-way sensitivity analyses'), 'synced sensitivity option starts enabled');
    fireEvent.click(sensitivity);
    ok(!sensitivity.checked, 'synced option toggle updates checked state');
    ok(!editor.value.includes('One-way sensitivity analyses'), 'synced option toggle regenerates the script section');
    cleanup();
  }

  {
    const view = render(React.createElement(RScriptBuilder, base));
    const editor = view.container.querySelector('#generated-r-script');
    ok(editor.value.includes('analysis_type <- "cox"'), 'initial editor is generated from current inputs');
    fireEvent.change(editor, { target: { value: '# hand-edited Cox artifact' } });
    view.rerender(React.createElement(RScriptBuilder, changed));
    ok(editor.value === '# hand-edited Cox artifact', 'custom text survives prop changes');
    ok(view.container.textContent.includes('Customized - calculator inputs changed'), 'prop change shows stale notice');
    ok(view.container.textContent.includes('Cox Proportional Hazards') && !view.container.textContent.includes('Linear Regression'), 'custom artifact retains source analysis metadata');
    ok(view.container.textContent.includes('proteomics-power-cox-cohort.R'), 'custom artifact retains source filename');

    const sensitivity = [...view.container.querySelectorAll('label')]
      .find((label) => label.textContent.includes('Sensitivity analyses')).querySelector('input');
    fireEvent.click(sensitivity);
    ok(editor.value === '# hand-edited Cox artifact', 'option change preserves custom text');
    ok(view.container.textContent.includes('Selections apply on regeneration'), 'custom mode explains option timing');
    fireEvent.click(view.getByRole('button', { name: 'Keep my edits' }));
    ok(!view.queryByRole('alert'), 'Keep my edits dismisses the stale notice');

    fireEvent.click(view.getByRole('button', { name: 'Regenerate from inputs' }));
    ok(editor.value.includes('analysis_type <- "linear"'), 'regenerate replaces text from current props');
    ok(view.container.textContent.includes('proteomics-power-linear-cross-sectional.R'), 'regenerate updates filename provenance');

    fireEvent.change(editor, { target: { value: '# another edit' } });
    view.rerender(React.createElement(RScriptBuilder, { ...base, analysisType: 'logistic' }));
    fireEvent.click(view.getByRole('button', { name: 'Replace with updated script' }));
    ok(editor.value.includes('analysis_type <- "logistic"'), 'Replace action uses latest calculator props');
    cleanup();
  }

  {
    const copied = [];
    setClipboard(async (text) => { copied.push(text); });
    const view = render(React.createElement(RScriptBuilder, base));
    const editor = view.container.querySelector('#generated-r-script');
    fireEvent.change(editor, { target: { value: '# copied custom text' } });
    fireEvent.click(view.getByRole('button', { name: 'Copy R script' }));
    await waitFor(() => view.getByRole('status'));
    ok(copied[0] === '# copied custom text', 'copy uses current edited text');
    ok(view.getByRole('status').textContent.includes('copied'), 'copy success is reported');
    cleanup();
  }

  {
    let resolveCopy;
    setClipboard(() => new Promise((resolve) => { resolveCopy = resolve; }));
    const view = render(React.createElement(RScriptBuilder, base));
    const editor = view.container.querySelector('#generated-r-script');
    fireEvent.change(editor, { target: { value: '# first edit' } });
    fireEvent.click(view.getByRole('button', { name: 'Copy R script' }));
    fireEvent.change(editor, { target: { value: '# changed during copy' } });
    await act(async () => { resolveCopy(); await Promise.resolve(); });
    ok(!view.queryByText('R script copied.'), 'delayed copy cannot publish stale success after an edit');
    cleanup();
  }

  {
    setClipboard(async () => { throw new Error('permission denied'); });
    const view = render(React.createElement(RScriptBuilder, base));
    fireEvent.click(view.getByRole('button', { name: 'Copy R script' }));
    await waitFor(() => view.getByRole('alert'));
    ok(view.getByRole('alert').textContent.includes('could not be copied'), 'clipboard rejection reports a recovery path');
    cleanup();
  }

  {
    let capturedBlob;
    let capturedFilename;
    const revoked = [];
    global.URL = dom.window.URL;
    global.URL.createObjectURL = (blob) => { capturedBlob = blob; return 'blob:test-success'; };
    global.URL.revokeObjectURL = (url) => revoked.push(url);
    dom.window.HTMLAnchorElement.prototype.click = function click() { capturedFilename = this.download; };
    const view = render(React.createElement(RScriptBuilder, base));
    const editor = view.container.querySelector('#generated-r-script');
    fireEvent.change(editor, { target: { value: '# downloadable custom text' } });
    view.rerender(React.createElement(RScriptBuilder, changed));
    fireEvent.click(view.getByRole('button', { name: 'Download .R' }));
    ok(await capturedBlob.text() === '# downloadable custom text', 'download Blob uses current edited text');
    ok(capturedFilename === 'proteomics-power-cox-cohort.R', 'download uses custom artifact source filename');
    ok(revoked.includes('blob:test-success') && document.querySelectorAll('a').length === 0, 'successful download cleans anchor and object URL');
    ok(view.getByRole('status').textContent.includes('Download requested'), 'download feedback does not attest completion');
    cleanup();
  }

  {
    const revoked = [];
    global.URL.createObjectURL = () => 'blob:test-failure';
    global.URL.revokeObjectURL = (url) => revoked.push(url);
    dom.window.HTMLAnchorElement.prototype.click = () => { throw new Error('blocked'); };
    const view = render(React.createElement(RScriptBuilder, base));
    fireEvent.click(view.getByRole('button', { name: 'Download .R' }));
    ok(revoked.includes('blob:test-failure') && document.querySelectorAll('a').length === 0, 'click failure still cleans anchor and object URL');
    ok(view.getByRole('alert').textContent.includes('could not be requested'), 'click failure reports request failure');
    cleanup();
  }

  {
    global.URL.createObjectURL = () => { throw new Error('URL unavailable'); };
    const view = render(React.createElement(RScriptBuilder, base));
    fireEvent.click(view.getByRole('button', { name: 'Download .R' }));
    ok(document.querySelectorAll('a').length === 0, 'object-URL failure leaves no anchor behind');
    ok(view.getByRole('alert').textContent.includes('could not be requested'), 'object-URL failure reports request failure');
    cleanup();
  }

  console.log(`R SCRIPT BUILDER RESULTS: ${passed}/${total} passed, ${failures.length} failed\n`);
  if (failures.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
