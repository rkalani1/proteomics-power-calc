import { useMemo, useState } from 'react';
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
import { calculateEffectiveAlpha, type CorrectionMethod } from '../utils/statistics';

type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';
type SensitivityVariable = 'sampleSize' | 'events' | 'effectSize' | 'proteinCount';

interface SensitivityAnalysisProps {
  analysisType: AnalysisType;
  targetPower: number;
  fdrQ: number;
  currentSampleSize: number;
  currentEvents: number;
  currentEffectSize: number;
  proteinCounts: number[];
  effectSymbol: string;
  effectLabel: string;
  calculatePowerForEffect: (effect: number, alpha: number) => number;
  correctionMethod?: CorrectionMethod;
}

/**
 * SensitivityAnalysis Component
 *
 * Visualizes how power changes across a range of parameter values.
 * Allows researchers to explore "what-if" scenarios.
 */
const SensitivityAnalysis: React.FC<SensitivityAnalysisProps> = ({
  analysisType,
  targetPower,
  fdrQ,
  currentSampleSize,
  currentEvents,
  currentEffectSize,
  proteinCounts,
  effectSymbol,
  effectLabel,
  calculatePowerForEffect,
  correctionMethod = 'fdr',
}) => {
  const [selectedVariable, setSelectedVariable] = useState<SensitivityVariable>(
    analysisType === 'cox' ? 'events' : 'sampleSize'
  );

  // Generate sensitivity data based on selected variable
  const sensitivityData = useMemo(() => {
    const data: Array<Record<string, number>> = [];

    switch (selectedVariable) {
      case 'sampleSize': {
        // Vary sample size from 100 to 10000
        const sizes = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000];
        sizes.forEach(size => {
          const point: Record<string, number> = { x: size };
          proteinCounts.forEach(count => {
            const alpha = calculateEffectiveAlpha(fdrQ, count, correctionMethod);
            // For sample size sensitivity, we need to recalculate with different n
            // This is a simplified approximation - actual power would need the full calculation
            const basePower = calculatePowerForEffect(currentEffectSize, alpha);
            const scaleFactor = Math.sqrt(size / currentSampleSize);
            const adjustedPower = Math.min(0.999, 1 - Math.pow(1 - basePower, scaleFactor));
            point[`power_${count}`] = adjustedPower;
          });
          data.push(point);
        });
        break;
      }

      case 'events': {
        // Vary events from 20 to 500
        const eventCounts = [20, 40, 60, 80, 100, 150, 200, 300, 400, 500];
        eventCounts.forEach(e => {
          const point: Record<string, number> = { x: e };
          proteinCounts.forEach(count => {
            const alpha = calculateEffectiveAlpha(fdrQ, count, correctionMethod);
            const basePower = calculatePowerForEffect(currentEffectSize, alpha);
            const scaleFactor = Math.sqrt(e / currentEvents);
            const adjustedPower = Math.min(0.999, 1 - Math.pow(1 - basePower, scaleFactor));
            point[`power_${count}`] = adjustedPower;
          });
          data.push(point);
        });
        break;
      }

      case 'effectSize': {
        // Vary effect size based on analysis type
        let effectValues: number[];
        if (analysisType === 'linear') {
          effectValues = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8];
        } else {
          effectValues = [1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 2.0, 2.5, 3.0];
        }
        effectValues.forEach(effect => {
          const point: Record<string, number> = { x: effect };
          proteinCounts.forEach(count => {
            const alpha = calculateEffectiveAlpha(fdrQ, count, correctionMethod);
            point[`power_${count}`] = calculatePowerForEffect(effect, alpha);
          });
          data.push(point);
        });
        break;
      }

      case 'proteinCount': {
        // Vary protein count from 1 to 10000
        const counts = [1, 10, 50, 100, 500, 1000, 2000, 3000, 5000, 7000, 10000];
        counts.forEach(count => {
          const alpha = calculateEffectiveAlpha(fdrQ, count, correctionMethod);
          const power = calculatePowerForEffect(currentEffectSize, alpha);
          data.push({
            x: count,
            power,
            alpha,
          });
        });
        break;
      }
    }

    return data;
  }, [selectedVariable, proteinCounts, fdrQ, correctionMethod, currentEffectSize, currentSampleSize, currentEvents, analysisType, calculatePowerForEffect]);

  // Color palette for lines
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6'];

  // Get axis labels based on selected variable
  const getAxisLabel = (): string => {
    switch (selectedVariable) {
      case 'sampleSize': return 'Sample Size (n)';
      case 'events': return 'Number of Events (d)';
      case 'effectSize': return `${effectLabel} (${effectSymbol})`;
      case 'proteinCount': return 'Number of Proteins Tested';
    }
  };

  // Get current value for reference line
  const getCurrentValue = (): number => {
    switch (selectedVariable) {
      case 'sampleSize': return currentSampleSize;
      case 'events': return currentEvents;
      case 'effectSize': return currentEffectSize;
      case 'proteinCount': return proteinCounts[0];
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: number;
  }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-800 mb-2">
          {getAxisLabel()}: {selectedVariable === 'effectSize'
            ? Number(label).toFixed(2)
            : Number(label).toLocaleString()}
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
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Sensitivity Analysis
          </h3>
        </div>

        {/* Variable selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Vary:</label>
          <select
            value={selectedVariable}
            onChange={(e) => setSelectedVariable(e.target.value as SensitivityVariable)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {analysisType === 'cox' && (
              <option value="events">Number of Events</option>
            )}
            {analysisType !== 'cox' && (
              <option value="sampleSize">Sample Size</option>
            )}
            <option value="effectSize">{effectLabel}</option>
            <option value="proteinCount">Proteins Tested</option>
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={sensitivityData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="x"
            type="number"
            scale={selectedVariable === 'proteinCount' ? 'log' : 'linear'}
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) =>
              selectedVariable === 'effectSize'
                ? value.toFixed(analysisType === 'linear' ? 2 : 1)
                : value.toLocaleString()
            }
            label={{
              value: getAxisLabel(),
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

          {/* Target power line */}
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
            }}
          />

          {/* Current value reference line */}
          <ReferenceLine
            x={getCurrentValue()}
            stroke="#8b5cf6"
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: 'Current',
              position: 'top',
              fill: '#8b5cf6',
              fontSize: 11,
            }}
          />

          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => {
              if (selectedVariable === 'proteinCount') {
                return <span className="text-sm text-gray-700">Power</span>;
              }
              const count = parseInt(value.split('_')[1]);
              return (
                <span className="text-sm text-gray-700">
                  {count.toLocaleString()} protein{count !== 1 ? 's' : ''}
                </span>
              );
            }}
          />

          {selectedVariable === 'proteinCount' ? (
            <Line
              type="monotone"
              dataKey="power"
              name="power"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 4, fill: '#6366f1' }}
              activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
            />
          ) : (
            proteinCounts.map((count, index) => (
              <Line
                key={count}
                type="monotone"
                dataKey={`power_${count}`}
                name={`power_${count}`}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: COLORS[index % COLORS.length], stroke: '#fff', strokeWidth: 2 }}
              />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
};

export default SensitivityAnalysis;
