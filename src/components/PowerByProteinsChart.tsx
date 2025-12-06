import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { calculatePower, calculateEffectiveAlpha } from '../utils/statistics';

interface PowerByProteinsChartProps {
  events: number;
  fdrQ: number;
  targetPower: number;
}

/**
 * PowerByProteinsChart Component
 *
 * Comprehensive visualization of how statistical power changes with
 * the number of proteins tested, for multiple hazard ratio values.
 *
 * Includes:
 * 1. Sensitivity table: HR × Number of Proteins matrix
 * 2. Linear scale chart (emphasizes critical zone)
 * 3. Log scale chart (shows full range 1-5000)
 */
const PowerByProteinsChart: React.FC<PowerByProteinsChartProps> = ({
  events,
  fdrQ,
  targetPower,
}) => {
  // Hazard ratios for sensitivity analysis (1.1 to 2.0)
  const hazardRatios = [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];

  // Protein counts for sensitivity table (focus on critical zone)
  const proteinCountsForTable = [1, 5, 10, 25, 50, 100, 200, 500, 1000, 3000, 5000];

  // Color palette for HR curves
  const hrColors: Record<number, string> = {
    1.1: '#991b1b', // dark red
    1.2: '#dc2626', // red
    1.3: '#ea580c', // orange
    1.4: '#d97706', // amber
    1.5: '#ca8a04', // yellow
    1.6: '#65a30d', // lime
    1.7: '#16a34a', // green
    1.8: '#0d9488', // teal
    1.9: '#0284c7', // sky
    2.0: '#2563eb', // blue
  };

  // Generate data for linear chart (1-1000 range)
  const generateLinearChartData = () => {
    const counts: number[] = [];
    for (let i = 1; i <= 1000; i += 1) {
      counts.push(i);
    }
    return counts.map((numProteins) => {
      const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins);
      const dataPoint: Record<string, number> = { proteins: numProteins };
      hazardRatios.forEach((hr) => {
        dataPoint[`hr_${hr}`] = calculatePower(hr, events, alphaMulti);
      });
      return dataPoint;
    });
  };

  // Generate data for log chart (full 1-5000 range)
  const generateLogChartData = () => {
    const counts: number[] = [];
    // Dense sampling 1-100
    for (let i = 1; i <= 100; i += 1) counts.push(i);
    // Medium density 100-500
    for (let i = 110; i <= 500; i += 10) counts.push(i);
    // Sparser 500-1000
    for (let i = 550; i <= 1000; i += 50) counts.push(i);
    // Even sparser 1000-5000
    for (let i = 1100; i <= 5000; i += 100) counts.push(i);

    return counts.map((numProteins) => {
      const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins);
      const dataPoint: Record<string, number> = { proteins: numProteins };
      hazardRatios.forEach((hr) => {
        dataPoint[`hr_${hr}`] = calculatePower(hr, events, alphaMulti);
      });
      return dataPoint;
    });
  };

  const linearChartData = generateLinearChartData();
  const logChartData = generateLogChartData();

  // Generate sensitivity table data
  const sensitivityTableData = proteinCountsForTable.map((numProteins) => {
    const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins);
    const row: Record<string, number> = { proteins: numProteins };
    hazardRatios.forEach((hr) => {
      row[`hr_${hr}`] = calculatePower(hr, events, alphaMulti);
    });
    return row;
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
    label?: number;
  }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto">
        <p className="font-semibold text-gray-800 mb-2">
          {label?.toLocaleString()} protein{label !== 1 ? 's' : ''} tested
        </p>
        <p className="text-xs text-gray-500 mb-2">
          α ≈ {calculateEffectiveAlpha(fdrQ, label || 1).toExponential(2)}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {payload.map((entry, index) => {
            const hr = entry.dataKey.replace('hr_', '');
            return (
              <p key={index} className="text-sm flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">HR {hr}:</span>
                <span className="font-medium" style={{ color: entry.color }}>
                  {(entry.value * 100).toFixed(0)}%
                </span>
              </p>
            );
          })}
        </div>
      </div>
    );
  };

  // Format power cell with color coding
  const formatPowerCell = (power: number) => {
    const percentage = (power * 100).toFixed(0);
    let bgColor = 'bg-red-100 text-red-800';
    if (power >= 0.8) bgColor = 'bg-green-100 text-green-800';
    else if (power >= 0.5) bgColor = 'bg-amber-100 text-amber-800';

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${bgColor}`}>
        {percentage}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sensitivity Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M9 7v13M4 12h16" />
            </svg>
            Power Sensitivity: Hazard Ratio × Number of Proteins
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Power (%) for each combination (FDR q = {fdrQ}, d = {events} events)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-2 py-2 text-left text-gray-700 font-semibold bg-gray-50 sticky left-0">
                  # Proteins
                </th>
                {hazardRatios.map((hr) => (
                  <th
                    key={hr}
                    className="px-2 py-2 text-center font-semibold"
                    style={{ color: hrColors[hr] }}
                  >
                    HR={hr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivityTableData.map((row, idx) => (
                <tr
                  key={row.proteins}
                  className={`border-b border-gray-100 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                >
                  <td className="px-2 py-2 font-medium text-gray-800 bg-gray-50 sticky left-0">
                    {row.proteins.toLocaleString()}
                  </td>
                  {hazardRatios.map((hr) => (
                    <td key={hr} className="px-2 py-2 text-center">
                      {formatPowerCell(row[`hr_${hr}`])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs">≥80%</span>
            <span>Adequate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs">50-79%</span>
            <span>Marginal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs">&lt;50%</span>
            <span>Underpowered</span>
          </div>
        </div>
      </div>

      {/* Linear Scale Chart (1-1000 proteins) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Power vs Number of Proteins (Linear Scale, 1-1,000)
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Shows how power decreases as the number of proteins tested increases
          </p>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={linearChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              dataKey="proteins"
              type="number"
              domain={[1, 1000]}
              ticks={[1, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]}
              tickFormatter={(value) => value.toLocaleString()}
              label={{
                value: 'Number of Proteins Tested',
                position: 'insideBottom',
                offset: -5,
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
              formatter={(value) => {
                const hr = value.replace('hr_', 'HR ');
                return <span className="text-xs text-gray-700">{hr}</span>;
              }}
            />

            {/* Target power reference line */}
            <ReferenceLine
              y={targetPower}
              stroke="#8b5cf6"
              strokeDasharray="8 4"
              strokeWidth={2}
            />

            {/* Power curves for each HR */}
            {hazardRatios.map((hr) => (
              <Line
                key={hr}
                type="monotone"
                dataKey={`hr_${hr}`}
                name={`hr_${hr}`}
                stroke={hrColors[hr]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: hrColors[hr], stroke: '#fff', strokeWidth: 1 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-purple-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0', borderColor: '#8b5cf6' }}></div>
            <span>Target power ({(targetPower * 100).toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      {/* Log Scale Chart (1-5000 proteins) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Power vs Number of Proteins (Log Scale, 1-5,000)
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Shows the full range with logarithmic protein scale
          </p>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart
            data={logChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              dataKey="proteins"
              type="number"
              scale="log"
              domain={[1, 5000]}
              tickFormatter={(value) => value.toLocaleString()}
              ticks={[1, 10, 100, 1000, 5000]}
              label={{
                value: 'Number of Proteins Tested (log scale)',
                position: 'insideBottom',
                offset: -5,
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
              formatter={(value) => {
                const hr = value.replace('hr_', 'HR ');
                return <span className="text-xs text-gray-700">{hr}</span>;
              }}
            />

            {/* Target power reference line */}
            <ReferenceLine
              y={targetPower}
              stroke="#8b5cf6"
              strokeDasharray="8 4"
              strokeWidth={2}
            />

            {/* Power curves for each HR */}
            {hazardRatios.map((hr) => (
              <Line
                key={hr}
                type="monotone"
                dataKey={`hr_${hr}`}
                name={`hr_${hr}`}
                stroke={hrColors[hr]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: hrColors[hr], stroke: '#fff', strokeWidth: 1 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-purple-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0', borderColor: '#8b5cf6' }}></div>
            <span>Target power ({(targetPower * 100).toFixed(0)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerByProteinsChart;
