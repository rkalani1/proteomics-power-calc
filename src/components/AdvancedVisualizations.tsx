import { useState, useMemo } from 'react';
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
  ErrorBar,
  Cell,
} from 'recharts';

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
}

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
}) => {
  const [activeViz, setActiveViz] = useState<VisualizationType>('sample-size-curve');

  // Determine decimal places based on analysis type
  const decimals = analysisType === 'linear' ? 3 : 2;
  const isCox = analysisType === 'cox';

  // Generate sample size curve data
  const sampleSizeCurveData = useMemo(() => {
    const powerLevels = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.99];

    return powerLevels.map(power => {
      const point: Record<string, number> = { power: power * 100 };

      scenarios.forEach(scenario => {
        if (isCox) {
          const events = calculateRequiredEvents(currentEffectSize, scenario.alpha, power);
          point[`events_${scenario.proteinCount}`] = Math.min(events, 5000);
        } else {
          const n = calculateRequiredSampleSize(currentEffectSize, scenario.alpha, power);
          point[`n_${scenario.proteinCount}`] = Math.min(n, 50000);
        }
      });

      return point;
    });
  }, [scenarios, currentEffectSize, isCox, calculateRequiredEvents, calculateRequiredSampleSize]);

  // Generate forest plot data
  const forestPlotData = useMemo(() => {
    return scenarios.map(scenario => {
      const baseEffect = analysisType === 'linear' ? 0 : 1;
      const effectRange = scenario.minDetectableEffect - baseEffect;

      // Calculate confidence interval approximation (±15% of effect range for visualization)
      const ciWidth = effectRange * 0.15;

      return {
        name: `${scenario.proteinCount.toLocaleString()} proteins`,
        proteinCount: scenario.proteinCount,
        effect: scenario.minDetectableEffect,
        effectLow: scenario.minDetectableEffect - ciWidth,
        effectHigh: scenario.minDetectableEffect + ciWidth,
        alpha: scenario.alpha,
        color: scenario.color.hex,
      };
    });
  }, [scenarios, analysisType]);

  // Generate power contour data (effect size vs sample size grid)
  const powerContourData = useMemo(() => {
    const data: Array<Record<string, number | string>> = [];

    // Define grid
    const effectValues = analysisType === 'linear'
      ? [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5]
      : [1.2, 1.3, 1.4, 1.5, 1.7, 2.0, 2.5];

    const sampleValues = isCox
      ? [50, 100, 150, 200, 300, 500, 750, 1000]
      : [200, 500, 1000, 2000, 3000, 5000, 7500, 10000];

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
  }, [scenarios, analysisType, isCox, decimals, calculatePower]);

  // Custom tooltip for sample size curve
  const SampleSizeTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
    label?: number;
  }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-800 mb-2">
          Target Power: {label}%
        </p>
        {payload.map((entry, index) => {
          const proteinCount = parseInt(entry.dataKey.split('_')[1]);
          return (
            <p key={index} className="text-sm flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">
                {proteinCount.toLocaleString()} proteins:
              </span>
              <span className="font-medium" style={{ color: entry.color }}>
                {isCox ? `${Math.round(entry.value)} events` : `n=${Math.round(entry.value).toLocaleString()}`}
              </span>
            </p>
          );
        })}
      </div>
    );
  };

  // Custom tooltip for forest plot
  const ForestTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: typeof forestPlotData[0] }>;
  }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-800">{data.name}</p>
        <p className="text-sm text-gray-600">
          Min Detectable {effectSymbol}: <span className="font-medium">{data.effect.toFixed(decimals)}</span>
        </p>
        <p className="text-xs text-gray-500">
          α ≈ {data.alpha.toExponential(1)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          95% CI: [{data.effectLow.toFixed(decimals)}, {data.effectHigh.toFixed(decimals)}]
        </p>
      </div>
    );
  };

  // Power status color
  const getPowerColor = (power: number): string => {
    if (power >= 0.8) return '#10b981';
    if (power >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header with visualization selector */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Advanced Visualizations
            </h3>
          </div>

          {/* Visualization type selector */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveViz('sample-size-curve')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeViz === 'sample-size-curve'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {isCox ? 'Events Curve' : 'Sample Size Curve'}
            </button>
            <button
              onClick={() => setActiveViz('forest-plot')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeViz === 'forest-plot'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Forest Plot
            </button>
            <button
              onClick={() => setActiveViz('power-contour')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeViz === 'power-contour'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Power Grid
            </button>
          </div>
        </div>
      </div>

      {/* Visualization content */}
      <div className="p-4">
        {/* Sample Size Curve */}
        {activeViz === 'sample-size-curve' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Required {isCox ? 'events' : 'sample size'} to achieve different power levels at {effectSymbol} = {currentEffectSize.toFixed(decimals)}
            </p>

            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={sampleSizeCurveData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                <XAxis
                  dataKey="power"
                  type="number"
                  domain={[50, 100]}
                  tickFormatter={(value) => `${value}%`}
                  label={{
                    value: 'Target Power',
                    position: 'insideBottom',
                    offset: -10,
                    style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12 },
                  }}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />

                <YAxis
                  tickFormatter={(value) => value.toLocaleString()}
                  label={{
                    value: isCox ? 'Required Events (d)' : 'Required Sample Size (n)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12 },
                  }}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />

                <Tooltip content={<SampleSizeTooltip />} />

                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value: string) => {
                    const count = parseInt(value.split('_')[1]);
                    return (
                      <span className="text-sm text-gray-700">
                        {count.toLocaleString()} proteins
                      </span>
                    );
                  }}
                />

                {/* Current power reference line */}
                <ReferenceLine
                  x={targetPower * 100}
                  stroke="#f59e0b"
                  strokeDasharray="8 4"
                  strokeWidth={2}
                  label={{
                    value: `Target: ${(targetPower * 100).toFixed(0)}%`,
                    position: 'top',
                    fill: '#f59e0b',
                    fontSize: 11,
                  }}
                />

                {/* Current sample size reference */}
                <ReferenceLine
                  y={isCox ? currentEvents : currentSampleSize}
                  stroke="#8b5cf6"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Current: ${isCox ? currentEvents : currentSampleSize.toLocaleString()}`,
                    position: 'right',
                    fill: '#8b5cf6',
                    fontSize: 11,
                  }}
                />

                {scenarios.map((scenario) => (
                  <Line
                    key={scenario.proteinCount}
                    type="monotone"
                    dataKey={isCox ? `events_${scenario.proteinCount}` : `n_${scenario.proteinCount}`}
                    name={isCox ? `events_${scenario.proteinCount}` : `n_${scenario.proteinCount}`}
                    stroke={scenario.color.hex}
                    strokeWidth={3}
                    dot={{ r: 4, fill: scenario.color.hex }}
                    activeDot={{ r: 6, fill: scenario.color.hex, stroke: '#fff', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Forest Plot */}
        {activeViz === 'forest-plot' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Minimum detectable {effectLabel} for {(targetPower * 100).toFixed(0)}% power across protein counts
            </p>

            <ResponsiveContainer width="100%" height={Math.max(200, scenarios.length * 50 + 100)}>
              <BarChart
                data={forestPlotData}
                layout="vertical"
                margin={{ top: 20, right: 40, left: 120, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />

                <XAxis
                  type="number"
                  domain={analysisType === 'linear' ? [0, 'auto'] : [1, 'auto']}
                  tickFormatter={(value) => value.toFixed(decimals)}
                  label={{
                    value: `Minimum Detectable ${effectLabel} (${effectSymbol})`,
                    position: 'insideBottom',
                    offset: -5,
                    style: { textAnchor: 'middle', fill: '#6b7280', fontSize: 12 },
                  }}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  width={110}
                />

                <Tooltip content={<ForestTooltip />} />

                {/* Reference line at null effect */}
                <ReferenceLine
                  x={analysisType === 'linear' ? 0 : 1}
                  stroke="#9ca3af"
                  strokeWidth={2}
                  label={{
                    value: 'Null',
                    position: 'top',
                    fill: '#9ca3af',
                    fontSize: 10,
                  }}
                />

                {/* Current effect size reference */}
                <ReferenceLine
                  x={currentEffectSize}
                  stroke="#8b5cf6"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Input ${effectSymbol}`,
                    position: 'top',
                    fill: '#8b5cf6',
                    fontSize: 10,
                  }}
                />

                <Bar dataKey="effect" radius={[0, 4, 4, 0]}>
                  {forestPlotData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <ErrorBar
                    dataKey="effectHigh"
                    width={4}
                    strokeWidth={2}
                    stroke="#6b7280"
                    direction="x"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

          </div>
        )}

        {/* Power Contour / Grid */}
        {activeViz === 'power-contour' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Power across {effectLabel} and {isCox ? 'events' : 'sample size'} combinations
              (using {scenarios[0]?.proteinCount.toLocaleString() || 'selected'} proteins, α ≈ {scenarios[0]?.alpha.toExponential(1)})
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                      {effectSymbol}
                    </th>
                    {powerContourData.sampleValues.map((n) => (
                      <th key={n} className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-gray-200">
                        {isCox ? `d=${n}` : `n=${n.toLocaleString()}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {powerContourData.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-2 font-medium text-gray-900 border-b border-gray-100">
                        {row.effectLabel}
                      </td>
                      {powerContourData.sampleValues.map((n) => {
                        const power = row[`power_${n}`] as number;
                        return (
                          <td
                            key={n}
                            className="px-3 py-2 text-center border-b border-gray-100"
                            style={{
                              backgroundColor: `${getPowerColor(power)}20`,
                              color: getPowerColor(power),
                            }}
                          >
                            <span className="font-medium">
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

            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b98133' }}></div>
                <span className="text-green-600">≥80% adequate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b33' }}></div>
                <span className="text-amber-600">50-79% marginal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef444433' }}></div>
                <span className="text-red-600">&lt;50% underpowered</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedVisualizations;
