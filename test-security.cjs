/**
 * SECURITY UTILS TEST
 *
 * Verifies that the security utilities correctly handle edge cases and escape HTML.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const esbuild = require('esbuild');

// ---------------------------------------------------------------------------
// Compile the real TypeScript source to a CommonJS bundle and load it.
// ---------------------------------------------------------------------------
const SRC = path.join(__dirname, 'src', 'utils', 'security.ts');
const out = esbuild.buildSync({
  entryPoints: [SRC],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const bundlePath = path.join(os.tmpdir(), `security.bundle.${process.pid}.cjs`);
fs.writeFileSync(bundlePath, out.outputFiles[0].text);
const Security = require(bundlePath);
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
console.log('SECURITY UTILITIES VERIFICATION');
console.log('='.repeat(70));

console.log('\n1. escapeHTML');

// Test null/undefined
ok(Security.escapeHTML(null) === '', 'escapeHTML handles null');
ok(Security.escapeHTML(undefined) === '', 'escapeHTML handles undefined');

// Test numbers
ok(Security.escapeHTML(123) === '123', 'escapeHTML handles positive integers');
ok(Security.escapeHTML(0) === '0', 'escapeHTML handles zero');
ok(Security.escapeHTML(-45.67) === '-45.67', 'escapeHTML handles negative floats');

// Test standard string
ok(Security.escapeHTML('hello world') === 'hello world', 'escapeHTML handles plain strings');

// Test individual characters
ok(Security.escapeHTML('&') === '&amp;', 'escapeHTML escapes ampersand');
ok(Security.escapeHTML('<') === '&lt;', 'escapeHTML escapes less than');
ok(Security.escapeHTML('>') === '&gt;', 'escapeHTML escapes greater than');
ok(Security.escapeHTML('"') === '&quot;', 'escapeHTML escapes double quote');
ok(Security.escapeHTML("'") === '&#039;', 'escapeHTML escapes single quote');

// Test multiple replacements
ok(Security.escapeHTML('<script>alert("XSS & hacks\'");</script>') === '&lt;script&gt;alert(&quot;XSS &amp; hacks&#039;&quot;);&lt;/script&gt;', 'escapeHTML handles complex XSS strings');
ok(Security.escapeHTML('&&') === '&amp;&amp;', 'escapeHTML replaces multiple occurrences (ampersand)');
ok(Security.escapeHTML('<<>>') === '&lt;&lt;&gt;&gt;', 'escapeHTML replaces multiple occurrences (brackets)');

console.log('\n' + '='.repeat(70));
console.log(`SECURITY RESULTS: ${passed}/${total} passed, ${fails.length} failed`);
console.log('='.repeat(70) + '\n');

if (fails.length) {
  process.exit(1);
}
