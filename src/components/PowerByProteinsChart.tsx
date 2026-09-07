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
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto">
      <p className="font-semibold text-gray-800 mb-2">
        {label?.toLocaleString()} protein{label !== 1 ? 's' : ''} tested
      </p>
      <p className="text-xs text-gray-500 mb-2">
        α ≈ {effectiveAlpha.toExponential(2)}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {payload.map((entry, index) => {
          const es = entry.dataKey.replace('es_', '');
          return (
            <p key={index} className="text-sm flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{effectSymbol} {es}:</span>
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
    const bgColor = POWER_STATUS_BG_CLASSES[status];

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${bgColor}`}>
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

  return (
    <div className="space-y-6">
      {/* Sensitivity Table */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <svg aria-hidden="true" focusable="false" className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M9 7v13M4 12h16" />
            </svg>
            Power Sensitivity: {effectSymbol} × Number of Proteins
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Power (%) for each combination ({correctionMethod === 'fdr' ? 'FDR q' : 'FWER α'} = {fdrQ}, {parameterDescription})
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-2 py-2 text-left text-gray-700 font-semibold bg-gray-50 sticky left-0">
                  # Proteins
                </th>
                {effectSizes.map((es) => (
                  <th
                    key={es}
                    className="px-2 py-2 text-center font-semibold"
                    style={{ color: effectColors[es] }}
                  >
                    {effectSymbol}={formatEffectSize(es)}
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
                  {effectSizes.map((es) => (
                    <td key={es} className="px-2 py-2 text-center">
                      {formatPowerCell(row[`es_${es}`])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs">≥{(targetPower * 100).toFixed(0)}% (meets target)</span>
          </div>
          {/* At the 50% minimum target the "below target" band is empty, so skip it */}
          {targetPower > 0.5 && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs">50%–{(targetPower * 100).toFixed(0)}% (below target)</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs">&lt;50% (underpowered)</span>
          </div>
        </div>
      </section>

      {/* Power vs Number of Proteins Chart with Scale Toggle */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg aria-hidden="true" focusable="false" className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Power vs Number of Proteins
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {scaleType === 'linear'
                ? 'Linear scale (1-1,000 proteins)'
                : 'Logarithmic scale (1-5,000 proteins)'}
            </p>
          </div>

          {/* Scale Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1" role="group" aria-label="Chart scale">
            <button
              onClick={() => setScaleType('linear')}
              aria-pressed={scaleType === 'linear'}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                scaleType === 'linear'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Linear
            </button>
            <button
              onClick={() => setScaleType('log')}
              aria-pressed={scaleType === 'log'}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                scaleType === 'log'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
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
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              dataKey="proteins"
              type="number"
              scale={scaleType}
              domain={scaleType === 'linear' ? [1, 1000] : [1, 5000]}
              ticks={scaleType === 'linear'
                ? [1, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
                : [1, 10, 100, 1000, 5000]}
              tickFormatter={(value) => value.toLocaleString()}
              label={{
                value: `Number of Proteins Tested${scaleType === 'log' ? ' (log scale)' : ''}`,
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

            <Tooltip content={<ProteinsTooltip fdrQ={fdrQ} effectSymbol={effectSymbol} correctionMethod={correctionMethod} />} />

            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => {
                // Match the table headers' formatting (e.g. "HR=2.0", not "HR 2").
                const es = Number(value.replace('es_', ''));
                return <span className="text-xs text-gray-700">{effectSymbol}={formatEffectSize(es)}</span>;
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
                fontSize: 10,
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
                activeDot={{ r: 4, fill: effectColors[es], stroke: '#fff', strokeWidth: 1 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div aria-hidden="true" className="w-6 border-t-2 border-dashed border-purple-500"></div>
            <span>Target power ({(targetPower * 100).toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Toggle between Linear/Log scale above</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PowerByProteinsChart;
