import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  AXIS_LABEL_STYLE,
  AXIS_TICK,
  CHART_AXIS,
  CHART_GRID,
  MARKER_LINE,
  TARGET_LINE,
} from '../constants/chartTheme';
import { formatAlpha } from '../utils/formatters';

type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';

interface ScenarioInfo {
  proteinCount: number;
  alpha: number;
  color: {
    bg: string;
    text: string;
    light: string;
    border: string;
    hex: string;
  };
}

interface MultiScenarioPowerChartProps {
  /** Power curve data with effect sizes and power values for each scenario */
  data: Array<Record<string, number>>;
  /** Information about each scenario (protein count, alpha, color) */
  scenarios: ScenarioInfo[];
  /** Target power level (horizontal reference line) */
  targetPower: number;
  /** Input effect size (vertical reference line) */
  inputEffect: number;
  /** Effect size label (e.g., "Hazard Ratio") */
  effectLabel?: string;
  /** Effect size symbol (e.g., "HR") */
  effectSymbol?: string;
  /** Analysis type for formatting */
  analysisType?: AnalysisType;
}

// Dash patterns per scenario index so up to six curves stay distinguishable
// without relying on color alone. The first series stays solid; the rest
// cycle through distinct patterns.
const SCENARIO_DASHES: Array<string | undefined> = [undefined, '9 4', '3 3', '12 4 3 4', '6 3', '2 5'];

// Tooltip for the power-vs-effect curves. Defined at module scope to keep a
// stable component identity across re-renders.
const PowerCurveTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: number;
  effectLabel: string;
  decimals: number;
  scenarios: ScenarioInfo[];
}> = ({ active, payload, label, effectLabel, decimals, scenarios }) => {
  const scenarioDict = useMemo(() => {
    const dict: Record<number, ScenarioInfo> = {};
    for (let i = 0; i < scenarios.length; i++) {
      dict[scenarios[i].proteinCount] = scenarios[i];
    }
    return dict;
  }, [scenarios]);

  if (!active || !payload || !payload.length) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__title">
        {effectLabel}: {Number(label).toFixed(decimals)}
      </p>
      {payload.map((entry, index) => {
        // Extract protein count from dataKey (format: power_1000)
        const proteinCount = parseInt(entry.dataKey.split('_')[1]);
        const scenario = scenarioDict[proteinCount];

        return (
          <p key={index} className="chart-tooltip__row">
            <span
              className="series-dot"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-ink-soft">
              {proteinCount.toLocaleString()} protein{proteinCount !== 1 ? 's' : ''}:
            </span>
            <span className="chart-tooltip__value">
              {(entry.value * 100).toFixed(1)}%
            </span>
            {scenario && (
              <span className="chart-tooltip__meta">
                (α ≈ {formatAlpha(scenario.alpha)})
              </span>
            )}
          </p>
        );
      })}
    </div>
  );
};

/**
 * MultiScenarioPowerChart Component
 *
 * Interactive visualization of Power vs Effect Size curves for multiple
 * protein count scenarios. Dynamically renders a line for each scenario
 * with distinct colors and labels.
 */
const MultiScenarioPowerChart: React.FC<MultiScenarioPowerChartProps> = ({
  data,
  scenarios,
  targetPower,
  inputEffect,
  effectLabel = 'Hazard Ratio',
  effectSymbol = 'HR',
  analysisType = 'cox',
}) => {
  // Determine decimal places based on analysis type
  const isBetaEffect = analysisType === 'linear' || analysisType === 'gee';
  const decimals = isBetaEffect ? 3 : 2;

  // Get x-axis domain based on data
  const xMin = data.length > 0 ? data[0].effect : 1;
  const xMax = data.length > 0 ? data[data.length - 1].effect : 3;
  const rangeStep = data.length > 1
    ? Number(Math.max(Number.EPSILON, data[1].effect - data[0].effect).toFixed(6))
    : (isBetaEffect ? 0.01 : 0.02);
  const [range, setRange] = useState({
    min: xMin,
    max: xMax,
    domainMin: xMin,
    domainMax: xMax,
  });
  const rangeMatchesDomain = range.domainMin === xMin && range.domainMax === xMax;
  const currentRangeMin = rangeMatchesDomain
    ? Math.max(xMin, Math.min(range.min, xMax))
    : xMin;
  const currentRangeMax = rangeMatchesDomain
    ? Math.min(xMax, Math.max(range.max, xMin))
    : xMax;
  const visibleData = useMemo(
    () => data.filter(point => point.effect >= currentRangeMin && point.effect <= currentRangeMax),
    [data, currentRangeMin, currentRangeMax]
  );
  const rangePrecision = isBetaEffect ? 3 : 2;
  const rangeSummary = `${effectLabel} range ${currentRangeMin.toFixed(rangePrecision)} to ${currentRangeMax.toFixed(rangePrecision)}`;
  // The input-effect marker is only drawn when it falls inside the zoomed
  // range, so the chart description and legend must not claim it otherwise.
  const inputMarkerVisible = inputEffect >= currentRangeMin && inputEffect <= currentRangeMax;

  return (
    <section className="assay-card assay-card--padded">
      <div className="mb-4">
        <h2 className="section-title">
          <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          Power vs {effectLabel}
        </h2>
        <p className="section-subtitle">
          Comparing {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}: {scenarios.map(s =>
            `${s.proteinCount.toLocaleString()} protein${s.proteinCount !== 1 ? 's' : ''}`
          ).join(', ')}
        </p>
      </div>

      <div
        role="img"
        aria-label={`Line chart: statistical power versus ${effectLabel} (${effectSymbol}) for ${scenarios.length} protein-count scenario${scenarios.length !== 1 ? 's' : ''}, showing ${rangeSummary}, with the ${(targetPower * 100).toFixed(0)}% power target${inputMarkerVisible ? ` and the input ${effectSymbol}=${inputEffect.toFixed(decimals)}` : ''} marked.`}
      >
      <ResponsiveContainer width="100%" height={360}>
        <LineChart
          data={visibleData}
          margin={{ top: 20, right: 84, left: 20, bottom: 40 }}
        >
          <CartesianGrid stroke={CHART_GRID} vertical={false} />

          <XAxis
            dataKey="effect"
            type="number"
            domain={[currentRangeMin, currentRangeMax]}
            tickCount={11}
            tickFormatter={(value) => value.toFixed(isBetaEffect ? 2 : 1)}
            axisLine={{ stroke: CHART_AXIS }}
            tickLine={{ stroke: CHART_AXIS }}
            label={{
              value: `${effectLabel} (${effectSymbol})`,
              position: 'insideBottom',
              offset: -10,
              style: AXIS_LABEL_STYLE,
            }}
            tick={AXIS_TICK}
          />

          <YAxis
            domain={[0, 1]}
            tickCount={11}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Statistical Power',
              angle: -90,
              position: 'insideLeft',
              style: AXIS_LABEL_STYLE,
            }}
            tick={AXIS_TICK}
          />

          <Tooltip content={<PowerCurveTooltip effectLabel={effectLabel} decimals={decimals} scenarios={scenarios} />} />

          <Legend
            verticalAlign="top"
            height={36}
            iconType="plainline"
            formatter={(value: string) => {
              const proteinCount = parseInt(value.split('_')[1]);
              return (
                <span className="text-sm text-ink-soft">
                  {proteinCount.toLocaleString()} protein{proteinCount !== 1 ? 's' : ''}
                </span>
              );
            }}
          />

          {/* Target power reference line */}
          <ReferenceLine
            y={targetPower}
            stroke={TARGET_LINE}
            strokeDasharray="8 4"
            strokeWidth={1.5}
            label={{
              value: `Target: ${(targetPower * 100).toFixed(0)}%`,
              position: 'right',
              fill: TARGET_LINE,
              fontSize: 11,
              fontWeight: 600,
            }}
          />

          {/* Input effect size reference line (only when inside the zoom range) */}
          {inputMarkerVisible && (
            <ReferenceLine
              x={inputEffect}
              stroke={MARKER_LINE}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `${effectSymbol}=${inputEffect.toFixed(decimals)}`,
                position: 'top',
                fill: MARKER_LINE,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}

          {/* Render a line for each scenario */}
          {scenarios.map((scenario, index) => (
            <Line
              key={scenario.proteinCount}
              type="monotone"
              dataKey={`power_${scenario.proteinCount}`}
              name={`power_${scenario.proteinCount}`}
              stroke={scenario.color.hex}
              strokeWidth={2.25}
              strokeDasharray={SCENARIO_DASHES[index % SCENARIO_DASHES.length]}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 5, fill: scenario.color.hex, stroke: '#fff', strokeWidth: 2 }}
            />
          ))}

        </LineChart>
      </ResponsiveContainer>
      </div>

      <fieldset className="chart-range-controls">
        <legend>Visible chart range</legend>
        <div className="chart-range-control">
          <label htmlFor="chart-range-minimum">
            Minimum {effectSymbol}
            {/* aria-hidden keeps the live value out of the control's accessible
                name; the slider's aria-valuetext already announces it. */}
            <output htmlFor="chart-range-minimum" aria-hidden="true">{currentRangeMin.toFixed(rangePrecision)}</output>
          </label>
          <input
            id="chart-range-minimum"
            className="chart-range-slider"
            type="range"
            min={xMin}
            max={xMax}
            step={rangeStep}
            value={currentRangeMin}
            aria-valuetext={`${effectLabel} minimum ${currentRangeMin.toFixed(rangePrecision)}`}
            disabled={xMin === xMax}
            onChange={(event) => {
              const requested = Number(event.target.value);
              setRange({
                min: Number(Math.min(requested, currentRangeMax - rangeStep).toFixed(6)),
                max: currentRangeMax,
                domainMin: xMin,
                domainMax: xMax,
              });
            }}
          />
        </div>
        <div className="chart-range-control">
          <label htmlFor="chart-range-maximum">
            Maximum {effectSymbol}
            <output htmlFor="chart-range-maximum" aria-hidden="true">{currentRangeMax.toFixed(rangePrecision)}</output>
          </label>
          <input
            id="chart-range-maximum"
            className="chart-range-slider"
            type="range"
            min={xMin}
            max={xMax}
            step={rangeStep}
            value={currentRangeMax}
            aria-valuetext={`${effectLabel} maximum ${currentRangeMax.toFixed(rangePrecision)}`}
            disabled={xMin === xMax}
            onChange={(event) => {
              const requested = Number(event.target.value);
              setRange({
                min: currentRangeMin,
                max: Number(Math.max(requested, currentRangeMin + rangeStep).toFixed(6)),
                domainMin: xMin,
                domainMax: xMax,
              });
            }}
          />
        </div>
        <div className="chart-range-footer">
          <p role="status" aria-live="polite" aria-atomic="true">{rangeSummary}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setRange({ min: xMin, max: xMax, domainMin: xMin, domainMax: xMax });
            }}
            disabled={currentRangeMin === xMin && currentRangeMax === xMax}
          >
            Reset full range
          </button>
        </div>
      </fieldset>

      <div className="chart-legend-note">
        <div style={{ color: TARGET_LINE }}>
          <span aria-hidden="true" className="chart-legend-swatch"></span>
          <span className="text-ink-soft">Target power threshold ({(targetPower * 100).toFixed(0)}%)</span>
        </div>
        {inputMarkerVisible && (
          <div style={{ color: MARKER_LINE }}>
            <span aria-hidden="true" className="chart-legend-swatch"></span>
            <span className="text-ink-soft">Input {effectSymbol} = {inputEffect.toFixed(decimals)}</span>
          </div>
        )}
        <div>
          <span>Use the labelled range controls to zoom the chart.</span>
        </div>
      </div>
    </section>
  );
};

export default MultiScenarioPowerChart;
