import type { AnalysisType, StudyDesign } from '../utils/statistics';

export interface StudyDesignOption {
  value: StudyDesign;
  label: string;
  description: string;
}

export const STUDY_DESIGN_OPTIONS = {
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
} as const satisfies Record<AnalysisType, readonly StudyDesignOption[]>;

export const SUPPORTED_STUDY_DESIGNS: Record<AnalysisType, readonly StudyDesign[]> = {
  cox: STUDY_DESIGN_OPTIONS.cox.map(({ value }) => value),
  linear: STUDY_DESIGN_OPTIONS.linear.map(({ value }) => value),
  logistic: STUDY_DESIGN_OPTIONS.logistic.map(({ value }) => value),
  poisson: STUDY_DESIGN_OPTIONS.poisson.map(({ value }) => value),
  gee: STUDY_DESIGN_OPTIONS.gee.map(({ value }) => value),
};

const RATIO_DISPLAY_EFFECT_GRID = [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0] as const;
const ADDITIVE_DISPLAY_EFFECT_GRID = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5] as const;

export const DISPLAY_EFFECT_GRIDS: Record<AnalysisType, readonly number[]> = {
  cox: RATIO_DISPLAY_EFFECT_GRID,
  linear: ADDITIVE_DISPLAY_EFFECT_GRID,
  logistic: RATIO_DISPLAY_EFFECT_GRID,
  poisson: RATIO_DISPLAY_EFFECT_GRID,
  gee: ADDITIVE_DISPLAY_EFFECT_GRID,
};

export const POWER_CURVE_RANGES: Record<AnalysisType, readonly [number, number]> = {
  cox: [1, 3],
  linear: [0, 1],
  logistic: [1, 3],
  poisson: [1, 3],
  gee: [0, 1],
};
export const POWER_CURVE_POINT_COUNT = 101;

export const POWER_BY_PROTEIN_TABLE_GRID = [1, 5, 10, 25, 50, 100, 200, 500, 1000, 3000, 5000] as const;
export const POWER_CHART_LINEAR_GRID = [
  ...Array.from({ length: 50 }, (_, index) => index + 1),
  ...Array.from({ length: 190 }, (_, index) => 55 + index * 5),
] as const;
export const POWER_CHART_LOG_GRID = [
  ...Array.from({ length: 100 }, (_, index) => index + 1),
  ...Array.from({ length: 40 }, (_, index) => 110 + index * 10),
  ...Array.from({ length: 10 }, (_, index) => 550 + index * 50),
  ...Array.from({ length: 40 }, (_, index) => 1100 + index * 100),
] as const;

export const SENSITIVITY_SAMPLE_SIZE_GRID = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000] as const;
export const SENSITIVITY_EVENT_GRID = [20, 40, 60, 80, 100, 150, 200, 300, 400, 500] as const;
export const SENSITIVITY_ADDITIVE_EFFECT_GRID = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8] as const;
export const SENSITIVITY_RATIO_EFFECT_GRID = [1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 2.0, 2.5, 3.0] as const;
// Deliberately fixed: unlike effect and dimension sweeps, the page does not
// merge current calculator scenarios into this x-axis.
export const SENSITIVITY_PROTEIN_GRID = [1, 10, 50, 100, 500, 1000, 2000, 3000, 5000, 7000, 10000] as const;

export const ADVANCED_TARGET_POWER_GRID = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.99] as const;
export const CONTOUR_ADDITIVE_EFFECT_GRID = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5] as const;
export const CONTOUR_RATIO_EFFECT_GRID = [1.2, 1.3, 1.4, 1.5, 1.7, 2.0, 2.5] as const;
export const CONTOUR_COX_DIMENSION_GRID = [50, 100, 150, 200, 300, 500, 750, 1000] as const;
export const CONTOUR_SAMPLE_SIZE_GRID = [200, 500, 1000, 2000, 3000, 5000, 7500, 10000] as const;
