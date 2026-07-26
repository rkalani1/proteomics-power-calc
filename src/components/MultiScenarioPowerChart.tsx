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
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-gray-800 mb-2">
        {effectLabel}: {Number(label).toFixed(decimals)}
      </p>
      {payload.map((entry, index) => {
        // Extract protein count from dataKey (format: power_1000)
        const proteinCount = parseInt(entry.dataKey.split('_')[1]);
        const scenario = scenarioDict[proteinCount];

        return (
          <p key={index} className="text-sm flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">
              {proteinCount.toLocaleString()} protein{proteinCount !== 1 ? 's' : ''}:
            </span>
            <span className="font-medium" style={{ color: entry.color }}>
              {(entry.value * 100).toFixed(1)}%
            </span>
            {scenario && (
              <span className="text-xs text-gray-400">
                (α≈{scenario.alpha.toExponential(1)})
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          Power vs {effectLabel}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Comparing {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}: {scenarios.map(s =>
            `${s.proteinCount.toLocaleString()} protein${s.proteinCount !== 1 ? 's' : ''}`
          ).join(', ')}
        </p>
      </div>

      <div
        role="img"
        aria-label={`Line chart: statistical power versus ${effectLabel} (${effectSymbol}) for ${scenarios.length} protein-count scenario${scenarios.length !== 1 ? 's' : ''}, showing ${rangeSummary}, with the ${(targetPower * 100).toFixed(0)}% power target and the input ${effectSymbol}=${inputEffect.toFixed(decimals)} marked.`}
      >
      <ResponsiveContainer width="100%" height={360}>
        <LineChart
          data={visibleData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="effect"
            type="number"
            domain={[currentRangeMin, currentRangeMax]}
            tickCount={11}
            tickFormatter={(value) => value.toFixed(isBetaEffect ? 2 : 1)}
            label={{
              value: `${effectLabel} (${effectSymbol})`,
              position: 'insideBottom',
              offset: -10,
              style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12 },
            }}
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />

          <YAxis
            domain={[0, 1]}
            tickCount={11}
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            label={{
              value: 'Statistical Power',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12 },
            }}
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />

          <Tooltip content={<PowerCurveTooltip effectLabel={effectLabel} decimals={decimals} scenarios={scenarios} />} />

          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => {
              const proteinCount = parseInt(value.split('_')[1]);
              return (
                <span className="text-sm text-gray-700">
                  {proteinCount.toLocaleString()} protein{proteinCount !== 1 ? 's' : ''}
                </span>
              );
            }}
          />

          {/* Target power reference line */}
          <ReferenceLine
            y={targetPower}
            stroke="#f59e0b"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: `Target: ${(targetPower * 100).toFixed(0)}%`,
              position: 'right',
              fill: '#f59e0b',
              fontSize: 11,
              fontWeight: 600,
            }}
          />

          {/* Input effect size reference line */}
          <ReferenceLine
            x={inputEffect}
            stroke="#8b5cf6"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: `${effectSymbol}=${inputEffect.toFixed(decimals)}`,
              position: 'top',
              fill: '#8b5cf6',
              fontSize: 11,
              fontWeight: 600,
            }}
          />

          {/* Render a line for each scenario */}
          {scenarios.map((scenario) => (
            <Line
              key={scenario.proteinCount}
              type="monotone"
              dataKey={`power_${scenario.proteinCount}`}
              name={`power_${scenario.proteinCount}`}
              stroke={scenario.color.hex}
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 6, fill: scenario.color.hex, stroke: '#fff', strokeWidth: 2 }}
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
            <output htmlFor="chart-range-minimum">{currentRangeMin.toFixed(rangePrecision)}</output>
          </label>
          <input
            id="chart-range-minimum"
            className="chart-range-slider"
            type="range"
            min={xMin}
            max={xMax}
            step={rangeStep}
            value={currentRangeMin}
            aria-valuemin={xMin}
            aria-valuemax={xMax}
            aria-valuenow={currentRangeMin}
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
            <output htmlFor="chart-range-maximum">{currentRangeMax.toFixed(rangePrecision)}</output>
          </label>
          <input
            id="chart-range-maximum"
            className="chart-range-slider"
            type="range"
            min={xMin}
            max={xMax}
            step={rangeStep}
            value={currentRangeMax}
            aria-valuemin={xMin}
            aria-valuemax={xMax}
            aria-valuenow={currentRangeMax}
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
            onClick={() => {
              setRange({ min: xMin, max: xMax, domainMin: xMin, domainMax: xMax });
            }}
            disabled={currentRangeMin === xMin && currentRangeMax === xMax}
          >
            Reset full range
          </button>
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-amber-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0', borderColor: '#f59e0b' }}></div>
          <span>Target power threshold ({(targetPower * 100).toFixed(0)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-purple-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0', borderColor: '#8b5cf6' }}></div>
          <span>Input {effectSymbol} = {inputEffect.toFixed(decimals)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Use the labelled range controls to zoom the chart.</span>
        </div>
      </div>
    </div>
  );
};

export default MultiScenarioPowerChart;
