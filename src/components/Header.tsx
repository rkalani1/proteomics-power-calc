import React from 'react';
import type { AnalysisType, StudyDesign } from '../utils/statistics';

interface HeaderProps {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  comparisonMode: boolean;
  proteinCounts: number[];
  proteinCount: number;
  ANALYSIS_TYPE_OPTIONS: { value: AnalysisType; label: string; description: string }[];
  STUDY_DESIGN_OPTIONS: Record<AnalysisType, { value: StudyDesign; label: string; description: string }[]>;
}

export const Header: React.FC<HeaderProps> = ({
  analysisType,
  studyDesign,
  comparisonMode,
  proteinCounts,
  proteinCount,
  ANALYSIS_TYPE_OPTIONS,
  STUDY_DESIGN_OPTIONS,
}) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm sticky top-0 z-50">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Proteomics Power Calculator
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 rounded-full font-medium border border-indigo-200/50 shadow-sm">
              {ANALYSIS_TYPE_OPTIONS.find(o => o.value === analysisType)?.label}
            </span>
            <span className="px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-full font-medium border border-purple-200/50 shadow-sm">
              {STUDY_DESIGN_OPTIONS[analysisType].find(o => o.value === studyDesign)?.label}
            </span>
            <span className="px-3 py-1.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 rounded-full font-medium border border-amber-200/50 shadow-sm">
              {comparisonMode
                ? `Comparing ${proteinCounts.length} scenario${proteinCounts.length !== 1 ? 's' : ''}`
                : `${proteinCount.toLocaleString()} proteins`
              }
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
