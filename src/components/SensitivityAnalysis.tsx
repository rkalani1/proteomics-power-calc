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
import { normalizeSensitivityVariable, type SensitivityVariable } from '../utils/sensitivity';


interface SensitivityAnalysisProps {
  analysisType: Parameters<typeof normalizeSensitivityVariable>[0];
  targetPower: number;
  fdrQ: number;
  currentSampleSize: number;
  currentEvents: number;
  currentEffectSize: number;
  proteinCounts: number[];
  effectSymbol: string;
  effectLabel: string;
  calculatePowerForEffect: (effect: number, alpha: number) => number;
  /** Design-aware power as a function of the swept sample dimension
   * (events for Cox, total sample size otherwise). */
  calculatePowerAtSampleSize: (effect: number, alpha: number, dimension: number) => number;
  correctionMethod?: CorrectionMethod;
}

// Tooltip for the sensitivity curves. Defined at module scope to keep a stable
// component identity across re-renders.
const SensitivityTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  axisLabel: string;
  selectedVariable: SensitivityVariable;
}> = ({ active, payload, label, axisLabel, selectedVariable }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-gray-800 mb-2">
        {axisLabel}: {selectedVariable === 'effectSize'
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

interface SensitivityControlsProps {
  activeVariable: SensitivityVariable;
  analysisType: Parameters<typeof normalizeSensitivityVariable>[0];
  effectLabel: string;
  setSelectedVariable: (variable: SensitivityVariable) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const SensitivityControls: React.FC<SensitivityControlsProps> = ({
  activeVariable,
  analysisType,
  effectLabel,
  setSelectedVariable,
  isExpanded,
  onToggle,
}) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls="sensitivity-content"
      className="flex items-center gap-2 text-left"
    >
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        <svg aria-hidden="true" focusable="false" className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Sensitivity Analysis
      </h2>
      <svg
        aria-hidden="true"
        focusable="false"
        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    {isExpanded && (
      <div className="flex items-center gap-2">
        <label htmlFor="sensitivity-vary" className="text-sm text-gray-600">Vary:</label>
        <select
          id="sensitivity-vary"
          value={activeVariable}
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
    )}
  </div>
);

interface SensitivityChartProps {
  activeVariable: SensitivityVariable;
  analysisType: Parameters<typeof normalizeSensitivityVariable>[0];
  getAxisLabel: () => string;
  getCurrentValue: () => number;
  proteinCounts: number[];
  sensitivityData: Array<Record<string, number>>;
  targetPower: number;
}

const SENSITIVITY_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6'];

const SensitivityChart: React.FC<SensitivityChartProps> = ({
  activeVariable,
  analysisType,
  getAxisLabel,
  getCurrentValue,
  proteinCounts,
  sensitivityData,
  targetPower,
}) => (
  <ResponsiveContainer width="100%" height={350}>
    <LineChart data={sensitivityData} margin={{ top: 20, right: 84, left: 20, bottom: 40 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

      <XAxis
        dataKey="x"
        type="number"
        scale={activeVariable === 'proteinCount' ? 'log' : 'linear'}
        domain={['dataMin', 'dataMax']}
        tickFormatter={(value) =>
          activeVariable === 'effectSize'
            ? value.toFixed(analysisType === 'linear' || analysisType === 'gee' ? 2 : 1)
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

      <Tooltip content={<SensitivityTooltip axisLabel={getAxisLabel()} selectedVariable={activeVariable} />} />

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
          if (activeVariable === 'proteinCount') {
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

      {activeVariable === 'proteinCount' ? (
        <Line
          type="monotone"
          dataKey="power"
          name="power"
          stroke="#6366f1"
          strokeWidth={3}
          dot={{ r: 4, fill: '#6366f1' }}
          isAnimationActive={false}
          activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
        />
      ) : (
        proteinCounts.map((count, index) => (
          <Line
            key={count}
            type="monotone"
            dataKey={`power_${count}`}
            name={`power_${count}`}
            stroke={SENSITIVITY_COLORS[index % SENSITIVITY_COLORS.length]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 5, fill: SENSITIVITY_COLORS[index % SENSITIVITY_COLORS.length], stroke: '#fff', strokeWidth: 2 }}
          />
        ))
      )}
    </LineChart>
  </ResponsiveContainer>
);

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
  calculatePowerAtSampleSize,
  correctionMethod = 'fdr',
}) => {
  const [selectedVariable, setSelectedVariable] = useState<SensitivityVariable>(
    analysisType === 'cox' ? 'events' : 'sampleSize'
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const activeVariable = normalizeSensitivityVariable(analysisType, selectedVariable);

  // Merge the user's current value into a sweep grid so the "Current"
  // reference marker always falls inside the plotted range (the parameter
  // sliders allow values beyond the fixed grids, e.g. n up to 50,000).
  const withCurrent = (grid: number[], current: number): number[] => {
    if (!Number.isFinite(current) || current <= 0 || grid.includes(current)) return grid;
    return [...grid, current].sort((a, b) => a - b);
  };

  // Generate sensitivity data based on selected variable
  const sensitivityData = useMemo(() => {
    const data: Array<Record<string, number>> = [];

    switch (activeVariable) {
      case 'sampleSize': {
        // Vary sample size from 100 to 10000, recomputing the exact power at
        // each n with the same design-aware formula used for the headline result.
        const sizes = withCurrent([100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000], currentSampleSize);
        sizes.forEach(size => {
          const point: Record<string, number> = { x: size };
          proteinCounts.forEach(count => {
            const alpha = calculateEffectiveAlpha(fdrQ, count, correctionMethod);
            point[`power_${count}`] = calculatePowerAtSampleSize(currentEffectSize, alpha, size);
          });
          data.push(point);
        });
        break;
      }

      case 'events': {
        // Vary events from 20 to 500, recomputing the exact power at each event
        // count with the same design-aware formula used for the headline result.
        const eventCounts = withCurrent([20, 40, 60, 80, 100, 150, 200, 300, 400, 500], currentEvents);
        eventCounts.forEach(e => {
          const point: Record<string, number> = { x: e };
          proteinCounts.forEach(count => {
            const alpha = calculateEffectiveAlpha(fdrQ, count, correctionMethod);
            point[`power_${count}`] = calculatePowerAtSampleSize(currentEffectSize, alpha, e);
          });
          data.push(point);
        });
        break;
      }

      case 'effectSize': {
        // Vary effect size; linear and GEE use additive β values, the ratio
        // models (Cox/logistic/Poisson) use multiplicative values around 1.
        let effectValues: number[];
        if (analysisType === 'linear' || analysisType === 'gee') {
          effectValues = withCurrent([0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8], currentEffectSize);
        } else {
          effectValues = withCurrent([1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 2.0, 2.5, 3.0], currentEffectSize);
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
  }, [activeVariable, proteinCounts, fdrQ, correctionMethod, currentEffectSize, currentSampleSize, currentEvents, analysisType, calculatePowerForEffect, calculatePowerAtSampleSize]);

  // Get axis labels based on selected variable
  const getAxisLabel = (): string => {
    switch (activeVariable) {
      case 'sampleSize': return 'Sample Size (n)';
      case 'events': return 'Number of Events (d)';
      case 'effectSize': return `${effectLabel} (${effectSymbol})`;
      case 'proteinCount': return 'Number of Proteins Tested';
    }
  };

  // Get current value for reference line
  const getCurrentValue = (): number => {
    switch (activeVariable) {
      case 'sampleSize': return currentSampleSize;
      case 'events': return currentEvents;
      case 'effectSize': return currentEffectSize;
      case 'proteinCount': return proteinCounts[0];
    }
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <SensitivityControls
        activeVariable={activeVariable}
        analysisType={analysisType}
        effectLabel={effectLabel}
        setSelectedVariable={setSelectedVariable}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />
      {isExpanded && (
        <div
          id="sensitivity-content"
          className="mt-6"
          role="img"
          aria-label={`Line chart: statistical power versus ${getAxisLabel()}, with the ${(targetPower * 100).toFixed(0)}% target and current value marked.`}
        >
          <SensitivityChart
            activeVariable={activeVariable}
            analysisType={analysisType}
            getAxisLabel={getAxisLabel}
            getCurrentValue={getCurrentValue}
            proteinCounts={proteinCounts}
            sensitivityData={sensitivityData}
            targetPower={targetPower}
          />
        </div>
      )}
    </section>
  );
};

export default SensitivityAnalysis;
