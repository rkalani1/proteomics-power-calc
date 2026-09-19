import { useState, useMemo } from 'react';
import { formatAlpha, getPowerStatus, POWER_STATUS_TEXT_CLASSES } from '../utils/formatters';

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
      <svg aria-hidden="true" focusable="false" className="h-4 w-4 text-line" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return sortDirection === 'asc' ? (
    <svg aria-hidden="true" focusable="false" className="h-4 w-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg aria-hidden="true" focusable="false" className="h-4 w-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      const powerKeys = scenarios.map(s => `power_${s.proteinCount}`);
      result = result.filter((row) =>
        powerKeys.some(key => (row[key] as number) >= filterMinPower)
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

  // Keyboard activation for the sortable headers (they are th elements, not
  // buttons, so Enter/Space must be wired up explicitly).
  const handleSortKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(field);
    }
  };

  const ariaSortFor = (field: string): 'ascending' | 'descending' | 'none' =>
    sortField === field ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

  // Format power as percentage with color coding (green = meets target power)
  const formatPower = (power: number) => {
    const percentage = (power * 100).toFixed(1);
    const status = getPowerStatus(power, targetPower);
    const statusClass = POWER_STATUS_TEXT_CLASSES[status];

    return (
      <span className={statusClass}>
        {percentage}%
      </span>
    );
  };

  return (
    <section className="assay-card overflow-hidden">
      <div className="border-b border-line-soft px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="section-title">
            <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Power Comparison Table
          </h2>

          <div className="flex items-center gap-2">
            <label htmlFor="min-power-filter" className="text-sm text-ink-soft">Min Power:</label>
            <select
              id="min-power-filter"
              value={filterMinPower}
              onChange={(e) => setFilterMinPower(Number(e.target.value))}
              className="field-select text-sm"
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

      <div className="scroll-region" tabIndex={0} role="region" aria-label="Power comparison table">
        <table className="data-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSort('effect')}
                onKeyDown={(e) => handleSortKeyDown(e, 'effect')}
                tabIndex={0}
                aria-sort={ariaSortFor('effect')}
                aria-label={`Sort by ${effectLabel}`}
                className="is-sortable"
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
                  onKeyDown={(e) => handleSortKeyDown(e, `power_${scenario.proteinCount}`)}
                  tabIndex={0}
                  aria-sort={ariaSortFor(`power_${scenario.proteinCount}`)}
                  aria-label={`Sort by power for ${scenario.proteinCount.toLocaleString()} proteins`}
                  className="is-sortable"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="series-dot"
                        style={{ backgroundColor: scenario.color.hex }}
                        aria-hidden="true"
                      ></span>
                      {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
                    </span>
                    <SortIndicator field={`power_${scenario.proteinCount}`} sortField={sortField} sortDirection={sortDirection} />
                  </div>
                  <div className="text-xs font-normal text-ink-muted">
                    α ≈ {formatAlpha(scenario.alpha)}
                  </div>
                </th>
              ))}
              {scenarios.length >= 2 && (
                <th>
                  Power Loss
                  <div className="text-xs font-normal text-ink-muted">
                    (first → last)
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {processedData.map((row) => {
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
                <tr key={row.effect}>
                  <td className="font-semibold text-ink">
                    {row.effect.toFixed(decimals)}
                  </td>
                  {scenarios.map((scenario) => (
                    <td key={scenario.proteinCount}>
                      {formatPower(row[`power_${scenario.proteinCount}`] ?? 0)}
                    </td>
                  ))}
                  {scenarios.length >= 2 && (
                    <td className="text-ink-soft">
                      {showPowerLoss ? `−${powerLoss}%` : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {processedData.length === 0 && (
        <div className="p-8 text-center text-sm text-ink-soft">
          No data matches the current filter criteria.
        </div>
      )}

      <div className="table-legend border-t border-line-soft bg-paper px-6 py-3">
        <span>Showing {processedData.length} of {data.length} rows</span>
        <span className="status-text--adequate">≥{targetPct}% meets target</span>
        {targetPower > 0.5 && (
          <span className="status-text--marginal">50%–{targetPct}% below target</span>
        )}
        <span className="status-text--inadequate">&lt;50% underpowered</span>
      </div>
    </section>
  );
};

export default MultiScenarioResultsTable;
