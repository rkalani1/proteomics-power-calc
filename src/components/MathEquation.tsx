import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { FORMULA_CONFIGS, definitionsFor } from '../constants/formulas';

type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';
type StudyDesign = 'cohort' | 'case-control' | 'cross-sectional' | 'case-cohort' | 'nested-case-control';

interface MathEquationProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

interface PowerFormulaProps {
  analysisType?: AnalysisType;
  studyDesign?: StudyDesign;
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
 * Displays the complete power formula for the selected regression model
 * with all variable definitions, plus the minimum detectable effect size formula.
 * The standard error reflects the selected study design. Collapsible.
 */
export const PowerFormula: React.FC<PowerFormulaProps> = ({
  analysisType = 'cox',
  studyDesign = 'cohort',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = FORMULA_CONFIGS[analysisType];
  // The σ definition is design-dependent for Cox (case-cohort, nested) and
  // logistic (case-control, nested); other models are unaffected by design.
  const definitions = definitionsFor(analysisType, studyDesign);

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
                  latex={definitions}
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
