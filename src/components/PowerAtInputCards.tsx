import type { AnalysisType } from '../utils/statistics';
import { formatAlpha } from '../utils/formatters';

type EffectConfig = {
  symbol: string;
};

type ScenarioResult = {
  proteinCount: number;
  alpha: number;
  powerAtInput: number;
  sampleNeeded: number | string;
  color: {
    bg: string;
    text: string;
    light: string;
    border: string;
  };
};

interface PowerAtInputCardsProps {
  analysisType: AnalysisType;
  effectConfig: EffectConfig;
  effectDecimals: number;
  effectSize: number;
  scenarioResults: ScenarioResult[];
  targetPower: number;
}

function formatSampleNeeded(sampleNeeded: number | string): string {
  if (typeof sampleNeeded === 'string') {
    return sampleNeeded;
  }
  if (sampleNeeded === Infinity) {
    return '∞';
  }
  if (typeof sampleNeeded === 'number') {
    return sampleNeeded.toLocaleString();
  }
  return '—';
}

export function PowerAtInputCards({
  analysisType,
  effectConfig,
  effectDecimals,
  effectSize,
  scenarioResults,
  targetPower,
}: PowerAtInputCardsProps) {
  const sizeNoun = analysisType === 'cox' ? 'Events' : analysisType === 'gee' ? 'Observations' : 'Sample Size';

  return (
    <section className="assay-card assay-card--padded">
      <h2 className="section-title mb-4">
        <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Power for {effectConfig.symbol} = {effectSize.toFixed(effectDecimals)}
      </h2>

      <div className={`grid grid-cols-1 gap-3 ${scenarioResults.length > 1 ? 'md:grid-cols-2' : ''} ${scenarioResults.length > 2 ? 'lg:grid-cols-3' : ''}`}>
        {scenarioResults.map((scenario) => {
          const targetAttained = scenario.powerAtInput >= targetPower;
          const statusTone = targetAttained
            ? 'adequate'
            : scenario.powerAtInput >= 0.5
              ? 'warning'
              : 'danger';
          const targetDelta = Math.abs(targetPower - scenario.powerAtInput) * 100;
          const statusLabel = targetAttained
            ? `Target attained · ${targetDelta.toFixed(1)} percentage points above target`
            : statusTone === 'warning'
              ? `Below target · ${targetDelta.toFixed(1)} percentage points needed`
              : `Underpowered · ${targetDelta.toFixed(1)} percentage points needed`;
          const statusIcon = targetAttained ? '✓' : statusTone === 'warning' ? '⚠' : '✕';

          return (
          <div
            key={scenario.proteinCount}
            className="power-result-card"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex items-center gap-2">
                <span className={`series-dot ${scenario.color.bg}`} aria-hidden="true"></span>
                <span className="text-sm font-semibold text-ink">
                  {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-ink-soft">Effective α ≈ {formatAlpha(scenario.alpha)}</span>
            </div>
            <div className={`power-result-value power-result-value--${statusTone} text-3xl font-bold tracking-tight`}>
              {(scenario.powerAtInput * 100).toFixed(1)}%
            </div>
            <div className="power-progress-track">
              <div
                className={`power-progress power-progress--${statusTone}`}
                style={{ width: `${Math.min(scenario.powerAtInput * 100, 100)}%` }}
              />
            </div>
            {/* Plain visible text (no role="status"): with several scenario
                cards, live-region announcements on every slider tick would
                flood assistive tech with duplicate messages. */}
            <p className={`power-status-band power-status-band--${statusTone}`}>
              <span aria-hidden="true">{statusIcon}</span>
              <span>{statusLabel}</span>
            </p>
          </div>
          );
        })}
      </div>

      <div className="inset-panel mt-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">
          {sizeNoun} Required for {(targetPower * 100).toFixed(0)}% Power at {effectConfig.symbol} = {effectSize.toFixed(effectDecimals)}
        </h3>
        <div className={`grid grid-cols-2 gap-4 ${scenarioResults.length > 2 ? 'md:grid-cols-3' : ''}`}>
          {scenarioResults.map((scenario) => (
            <div key={scenario.proteinCount} className="text-center">
              <p className={`text-xl font-bold tracking-tight ${scenario.color.text}`}>
                {formatSampleNeeded(scenario.sampleNeeded)}
              </p>
              <p className="text-xs text-ink-soft">
                {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
        {scenarioResults.some(s => typeof s.sampleNeeded === 'number' && !Number.isFinite(s.sampleNeeded)) && (
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            ∞: the selected effect size equals the null value (no effect), so no
            sample size can attain the target power — increase the effect size.
          </p>
        )}
      </div>
    </section>
  );
}
