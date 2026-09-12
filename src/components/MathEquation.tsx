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
export const MathEquation: React.FC<MathEquationProps> = ({
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
          trust: false,
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
    <section className="assay-card overflow-hidden">
      <h2 className="section-title">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls="power-formula-content"
          onClick={() => setIsExpanded(!isExpanded)}
          className="disclosure"
        >
          <span className="flex items-center gap-2.5">
            <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Statistical Formulas ({config.title})
          </span>
          <svg
            aria-hidden="true"
            focusable="false"
            className="disclosure__chevron"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </h2>

      <div
        id="power-formula-content"
        inert={!isExpanded}
        className={`disclosure-body ${
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 pt-5">
          <div className="scroll-region" tabIndex={0} role="region" aria-label="Statistical formulas">
            <div className="min-w-fit">
              {/* Power Formula */}
              <div className="mb-6">
                <p className="mb-2 text-sm font-semibold text-ink">Power formula</p>
                <MathEquation
                  latex={config.mainFormula}
                  className="py-2 text-center"
                />
              </div>

              {/* Minimum Detectable Effect Size */}
              <div className="inset-panel mb-6">
                <p className="mb-2 text-sm font-semibold text-ink">{config.minEffectLabel}</p>
                <MathEquation latex={config.minEffectFormula} className="text-center" />
                <p className="mt-2 text-center text-xs text-ink-soft">
                  where z<sub>β</sub> = Φ<sup>-1</sup>(target power)
                </p>
              </div>

              {/* Variable Definitions */}
              <div className="border-t border-line-soft pt-4">
                <p className="mb-3 text-sm font-semibold text-ink">Where</p>
                <MathEquation
                  latex={definitions}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
