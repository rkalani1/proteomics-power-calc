/**
 * SENSITIVITY UTILITIES TEST
 *
 * Verifies that the sensitivity utilities correctly handle edge cases, such as
 * swapping "sampleSize" and "events" based on the analysis type.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

// ---------------------------------------------------------------------------
// Compile the real TypeScript source to a CommonJS bundle and load it.
// ---------------------------------------------------------------------------
const SRC = path.join(__dirname, 'src', 'utils', 'sensitivity.ts');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(os.tmpdir(), `sensitivity.bundle.${process.pid}.cjs`);
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

console.log('\n' + '='.repeat(70));
console.log('SENSITIVITY UTILITIES VERIFICATION');
console.log('='.repeat(70));

// 1. Test normalizeSensitivityVariable
console.log('\n1. normalizeSensitivityVariable');

ok(
  S.normalizeSensitivityVariable('cox', 'sampleSize') === 'events',
  'cox + sampleSize returns events'
);

ok(
  S.normalizeSensitivityVariable('linear', 'events') === 'sampleSize',
  'non-cox + events returns sampleSize (linear)'
);

ok(
  S.normalizeSensitivityVariable('logistic', 'events') === 'sampleSize',
  'non-cox + events returns sampleSize (logistic)'
);

ok(
  S.normalizeSensitivityVariable('cox', 'events') === 'events',
  'cox + events returns events'
);

ok(
  S.normalizeSensitivityVariable('linear', 'sampleSize') === 'sampleSize',
  'non-cox + sampleSize returns sampleSize'
);

ok(
  S.normalizeSensitivityVariable('cox', 'effectSize') === 'effectSize',
  'cox + effectSize returns effectSize'
);

ok(
  S.normalizeSensitivityVariable('linear', 'proteinCount') === 'proteinCount',
  'linear + proteinCount returns proteinCount'
);

console.log('\n' + '='.repeat(70));
console.log(`SENSITIVITY RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');

if (fails.length) {
  process.exit(1);
}
