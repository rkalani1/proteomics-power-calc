import React from 'react';
import type { AnalysisType, StudyDesign } from '../utils/statistics';

interface AnalysisFrameworkProps {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  comparisonMode: boolean;
  proteinCount: number;
  proteinCounts: number[];
  newProteinCount: string;
  fdrQ: number;
  correctionMethod: 'fdr' | 'bonferroni';
  ANALYSIS_TYPE_OPTIONS: { value: AnalysisType; label: string; description: string }[];
  STUDY_DESIGN_OPTIONS: Record<AnalysisType, { value: StudyDesign; label: string; description: string }[]>;
  handleAnalysisTypeChange: (newType: AnalysisType) => void;
  setStudyDesign: (design: StudyDesign) => void;
  setComparisonMode: (mode: boolean) => void;
  setProteinCount: (count: number) => void;
  setNewProteinCount: (count: string) => void;
  addProteinCount: () => void;
  removeProteinCount: (count: number) => void;
  calculateEffectiveAlpha: (alpha: number, m: number, method: 'fdr' | 'bonferroni') => number;
  SCENARIO_COLORS: { bg: string; text: string; light: string; border: string; hex: string }[];
  setProteinCounts: (counts: number[]) => void;
}

export const AnalysisFramework: React.FC<AnalysisFrameworkProps> = ({
  analysisType,
  studyDesign,
  comparisonMode,
  proteinCount,
  proteinCounts,
  newProteinCount,
  fdrQ,
  correctionMethod,
  ANALYSIS_TYPE_OPTIONS,
  STUDY_DESIGN_OPTIONS,
  handleAnalysisTypeChange,
  setStudyDesign,
  setComparisonMode,
  setProteinCount,
  setNewProteinCount,
  addProteinCount,
  removeProteinCount,
  calculateEffectiveAlpha,
  SCENARIO_COLORS,
  setProteinCounts,
}) => {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        Analysis Framework
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Analysis Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
          <div className="grid grid-cols-2 gap-2">
            {ANALYSIS_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={analysisType === option.value}
                onClick={() => handleAnalysisTypeChange(option.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  analysisType === option.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Study Design */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Study Design</label>
          <div className="grid grid-cols-1 gap-2">
            {STUDY_DESIGN_OPTIONS[analysisType].map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={studyDesign === option.value}
                onClick={() => setStudyDesign(option.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  studyDesign === option.value
                    ? 'border-purple-500 bg-purple-50 text-purple-900'
                    : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Protein Count */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="protein-count-input" className="block text-sm font-medium text-gray-700">
            Number of Proteins
          </label>
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
              comparisonMode
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {comparisonMode ? 'Comparison On' : 'Compare Scenarios'}
          </button>
        </div>

        {!comparisonMode ? (
          /* Single protein count mode */
          <div>
            <div className="flex items-center gap-4">
              <input
                id="protein-count-input"
                type="number"
                min={1}
                max={100000}
                value={proteinCount}
                onChange={(e) => setProteinCount(Math.min(100000, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-sm text-gray-500">
                Effective α ≈ {calculateEffectiveAlpha(fdrQ, proteinCount, correctionMethod).toExponential(2)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 mr-2">Presets:</span>
              {[1, 100, 1000, 3000, 5000, 7000].map(n => (
                <button
                  key={n}
                  onClick={() => setProteinCount(n)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    proteinCount === n
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  {n.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Comparison mode */
          <div>
            <p className="text-xs text-gray-500 mb-4">
              Compare power across different protein counts (e.g., targeted panel vs. proteome-wide).
            </p>

            {/* Current protein counts */}
            <div className="flex flex-wrap gap-2 mb-4">
              {proteinCounts.map((count, index) => {
                const color = SCENARIO_COLORS[index % SCENARIO_COLORS.length];
                return (
                  <div
                    key={count}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${color.border} ${color.light}`}
                  >
                    <span className={`w-3 h-3 rounded-full ${color.bg}`}></span>
                    <span className={`font-medium ${color.text}`}>
                      {count.toLocaleString()} protein{count !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-500">
                      (α≈{calculateEffectiveAlpha(fdrQ, count, correctionMethod).toExponential(1)})
                    </span>
                    {proteinCounts.length > 1 && (
                      <button
                        onClick={() => removeProteinCount(count)}
                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add new protein count */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100000}
                value={newProteinCount}
                onChange={(e) => setNewProteinCount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addProteinCount()}
                placeholder="Enter protein count..."
                aria-label="Add a protein-count scenario"
                className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={addProteinCount}
                disabled={!newProteinCount || proteinCounts.length >= 6}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
              {proteinCounts.length >= 6 && (
                <span className="text-xs text-amber-600">Maximum 6 scenarios</span>
              )}
            </div>

            {/* Quick add presets */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 mr-2">Quick add:</span>
              {[1, 50, 100, 500, 1000, 3000, 5000, 7000].filter(n => !proteinCounts.includes(n)).slice(0, 5).map(n => (
                <button
                  key={n}
                  onClick={() => {
                    if (proteinCounts.length < 6) {
                      setProteinCounts([...proteinCounts, n].sort((a, b) => a - b));
                    }
                  }}
                  disabled={proteinCounts.length >= 6}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {n.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
