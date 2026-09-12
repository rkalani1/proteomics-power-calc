import { useState, useMemo } from 'react';
import { getPowerStatus, POWER_STATUS_BG_CLASSES } from '../utils/formatters';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  ADVANCED_TARGET_POWER_GRID,
  CONTOUR_ADDITIVE_EFFECT_GRID,
  CONTOUR_COX_DIMENSION_GRID,
  CONTOUR_RATIO_EFFECT_GRID,
  CONTOUR_SAMPLE_SIZE_GRID,
} from '../constants/analysisGrids';
import {
  AXIS_LABEL_STYLE,
  AXIS_TICK,
  CHART_AXIS,
  CHART_GRID,
  MARKER_LINE,
  NULL_LINE,
  TARGET_LINE,
} from '../constants/chartTheme';

type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';
type VisualizationType = 'sample-size-curve' | 'forest-plot' | 'power-contour';

interface ScenarioInfo {
  proteinCount: number;
  alpha: number;
  minDetectableEffect: number;
  color: {
    bg: string;
    text: string;
    light: string;
    border: string;
    hex: string;
  };
}

interface AdvancedVisualizationsProps {
  analysisType: AnalysisType;
  targetPower: number;
  scenarios: ScenarioInfo[];
  effectSymbol: string;
  effectLabel: string;
  currentEffectSize: number;
  currentEvents: number;
  currentSampleSize: number;
  calculateRequiredEvents: (effect: number, alpha: number, power: number) => number;
  calculateRequiredSampleSize: (effect: number, alpha: number, power: number) => number;
  calculatePower: (effect: number, alpha: number, n: number) => number;
  /** Initial visualization shown (defaults to the events/sample-size curve). */
  initialViz?: VisualizationType;
  /** Start expanded instead of collapsed (used by render tests). */
  initialExpanded?: boolean;
}

interface ForestDatum {
  name: string;
  proteinCount: number;
  effect: number;
  alpha: number;
  color: string;
}

// Tooltips for the advanced visualizations. Defined at module scope to keep a
// stable component identity across re-renders.
const SampleSizeTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: number;
  isCox: boolean;
}> = ({ active, payload, label, isCox }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__title">
        Target Power: {label}%
      </p>
      {payload.map((entry, index) => {
        const proteinCount = parseInt(entry.dataKey.split('_')[1]);
        return (
          <p key={index} className="chart-tooltip__row">
            <span
              className="series-dot"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-ink-soft">
              {proteinCount.toLocaleString()} proteins:
            </span>
            <span className="chart-tooltip__value">
              {isCox ? `${Math.round(entry.value)} events` : `n=${Math.round(entry.value).toLocaleString()}`}
            </span>
          </p>
        );
      })}
    </div>
  );
};

const ForestTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: ForestDatum }>;
  effectSymbol: string;
  decimals: number;
}> = ({ active, payload, effectSymbol, decimals }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__title">{data.name}</p>
      <p className="chart-tooltip__row">
        <span className="text-ink-soft">Min Detectable {effectSymbol}:</span>
        <span className="chart-tooltip__value">{data.effect.toFixed(decimals)}</span>
      </p>
      <p className="chart-tooltip__meta">
        α ≈ {data.alpha.toExponential(1)}
      </p>
    </div>
  );
};

/**
 * AdvancedVisualizations Component
 *
 * Provides additional visualization options for power analysis:
 * 1. Sample Size Curve - Required sample size vs target power
 * 2. Forest Plot - Visual comparison of minimum detectable effects
 * 3. Power Contour - Heatmap of power across effect sizes and sample sizes
 */
const AdvancedVisualizations: React.FC<AdvancedVisualizationsProps> = ({
  analysisType,
  targetPower,
  scenarios,
  effectSymbol,
  effectLabel,
  currentEffectSize,
  currentEvents,
  currentSampleSize,
  calculateRequiredEvents,
  calculateRequiredSampleSize,
  calculatePower,
  initialViz = 'sample-size-curve',
  initialExpanded = false,
}) => {
  const [activeViz, setActiveViz] = useState<VisualizationType>(initialViz);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // Linear and GEE estimate an additive coefficient β (null effect = 0); the
  // others estimate a multiplicative ratio (null effect = 1). This drives the
  // effect range, axis domain, null reference, and display precision.
  const isBetaEffect = analysisType === 'linear' || analysisType === 'gee';
  const decimals = isBetaEffect ? 3 : 2;
  const isCox = analysisType === 'cox';

  // Generate sample size curve data
  const sampleSizeCurveData = useMemo(() => {
    return ADVANCED_TARGET_POWER_GRID.map(power => {
      const point: Record<string, number> = { power: power * 100 };

      scenarios.forEach(scenario => {
        // Plot the true required events / sample size (no display cap, so the
        // tooltip never reports a clamped number). Non-finite results (e.g. at
        // the null effect) are omitted so the line simply breaks.
        const required = isCox
          ? calculateRequiredEvents(currentEffectSize, scenario.alpha, power)
          : calculateRequiredSampleSize(currentEffectSize, scenario.alpha, power);
        if (Number.isFinite(required)) {
          point[`${isCox ? 'events' : 'n'}_${scenario.proteinCount}`] = required;
        }
      });

      return point;
    });
  }, [scenarios, currentEffectSize, isCox, calculateRequiredEvents, calculateRequiredSampleSize]);

  // Generate forest plot data. The minimum detectable effect is a single
  // computed threshold (not an estimate with sampling error), so it carries no
  // confidence interval — only the point value per scenario is shown.
  // Non-finite thresholds (e.g. zero events) are dropped rather than passed to
  // the bar chart, which cannot render them.
  const forestPlotData = useMemo(() => {
    return scenarios
      .filter(scenario => Number.isFinite(scenario.minDetectableEffect))
      .map(scenario => ({
        name: `${scenario.proteinCount.toLocaleString()} proteins`,
        proteinCount: scenario.proteinCount,
        effect: scenario.minDetectableEffect,
        alpha: scenario.alpha,
        color: scenario.color.hex,
      }));
  }, [scenarios]);

  // True when at least one point on the required-N curve is finite; at the
  // null effect every point is dropped and the chart would render blank.
  const sampleSizeCurveHasData = useMemo(
    () => sampleSizeCurveData.some(point => Object.keys(point).length > 1),
    [sampleSizeCurveData]
  );

  // Generate power contour data (effect size vs sample size grid)
  const powerContourData = useMemo(() => {
    const data: Array<Record<string, number | string>> = [];

    // Define grid
    const effectValues = isBetaEffect
      ? CONTOUR_ADDITIVE_EFFECT_GRID
      : CONTOUR_RATIO_EFFECT_GRID;

    const sampleValues = isCox
      ? CONTOUR_COX_DIMENSION_GRID
      : CONTOUR_SAMPLE_SIZE_GRID;

    // Use first scenario's alpha for the contour
    const alpha = scenarios[0]?.alpha || 0.05;

    effectValues.forEach(effect => {
      const row: Record<string, number | string> = {
        effect,
        effectLabel: effect.toFixed(decimals)
      };

      sampleValues.forEach(n => {
        const power = calculatePower(effect, alpha, n);
        row[`power_${n}`] = power;
      });

      data.push(row);
    });

    return { data, sampleValues };
  }, [scenarios, isBetaEffect, isCox, decimals, calculatePower]);

  // Accessible power-status classes (AA-contrast text on a light wash),
  // matching the token set used by the Power Sensitivity table.
  const getPowerCellClasses = (power: number): string => {
    const status = getPowerStatus(power, targetPower);
    return POWER_STATUS_BG_CLASSES[status];
  };

  const targetPct = (targetPower * 100).toFixed(0);

  const vizOptions: Array<{ value: VisualizationType; label: string }> = [
    { value: 'sample-size-curve', label: isCox ? 'Events Curve' : 'Sample Size Curve' },
    { value: 'forest-plot', label: 'Forest Plot' },
    { value: 'power-contour', label: 'Power Grid' },
  ];

  return (
    <section className="assay-card">
      {/* Header with visualization selector */}
      <div className={`px-6 py-4 ${isExpanded ? 'border-b border-line-soft' : ''}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="section-title">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-controls="advanced-viz-content"
              className="disclosure disclosure--inline"
            >
              <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Advanced Visualizations</span>
              <svg
                aria-hidden="true"
                focusable="false"
                className="disclosure__chevron"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </h2>

          {/* Visualization type selector */}
          {isExpanded && (
          <div className="segmented" role="group" aria-label="Visualization type">
            {vizOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveViz(option.value)}
                aria-pressed={activeViz === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* Visualization content */}
      {isExpanded && (
      <div id="advanced-viz-content" className="p-6">
        {/* Sample Size Curve */}
        {activeViz === 'sample-size-curve' && (
          <div>
            <p className="mb-4 text-sm text-ink-soft">
              Required {isCox ? 'events' : 'sample size'} to achieve different power levels at {effectSymbol} = {currentEffectSize.toFixed(decimals)}
            </p>

            {!sampleSizeCurveHasData && (
              <p className="inset-panel p-6 text-center text-sm text-ink-soft">
                No attainable {isCox ? 'event count' : 'sample size'}: the selected effect size
                equals the null value (no effect). Increase the effect size to see the curve.
              </p>
            )}

            {sampleSizeCurveHasData && (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={sampleSizeCurveData} margin={{ top: 20, right: 104, left: 20, bottom: 40 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />

                <XAxis
                  dataKey="power"
                  type="number"
                  domain={[50, 100]}
                  tickFormatter={(value) => `${value}%`}
                  axisLine={{ stroke: CHART_AXIS }}
                  tickLine={{ stroke: CHART_AXIS }}
                  label={{
                    value: 'Target Power',
                    position: 'insideBottom',
                    offset: -10,
                    style: AXIS_LABEL_STYLE,
                  }}
                  tick={AXIS_TICK}
                />

                <YAxis
                  tickFormatter={(value) => value.toLocaleString()}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: isCox ? 'Required Events (d)' : 'Required Sample Size (n)',
                    angle: -90,
                    position: 'insideLeft',
                    style: AXIS_LABEL_STYLE,
                  }}
                  tick={AXIS_TICK}
                />

                <Tooltip content={<SampleSizeTooltip isCox={isCox} />} />

                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="plainline"
                  formatter={(value: string) => {
                    const count = parseInt(value.split('_')[1]);
                    return (
                      <span className="text-sm text-ink-soft">
                        {count.toLocaleString()} proteins
                      </span>
                    );
                  }}
                />

                {/* Current power reference line */}
                <ReferenceLine
                  x={targetPower * 100}
                  stroke={TARGET_LINE}
                  strokeDasharray="8 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Target: ${targetPct}%`,
                    position: 'top',
                    fill: TARGET_LINE,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />

                {/* Current sample size reference */}
                <ReferenceLine
                  y={isCox ? currentEvents : currentSampleSize}
                  stroke={MARKER_LINE}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Current: ${isCox ? currentEvents : currentSampleSize.toLocaleString()}`,
                    position: 'right',
                    fill: MARKER_LINE,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />

                {scenarios.map((scenario) => (
                  <Line
                    key={scenario.proteinCount}
                    type="monotone"
                    dataKey={isCox ? `events_${scenario.proteinCount}` : `n_${scenario.proteinCount}`}
                    name={isCox ? `events_${scenario.proteinCount}` : `n_${scenario.proteinCount}`}
                    stroke={scenario.color.hex}
                    strokeWidth={2.25}
                    dot={{ r: 3.5, fill: scenario.color.hex, stroke: '#fff', strokeWidth: 1.5 }}
                    isAnimationActive={false}
                    activeDot={{ r: 5, fill: scenario.color.hex, stroke: '#fff', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Forest Plot */}
        {activeViz === 'forest-plot' && (
          <div>
            <p className="mb-4 text-sm text-ink-soft">
              Minimum detectable {effectLabel} for {targetPct}% power across protein counts
            </p>

            {forestPlotData.length === 0 && (
              <p className="inset-panel p-6 text-center text-sm text-ink-soft">
                No finite minimum detectable effect for the current parameters —
                check the sample-size / events inputs.
              </p>
            )}

            {forestPlotData.length > 0 && (
            <ResponsiveContainer width="100%" height={Math.max(200, scenarios.length * 50 + 100)}>
              <BarChart
                data={forestPlotData}
                layout="vertical"
                margin={{ top: 20, right: 40, left: 120, bottom: 20 }}
                barCategoryGap="30%"
              >
                <CartesianGrid stroke={CHART_GRID} horizontal={false} />

                <XAxis
                  type="number"
                  domain={isBetaEffect ? [0, 'auto'] : [1, 'auto']}
                  tickFormatter={(value) => value.toFixed(decimals)}
                  axisLine={{ stroke: CHART_AXIS }}
                  tickLine={{ stroke: CHART_AXIS }}
                  label={{
                    value: `Minimum Detectable ${effectLabel} (${effectSymbol})`,
                    position: 'insideBottom',
                    offset: -5,
                    style: AXIS_LABEL_STYLE,
                  }}
                  tick={AXIS_TICK}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                  width={110}
                />

                <Tooltip content={<ForestTooltip effectSymbol={effectSymbol} decimals={decimals} />} cursor={{ fill: 'rgba(20, 47, 58, 0.04)' }} />

                {/* Reference line at null effect */}
                <ReferenceLine
                  x={isBetaEffect ? 0 : 1}
                  stroke={NULL_LINE}
                  strokeWidth={1.5}
                  label={{
                    value: 'Null',
                    position: 'top',
                    fill: NULL_LINE,
                    fontSize: 10,
                  }}
                />

                {/* Current effect size reference */}
                <ReferenceLine
                  x={currentEffectSize}
                  stroke={MARKER_LINE}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Input ${effectSymbol}`,
                    position: 'top',
                    fill: MARKER_LINE,
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />

                <Bar dataKey="effect" radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={28}>
                  {forestPlotData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Power Contour / Grid */}
        {activeViz === 'power-contour' && (
          <div>
            <p className="mb-4 text-sm text-ink-soft">
              Power across {effectLabel} and {isCox ? 'events' : 'sample size'} combinations
              (using {scenarios[0]?.proteinCount.toLocaleString() || 'selected'} proteins, α ≈ {scenarios[0]?.alpha.toExponential(2)})
            </p>

            <div className="scroll-region" tabIndex={0} role="region" aria-label={`Power grid: ${effectLabel} by ${isCox ? 'events' : 'sample size'}`}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="is-sticky">
                      {effectSymbol}
                    </th>
                    {powerContourData.sampleValues.map((n) => (
                      <th key={n} className="text-center">
                        {isCox ? `d=${n}` : `n=${n.toLocaleString()}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {powerContourData.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="is-sticky font-semibold text-ink">
                        {row.effectLabel}
                      </td>
                      {powerContourData.sampleValues.map((n) => {
                        const power = row[`power_${n}`] as number;
                        return (
                          <td key={n} className="text-center">
                            <span className={getPowerCellClasses(power)}>
                              {(power * 100).toFixed(0)}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-legend mt-4">
              <span className="status-badge status-badge--adequate">≥{targetPct}% meets target</span>
              {targetPower > 0.5 && (
                <span className="status-badge status-badge--marginal">50%–{targetPct}% below target</span>
              )}
              <span className="status-badge status-badge--inadequate">&lt;50% underpowered</span>
            </div>

          </div>
        )}
      </div>
      )}
    </section>
  );
};

export default AdvancedVisualizations;
