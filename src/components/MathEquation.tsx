import { useEffect, useRef, useState } from 'react';
import katex from 'katex';

type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';

interface MathEquationProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

interface PowerFormulaProps {
  analysisType?: AnalysisType;
}

/**
 * MathEquation Component
 *
 * Renders LaTeX mathematical equations using KaTeX.
 * This component displays the power formula in textbook-style notation.
 */
const MathEquation: React.FC<MathEquationProps> = ({
  latex,
  displayMode = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(latex, containerRef.current, {
          displayMode,
          throwOnError: false,
          strict: false,
          trust: true,
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        containerRef.current.textContent = latex;
      }
    }
  }, [latex, displayMode]);

  return <div ref={containerRef} className={className} />;
};

// Model-specific formula configurations
const FORMULA_CONFIGS: Record<AnalysisType, {
  title: string;
  mainFormula: string;
  minEffectFormula: string;
  minEffectLabel: string;
  definitions: string;
}> = {
  cox: {
    title: 'Cox Proportional Hazards',
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\log(\text{HR})|}{\sigma} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\log(\text{HR})|}{\sigma} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\text{HR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)`,
    minEffectLabel: 'Minimum Detectable Hazard Ratio',
    definitions: String.raw`\begin{aligned}
    \sigma &= \frac{1}{\sqrt{d}} \quad \text{(standard error of } \log(\text{HR}) \text{)} \\[0.5em]
    d &= \text{number of events} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)} \\[0.5em]
    z_{1-\alpha/2} &= \Phi^{-1}(1 - \alpha/2) \quad \text{(critical value)}
    \end{aligned}`,
  },
  linear: {
    title: 'Linear Regression',
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\beta_{\min} = (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma_\beta`,
    minEffectLabel: 'Minimum Detectable Beta',
    definitions: String.raw`\begin{aligned}
    \sigma_\beta &= \frac{\sigma_{\text{residual}}}{\sqrt{n-2}} \quad \text{(standard error of } \beta \text{)} \\[0.5em]
    n &= \text{sample size} \\[0.5em]
    \sigma_{\text{residual}} &= \text{residual standard deviation} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)}
    \end{aligned}`,
  },
  logistic: {
    title: 'Logistic Regression',
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\log(\text{OR})|}{\sigma} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\log(\text{OR})|}{\sigma} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\text{OR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)`,
    minEffectLabel: 'Minimum Detectable Odds Ratio',
    definitions: String.raw`\begin{aligned}
    \sigma &= \frac{1}{\sqrt{n \cdot p \cdot (1-p)}} \quad \text{(Hsieh's formula)} \\[0.5em]
    n &= \text{sample size} \\[0.5em]
    p &= \text{outcome prevalence} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)}
    \end{aligned}`,
  },
  poisson: {
    title: 'Modified Poisson Regression',
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\log(\text{RR})|}{\sigma} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\log(\text{RR})|}{\sigma} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\text{RR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)`,
    minEffectLabel: 'Minimum Detectable Relative Risk',
    definitions: String.raw`\begin{aligned}
    \sigma &= \sqrt{\frac{1}{n \cdot p}} \quad \text{(robust variance)} \\[0.5em]
    n &= \text{sample size} \\[0.5em]
    p &= \text{outcome prevalence} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)}
    \end{aligned}`,
  },
  gee: {
    title: 'GEE/Mixed Effects Model',
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\beta_{\min} = (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma_\beta`,
    minEffectLabel: 'Minimum Detectable Beta',
    definitions: String.raw`\begin{aligned}
    \sigma_\beta &= \frac{\sigma_{\text{residual}} \cdot \sqrt{\text{DE}}}{\sqrt{n-2}} \quad \text{(clustering-adjusted SE)} \\[0.5em]
    \text{DE} &= 1 + (m-1) \cdot \text{ICC} \quad \text{(design effect)} \\[0.5em]
    m &= \text{cluster size (observations per subject)} \\[0.5em]
    \text{ICC} &= \text{intraclass correlation coefficient} \\[0.5em]
    n_{\text{eff}} &= \frac{n}{\text{DE}} \quad \text{(effective sample size)} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)}
    \end{aligned}`,
  },
};

/**
 * PowerFormula Component
 *
 * Displays the complete power formula for the selected regression model
 * with all variable definitions, plus the minimum detectable effect size formula.
 * Now collapsible with a dropdown toggle.
 */
export const PowerFormula: React.FC<PowerFormulaProps> = ({
  analysisType = 'cox',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = FORMULA_CONFIGS[analysisType];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-blue-100/50 transition-colors"
      >
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Statistical Formulas ({config.title})
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-6 pb-6">
          <div className="overflow-x-auto">
            <div className="min-w-fit">
              {/* Power Formula */}
              <div className="mb-6">
                <p className="text-sm text-gray-700 mb-2 font-medium">Power Formula:</p>
                <MathEquation
                  latex={config.mainFormula}
                  className="text-center py-2"
                />
              </div>

              {/* Minimum Detectable Effect Size */}
              <div className="mb-6 bg-amber-50/50 rounded-lg p-4 border border-amber-100">
                <p className="text-sm text-gray-700 mb-2 font-medium">{config.minEffectLabel}:</p>
                <MathEquation latex={config.minEffectFormula} className="text-center" />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  where z<sub>β</sub> = Φ<sup>-1</sup>(target power)
                </p>
              </div>

              {/* Variable Definitions */}
              <div className="border-t border-blue-200 pt-4">
                <p className="text-sm text-gray-600 mb-3 font-medium">Where:</p>
                <MathEquation
                  latex={config.definitions}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * MinHRFormula Component
 *
 * Displays the formula for minimum detectable hazard ratio.
 * @deprecated Use PowerFormula which now includes this formula
 */
export const MinHRFormula: React.FC = () => {
  const formula = String.raw`
    \text{HR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)
  `;

  return (
    <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100">
      <p className="text-sm text-gray-700 mb-2 font-medium">Minimum Detectable Effect Size:</p>
      <MathEquation latex={formula} className="text-sm" />
      <p className="text-xs text-gray-500 mt-2">
        where z<sub>β</sub> = Φ<sup>-1</sup>(target power)
      </p>
    </div>
  );
};

export default MathEquation;
