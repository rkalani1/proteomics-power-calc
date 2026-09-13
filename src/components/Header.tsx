import React, { useEffect, useState } from 'react';
import type { AnalysisType, StudyDesign } from '../utils/statistics';

interface HeaderProps {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  comparisonMode: boolean;
  proteinCounts: number[];
  proteinCount: number;
  ANALYSIS_TYPE_OPTIONS: { value: AnalysisType; label: string; description: string }[];
  STUDY_DESIGN_OPTIONS: Record<AnalysisType, readonly { value: StudyDesign; label: string; description: string }[]>;
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
  const [isCompact, setIsCompact] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const analysisLabel = ANALYSIS_TYPE_OPTIONS.find(o => o.value === analysisType)?.label;
  const designLabel = STUDY_DESIGN_OPTIONS[analysisType].find(o => o.value === studyDesign)?.label;
  const scopeLabel = comparisonMode
    ? `Comparing ${proteinCounts.length} scenario${proteinCounts.length !== 1 ? 's' : ''}`
    : `${proteinCount.toLocaleString()} protein${proteinCount !== 1 ? 's' : ''}`;

  useEffect(() => {
    const updateCompactState = () => setIsCompact(window.scrollY > 72);
    updateCompactState();
    window.addEventListener('scroll', updateCompactState, { passive: true });
    return () => window.removeEventListener('scroll', updateCompactState);
  }, []);

  return (
    <header className={`assay-header${isCompact ? ' is-compact' : ''}`}>
      <div className="assay-header-rule" aria-hidden="true"></div>
      <div className="assay-header-inner">
        <div className="assay-header-primary">
          <div className="assay-header-brand">
            <div className="assay-mark" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1>Proteomics Power Calculator</h1>
              <p className="assay-header-tagline">
                Power and sample size for proteome-wide association studies
              </p>
            </div>
          </div>
          <div className="assay-header-desktop-chips" role="group" aria-label="Current setup">
            <span className="assay-chip assay-chip--analysis">{analysisLabel}</span>
            <span className="assay-chip assay-chip--design">{designLabel}</span>
            <span className="assay-chip assay-chip--scope">{scopeLabel}</span>
          </div>
          <button
            type="button"
            className="assay-current-setup"
            aria-expanded={setupOpen}
            aria-controls="current-setup-panel"
            onClick={() => setSetupOpen(open => !open)}
          >
            <span>Current setup</span>
            <span aria-hidden="true">{setupOpen ? '−' : '+'}</span>
          </button>
        </div>
        <div id="current-setup-panel" className="assay-current-setup-panel" hidden={!setupOpen}>
          <span className="assay-chip assay-chip--analysis">{analysisLabel}</span>
          <span className="assay-chip assay-chip--design">{designLabel}</span>
          <span className="assay-chip assay-chip--scope">{scopeLabel}</span>
        </div>
      </div>
    </header>
  );
};
