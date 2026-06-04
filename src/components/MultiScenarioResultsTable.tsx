import { useState, useMemo } from 'react';

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

interface MultiScenarioResultsTableProps {
  /** Table data with effect sizes and power values for each scenario */
  data: Array<Record<string, number>>;
  /** Information about each scenario (protein count, alpha, color) */
  scenarios: ScenarioInfo[];
  /** Effect size label (e.g., "Hazard Ratio") */
  effectLabel?: string;
  /** Analysis type for formatting */
  analysisType?: AnalysisType;
  /** Target power — the threshold for the green "meets target" coloring */
  targetPower?: number;
}

type SortDirection = 'asc' | 'desc';

// Sort direction indicator. Defined at module scope so it keeps a stable
// component identity across re-renders.
const SortIndicator: React.FC<{
  field: string;
  sortField: string;
  sortDirection: SortDirection;
}> = ({ field, sortField, sortDirection }) => {
  if (sortField !== field) {
    return (
      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return sortDirection === 'asc' ? (
    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
};

/**
 * MultiScenarioResultsTable Component
 *
 * Displays a sortable, filterable table showing power values
 * across different effect sizes for each protein count scenario.
 */
const MultiScenarioResultsTable: React.FC<MultiScenarioResultsTableProps> = ({
  data,
  scenarios,
  effectLabel = 'Hazard Ratio',
  analysisType = 'cox',
  targetPower = 0.8,
}) => {
  // Linear and GEE use an additive β effect (null = 0); others use a ratio (null = 1).
  const isBetaEffect = analysisType === 'linear' || analysisType === 'gee';
  const decimals = isBetaEffect ? 3 : 2;
  const targetPct = (targetPower * 100).toFixed(0);
  const [sortField, setSortField] = useState<string>('effect');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterMinPower, setFilterMinPower] = useState<number>(0);

  // Sort and filter data
  const processedData = useMemo(() => {
    let result = [...data];

    // Filter by minimum power (any column)
    if (filterMinPower > 0) {
      result = result.filter((row) =>
        scenarios.some(s => row[`power_${s.proteinCount}`] >= filterMinPower)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (aVal - bVal) * multiplier;
    });

    return result;
  }, [data, scenarios, sortField, sortDirection, filterMinPower]);

  // Handle column header click for sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Format power as percentage with color coding (green = meets target power)
  const formatPower = (power: number) => {
    const percentage = (power * 100).toFixed(1);
    let statusClass = 'text-red-600';
    if (power >= targetPower) statusClass = 'text-green-600 font-semibold';
    else if (power >= 0.5) statusClass = 'text-amber-600';

    return (
      <span className={statusClass}>
        {percentage}%
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Power Comparison Table
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Min Power:</label>
            <select
              value={filterMinPower}
              onChange={(e) => setFilterMinPower(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={0}>All</option>
              <option value={0.5}>≥50%</option>
              <option value={0.7}>≥70%</option>
              <option value={0.8}>≥80%</option>
              <option value={0.9}>≥90%</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('effect')}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {effectLabel}
                  <SortIndicator field="effect" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              {scenarios.map((scenario) => (
                <th
                  key={scenario.proteinCount}
                  onClick={() => handleSort(`power_${scenario.proteinCount}`)}
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: scenario.color.hex }}
                      ></span>
                      {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
                    </span>
                    <SortIndicator field={`power_${scenario.proteinCount}`} sortField={sortField} sortDirection={sortDirection} />
                  </div>
                  <div className="text-xs font-normal text-gray-500">
                    α≈{scenario.alpha.toExponential(1)}
                  </div>
                </th>
              ))}
              {scenarios.length >= 2 && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Power Loss
                  <div className="text-xs font-normal text-gray-500">
                    (first → last)
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {processedData.map((row, index) => {
              // Calculate power loss (first scenario vs last scenario)
              const firstPower = row[`power_${scenarios[0].proteinCount}`] ?? 0;
              const lastPower = row[`power_${scenarios[scenarios.length - 1].proteinCount}`] ?? 0;
              const powerLoss = firstPower > 0
                ? ((firstPower - lastPower) / firstPower * 100).toFixed(1)
                : '0.0';

              // Determine if we should show power loss (when effect is above baseline)
              const showPowerLoss = isBetaEffect
                ? row.effect > 0
                : row.effect > 1;

              return (
                <tr
                  key={row.effect}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50/50 transition-colors`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {row.effect.toFixed(decimals)}
                  </td>
                  {scenarios.map((scenario) => (
                    <td key={scenario.proteinCount} className="px-4 py-3 text-sm">
                      {formatPower(row[`power_${scenario.proteinCount}`] ?? 0)}
                    </td>
                  ))}
                  {scenarios.length >= 2 && (
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {showPowerLoss ? `-${powerLoss}%` : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {processedData.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No data matches the current filter criteria.
        </div>
      )}

      <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Showing {processedData.length} of {data.length} rows •
        <span className="text-green-600 ml-2">≥{targetPct}% meets target</span> •
        <span className="text-amber-600 ml-2">50%–{targetPct}% below target</span> •
        <span className="text-red-600 ml-2">&lt;50% underpowered</span>
      </div>
    </div>
  );
};

export default MultiScenarioResultsTable;
