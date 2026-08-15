import { calculateDesignEffect, calculateInflation, type AnalysisType, type StudyDesign } from '../utils/statistics';

type EffectConfig = {
  label: string;
  symbol: string;
};

type ScenarioResult = {
  proteinCount: number;
  alpha: number;
  minEffect: number;
  color: {
    bg: string;
    text: string;
    light: string;
    border: string;
  };
};

interface MinEffectCardsProps {
  analysisType: AnalysisType;
  effectConfig: EffectConfig;
  effectDecimals: number;
  events: number;
  icc: number;
  clusterSize: number;
  numCases: number;
  numControls: number;
  prevalence: number;
  sampleSize: number;
  subcohortSize: number;
  totalCohort: number;
  matchingRatio: number;
  scenarioResults: ScenarioResult[];
  standardError: number;
  studyDesign: StudyDesign;
  targetPower: number;
}

export function MinEffectCards({
  analysisType,
  effectConfig,
  effectDecimals,
  events,
  icc,
  clusterSize,
  numCases,
  numControls,
  prevalence,
  sampleSize,
  subcohortSize,
  totalCohort,
  matchingRatio,
  scenarioResults,
  standardError,
  studyDesign,
  targetPower,
}: MinEffectCardsProps) {
  const isBetaModel = analysisType === 'linear' || analysisType === 'gee';
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Minimum Detectable {effectConfig.label} for {(targetPower * 100).toFixed(0)}% Power
      </h2>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${scenarioResults.length > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
        {scenarioResults.map((scenario) => (
          <div
            key={scenario.proteinCount}
            className={`p-4 rounded-lg border ${scenario.color.border} ${scenario.color.light}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${scenario.color.bg}`}></span>
              <span className={`text-sm font-medium ${scenario.color.text}`}>
                {scenario.proteinCount.toLocaleString()} protein{scenario.proteinCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className={`text-2xl font-bold ${scenario.color.text}`}>
              {isBetaModel ? `|${effectConfig.symbol}|` : effectConfig.symbol} ≥ {scenario.minEffect.toFixed(effectDecimals)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Effective α ≈ {scenario.alpha.toExponential(2)}
            </p>
          </div>
        ))}
      </div>

      {isBetaModel ? (
        <p className="mt-3 text-xs text-gray-500">
          Detectability is symmetric about zero: a {effectConfig.symbol} of −x is exactly as detectable
          as +x, so the threshold applies to the magnitude |{effectConfig.symbol}|.
        </p>
      ) : (
        <p className="mt-3 text-xs text-gray-500">
          Detectability is symmetric on the log scale: a minimum detectable {effectConfig.symbol} of x is
          equivalent to a protective {effectConfig.symbol} of 1/x (e.g. {effectConfig.symbol} 1.25 ↔ 0.80).
        </p>
      )}

      {scenarioResults.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="font-medium">Effect Size Inflation:</span>
            {(() => {
              const first = scenarioResults[0];
              const last = scenarioResults[scenarioResults.length - 1];
              // calculateInflation is a ratio-scale (HR/OR/RR) helper whose
              // guards treat 1 as the null; for additive β (null = 0) the
              // relative increase is computed directly so a minimum detectable
              // β near 1.0 is not misreported as zero inflation.
              const inflation = isBetaModel
                ? (first.minEffect > 0 ? ((last.minEffect / first.minEffect) - 1) * 100 : 0)
                : calculateInflation(first.minEffect, last.minEffect);
              return (
                <span className="text-amber-600 font-semibold">
                  {isFinite(inflation) ? `~${inflation.toFixed(1)}%` : 'N/A'}
                  <span className="font-normal text-gray-500 ml-2">
                    ({first.proteinCount.toLocaleString()} → {last.proteinCount.toLocaleString()} proteins)
                  </span>
                </span>
              );
            })()}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="font-medium">
            {analysisType === 'linear' || analysisType === 'gee' ? 'SE(β)' : `SE(log ${effectConfig.symbol})`}:
          </span>
          <span className="text-purple-600 font-semibold">
            {isFinite(standardError) ? standardError.toFixed(4) : '∞'}
          </span>
          <span className="text-gray-500">
            {analysisType === 'cox'
              ? studyDesign === 'case-cohort'
                ? `(${events} events, subcohort ${subcohortSize}/${totalCohort})`
                : studyDesign === 'nested-case-control'
                ? `(${events} events, ${matchingRatio}:1 matching)`
                : `(${events} events)`
              : analysisType === 'linear'
              ? `(n = ${sampleSize})`
              : analysisType === 'gee'
              ? `(n = ${sampleSize} obs, m = ${clusterSize}, ICC = ${icc.toFixed(2)}, DE = ${calculateDesignEffect(clusterSize, icc).toFixed(2)})`
              : (studyDesign === 'case-control' || studyDesign === 'nested-case-control')
              ? `(${numCases} cases, ${numControls} controls)`
              : `(n = ${sampleSize}, prev = ${(prevalence * 100).toFixed(0)}%)`}
          </span>
        </div>
      </div>
    </section>
  );
}
