import React, { useEffect, useRef, useState } from 'react';
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
  STUDY_DESIGN_OPTIONS: Record<AnalysisType, readonly { value: StudyDesign; label: string; description: string }[]>;
  handleAnalysisTypeChange: (newType: AnalysisType) => void;
  setStudyDesign: (design: StudyDesign) => void;
  setComparisonMode: (mode: boolean) => void;
  setProteinCount: (count: number) => void;
  setNewProteinCount: (count: string) => void;
  addProteinScenario: (count: number) => boolean;
  removeProteinCount: (count: number) => void;
  calculateEffectiveAlpha: (alpha: number, m: number, method: 'fdr' | 'bonferroni') => number;
  SCENARIO_COLORS: { bg: string; text: string; light: string; border: string; hex: string }[];
}

const PROTEIN_PRESETS = [1, 100, 1000, 3000, 5000, 7000];
const QUICK_ADD_PRESETS = [1, 50, 100, 500, 1000, 3000, 5000, 7000];

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
  addProteinScenario,
  removeProteinCount,
  calculateEffectiveAlpha,
  SCENARIO_COLORS,
}) => {
  const [normalizationMessage, setNormalizationMessage] = useState('');
  const [scenarioAnnouncement, setScenarioAnnouncement] = useState('');
  const [scenarioError, setScenarioError] = useState('');
  // Raw text while the protein-count field is being edited; null when idle.
  // Normalization is deferred to blur so the user can clear the field and
  // retype without the value being force-rewritten on every keystroke.
  const [proteinDraft, setProteinDraft] = useState<string | null>(null);
  const pendingScenarioFocus = useRef<number | null>(null);

  useEffect(() => {
    const count = pendingScenarioFocus.current;
    if (count === null || !proteinCounts.includes(count)) return;

    pendingScenarioFocus.current = null;
    const focusTimer = window.setTimeout(() => {
      const removeButton = document.querySelector<HTMLButtonElement>(`[data-remove-scenario="${count}"]`);
      const summary = document.getElementById('scenario-comparison-summary');
      if (removeButton) {
        removeButton.focus();
      } else {
        summary?.focus();
      }
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [proteinCounts]);

  const handleProteinCountChange = (rawValue: string) => {
    setProteinDraft(rawValue);
    const parsed = Number.parseInt(rawValue, 10);
    // Commit valid in-range values live; leave invalid/partial input alone
    // until blur so the field stays editable.
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 100000) {
      setProteinCount(parsed);
      setNormalizationMessage('');
    }
  };

  const handleProteinCountBlur = () => {
    const parsed = Number.parseInt(proteinDraft ?? '', 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setProteinCount(1);
      setNormalizationMessage('Protein count normalized to the minimum value of 1.');
    } else if (parsed > 100000) {
      setProteinCount(100000);
      setNormalizationMessage('Protein count normalized to the maximum value of 100,000.');
    }
    setProteinDraft(null);
  };

  // Mirror the validity policy in addProteinScenario (App.tsx) so a rejected
  // add produces a visible, announced explanation instead of failing silently.
  const explainScenarioRejection = (count: number): string => {
    if (!Number.isInteger(count) || count < 1 || count > 100000) {
      return 'Enter a whole number between 1 and 100,000.';
    }
    if (proteinCounts.length >= 6) return 'Maximum of 6 scenarios reached.';
    if (proteinCounts.includes(count)) {
      return `${count.toLocaleString()} is already being compared.`;
    }
    return 'Could not add scenario.';
  };

  const addManualScenario = () => {
    const count = Number.parseInt(newProteinCount, 10);
    if (addProteinScenario(count)) {
      pendingScenarioFocus.current = count;
      setScenarioAnnouncement(
        `Scenario added. Now comparing ${proteinCounts.length + 1} scenarios.`
      );
      setScenarioError('');
      setNewProteinCount('');
    } else {
      setScenarioError(explainScenarioRejection(count));
    }
  };

  const addQuickScenario = (count: number) => {
    if (!addProteinScenario(count)) return;
    pendingScenarioFocus.current = count;
    setScenarioAnnouncement(
      `Scenario added. Now comparing ${proteinCounts.length + 1} scenarios.`
    );
  };

  const handleRemoveScenario = (count: number) => {
    setScenarioAnnouncement(
      `Scenario removed. Now comparing ${proteinCounts.length - 1} scenarios.`
    );
    removeProteinCount(count);
  };

  const atScenarioLimit = proteinCounts.length >= 6;

  return (
    <section className="assay-framework assay-card assay-card--accent assay-card--padded">
      <h2 id="setup-heading" tabIndex={-1} className="section-title mb-5">
        <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        Analysis Framework
      </h2>

      <div className="analysis-method-columns">
        {/* Analysis Type */}
        <fieldset className="analysis-method-selector">
          <legend className="field-label">Analysis Type</legend>
          <div className="analysis-method-grid" role="group" aria-label="Analysis type">
            {ANALYSIS_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={analysisType === option.value}
                aria-label={`${option.label}: ${option.description}`}
                title={option.label}
                onClick={() => handleAnalysisTypeChange(option.value)}
                className="option-tile"
              >
                <span className="option-tile__label">{option.label}</span>
                <span className="option-tile__meta">{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Study Design */}
        <fieldset className="analysis-method-selector">
          <legend className="field-label">Study Design</legend>
          <div className="analysis-method-grid" role="group" aria-label="Study design">
            {STUDY_DESIGN_OPTIONS[analysisType].map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={studyDesign === option.value}
                aria-label={`${option.label}: ${option.description}`}
                onClick={() => setStudyDesign(option.value)}
                className="option-tile"
              >
                <span className="option-tile__label">{option.label}</span>
                <span className="option-tile__meta">{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Protein Count */}
      <div className="mt-6 border-t border-line-soft pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          {/* Point the label at whichever input is rendered for the current
              mode so it never references a non-existent element. */}
          <label
            htmlFor={comparisonMode ? 'protein-scenario-input' : 'protein-count-input'}
            className="text-sm font-semibold text-ink"
          >
            Number of Proteins
          </label>
          <button
            type="button"
            onClick={() => setComparisonMode(!comparisonMode)}
            aria-pressed={comparisonMode}
            className="toggle-button"
          >
            <svg aria-hidden="true" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {comparisonMode ? 'Comparison On' : 'Compare Scenarios'}
          </button>
        </div>

        {!comparisonMode ? (
          /* Single protein count mode */
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="protein-count-input"
                type="number"
                min={1}
                max={100000}
                value={proteinDraft ?? proteinCount}
                aria-describedby="protein-count-constraints protein-count-normalization"
                onChange={(e) => handleProteinCountChange(e.target.value)}
                onBlur={handleProteinCountBlur}
                className="field-input w-32"
              />
              <span className="text-sm text-ink-soft">
                Effective α ≈ {calculateEffectiveAlpha(fdrQ, proteinCount, correctionMethod).toExponential(2)}
              </span>
            </div>
            <p id="protein-count-constraints" className="protein-count-helper">
              Allowed range: 1 to 100,000 proteins.
            </p>
            <p
              id="protein-count-normalization"
              className="protein-count-normalization"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {normalizationMessage}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-ink-muted">Presets:</span>
              {PROTEIN_PRESETS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setProteinCount(n)}
                  aria-pressed={proteinCount === n}
                  className="chip-button"
                >
                  {n.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Comparison mode */
          <div>
            <p className="mb-4 text-xs leading-relaxed text-ink-soft">
              Compare power across different protein counts (e.g., targeted panel vs. proteome-wide).
            </p>

            {/* Current protein counts */}
            <div
              id="scenario-comparison-summary"
              className="mb-4 flex flex-wrap gap-2"
              tabIndex={-1}
              aria-label={`Comparing ${proteinCounts.length} scenarios`}
            >
              {proteinCounts.map((count, index) => {
                const color = SCENARIO_COLORS[index % SCENARIO_COLORS.length];
                return (
                  <div
                    key={count}
                    className={`scenario-pill ${color.border} ${color.light} ${color.text}`}
                  >
                    <span className={`scenario-pill__dot ${color.bg}`} aria-hidden="true"></span>
                    <span>
                      {count.toLocaleString()} protein{count !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-normal text-ink-soft">
                      (α≈{calculateEffectiveAlpha(fdrQ, count, correctionMethod).toExponential(2)})
                    </span>
                    {proteinCounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveScenario(count)}
                        data-remove-scenario={count}
                        aria-label={`Remove ${count.toLocaleString()} protein scenario`}
                        className="scenario-pill__remove"
                        title={`Remove ${count.toLocaleString()} protein scenario`}
                      >
                        <svg aria-hidden="true" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add new protein count */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="protein-scenario-input"
                type="number"
                min={1}
                max={100000}
                value={newProteinCount}
                onChange={(e) => { setNewProteinCount(e.target.value); setScenarioError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && addManualScenario()}
                placeholder="Enter protein count..."
                aria-label="Add a protein-count scenario"
                aria-describedby={scenarioError ? 'protein-scenario-error' : undefined}
                className="field-input w-48"
              />
              <button
                type="button"
                onClick={addManualScenario}
                disabled={!newProteinCount || atScenarioLimit}
                className="btn btn-primary"
              >
                Add
              </button>
              {atScenarioLimit && (
                <span className="text-xs font-medium text-warn-800">Maximum 6 scenarios</span>
              )}
            </div>
            {scenarioError && (
              <p id="protein-scenario-error" className="mt-2 text-xs font-medium text-danger-800" role="status" aria-live="polite">
                {scenarioError}
              </p>
            )}

            {/* Quick add presets */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-ink-muted">Quick add:</span>
              {QUICK_ADD_PRESETS.filter(n => !proteinCounts.includes(n)).slice(0, 5).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => addQuickScenario(n)}
                  disabled={atScenarioLimit}
                  className="chip-button"
                >
                  {n.toLocaleString()}
                </button>
              ))}
            </div>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {scenarioAnnouncement}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
