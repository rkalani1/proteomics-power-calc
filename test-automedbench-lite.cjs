const fs = require('fs');

const target = 'docs/ai-agent-evals/automedbench-lite.md';
const text = fs.readFileSync(target, 'utf8');

const required = [
  'S1 Plan',
  'S2 Setup',
  'S3 Validate',
  'S4 Execute',
  'S5 Submit',
  'npm run test',
  'npm run build',
  'Source fidelity',
  'Numerical validation',
  'synthetic'
];

const missing = required.filter((phrase) => !text.includes(phrase));

if (missing.length) {
  console.error(`AutoMedBench-Lite gate is missing required content in ${target}:`);
  for (const phrase of missing) console.error(`- ${phrase}`);
  process.exit(1);
}

console.log(`AutoMedBench-Lite gate validated: ${target}`);
