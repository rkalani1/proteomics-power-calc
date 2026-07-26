import type { AnalysisType, StudyDesign } from '../utils/statistics';

export const ANALYSIS_TYPE_OPTIONS: { value: AnalysisType; label: string; description: string }[] = [
  { value: 'cox', label: 'Cox Proportional Hazards', description: 'Time-to-event outcomes (Hazard Ratio)' },
  { value: 'linear', label: 'Linear Regression', description: 'Continuous outcomes (Beta coefficient)' },
  { value: 'logistic', label: 'Logistic Regression', description: 'Binary outcomes (Odds Ratio)' },
  { value: 'poisson', label: 'Modified Poisson', description: 'Binary outcomes, prevalence >10% (Relative Risk)' },
  { value: 'gee', label: 'GEE/Mixed Effects', description: 'Clustered/longitudinal data (Beta with ICC)' },
];

export const STUDY_DESIGN_OPTIONS: Record<AnalysisType, { value: StudyDesign; label: string; description: string }[]> = {
  cox: [
    { value: 'cohort', label: 'Cohort', description: 'Prospective or retrospective cohort study' },
    { value: 'case-cohort', label: 'Case-Cohort', description: 'Subcohort sampling from full cohort' },
    { value: 'nested-case-control', label: 'Nested Case-Control', description: 'Case-control within cohort' },
  ],
  linear: [
    { value: 'cohort', label: 'Cohort', description: 'Prospective or retrospective cohort study' },
    { value: 'cross-sectional', label: 'Cross-Sectional', description: 'Single time-point measurement' },
  ],
  logistic: [
    { value: 'cohort', label: 'Cohort', description: 'Prospective or retrospective cohort study' },
    { value: 'case-control', label: 'Case-Control', description: 'Case-control study design' },
    { value: 'cross-sectional', label: 'Cross-Sectional', description: 'Single time-point measurement' },
    { value: 'nested-case-control', label: 'Nested Case-Control', description: 'Case-control within cohort' },
  ],
  poisson: [
    { value: 'cohort', label: 'Cohort', description: 'Prospective or retrospective cohort study' },
    { value: 'cross-sectional', label: 'Cross-Sectional', description: 'Single time-point measurement' },
  ],
  gee: [
    { value: 'cohort', label: 'Longitudinal Cohort', description: 'Repeated measures over time' },
    { value: 'cross-sectional', label: 'Clustered Cross-Sectional', description: 'Observations clustered within groups' },
  ],
};

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
    min: 1.0,
    max: 3.0,
    default: 1.2,
    step: 0.01,
    inputLabel: 'Target Hazard Ratio (HR)',
    inputDescription: '',
  },
  linear: {
    label: 'Per-SD Beta',
    symbol: 'β',
    min: 0.0,
    max: 1.0,
    default: 0.2,
    step: 0.01,
    inputLabel: 'Target Beta (β)',
    inputDescription: 'Change in outcome per 1 SD increase in protein (outcome in its own units; set Residual SD to match).',
  },
  logistic: {
    label: 'Odds Ratio',
    symbol: 'OR',
    min: 1.0,
    max: 3.0,
    default: 1.3,
    step: 0.01,
    inputLabel: 'Target Odds Ratio (OR)',
    inputDescription: '',
  },
  poisson: {
    label: 'Relative Risk',
    symbol: 'RR',
    min: 1.0,
    max: 3.0,
    default: 1.2,
    step: 0.01,
    inputLabel: 'Target Relative Risk (RR)',
    inputDescription: '',
  },
  gee: {
    label: 'Per-SD Beta',
    symbol: 'β',
    min: 0.0,
    max: 1.0,
    default: 0.2,
    step: 0.01,
    inputLabel: 'Target Beta (β)',
    inputDescription: 'Change in outcome per 1 SD increase in protein (outcome in its own units; set Residual SD to match).',
  },
};
