# AutoMedBench-Lite Gate for AI-Assisted Power Calculator Updates

Use this gate before accepting AI-generated changes to formulas, assumptions, validation cases, UI-rendered values, source citations, or exported calculation summaries.

This gate evaluates agent workflow discipline. It does not validate a study design, replace a statistician, or make the calculator appropriate for confidential cohort planning.

## Safety Boundary

- Use aggregate, synthetic, or public example assumptions only.
- Do not enter patient identifiers, restricted cohort data, unpublished institutional details, credentials, or confidential grant materials.
- Do not claim that a formula update is correct unless it is mapped to source text and tested against expected outputs.

## S1 Plan

The agent must state:

- Formula, model, UI component, or test file being changed.
- The exact statistical claim or behavior being altered.
- Source reference or repo test supporting the change.
- Assumptions that are preserved, narrowed, or newly introduced.
- Stop conditions, including missing source text, impossible expected value, or failed test.

## S2 Setup

The agent must identify:

- Relevant implementation files under `src/`.
- Existing calculation tests such as `test-calculations.cjs`, `test-equations.cjs`, and `test-source-vs-validation.cjs`.
- README formula text and references that must remain synchronized.
- Whether the change is formula logic, UI presentation, source validation, or documentation only.

## S3 Validate

The agent must complete concrete checks:

- Source fidelity: each formula or assumption maps to README/reference text or an explicit source.
- Numerical validation: at least one synthetic expected-value case covers the changed path.
- Cross-surface consistency: rendered formula text, calculation logic, and tests agree.
- Edge cases: impossible inputs, common outcomes, rare outcomes, multiple-testing correction, and covariate R2 boundaries are considered when affected.
- Privacy: no real cohort details or restricted planning assumptions are added.

Minimum commands for calculation or formula changes:

```bash
npm run test:automedbench-lite
npm run test
npm run build
```

## S4 Execute

Make the smallest scoped change after validation planning is complete. Keep formulas, UI copy, tests, and README references synchronized.

## S5 Submit

The final response or PR description must include:

- Changed files.
- Formula/source trace.
- Synthetic validation cases added or exercised.
- Commands run and outcomes.
- Residual statistical assumptions requiring human review.

## One-Shot Prompt

```text
Apply the proteomics-power-calc AutoMedBench-Lite gate. Write S1 Plan, S2 Setup, and S3 Validate before editing. Then execute the scoped change and submit changed files, formula/source trace, synthetic validation, commands run, and residual statistical assumptions. Stop if formula-source consistency or numerical validation cannot be completed.
```
