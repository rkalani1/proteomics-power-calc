import { useState, useMemo } from 'react';

interface TableRow {
  hr: number;
  powerSingle: number;
  powerMulti: number;
}

interface ResultsTableProps {
  data: TableRow[];
  alphaSingle: number;
  alphaMulti: number;
}

type SortField = 'hr' | 'powerSingle' | 'powerMulti';
type SortDirection = 'asc' | 'desc';

/**
 * ResultsTable Component
 *
 * Displays a sortable, filterable table comparing power values
 * across different hazard ratios for single-protein vs. proteome-wide testing.
 */
const ResultsTable: React.FC<ResultsTableProps> = ({
  data,
  alphaSingle,
  alphaMulti,
}) => {
  const [sortField, setSortField] = useState<SortField>('hr');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterMinPower, setFilterMinPower] = useState<number>(0);

  // Sort and filter data
  const processedData = useMemo(() => {
    let result = [...data];

    // Filter by minimum power (either column)
    if (filterMinPower > 0) {
      result = result.filter(
        (row) =>
          row.powerSingle >= filterMinPower || row.powerMulti >= filterMinPower
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (aVal - bVal) * multiplier;
    });

    return result;
  }, [data, sortField, sortDirection, filterMinPower]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
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

  // Format power as percentage with color coding
  const formatPower = (power: number) => {
    const percentage = (power * 100).toFixed(1);
    let colorClass = 'text-red-600';
    if (power >= 0.8) colorClass = 'text-green-600 font-semibold';
    else if (power >= 0.5) colorClass = 'text-amber-600';

    return <span className={colorClass}>{percentage}%</span>;
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
            <p className="text-sm text-gray-500 mt-1">
              Click column headers to sort • Filter by minimum power threshold
            </p>
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
                onClick={() => handleSort('hr')}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  Hazard Ratio
                  <SortIndicator field="hr" />
                </div>
              </th>
              <th
                onClick={() => handleSort('powerSingle')}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Power (Single)
                  </span>
                  <SortIndicator field="powerSingle" />
                </div>
                <div className="text-xs font-normal text-gray-500">α={alphaSingle}</div>
              </th>
              <th
                onClick={() => handleSort('powerMulti')}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Power (Multi)
                  </span>
                  <SortIndicator field="powerMulti" />
                </div>
                <div className="text-xs font-normal text-gray-500">α≈{alphaMulti.toExponential(2)}</div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Power Loss
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {processedData.map((row, index) => {
              const powerLoss = row.powerSingle > 0
                ? ((row.powerSingle - row.powerMulti) / row.powerSingle * 100).toFixed(1)
                : '0.0';

              return (
                <tr
                  key={row.hr}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50/50 transition-colors`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {row.hr.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatPower(row.powerSingle)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatPower(row.powerMulti)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {row.hr > 1 ? `-${powerLoss}%` : '—'}
                  </td>
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
        <span className="text-green-600 ml-2">≥80% adequate power</span> •
        <span className="text-amber-600 ml-2">50-79% marginal</span> •
        <span className="text-red-600 ml-2">&lt;50% underpowered</span>
      </div>
    </div>
  );
};

export default ResultsTable;
