import { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathEquationProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
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

/**
 * PowerFormula Component
 *
 * Displays the complete power formula for Cox regression
 * with all variable definitions.
 */
export const PowerFormula: React.FC = () => {
  const mainFormula = String.raw`
    \text{Power} = \Phi\left( \frac{|\log(\text{HR})|}{\sigma} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\log(\text{HR})|}{\sigma} - z_{1-\alpha/2} \right)
  `;

  const definitions = String.raw`
    \begin{aligned}
    \sigma &= \frac{1}{\sqrt{d}} \quad \text{(standard error of } \log(\text{HR}) \text{)} \\[0.5em]
    d &= \text{number of events} \\[0.5em]
    \Phi &= \text{standard normal CDF} \\[0.5em]
    z_{1-\alpha/2} &= \Phi^{-1}(1 - \alpha/2) \quad \text{(critical value)}
    \end{aligned}
  `;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Power Formula (Cox Proportional Hazards)
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-fit">
          <MathEquation
            latex={mainFormula}
            className="text-center mb-6 py-2"
          />

          <div className="border-t border-blue-200 pt-4">
            <p className="text-sm text-gray-600 mb-3 font-medium">Where:</p>
            <MathEquation
              latex={definitions}
              className="text-sm"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 bg-white/50 rounded-lg p-3">
        <strong>Assumption:</strong> Predictor variable (protein level) is standardized with variance = 1,
        which is standard practice in proteomics biostatistics.
      </div>
    </div>
  );
};

/**
 * MinHRFormula Component
 *
 * Displays the formula for minimum detectable hazard ratio.
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
