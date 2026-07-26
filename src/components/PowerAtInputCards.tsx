import type { AnalysisType } from '../utils/statistics';

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

export function PowerAtInputCards({
  analysisType,
  effectConfig,
  effectDecimals,
  effectSize,
  scenarioResults,
  targetPower,
}: PowerAtInputCardsProps) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Power for {effectConfig.symbol} = {effectSize.toFixed(effectDecimals)}
      </h2>

      <div className={`grid grid-cols-1 ${scenarioResults.length > 1 ? 'md:grid-cols-2' : ''} ${scenarioResults.length > 2 ? 'lg:grid-cols-3' : ''} gap-4`}>
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
            className="power-result-card rounded-lg p-4 border"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${scenario.color.bg}`}></span>
                <span className="text-sm font-medium text-gray-700">
                  {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-gray-500">Effective α ≈ {scenario.alpha.toExponential(1)}</span>
            </div>
            <div className={`power-result-value power-result-value--${statusTone} text-3xl font-bold`}>
              {(scenario.powerAtInput * 100).toFixed(1)}%
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`power-progress power-progress--${statusTone} h-full rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(scenario.powerAtInput * 100, 100)}%` }}
              />
            </div>
            <p
              className={`power-status-band power-status-band--${statusTone}`}
              role="status"
              aria-label={statusLabel}
            >
              <span aria-hidden="true">{statusIcon}</span>
              <span>{statusLabel}</span>
            </p>
          </div>
          );
        })}
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {analysisType === 'cox' ? 'Events' : 'Sample Size'} Required for {(targetPower * 100).toFixed(0)}% Power at {effectConfig.symbol} = {effectSize.toFixed(effectDecimals)}
        </h3>
        <div className={`grid grid-cols-2 ${scenarioResults.length > 2 ? 'md:grid-cols-3' : ''} ${scenarioResults.length > 4 ? 'lg:grid-cols-6' : ''} gap-4`}>
          {scenarioResults.map((scenario) => (
            <div key={scenario.proteinCount} className="text-center">
              <p className={`text-xl font-bold ${scenario.color.text}`}>
                {typeof scenario.sampleNeeded === 'string'
                  ? scenario.sampleNeeded
                  : scenario.sampleNeeded === Infinity
                  ? '∞'
                  : typeof scenario.sampleNeeded === 'number'
                  ? scenario.sampleNeeded.toLocaleString()
                  : '—'}
              </p>
              <p className="text-xs text-gray-500">
                {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
