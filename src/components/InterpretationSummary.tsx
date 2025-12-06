type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';

interface ScenarioResult {
  proteinCount: number;
  alpha: number;
  minEffect: number;
  powerAtInput: number;
  sampleNeeded: number | string;
  color: {
    bg: string;
    text: string;
    light: string;
    border: string;
    hex: string;
  };
}

interface InterpretationSummaryProps {
  scenarios: ScenarioResult[];
  analysisType: AnalysisType;
  effectSize: number;
  targetPower: number;
  effectSymbol: string;
  effectLabel: string;
  events?: number;
  sampleSize?: number;
}

/**
 * InterpretationSummary Component
 *
 * Provides plain-language interpretation of power analysis results
 * with actionable recommendations for study planning.
 */
const InterpretationSummary: React.FC<InterpretationSummaryProps> = ({
  scenarios,
  analysisType,
  effectSize,
  targetPower,
  effectSymbol,
  effectLabel,
  events,
  sampleSize,
}) => {
  // Find scenarios that achieve target power
  const adequatelyPowered = scenarios.filter(s => s.powerAtInput >= targetPower);
  const marginallyPowered = scenarios.filter(s => s.powerAtInput >= 0.5 && s.powerAtInput < targetPower);
  const underpowered = scenarios.filter(s => s.powerAtInput < 0.5);

  // Get the largest protein count that achieves target power
  const maxPoweredCount = adequatelyPowered.length > 0
    ? Math.max(...adequatelyPowered.map(s => s.proteinCount))
    : null;

  // Calculate effect size interpretation
  const getEffectInterpretation = (effect: number): string => {
    switch (analysisType) {
      case 'cox':
        if (effect < 1.2) return 'small';
        if (effect < 1.5) return 'moderate';
        return 'large';
      case 'linear':
        if (effect < 0.2) return 'small';
        if (effect < 0.5) return 'moderate';
        return 'large';
      case 'logistic':
      case 'poisson':
        if (effect < 1.3) return 'small';
        if (effect < 2.0) return 'moderate';
        return 'large';
      default:
        return 'moderate';
    }
  };

  const effectMagnitude = getEffectInterpretation(effectSize);

  // Determine overall status
  const getOverallStatus = (): 'success' | 'warning' | 'error' => {
    if (adequatelyPowered.length === scenarios.length) return 'success';
    if (adequatelyPowered.length > 0) return 'warning';
    return 'error';
  };

  const status = getOverallStatus();

  const statusConfig = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      title: 'text-green-800',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      title: 'text-amber-800',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      title: 'text-red-800',
    },
  };

  const config = statusConfig[status];

  // Generate recommendations
  const getRecommendations = (): string[] => {
    const recs: string[] = [];

    if (status === 'error') {
      recs.push(`Consider increasing ${analysisType === 'cox' ? 'the number of events' : 'sample size'} to achieve adequate power.`);
      recs.push(`Alternatively, focus on larger effect sizes if biologically plausible.`);
      if (scenarios.some(s => s.proteinCount > 1000)) {
        recs.push(`For proteome-wide analysis, consider a two-stage design with discovery and validation cohorts.`);
      }
    } else if (status === 'warning') {
      const firstUnderpowered = scenarios.find(s => s.powerAtInput < targetPower);
      if (firstUnderpowered) {
        recs.push(`Your study is underpowered for detecting ${effectSymbol}=${effectSize.toFixed(2)} when testing ${firstUnderpowered.proteinCount.toLocaleString()} proteins.`);
      }
      if (maxPoweredCount) {
        recs.push(`Consider limiting discovery analysis to ≤${maxPoweredCount.toLocaleString()} proteins, or use as a targeted validation panel.`);
      }
    } else {
      recs.push(`Your study design provides adequate statistical power across all tested scenarios.`);
      const smallest = scenarios[0];
      if (smallest.powerAtInput > 0.95) {
        recs.push(`Note: Power >${(smallest.powerAtInput * 100).toFixed(0)}% suggests your study may be larger than necessary for this effect size.`);
      }
    }

    return recs;
  };

  const recommendations = getRecommendations();

  return (
    <section className={`rounded-xl border ${config.border} ${config.bg} p-6`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${config.icon}`}>
          {status === 'success' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : status === 'warning' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${config.title} mb-2`}>
            {status === 'success' && 'Study is Adequately Powered'}
            {status === 'warning' && 'Partial Power Achieved'}
            {status === 'error' && 'Study is Underpowered'}
          </h3>

          {/* Main interpretation */}
          <div className="text-sm text-gray-700 space-y-2 mb-4">
            <p>
              <strong>Design Summary:</strong> With your current parameters
              {analysisType === 'cox' && events && ` (${events} events)`}
              {analysisType !== 'cox' && sampleSize && ` (n=${sampleSize.toLocaleString()})`}
              , your study can detect a <span className="font-medium">{effectMagnitude}</span> effect
              ({effectSymbol} = {analysisType === 'linear' ? effectSize.toFixed(3) : effectSize.toFixed(2)})
              with {(targetPower * 100).toFixed(0)}% power when testing up to{' '}
              <span className="font-semibold">
                {maxPoweredCount ? maxPoweredCount.toLocaleString() : '< 1'}
              </span>{' '}
              protein{maxPoweredCount !== 1 ? 's' : ''}.
            </p>

            {/* Scenario breakdown */}
            <div className="flex flex-wrap gap-2 mt-3">
              {adequatelyPowered.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {adequatelyPowered.length} scenario{adequatelyPowered.length !== 1 ? 's' : ''} ≥{(targetPower * 100).toFixed(0)}% power
                </span>
              )}
              {marginallyPowered.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  {marginallyPowered.length} scenario{marginallyPowered.length !== 1 ? 's' : ''} 50-{((targetPower - 0.01) * 100).toFixed(0)}% power
                </span>
              )}
              {underpowered.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {underpowered.length} scenario{underpowered.length !== 1 ? 's' : ''} &lt;50% power
                </span>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div className="border-t border-gray-200 pt-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Minimum detectable effects summary */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Minimum Detectable {effectLabel} at {(targetPower * 100).toFixed(0)}% Power:
            </h4>
            <div className="flex flex-wrap gap-3">
              {scenarios.map((scenario) => (
                <div key={scenario.proteinCount} className="text-xs">
                  <span className="text-gray-500">{scenario.proteinCount.toLocaleString()} proteins:</span>{' '}
                  <span className={`font-semibold ${scenario.color.text}`}>
                    {effectSymbol} ≥ {analysisType === 'linear' ? scenario.minEffect.toFixed(3) : scenario.minEffect.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InterpretationSummary;
