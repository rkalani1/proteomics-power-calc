import type { AnalysisType, CorrectionMethod, StudyDesign } from './statistics';
import { calculateDesignEffect } from './statistics';
import { formatAlpha, formatAnalysisType, formatStudyDesign } from './formatters';

/** One protein-count scenario with the headline results already computed. */
export interface MethodsScenario {
  proteinCount: number;
  alpha: number;
  minEffect: number;
  powerAtInput: number;
  sampleNeeded: number | string;
}

/** Everything the statement needs; a subset of the export payload. */
export interface MethodsStatementInput {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  scenarios: MethodsScenario[];
  effectSize: number;
  targetPower: number;
  fdrQ: number;
  correctionMethod: CorrectionMethod;
  sampleSize: number;
  events: number;
  prevalence: number;
  residualSD: number;
  numCases: number;
  numControls: number;
  subcohortSize: number;
  totalCohort: number;
  matchingRatio: number;
  clusterSize: number;
  icc: number;
  covariateR2: number;
  effectSymbol: string;
  effectLabel: string;
}

const MODEL_REFERENCES: Record<AnalysisType, string> = {
  cox: 'Schoenfeld 1983; Hsieh & Lavori 2000',
  linear: 'Hsieh, Bloch & Larsen 1998',
  logistic: 'Hsieh, Bloch & Larsen 1998',
  poisson: 'Zou 2004',
  gee: 'Liang & Zeger 1986; Liu & Liang 1997',
};

const DESIGN_REFERENCES: Partial<Record<StudyDesign, string>> = {
  'case-cohort': 'Prentice 1986',
  'nested-case-control': 'Dupont 1988',
};

const joinList = (items: string[]): string => {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  count === 1 ? singular : pluralForm;

const percent = (fraction: number, decimals = 0): string => `${(fraction * 100).toFixed(decimals)}%`;

/** Lower-case the effect label for use mid-sentence ("hazard ratio"). */
const effectNoun = (label: string): string =>
  label.replace(/Per-SD Beta/i, 'standardized regression coefficient (β)').toLowerCase();

/** Sizing noun for the "required" clause. */
const sizeNoun = (analysisType: AnalysisType, design: StudyDesign): string => {
  if (analysisType === 'cox') return design === 'nested-case-control' ? 'cases' : 'events';
  if (analysisType === 'gee') return 'observations';
  return 'participants';
};

/** Design clause: the model, the design, and every quantity that sets the SE. */
const describeDesign = (d: MethodsStatementInput): string => {
  const design = formatStudyDesign(d.studyDesign).toLowerCase();
  const n = d.sampleSize.toLocaleString();
  const prevalence = percent(d.prevalence);
  const isCaseControl = d.studyDesign === 'case-control' || d.studyDesign === 'nested-case-control';

  switch (d.analysisType) {
    case 'cox':
      if (d.studyDesign === 'case-cohort') {
        return `a Cox proportional-hazards model in a case-cohort design with d = ${d.events} ${plural(d.events, 'event')} and a subcohort of ${d.subcohortSize.toLocaleString()} sampled from a full cohort of ${d.totalCohort.toLocaleString()}`;
      }
      if (d.studyDesign === 'nested-case-control') {
        return `a Cox proportional-hazards model in a nested case-control design with d = ${d.events} ${plural(d.events, 'case')} and ${d.matchingRatio} matched ${plural(d.matchingRatio, 'control')} per case`;
      }
      return `a Cox proportional-hazards model in a ${design} design with d = ${d.events} ${plural(d.events, 'event')}`;
    case 'linear':
      return `a linear regression model in a ${design} design with n = ${n} participants and a residual standard deviation of ${d.residualSD}`;
    case 'logistic':
      return isCaseControl
        ? `a logistic regression model in a ${design} design with ${d.numCases.toLocaleString()} cases and ${d.numControls.toLocaleString()} controls`
        : `a logistic regression model in a ${design} design with n = ${n} participants and an outcome prevalence of ${prevalence}`;
    case 'poisson':
      return `a modified Poisson regression model with robust variance (relative risk) in a ${design} design with n = ${n} participants and an outcome prevalence of ${prevalence}`;
    case 'gee': {
      const de = calculateDesignEffect(d.clusterSize, d.icc).toFixed(2);
      return `a generalized estimating equation (GEE) or mixed-effects model in a ${design} design with n = ${n} observations in clusters of ${d.clusterSize} (intraclass correlation ${d.icc.toFixed(2)}, design effect ${de}) and a residual standard deviation of ${d.residualSD}`;
    }
    default:
      return `a ${formatAnalysisType(d.analysisType).toLowerCase()} model in a ${design} design`;
  }
};

const describeRequired = (scenario: MethodsScenario, noun: string): string => {
  const { sampleNeeded } = scenario;
  if (typeof sampleNeeded === 'number' && Number.isFinite(sampleNeeded)) {
    return `${sampleNeeded.toLocaleString()} ${noun}`;
  }
  return 'no finite number of ' + noun;
};

/**
 * Compose a protocol-ready methods paragraph from the current inputs and the
 * headline results. Plain Unicode text; deterministic (no timestamps).
 */
export function generateMethodsStatement(d: MethodsStatementInput): string {
  const isFdr = d.correctionMethod === 'fdr';
  const isBeta = d.analysisType === 'linear' || d.analysisType === 'gee';
  const effectDecimals = isBeta ? 3 : 2;
  const sym = d.effectSymbol;
  const noun = effectNoun(d.effectLabel);
  const scenarios = d.scenarios;
  const counts = scenarios.map(s => s.proteinCount.toLocaleString());
  const target = percent(d.targetPower);

  // Sentence 1: the test, the multiplicity scope, and the correction.
  const scope = scenarios.length === 1
    ? `across ${counts[0]} ${plural(scenarios[0].proteinCount, 'protein')}`
    : `across ${joinList(counts)} proteins in separate scenarios`;
  const alphaClause = scenarios.length === 1 ? ` (planning per-test α ≈ ${formatAlpha(scenarios[0].alpha)})` : '';
  const correction = isFdr
    ? `Benjamini–Hochberg false-discovery-rate control at q = ${d.fdrQ}${alphaClause}`
    : `Bonferroni correction at a family-wise error rate of ${d.fdrQ}${alphaClause}`;
  const sentence1 = `Statistical power was estimated for a single protein–outcome association tested ${scope}, using a two-sided Wald test with ${correction}.`;

  // Sentence 2: model, design, and covariate adjustment.
  const r2 = d.covariateR2 > 0
    ? `, and adjustment covariates are assumed to explain ${percent(d.covariateR2)} of the variance in protein level (R²ₓ = ${d.covariateR2.toFixed(2)}), which inflates each standard error by 1/√(1 − R²ₓ)`
    : '';
  const sentence2 = `The analysis assumes ${describeDesign(d)}; protein levels are standardized to unit variance, so effects are expressed per 1 SD increase in protein level${r2}.`;

  // Sentences 3+: one result sentence per scenario.
  const requiredNoun = sizeNoun(d.analysisType, d.studyDesign);
  const effectValue = d.effectSize.toFixed(effectDecimals);
  const minLabel = isBeta ? `|${sym}|` : sym;
  const results = scenarios.map(s => {
    const lead = scenarios.length === 1
      ? 'The study'
      : `With ${s.proteinCount.toLocaleString()} ${plural(s.proteinCount, 'protein')} (per-test α ≈ ${formatAlpha(s.alpha)}), the study`;
    const minEffect = Number.isFinite(s.minEffect) ? s.minEffect.toFixed(effectDecimals) : 'undefined';
    return `${lead} has ${percent(s.powerAtInput, 1)} power to detect a ${noun} of ${effectValue}; the minimum detectable ${minLabel} at ${target} power is ${minEffect}, and ${describeRequired(s, requiredNoun)} would be required to detect ${sym} = ${effectValue} with ${target} power.`;
  });

  // Closing: scope and references.
  const refs = [
    MODEL_REFERENCES[d.analysisType],
    DESIGN_REFERENCES[d.studyDesign],
    isFdr ? 'Benjamini & Hochberg 1995' : undefined,
  ].filter((r): r is string => Boolean(r)).join('; ');
  const closing = `Estimates are large-sample approximations intended for study planning (${refs}).`;

  return [sentence1, sentence2, ...results, closing].join(' ');
}
