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

export const SCENARIO_COLORS = [
  { bg: 'bg-cyan-600', text: 'text-cyan-800', light: 'bg-cyan-50', border: 'border-cyan-200', hex: '#0891b2' },
  { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200', hex: '#3b82f6' },
  { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', border: 'border-purple-200', hex: '#8b5cf6' },
  { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', border: 'border-orange-200', hex: '#f97316' },
  { bg: 'bg-pink-500', text: 'text-pink-700', light: 'bg-pink-50', border: 'border-pink-200', hex: '#ec4899' },
  { bg: 'bg-teal-500', text: 'text-teal-700', light: 'bg-teal-50', border: 'border-teal-200', hex: '#14b8a6' },
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
