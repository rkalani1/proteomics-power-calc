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
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls="export-panel-content"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg aria-hidden="true" focusable="false" className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Results
        </h2>
        <svg
          aria-hidden="true"
          focusable="false"
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id="export-panel-content"
        inert={!isExpanded}
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-6 pb-6">
          {feedback && (
            <div
              role="alert"
              className={`mb-4 p-3 rounded-lg flex items-center justify-between text-sm ${
                feedback.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              <span>{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Dismiss message"
                className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                &times;
              </button>
            </div>
          )}
          <div className="export-actions flex flex-wrap gap-3">
            <button
              onClick={downloadCSV}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV
            </button>

            <button
              onClick={downloadJSON}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
            >
              <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Download JSON
            </button>

            <button
              onClick={printSummary}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
            >
              <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>

            <button
              onClick={copyToClipboard}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
            >
              <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
