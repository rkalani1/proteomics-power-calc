import { useEffect, useRef, useState } from 'react';
import { formatAnalysisType, formatStudyDesign, performCopy } from '../utils/exportUtils';
import {
  DEFAULT_R_SCRIPT_OPTIONS,
  downloadRScript,
  generateRScript,
  getRScriptFilename,
  type AnalysisSnapshot,
  type RScriptInput,
  type RScriptOptions,
} from '../utils/rScriptGenerator';

type Feedback = { kind: 'success' | 'error'; message: string; context: string } | null;

interface CustomArtifact {
  kind: 'custom';
  text: string;
  generatedBaseline: string;
  sourceFilename: string;
  sourceOptions: RScriptOptions;
  sourceMetadata: AnalysisSnapshot;
  dismissedGeneratedBaseline?: string;
}

const snapshotMetadata = (input: RScriptInput): AnalysisSnapshot => ({
  analysisType: input.analysisType,
  studyDesign: input.studyDesign,
  proteinCounts: [...input.proteinCounts],
  correctionMethod: input.correctionMethod,
  fdrQ: input.fdrQ,
});

const selectedOptionCount = (options: RScriptOptions): number =>
  Object.values(options).filter(Boolean).length;

const feedbackContextFor = (generatedScript: string, displayedScript: string): string =>
  `${generatedScript}\u0000${displayedScript}`;

const RScriptBuilder: React.FC<RScriptInput> = (props) => {
  const [options, setOptions] = useState<RScriptOptions>({ ...DEFAULT_R_SCRIPT_OPTIONS });
  const generation = (() => {
    try {
      return { script: generateRScript(props, options), error: '' };
    } catch (error) {
      return {
        script: '',
        error: error instanceof Error ? error.message : 'The R script could not be generated.',
      };
    }
  })();

  const [customArtifact, setCustomArtifact] = useState<CustomArtifact | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const operationIdRef = useRef(0);

  const script = customArtifact?.text ?? generation.script;
  const feedbackContext = feedbackContextFor(generation.script, script);
  const visibleFeedback = feedback?.context === feedbackContext ? feedback : null;
  const scriptSnapshotRef = useRef(script);

  const invalidateFeedback = () => {
    operationIdRef.current += 1;
    setFeedback(null);
  };

  useEffect(() => {
    operationIdRef.current += 1;
  }, [generation.script]);

  useEffect(() => {
    scriptSnapshotRef.current = script;
  }, [script]);

  const isDirty = customArtifact !== null;
  const inputsChanged = isDirty && generation.script !== customArtifact.generatedBaseline;
  const showChangedNotice = inputsChanged
    && customArtifact.dismissedGeneratedBaseline !== generation.script;
  const filename = customArtifact?.sourceFilename ?? getRScriptFilename(props);
  const visibleMetadata = customArtifact?.sourceMetadata ?? snapshotMetadata(props);

  const updateOption = (key: keyof RScriptOptions) => {
    invalidateFeedback();
    setOptions((current) => ({ ...current, [key]: !current[key] }));
  };

  const replaceWithCurrentInputs = () => {
    if (!generation.script) return;
    invalidateFeedback();
    setCustomArtifact(null);
    setFeedback({
      kind: 'success',
      message: 'R script regenerated from the current calculator inputs.',
      context: feedbackContextFor(generation.script, generation.script),
    });
  };

  const keepEdits = () => {
    invalidateFeedback();
    setCustomArtifact((current) => current
      ? { ...current, dismissedGeneratedBaseline: generation.script }
      : current);
  };

  const copyScript = async () => {
    const textToCopy = script;
    const contextAtStart = feedbackContext;
    const operationId = ++operationIdRef.current;
    setFeedback(null);
    try {
      await performCopy(textToCopy);
      if (operationIdRef.current === operationId && scriptSnapshotRef.current === textToCopy) {
        setFeedback({ kind: 'success', message: 'R script copied.', context: contextAtStart });
      }
    } catch {
      if (operationIdRef.current === operationId && scriptSnapshotRef.current === textToCopy) {
        setFeedback({
          kind: 'error',
          message: 'The R script could not be copied. Select the code and copy it manually.',
          context: contextAtStart,
        });
      }
    }
  };

  const downloadScript = () => {
    invalidateFeedback();
    try {
      downloadRScript(script, filename);
      setFeedback({ kind: 'success', message: `Download requested: ${filename}.`, context: feedbackContext });
    } catch {
      setFeedback({
        kind: 'error',
        message: 'The R script download could not be requested. Copy it into R or RStudio instead.',
        context: feedbackContext,
      });
    }
  };

  const scenarioLabel = visibleMetadata.proteinCounts
    .map((proteinCount) => proteinCount.toLocaleString())
    .join(', ');
  const thresholdLabel = visibleMetadata.correctionMethod === 'fdr'
    ? `FDR q = ${visibleMetadata.fdrQ}`
    : `Bonferroni alpha = ${visibleMetadata.fdrQ}`;
  const statusLabel = inputsChanged
    ? 'Customized - calculator inputs changed'
    : isDirty
      ? 'Customized'
      : 'Synced with calculator';

  return (
    <section className="r-script-builder bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Reproducible analysis</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg aria-hidden="true" focusable="false" className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-3 3 3 3m8-6l3 3-3 3m-3-9l-2 12" />
              </svg>
              Generate an editable R script
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Replicate the current framework, study parameters, results, and sensitivity analyses in base R.
            </p>
          </div>
          <span className={`r-script-status ${inputsChanged || isDirty ? 'is-customized' : 'is-synced'}`}>
            <span aria-hidden="true" className="r-script-status-dot" />
            {statusLabel}
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-950">
          <span className="font-semibold">{formatAnalysisType(visibleMetadata.analysisType)}</span>
          <span aria-hidden="true"> · </span>
          {formatStudyDesign(visibleMetadata.studyDesign)}
          <span aria-hidden="true"> · </span>
          {scenarioLabel} protein{visibleMetadata.proteinCounts.length === 1 && visibleMetadata.proteinCounts[0] === 1 ? '' : 's'}
          <span aria-hidden="true"> · </span>
          {thresholdLabel}
        </div>
      </div>

      {generation.error && (
        <div role="alert" className="mx-6 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {generation.error}
        </div>
      )}

      {showChangedNotice && (
        <div role="alert" className="mx-6 mt-5 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong>Calculator settings changed.</strong> Your custom artifact keeps its original analysis, filename, generator options, and edits until you replace it.
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={keepEdits} className="rounded-md border border-amber-300 bg-white px-3 py-2 font-medium hover:bg-amber-100">
              Keep my edits
            </button>
            <button type="button" onClick={replaceWithCurrentInputs} className="rounded-md bg-amber-800 px-3 py-2 font-medium text-white hover:bg-amber-900">
              Replace with updated script
            </button>
          </div>
        </div>
      )}

      <div className="r-script-builder-grid px-6 py-6">
        <aside className="r-script-options" aria-label="R script contents">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Include in this script</h3>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {isDirty
                ? `Selections apply on regeneration. This custom artifact retains its ${selectedOptionCount(customArtifact.sourceOptions)} original optional selections.`
                : 'Selections regenerate code from the calculator values shown above.'}
            </p>
          </div>

          <label className="r-script-option is-required">
            <input type="checkbox" checked disabled />
            <span><strong>Core calculations and results</strong><small>Framework, parameters, scenario results, curves, and power grids</small></span>
          </label>

          {([
            ['includeSensitivity', 'Sensitivity analyses', 'Effect size, events or sample size, and proteins tested'],
            ['includeVisualizations', 'Visualizations', 'Six-panel PDF using base R graphics'],
            ['includeCsv', 'CSV result files', 'Machine-readable parameters and result tables'],
            ['includeSessionInfo', 'Reproducibility receipt', 'Save the local R session information'],
          ] as const).map(([key, label, description]) => (
            <label key={key} className="r-script-option">
              <input type="checkbox" checked={options[key]} onChange={() => updateOption(key)} />
              <span><strong>{label}</strong><small>{description}</small></span>
            </label>
          ))}

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-xs leading-5 text-gray-600">
            Uses base R only. The page creates code in your browser; it does not upload data or run R.
          </div>
        </aside>

        <div className="min-w-0">
          <div className="r-script-toolbar">
            <div className="min-w-0">
              <label htmlFor="generated-r-script" className="block text-sm font-semibold text-gray-800">
                Generated R script <span className="font-normal text-gray-500">(editable)</span>
              </label>
              <p id="r-script-instructions" className="mt-1 truncate text-xs text-gray-500">{filename}</p>
            </div>
            <div className="r-script-actions">
              <button type="button" onClick={replaceWithCurrentInputs} disabled={!generation.script} className="r-script-action secondary">
                Regenerate from inputs
              </button>
              <button type="button" onClick={copyScript} disabled={!script} className="r-script-action secondary">Copy R script</button>
              <button type="button" onClick={downloadScript} disabled={!script} className="r-script-action primary">Download .R</button>
            </div>
          </div>

          <textarea
            id="generated-r-script"
            value={script}
            onChange={(event) => {
              const nextText = event.target.value;
              invalidateFeedback();
              setCustomArtifact((current) => current
                ? { ...current, text: nextText }
                : {
                  kind: 'custom',
                  text: nextText,
                  generatedBaseline: generation.script,
                  sourceFilename: getRScriptFilename(props),
                  sourceOptions: { ...options },
                  sourceMetadata: snapshotMetadata(props),
                });
            }}
            aria-describedby="r-script-instructions r-script-trust"
            spellCheck={false}
            wrap="off"
            className="r-script-editor"
          />

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p id="r-script-trust" className="max-w-2xl text-xs leading-5 text-gray-500">
              Generated locally in your browser. Review the code before using it for an analysis, then run it in R or RStudio.
            </p>
            {visibleFeedback && (
              <p role={visibleFeedback.kind === 'error' ? 'alert' : 'status'} aria-live="polite" className={`text-xs font-medium ${visibleFeedback.kind === 'error' ? 'text-red-700' : 'text-teal-700'}`}>
                {visibleFeedback.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RScriptBuilder;
