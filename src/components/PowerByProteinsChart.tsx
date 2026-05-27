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
import {
  calculateEffectiveAlpha,
  calculateCoxPower,
  calculateLinearPower,
  calculateLogisticPower,
  calculatePoissonPower,
  type CorrectionMethod,
} from '../utils/statistics';

type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';
type StudyDesign = 'cohort' | 'case-control' | 'cross-sectional' | 'case-cohort' | 'nested-case-control';
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
  effectSymbol: string;
  correctionMethod?: CorrectionMethod;
}

// Effect size configurations per analysis type
const EFFECT_SIZES: Record<AnalysisType, number[]> = {
  cox: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0],
  linear: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5],
  logistic: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0],
  poisson: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0],
  gee: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5],
};

/**
 * PowerByProteinsChart Component
 *
 * Comprehensive visualization of how statistical power changes with
 * the number of proteins tested, for multiple effect size values.
 * Supports all analysis types: Cox, Linear, Logistic, and Poisson.
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
  effectSymbol,
  correctionMethod = 'fdr',
}) => {
  // Scale toggle state
  const [scaleType, setScaleType] = useState<ScaleType>('linear');

  // Get effect sizes for current analysis type
  const effectSizes = EFFECT_SIZES[analysisType];

  // Protein counts for sensitivity table
  const proteinCountsForTable = [1, 5, 10, 25, 50, 100, 200, 500, 1000, 3000, 5000];

  // Color palette for effect size curves
  const effectColors: Record<number, string> = {};
  const colorScale = [
    '#991b1b', '#dc2626', '#ea580c', '#d97706', '#ca8a04',
    '#65a30d', '#16a34a', '#0d9488', '#0284c7', '#2563eb',
  ];
  effectSizes.forEach((es, idx) => {
    effectColors[es] = colorScale[idx];
  });

  // Calculate power for a given effect size and alpha
  const calculateModelPower = (effectSize: number, alpha: number): number => {
    switch (analysisType) {
      case 'cox':
        if (studyDesign === 'case-cohort') {
          return calculateCoxPower(effectSize, events, alpha, { subcohortSize, totalCohort });
        }
        return calculateCoxPower(effectSize, events, alpha);

      case 'linear':
        return calculateLinearPower(effectSize, sampleSize, residualSD, alpha);

      case 'logistic':
        if (studyDesign === 'case-control') {
          return calculateLogisticPower(effectSize, 0, 0, alpha, { cases: numCases, controls: numControls });
        }
        return calculateLogisticPower(effectSize, sampleSize, prevalence, alpha);

      case 'poisson':
        return calculatePoissonPower(effectSize, sampleSize, prevalence, alpha);

      default:
        return 0;
    }
  };

  // Generate data for linear chart (1-1000 range)
  const generateLinearChartData = () => {
    const counts: number[] = [];
    for (let i = 1; i <= 1000; i += 1) {
      counts.push(i);
    }
    return counts.map((numProteins) => {
      const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins, correctionMethod);
      const dataPoint: Record<string, number> = { proteins: numProteins };
      effectSizes.forEach((es) => {
        dataPoint[`es_${es}`] = calculateModelPower(es, alphaMulti);
      });
      return dataPoint;
    });
  };

  // Generate data for log chart (full 1-5000 range)
  const generateLogChartData = () => {
    const counts: number[] = [];
    for (let i = 1; i <= 100; i += 1) counts.push(i);
    for (let i = 110; i <= 500; i += 10) counts.push(i);
    for (let i = 550; i <= 1000; i += 50) counts.push(i);
    for (let i = 1100; i <= 5000; i += 100) counts.push(i);

    return counts.map((numProteins) => {
      const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins, correctionMethod);
      const dataPoint: Record<string, number> = { proteins: numProteins };
      effectSizes.forEach((es) => {
        dataPoint[`es_${es}`] = calculateModelPower(es, alphaMulti);
      });
      return dataPoint;
    });
  };

  const linearChartData = generateLinearChartData();
  const logChartData = generateLogChartData();

  // Generate sensitivity table data
  const sensitivityTableData = proteinCountsForTable.map((numProteins) => {
    const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins, correctionMethod);
    const row: Record<string, number> = { proteins: numProteins };
    effectSizes.forEach((es) => {
      row[`es_${es}`] = calculateModelPower(es, alphaMulti);
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

  // Format effect size for display
  const formatEffectSize = (es: number) => {
    return analysisType === 'linear' ? es.toFixed(2) : es.toFixed(1);
  };

  // Get parameter description for subtitle
  const getParameterDescription = () => {
    switch (analysisType) {
      case 'cox':
        return studyDesign === 'case-cohort'
          ? `d = ${events} events, subcohort = ${subcohortSize}/${totalCohort}`
          : `d = ${events} events`;
      case 'linear':
        return `n = ${sampleSize}, σ = ${residualSD}`;
      case 'logistic':
        return studyDesign === 'case-control'
          ? `${numCases} cases, ${numControls} controls`
          : `n = ${sampleSize}, prevalence = ${(prevalence * 100).toFixed(0)}%`;
      case 'poisson':
        return `n = ${sampleSize}, prevalence = ${(prevalence * 100).toFixed(0)}%`;
      default:
        return '';
    }
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
            Power Sensitivity: {effectSymbol} × Number of Proteins
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Power (%) for each combination (FDR q = {fdrQ}, {getParameterDescription()})
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
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs">≥80%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs">50-79%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs">&lt;50%</span>
          </div>
        </div>
      </div>

      {/* Power vs Number of Proteins Chart with Scale Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Power vs Number of Proteins
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {scaleType === 'linear'
                ? 'Linear scale (1-1,000 proteins)'
                : 'Logarithmic scale (1-5,000 proteins)'}
            </p>
          </div>

          {/* Scale Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setScaleType('linear')}
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
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
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

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => {
                const es = value.replace('es_', `${effectSymbol} `);
                return <span className="text-xs text-gray-700">{es}</span>;
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
                activeDot={{ r: 4, fill: effectColors[es], stroke: '#fff', strokeWidth: 1 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-purple-500" style={{ borderStyle: 'dashed', borderWidth: '1px 0 0 0', borderColor: '#8b5cf6' }}></div>
            <span>Target power ({(targetPower * 100).toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Toggle between Linear/Log scale above</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerByProteinsChart;
