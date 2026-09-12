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
import {
  SENSITIVITY_ADDITIVE_EFFECT_GRID,
  SENSITIVITY_EVENT_GRID,
  SENSITIVITY_PROTEIN_GRID,
  SENSITIVITY_RATIO_EFFECT_GRID,
  SENSITIVITY_SAMPLE_SIZE_GRID,
} from '../constants/analysisGrids';
import { SCENARIO_COLORS } from '../constants/config';
import {
  AXIS_LABEL_STYLE,
  AXIS_TICK,
  CHART_AXIS,
  CHART_GRID,
  MARKER_LINE,
  SINGLE_SERIES,
  TARGET_LINE,
} from '../constants/chartTheme';


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

  const seriesLabel = (name: string) => {
    if (name === 'power') return 'Power';
    const count = parseInt(name.split('_')[1]);
    return Number.isFinite(count)
      ? `${count.toLocaleString()} protein${count !== 1 ? 's' : ''}`
      : name;
  };

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__title">
        {axisLabel}: {selectedVariable === 'effectSize'
          ? Number(label).toFixed(2)
          : Number(label).toLocaleString()}
      </p>
      {payload.map((entry, index) => (
        <p key={index} className="chart-tooltip__row">
          <span
            className="series-dot"
            style={{ backgroundColor: entry.color }}
            aria-hidden="true"
          />
          <span className="text-ink-soft">{seriesLabel(entry.name)}:</span>
          <span className="chart-tooltip__value">
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
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <h2 className="section-title">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls="sensitivity-content"
        className="disclosure disclosure--inline"
      >
        <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>Sensitivity Analysis</span>
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

    {isExpanded && (
      <div className="flex items-center gap-2">
        <label htmlFor="sensitivity-vary" className="text-sm text-ink-soft">Vary:</label>
        <select
          id="sensitivity-vary"
          value={activeVariable}
          onChange={(e) => setSelectedVariable(e.target.value as SensitivityVariable)}
          className="field-select text-sm"
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

// Scenario series keep the same colour here as in every other chart so a
// protein count is recognisable across the page.
const seriesColor = (index: number) => SCENARIO_COLORS[index % SCENARIO_COLORS.length].hex;

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
      <CartesianGrid stroke={CHART_GRID} vertical={false} />

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
        axisLine={{ stroke: CHART_AXIS }}
        tickLine={{ stroke: CHART_AXIS }}
        label={{
          value: getAxisLabel(),
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

      <Tooltip content={<SensitivityTooltip axisLabel={getAxisLabel()} selectedVariable={activeVariable} />} />

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

      <ReferenceLine
        x={getCurrentValue()}
        stroke={MARKER_LINE}
        strokeDasharray="4 4"
        strokeWidth={1.5}
        label={{
          value: 'Current',
          position: 'top',
          fill: MARKER_LINE,
          fontSize: 11,
          fontWeight: 600,
        }}
      />

      <Legend
        verticalAlign="top"
        height={36}
        iconType="plainline"
        formatter={(value: string) => {
          if (activeVariable === 'proteinCount') {
            return <span className="text-sm text-ink-soft">Power</span>;
          }
          const count = parseInt(value.split('_')[1]);
          return (
            <span className="text-sm text-ink-soft">
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
          stroke={SINGLE_SERIES}
          strokeWidth={2.25}
          dot={{ r: 3.5, fill: SINGLE_SERIES, stroke: '#fff', strokeWidth: 1.5 }}
          isAnimationActive={false}
          activeDot={{ r: 5, fill: SINGLE_SERIES, stroke: '#fff', strokeWidth: 2 }}
        />
      ) : (
        proteinCounts.map((count, index) => (
          <Line
            key={count}
            type="monotone"
            dataKey={`power_${count}`}
            name={`power_${count}`}
            stroke={seriesColor(index)}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 5, fill: seriesColor(index), stroke: '#fff', strokeWidth: 2 }}
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
  const withCurrent = (grid: readonly number[], current: number): number[] => {
    if (!Number.isFinite(current) || current <= 0 || grid.includes(current)) return [...grid];
    return [...grid, current].sort((a, b) => a - b);
  };

  // Generate sensitivity data based on selected variable
  const sensitivityData = useMemo(() => {
    const data: Array<Record<string, number>> = [];

    switch (activeVariable) {
      case 'sampleSize': {
        // Vary sample size from 100 to 10000, recomputing the exact power at
        // each n with the same design-aware formula used for the headline result.
        const alphas = proteinCounts.map(count => ({
          count,
          alpha: calculateEffectiveAlpha(fdrQ, count, correctionMethod),
        }));
        const sizes = withCurrent(SENSITIVITY_SAMPLE_SIZE_GRID, currentSampleSize);
        sizes.forEach(size => {
          const point: Record<string, number> = { x: size };
          alphas.forEach(({ count, alpha }) => {
            point[`power_${count}`] = calculatePowerAtSampleSize(currentEffectSize, alpha, size);
          });
          data.push(point);
        });
        break;
      }

      case 'events': {
        // Vary events from 20 to 500, recomputing the exact power at each event
        // count with the same design-aware formula used for the headline result.
        const alphas = proteinCounts.map(count => ({
          count,
          alpha: calculateEffectiveAlpha(fdrQ, count, correctionMethod),
        }));
        const eventCounts = withCurrent(SENSITIVITY_EVENT_GRID, currentEvents);
        eventCounts.forEach(e => {
          const point: Record<string, number> = { x: e };
          alphas.forEach(({ count, alpha }) => {
            point[`power_${count}`] = calculatePowerAtSampleSize(currentEffectSize, alpha, e);
          });
          data.push(point);
        });
        break;
      }

      case 'effectSize': {
        // Vary effect size; linear and GEE use additive β values, the ratio
        // models (Cox/logistic/Poisson) use multiplicative values around 1.
        const alphas = proteinCounts.map(count => ({
          count,
          alpha: calculateEffectiveAlpha(fdrQ, count, correctionMethod),
        }));
        let effectValues: number[];
        if (analysisType === 'linear' || analysisType === 'gee') {
          effectValues = withCurrent(SENSITIVITY_ADDITIVE_EFFECT_GRID, currentEffectSize);
        } else {
          effectValues = withCurrent(SENSITIVITY_RATIO_EFFECT_GRID, currentEffectSize);
        }
        effectValues.forEach(effect => {
          const point: Record<string, number> = { x: effect };
          alphas.forEach(({ count, alpha }) => {
            point[`power_${count}`] = calculatePowerForEffect(effect, alpha);
          });
          data.push(point);
        });
        break;
      }

      case 'proteinCount': {
        // Vary protein count from 1 to 10000
        SENSITIVITY_PROTEIN_GRID.forEach(count => {
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
    <section className="assay-card assay-card--padded">
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
