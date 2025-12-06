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
  ReferenceArea,
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
 * Visualizes how statistical power decreases as the number of proteins
 * tested increases, for multiple hazard ratio values.
 *
 * Key insight: The steepest power drop occurs in the first few hundred
 * proteins tested, after which it plateaus.
 */
const PowerByProteinsChart: React.FC<PowerByProteinsChartProps> = ({
  events,
  fdrQ,
  targetPower,
}) => {
  // Hazard ratios to display
  const hazardRatios = [1.2, 1.4, 1.6, 1.8, 2.0];

  // Color palette for HR curves
  const hrColors: Record<number, string> = {
    1.2: '#ef4444', // red
    1.4: '#f97316', // orange
    1.6: '#eab308', // yellow
    1.8: '#22c55e', // green
    2.0: '#3b82f6', // blue
  };

  // Generate protein count range with more density in the critical range
  const generateProteinCounts = (): number[] => {
    const counts: number[] = [];

    // Dense sampling 1-100 (where biggest drop happens)
    for (let i = 1; i <= 100; i += 1) {
      counts.push(i);
    }
    // Medium density 100-500
    for (let i = 110; i <= 500; i += 10) {
      counts.push(i);
    }
    // Sparser 500-1000
    for (let i = 550; i <= 1000; i += 50) {
      counts.push(i);
    }
    // Even sparser 1000-5000
    for (let i = 1100; i <= 5000; i += 100) {
      counts.push(i);
    }

    return counts;
  };

  const proteinCounts = generateProteinCounts();

  // Calculate power for each protein count and HR
  const chartData = proteinCounts.map((numProteins) => {
    const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins);

    const dataPoint: Record<string, number> = {
      proteins: numProteins,
    };

    hazardRatios.forEach((hr) => {
      dataPoint[`hr_${hr}`] = calculatePower(hr, events, alphaMulti);
    });

    return dataPoint;
  });

  // Find the "critical zone" where power drops most rapidly
  // This is typically between 1-100 proteins
  const criticalZoneStart = 1;
  const criticalZoneEnd = 100;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
    label?: number;
  }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-800 mb-2">
          {label?.toLocaleString()} protein{label !== 1 ? 's' : ''} tested
        </p>
        <p className="text-xs text-gray-500 mb-2">
          α ≈ {calculateEffectiveAlpha(fdrQ, label || 1).toExponential(2)}
        </p>
        {payload.map((entry, index) => {
          const hr = entry.dataKey.replace('hr_', '');
          return (
            <p key={index} className="text-sm flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">HR = {hr}:</span>
              <span className="font-medium" style={{ color: entry.color }}>
                {(entry.value * 100).toFixed(1)}%
              </span>
            </p>
          );
        })}
      </div>
    );
  };

  // Calculate power loss from single to 5000 proteins for each HR
  const powerLossData = hazardRatios.map((hr) => {
    const powerSingle = calculatePower(hr, events, 0.05);
    const power5000 = calculatePower(hr, events, calculateEffectiveAlpha(fdrQ, 5000));
    const powerLoss = ((powerSingle - power5000) / powerSingle) * 100;
    return { hr, powerSingle, power5000, powerLoss };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Power vs Number of Proteins Tested
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Shows power decline as multiple testing burden increases (FDR q = {fdrQ}, d = {events} events)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          {/* Highlight critical zone */}
          <ReferenceArea
            x1={criticalZoneStart}
            x2={criticalZoneEnd}
            fill="#fef3c7"
            fillOpacity={0.5}
            label={{
              value: 'Critical Zone',
              position: 'insideTop',
              fill: '#d97706',
              fontSize: 11,
            }}
          />

          <XAxis
            dataKey="proteins"
            type="number"
            scale="log"
            domain={[1, 5000]}
            tickFormatter={(value) => value.toLocaleString()}
            label={{
              value: 'Number of Proteins Tested (log scale)',
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
            formatter={(value) => {
              const hr = value.replace('hr_', 'HR = ');
              return <span className="text-sm text-gray-700">{hr}</span>;
            }}
          />

          {/* Target power reference line */}
          <ReferenceLine
            y={targetPower}
            stroke="#8b5cf6"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{
              value: `Target: ${(targetPower * 100).toFixed(0)}%`,
              position: 'right',
              fill: '#8b5cf6',
              fontSize: 11,
              fontWeight: 600,
            }}
          />

          {/* Power curves for each HR */}
          {hazardRatios.map((hr) => (
            <Line
              key={hr}
              type="monotone"
              dataKey={`hr_${hr}`}
              name={`hr_${hr}`}
              stroke={hrColors[hr]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: hrColors[hr], stroke: '#fff', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Power loss summary table */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Power Loss: Single Protein → 5,000 Proteins
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left text-gray-600">Hazard Ratio</th>
                <th className="px-3 py-2 text-right text-gray-600">Power (n=1)</th>
                <th className="px-3 py-2 text-right text-gray-600">Power (n=5000)</th>
                <th className="px-3 py-2 text-right text-gray-600">Relative Loss</th>
              </tr>
            </thead>
            <tbody>
              {powerLossData.map(({ hr, powerSingle, power5000, powerLoss }) => (
                <tr key={hr} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-medium" style={{ color: hrColors[hr] }}>
                    HR = {hr}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {(powerSingle * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right">
                    {(power5000 * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-red-600">
                    -{powerLoss.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-amber-100 border border-amber-300 rounded"></div>
          <span>Critical zone (1-100 proteins): steepest power decline</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-purple-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0', borderColor: '#8b5cf6' }}></div>
          <span>Target power threshold</span>
        </div>
      </div>
    </div>
  );
};

export default PowerByProteinsChart;
