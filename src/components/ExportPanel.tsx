import { useState } from 'react';
import {
  generateCSV,
  generateJSON,
  generatePrintHTML,
  generateTextSummary,
  performCSVDownload,
  performJSONDownload,
  performPrint,
  performCopy,
  type ExportData,
} from '../utils/exportUtils';



/**
 * ExportPanel Component
 *
 * Provides export functionality for power analysis results.
 * Supports CSV export for data and a printable summary.
 */
const ExportPanel: React.FC<ExportData> = (props) => {
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Download CSV
  const downloadCSV = () => {
    setIsExporting(true);
    setFeedback(null);
    try {
      const csv = generateCSV(props);
      const filename = `power-analysis-${new Date().toISOString().split('T')[0]}.csv`;
      performCSVDownload(csv, filename);
    } catch (err) {
      console.error('Failed to download CSV:', err);
      setFeedback({ type: 'error', message: 'Failed to download CSV. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  // Download structured JSON (machine-parseable)
  const downloadJSON = () => {
    setIsExporting(true);
    setFeedback(null);
    try {
      const json = generateJSON(props);
      const filename = `power-analysis-${new Date().toISOString().split('T')[0]}.json`;
      performJSONDownload(json, filename);
    } catch (err) {
      console.error('Failed to download JSON:', err);
      setFeedback({ type: 'error', message: 'Failed to download JSON. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  // Generate printable HTML and open print dialog using Blob URL
  const printSummary = () => {
    setIsExporting(true);
    setFeedback(null);
    try {
      const html = generatePrintHTML(props);
      performPrint(html);
    } catch (err) {
      console.error('Failed to print summary:', err);
      setFeedback({ type: 'error', message: 'Failed to print summary. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  // Copy summary to clipboard
  const copyToClipboard = async () => {
    setIsExporting(true);
    setFeedback(null);
    try {
      const summary = generateTextSummary(props);
      await performCopy(summary);
      setFeedback({ type: 'success', message: 'Summary copied to clipboard!' });
    } catch (err) {
      console.error('Failed to copy:', err);
      setFeedback({ type: 'error', message: 'Failed to copy to clipboard. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="assay-card overflow-hidden">
      <h2 className="section-title">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls="export-panel-content"
          onClick={() => setIsExpanded(!isExpanded)}
          className="disclosure"
        >
          <span className="flex items-center gap-2.5">
            <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Results
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
        id="export-panel-content"
        inert={!isExpanded}
        className={`disclosure-body ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 pt-5">
          <p className="mb-4 text-sm text-ink-soft">
            Save the current scenario results and the power-by-effect table, or copy a plain-text summary for a protocol or email.
          </p>
          {feedback && (
            <div
              role="alert"
              className={`note mb-4 items-center justify-between ${
                feedback.type === 'error' ? 'note--danger' : 'note--good'
              }`}
            >
              <span>{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Dismiss message"
                className="ml-2 text-lg leading-none text-ink-muted hover:text-ink"
              >
                &times;
              </button>
            </div>
          )}
          <div className="export-actions flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadCSV}
              disabled={isExporting}
              className="btn btn-primary"
            >
              <svg aria-hidden="true" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV
            </button>

            <button
              type="button"
              onClick={downloadJSON}
              disabled={isExporting}
              className="btn btn-secondary"
            >
              <svg aria-hidden="true" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Download JSON
            </button>

            <button
              type="button"
              onClick={printSummary}
              disabled={isExporting}
              className="btn btn-secondary"
            >
              <svg aria-hidden="true" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>

            <button
              type="button"
              onClick={copyToClipboard}
              disabled={isExporting}
              className="btn btn-secondary"
            >
              <svg aria-hidden="true" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Summary
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ExportPanel;
