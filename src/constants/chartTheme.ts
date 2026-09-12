/**
 * Shared chart chrome so every Recharts figure reads as one system:
 * recessive hairline grid and axes, ink-toned labels, and a fixed pair of
 * reference-line colours (gold for the power target, ink for the "current"
 * or "input" marker) reused across all charts.
 */
export const CHART_INK = '#49616a';
export const CHART_INK_MUTED = '#586d76';
export const CHART_GRID = '#e6eded';
export const CHART_AXIS = '#c9d6d6';

/** Dashed horizontal/vertical line marking the target power. */
export const TARGET_LINE = '#9a6b1c';
/** Dashed line marking the current input value. */
export const MARKER_LINE = '#142f3a';
/** Solid line at the null effect (HR/OR/RR = 1, beta = 0). */
export const NULL_LINE = '#9fb1b1';
/** Colour for a chart that carries a single series. */
export const SINGLE_SERIES = '#17656f';

export const AXIS_LABEL_STYLE = { textAnchor: 'middle', fill: CHART_INK, fontSize: 12 } as const;
export const AXIS_TICK = { fill: CHART_INK, fontSize: 11 } as const;

/**
 * Ordinal single-hue teal ramp for the ten fixed effect sizes plotted on the
 * power-by-proteins chart (smallest effect = lightest, largest = darkest).
 * Every step keeps at least 2:1 contrast on white. Ten discrete steps cannot
 * also satisfy a 0.06 OKLCH lightness gap between neighbours, so the
 * companion sensitivity table and the legend/tooltip act as the relief
 * channel for telling adjacent curves apart.
 */
export const EFFECT_SIZE_RAMP: readonly string[] = [
  '#57c3d0', '#44b2bf', '#2ea1ae', '#10919d', '#00818d',
  '#00717d', '#00616d', '#00525e', '#00434f', '#003441',
];
