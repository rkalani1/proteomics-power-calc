import type { AnalysisType } from '../utils/statistics';
import { POWER_CURVE_RANGES } from './analysisGrids';

export { STUDY_DESIGN_OPTIONS } from './analysisGrids';

export const ANALYSIS_TYPE_OPTIONS: { value: AnalysisType; label: string; description: string }[] = [
  { value: 'cox', label: 'Cox Proportional Hazards', description: 'Time-to-event outcomes (Hazard Ratio)' },
  { value: 'linear', label: 'Linear Regression', description: 'Continuous outcomes (Beta coefficient)' },
  { value: 'logistic', label: 'Logistic Regression', description: 'Binary outcomes (Odds Ratio)' },
  { value: 'poisson', label: 'Modified Poisson', description: 'Binary outcomes, common (≥10%) prevalence (Relative Risk)' },
  { value: 'gee', label: 'GEE/Mixed Effects', description: 'Clustered/longitudinal data (Beta with ICC)' },
];

/**
 * Categorical palette for protein-count scenarios. Slots are assigned in this
 * fixed order (never cycled) and the hex values were validated for
 * colour-vision-deficiency separation between neighbours; the wash/line/ink
 * companions are defined as --color-scenario-N-* tokens in index.css. `hex`
 * is the chart mark colour; `text` is a darker AA-contrast ink for labels.
 */
export const SCENARIO_COLORS = [
  { bg: 'bg-scenario-1', text: 'text-scenario-1-ink', light: 'bg-scenario-1-wash', border: 'border-scenario-1-line', hex: '#2a78d6' },
  { bg: 'bg-scenario-2', text: 'text-scenario-2-ink', light: 'bg-scenario-2-wash', border: 'border-scenario-2-line', hex: '#eb6834' },
  { bg: 'bg-scenario-3', text: 'text-scenario-3-ink', light: 'bg-scenario-3-wash', border: 'border-scenario-3-line', hex: '#1baf7a' },
  { bg: 'bg-scenario-4', text: 'text-scenario-4-ink', light: 'bg-scenario-4-wash', border: 'border-scenario-4-line', hex: '#eda100' },
  { bg: 'bg-scenario-5', text: 'text-scenario-5-ink', light: 'bg-scenario-5-wash', border: 'border-scenario-5-line', hex: '#e87ba4' },
  { bg: 'bg-scenario-6', text: 'text-scenario-6-ink', light: 'bg-scenario-6-wash', border: 'border-scenario-6-line', hex: '#008300' },
];

export const EFFECT_SIZE_CONFIG: Record<AnalysisType, {
  label: string;
  symbol: string;
  min: number;
  max: number;
  default: number;
  step: number;
  inputLabel: string;
  inputDescription: string;
}> = {
  cox: {
    label: 'Hazard Ratio',
    symbol: 'HR',
    min: POWER_CURVE_RANGES.cox[0],
    max: POWER_CURVE_RANGES.cox[1],
    default: 1.2,
    step: 0.01,
    inputLabel: 'Target Hazard Ratio (HR)',
    inputDescription: 'Hazard ratio per 1 SD increase in protein level (HR = 1 is the null: no association).',
  },
  linear: {
    label: 'Per-SD Beta',
    symbol: 'β',
    min: POWER_CURVE_RANGES.linear[0],
    max: POWER_CURVE_RANGES.linear[1],
    default: 0.2,
    step: 0.01,
    inputLabel: 'Target Beta (β)',
    inputDescription: 'Change in outcome per 1 SD increase in protein (outcome in its own units; set Residual SD to match).',
  },
  logistic: {
    label: 'Odds Ratio',
    symbol: 'OR',
    min: POWER_CURVE_RANGES.logistic[0],
    max: POWER_CURVE_RANGES.logistic[1],
    default: 1.3,
    step: 0.01,
    inputLabel: 'Target Odds Ratio (OR)',
    inputDescription: 'Odds ratio per 1 SD increase in protein level (OR = 1 is the null: no association).',
  },
  poisson: {
    label: 'Relative Risk',
    symbol: 'RR',
    min: POWER_CURVE_RANGES.poisson[0],
    max: POWER_CURVE_RANGES.poisson[1],
    default: 1.2,
    step: 0.01,
    inputLabel: 'Target Relative Risk (RR)',
    inputDescription: 'Relative risk per 1 SD increase in protein level (RR = 1 is the null: no association).',
  },
  gee: {
    label: 'Per-SD Beta',
    symbol: 'β',
    min: POWER_CURVE_RANGES.gee[0],
    max: POWER_CURVE_RANGES.gee[1],
    default: 0.2,
    step: 0.01,
    inputLabel: 'Target Beta (β)',
    inputDescription: 'Change in outcome per 1 SD increase in protein (outcome in its own units; set Residual SD to match).',
  },
};
