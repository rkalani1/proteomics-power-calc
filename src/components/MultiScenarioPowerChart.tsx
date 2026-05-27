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
  Brush,
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
  const decimals = analysisType === 'linear' ? 3 : 2;

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
    label?: number;
  }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-800 mb-2">
          {effectLabel}: {Number(label).toFixed(decimals)}
        </p>
        {payload.map((entry, index) => {
          // Extract protein count from dataKey (format: power_1000)
          const proteinCount = parseInt(entry.dataKey.split('_')[1]);
          const scenario = scenarios.find(s => s.proteinCount === proteinCount);

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

  // Get x-axis domain based on data
  const xMin = data.length > 0 ? data[0].effect : 1;
  const xMax = data.length > 0 ? data[data.length - 1].effect : 3;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          Power vs {effectLabel}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Comparing {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}: {scenarios.map(s =>
            `${s.proteinCount.toLocaleString()} protein${s.proteinCount !== 1 ? 's' : ''}`
          ).join(', ')}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="effect"
            type="number"
            domain={[xMin, xMax]}
            tickCount={11}
            tickFormatter={(value) => value.toFixed(analysisType === 'linear' ? 2 : 1)}
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

          <Tooltip content={<CustomTooltip />} />

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
              activeDot={{ r: 6, fill: scenario.color.hex, stroke: '#fff', strokeWidth: 2 }}
            />
          ))}

          {/* Brush for zoom/pan functionality */}
          <Brush
            dataKey="effect"
            height={30}
            stroke="#6366f1"
            fill="#eef2ff"
            tickFormatter={(value) => value.toFixed(1)}
          />
        </LineChart>
      </ResponsiveContainer>

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
          <span className="text-gray-400">Drag the brush below to zoom</span>
        </div>
      </div>
    </div>
  );
};

export default MultiScenarioPowerChart;
