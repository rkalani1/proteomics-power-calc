import { useState } from 'react';
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
import { calculateEffectiveAlpha, type CorrectionMethod, type AnalysisType, type StudyDesign } from '../utils/statistics';
import { getParameterDescription } from '../utils/formatters';
import { usePowerChartData } from '../hooks/usePowerChartData';
import { getPowerStatus, POWER_STATUS_BG_CLASSES } from '../utils/formatters';
import { DISPLAY_EFFECT_GRIDS } from '../constants/analysisGrids';
import {
  AXIS_LABEL_STYLE,
  AXIS_TICK,
  CHART_AXIS,
  CHART_GRID,
  TARGET_LINE,
} from '../constants/chartTheme';

type ScaleType = 'linear' | 'log';

interface PowerByProteinsChartProps {
  events: number;
  fdrQ: number;
  targetPower: number;
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  sampleSize: number;
  residualSD: number;
  prevalence: number;
  numCases: number;
  numControls: number;
  subcohortSize: number;
  totalCohort: number;
  matchingRatio: number;
  clusterSize: number;
  icc: number;
  covariateR2: number;
  effectSymbol: string;
  correctionMethod?: CorrectionMethod;
  /** Design-aware power for a given effect size and per-test alpha, computed by
   * the parent with the current study parameters (covariate R², study design,
   * clustering, etc.). Guarantees this chart matches the headline results. */
  calculatePower: (effectSize: number, alpha: number) => number;
}

// Tooltip for the power-vs-proteins curves. Defined at module scope to keep a
// stable component identity across re-renders.
const ProteinsTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string; payload?: { alphaMulti?: number } }>;
  label?: number;
  fdrQ: number;
  effectSymbol: string;
  correctionMethod: CorrectionMethod;
}> = ({ active, payload, label, fdrQ, effectSymbol, correctionMethod }) => {
  if (!active || !payload || !payload.length) return null;

  // Use pre-calculated effective alpha from the payload if available to save CPU time on every hover frame
  const effectiveAlpha = payload[0]?.payload?.alphaMulti ?? calculateEffectiveAlpha(fdrQ, label || 1, correctionMethod);

  return (
    <div className="chart-tooltip max-h-64 overflow-y-auto">
      <p className="chart-tooltip__title">
        {label?.toLocaleString()} protein{label !== 1 ? 's' : ''} tested
      </p>
      <p className="chart-tooltip__meta mb-2">
        α ≈ {effectiveAlpha.toExponential(2)}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {payload.map((entry, index) => {
          const es = entry.dataKey.replace('es_', '');
          return (
            <p key={index} className="chart-tooltip__row">
              <span
                className="series-dot"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span className="text-ink-soft">{effectSymbol} {es}:</span>
              <span className="chart-tooltip__value">
                {(entry.value * 100).toFixed(0)}%
              </span>
            </p>
          );
        })}
      </div>
    </div>
  );
};

/**
 * PowerByProteinsChart Component
 *
 * Comprehensive visualization of how statistical power changes with
 * the number of proteins tested, for multiple effect size values.
 * Supports all analysis types: Cox, Linear, Logistic, Poisson, and GEE.
 */
const PowerByProteinsChart: React.FC<PowerByProteinsChartProps> = ({
  events,
  fdrQ,
  targetPower,
  analysisType,
  studyDesign,
  sampleSize,
  residualSD,
  prevalence,
  numCases,
  numControls,
  subcohortSize,
  totalCohort,
  matchingRatio,
  clusterSize,
  icc,
  covariateR2,
  effectSymbol,
  correctionMethod = 'fdr',
  calculatePower,
}) => {
  // Scale toggle state
  const [scaleType, setScaleType] = useState<ScaleType>('linear');

  // Get effect sizes for current analysis type
  const effectSizes = DISPLAY_EFFECT_GRIDS[analysisType];

  const {
    effectColors,
    linearChartData,
    logChartData,
    sensitivityTableData,
  } = usePowerChartData({
    fdrQ,
    effectSizes,
    correctionMethod,
    calculatePower,
  });

  // Format power cell with color coding (green = meets the target power)
  const formatPowerCell = (power: number) => {
    const percentage = (power * 100).toFixed(0);
    const status = getPowerStatus(power, targetPower);
    const badgeClass = POWER_STATUS_BG_CLASSES[status];

    return (
      <span className={badgeClass}>
        {percentage}%
      </span>
    );
  };

  // Format effect size for display. Linear and GEE use additive β values (some
  // as fine as 0.05), so they need 2 decimals; the ratio models use 1.
  const formatEffectSize = (es: number) => {
    return analysisType === 'linear' || analysisType === 'gee' ? es.toFixed(2) : es.toFixed(1);
  };

  const parameterDescription = getParameterDescription({
    analysisType,
    studyDesign,
    events,
    subcohortSize,
    totalCohort,
    matchingRatio,
    sampleSize,
    residualSD,
    numCases,
    numControls,
    prevalence,
    clusterSize,
    icc,
    covariateR2,
  });

  const targetPct = (targetPower * 100).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Sensitivity Table */}
      <section className="assay-card assay-card--padded">
        <div className="mb-4">
          <h2 className="section-title">
            <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M9 7v13M4 12h16" />
            </svg>
            Power Sensitivity: {effectSymbol} × Number of Proteins
          </h2>
          <p className="section-subtitle">
            Power (%) for each combination ({correctionMethod === 'fdr' ? 'FDR q' : 'FWER α'} = {fdrQ}, {parameterDescription})
          </p>
        </div>

        <div className="scroll-region" tabIndex={0} role="region" aria-label={`Power sensitivity table: ${effectSymbol} by number of proteins`}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="is-sticky">
                  # Proteins
                </th>
                {effectSizes.map((es) => (
                  <th key={es} className="text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="series-dot" style={{ backgroundColor: effectColors[es] }} aria-hidden="true"></span>
                      {effectSymbol}={formatEffectSize(es)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivityTableData.map((row) => (
                <tr key={row.proteins}>
                  <td className="is-sticky font-semibold text-ink">
                    {row.proteins.toLocaleString()}
                  </td>
                  {effectSizes.map((es) => (
                    <td key={es} className="text-center">
                      {formatPowerCell(row[`es_${es}`])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-legend mt-3">
          <span className="status-badge status-badge--adequate">≥{targetPct}% (meets target)</span>
          {/* At the 50% minimum target the "below target" band is empty, so skip it */}
          {targetPower > 0.5 && (
            <span className="status-badge status-badge--marginal">50%–{targetPct}% (below target)</span>
          )}
          <span className="status-badge status-badge--inadequate">&lt;50% (underpowered)</span>
        </div>
      </section>

      {/* Power vs Number of Proteins Chart with Scale Toggle */}
      <section className="assay-card assay-card--padded">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="section-title">
              <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Power vs Number of Proteins
            </h2>
            <p className="section-subtitle">
              {scaleType === 'linear'
                ? 'Linear scale (1-1,000 proteins)'
                : 'Logarithmic scale (1-5,000 proteins)'}
            </p>
          </div>

          {/* Scale Toggle */}
          <div className="segmented" role="group" aria-label="Chart scale">
            <button
              type="button"
              onClick={() => setScaleType('linear')}
              aria-pressed={scaleType === 'linear'}
            >
              Linear
            </button>
            <button
              type="button"
              onClick={() => setScaleType('log')}
              aria-pressed={scaleType === 'log'}
            >
              Log
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={scaleType === 'linear' ? linearChartData : logChartData}
            margin={{ top: 20, right: 84, left: 20, bottom: 40 }}
          >
            <CartesianGrid stroke={CHART_GRID} vertical={false} />

            <XAxis
              dataKey="proteins"
              type="number"
              scale={scaleType}
              domain={scaleType === 'linear' ? [1, 1000] : [1, 5000]}
              ticks={scaleType === 'linear'
                ? [1, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
                : [1, 10, 100, 1000, 5000]}
              tickFormatter={(value) => value.toLocaleString()}
              axisLine={{ stroke: CHART_AXIS }}
              tickLine={{ stroke: CHART_AXIS }}
              label={{
                value: `Number of Proteins Tested${scaleType === 'log' ? ' (log scale)' : ''}`,
                position: 'insideBottom',
                offset: -5,
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

            <Tooltip content={<ProteinsTooltip fdrQ={fdrQ} effectSymbol={effectSymbol} correctionMethod={correctionMethod} />} />

            <Legend
              verticalAlign="top"
              height={36}
              iconType="plainline"
              formatter={(value) => {
                // Match the table headers' formatting (e.g. "HR=2.0", not "HR 2").
                const es = Number(value.replace('es_', ''));
                return <span className="text-xs text-ink-soft">{effectSymbol}={formatEffectSize(es)}</span>;
              }}
            />

            {/* Target power reference line */}
            <ReferenceLine
              y={targetPower}
              stroke={TARGET_LINE}
              strokeDasharray="8 4"
              strokeWidth={1.5}
              label={{
                value: `Target: ${targetPct}%`,
                position: 'right',
                fill: TARGET_LINE,
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            {/* Power curves for each effect size */}
            {effectSizes.map((es) => (
              <Line
                key={es}
                type="monotone"
                dataKey={`es_${es}`}
                name={`es_${es}`}
                stroke={effectColors[es]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 4, fill: effectColors[es], stroke: '#fff', strokeWidth: 1.5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <div className="chart-legend-note">
          <div style={{ color: TARGET_LINE }}>
            <span aria-hidden="true" className="chart-legend-swatch"></span>
            <span className="text-ink-soft">Target power ({targetPct}%)</span>
          </div>
          <div>
            <span>Lighter curves are smaller effects; darker curves are larger effects. Toggle the scale above.</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PowerByProteinsChart;
