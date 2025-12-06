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

interface PowerChartProps {
  /** Power curve data for single-protein test */
  dataSingle: Array<{ hr: number; power: number }>;
  /** Power curve data for proteome-wide scan */
  dataMulti: Array<{ hr: number; power: number }>;
  /** Target power level (horizontal reference line) */
  targetPower: number;
  /** Input minimal HR (vertical reference line) */
  inputHR: number;
  /** Alpha for single test */
  alphaSingle: number;
  /** Alpha for multiple testing */
  alphaMulti: number;
}

/**
 * PowerChart Component
 *
 * Interactive visualization of Power vs Hazard Ratio curves.
 * Compares single-protein test power to proteome-wide scan power.
 *
 * Features:
 * - Two power curves (single vs. multi-test corrected)
 * - Horizontal reference line at target power
 * - Vertical reference line at user-specified minimal HR
 * - Interactive zoom/pan via brush component
 * - Detailed tooltips with formatted values
 */
const PowerChart: React.FC<PowerChartProps> = ({
  dataSingle,
  dataMulti,
  targetPower,
  inputHR,
  alphaSingle,
  alphaMulti,
}) => {
  // Combine data for chart (use HR as common x-axis)
  const combinedData = dataSingle.map((d, i) => ({
    hr: d.hr,
    powerSingle: d.power,
    powerMulti: dataMulti[i]?.power ?? 0,
  }));

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: number;
  }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-800 mb-2">
          Hazard Ratio: {Number(label).toFixed(2)}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium" style={{ color: entry.color }}>
              {(entry.value * 100).toFixed(1)}%
            </span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          Power vs Hazard Ratio
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Comparing single-protein test (α={alphaSingle}) vs. proteome-wide scan (α≈{alphaMulti.toExponential(2)})
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={combinedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="hr"
            type="number"
            domain={[1, 3]}
            tickCount={11}
            label={{
              value: 'Hazard Ratio (HR)',
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
            formatter={(value) => (
              <span className="text-sm text-gray-700">{value}</span>
            )}
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

          {/* Input HR reference line */}
          <ReferenceLine
            x={inputHR}
            stroke="#8b5cf6"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: `HR=${inputHR.toFixed(2)}`,
              position: 'top',
              fill: '#8b5cf6',
              fontSize: 11,
              fontWeight: 600,
            }}
          />

          {/* Power curve for single-protein test */}
          <Line
            type="monotone"
            dataKey="powerSingle"
            name="Single Protein (α=0.05)"
            stroke="#10b981"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
          />

          {/* Power curve for proteome-wide scan */}
          <Line
            type="monotone"
            dataKey="powerMulti"
            name="Proteome-Wide (BH-FDR)"
            stroke="#ef4444"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
          />

          {/* Brush for zoom/pan functionality */}
          <Brush
            dataKey="hr"
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
          <span>Target power threshold</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-purple-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0', borderColor: '#8b5cf6' }}></div>
          <span>User-specified minimal HR</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Drag the brush below to zoom</span>
        </div>
      </div>
    </div>
  );
};

export default PowerChart;
