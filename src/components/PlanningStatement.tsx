import { useEffect, useMemo, useRef, useState } from 'react';
import { performCopy } from '../utils/exportUtils';
import { generateMethodsStatement, type MethodsStatementInput } from '../utils/methodsStatement';

// Feedback remembers the statement it was issued for, so it disappears on its
// own once the inputs (and therefore the paragraph) change.
type Feedback = { kind: 'success' | 'error'; message: string; forStatement: string } | null;

/**
 * PlanningStatement
 *
 * A protocol-ready methods paragraph composed from the current inputs and the
 * headline results, with a one-click copy. Intended for grant applications,
 * protocols, and statistical analysis plans.
 */
const PlanningStatement: React.FC<MethodsStatementInput> = (props) => {
  const statement = useMemo(() => generateMethodsStatement(props), [props]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const feedbackTimer = useRef<number | null>(null);
  const visibleFeedback = feedback && feedback.forStatement === statement ? feedback : null;

  // Cancel a pending auto-dismiss on unmount.
  useEffect(() => () => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
  }, []);

  const copyStatement = async () => {
    try {
      await performCopy(statement);
      setFeedback({ kind: 'success', message: 'Statement copied to the clipboard.', forStatement: statement });
    } catch {
      setFeedback({ kind: 'error', message: 'Could not copy automatically. Select the text and copy it manually.', forStatement: statement });
    }
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <section className="assay-card assay-card--padded planning-statement">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-kicker">Protocol text</p>
          <h2 className="section-title mt-1">
            <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h7l5 5v11a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" />
            </svg>
            Planning statement
          </h2>
          <p className="section-subtitle">
            A methods paragraph composed from the current inputs and results. Edit it to fit the protocol or application.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={copyStatement}>
          <svg aria-hidden="true" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
          </svg>
          Copy statement
        </button>
      </div>

      <blockquote className="planning-statement__text">{statement}</blockquote>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-relaxed text-ink-muted">
          Cited works are listed under Methodology &amp; References. Values update as the inputs change.
        </p>
        <p
          role="status"
          aria-live="polite"
          className={`min-h-4 text-xs font-semibold ${visibleFeedback?.kind === 'error' ? 'text-danger-800' : 'text-good-800'}`}
        >
          {visibleFeedback?.message ?? ''}
        </p>
      </div>
    </section>
  );
};

export default PlanningStatement;
