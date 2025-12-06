import { useState, useMemo } from 'react';
import { PowerFormula, MinHRFormula } from './components/MathEquation';
import PowerChart from './components/PowerChart';
import PowerByProteinsChart from './components/PowerByProteinsChart';
import ResultsTable from './components/ResultsTable';
import {
  calculateStandardError,
  calculateEffectiveAlpha,
  calculatePower,
  calculateMinDetectableHR,
  calculateInflation,
  generatePowerCurve,
  generateTableData,
  calculateRequiredEvents,
} from './utils/statistics';

/**
 * Proteome-Wide Cox Power Calculator
 *
 * Interactive web application for power calculations in proteome-wide
 * association studies using Cox proportional hazards models.
 *
 * Compares single-protein tests (α=0.05) with proteome-wide scans
 * using Benjamini-Hochberg FDR correction.
 */
function App() {
  // Input parameters
  const [sampleSize, setSampleSize] = useState(1000);
  const [events, setEvents] = useState(70);
  const [numTests, setNumTests] = useState(3000);
  const [fdrQ, setFdrQ] = useState(0.05);
  const [targetPower, setTargetPower] = useState(0.80);
  const [inputHR, setInputHR] = useState(1.2);

  // Fixed alpha for single-protein test
  const alphaSingle = 0.05;

  // Calculate derived values
  const calculations = useMemo(() => {
    // Effective alpha for multiple testing (BH approximation)
    const alphaMulti = calculateEffectiveAlpha(fdrQ, numTests);

    // Standard error of log(HR)
    const se = calculateStandardError(events);

    // Minimum detectable HRs for target power
    const hrMinSingle = calculateMinDetectableHR(targetPower, events, alphaSingle);
    const hrMinMulti = calculateMinDetectableHR(targetPower, events, alphaMulti);

    // Effect size inflation due to multiple testing
    const inflation = calculateInflation(hrMinSingle, hrMinMulti);

    // Power for user-specified input HR
    const powerAtInputSingle = calculatePower(inputHR, events, alphaSingle);
    const powerAtInputMulti = calculatePower(inputHR, events, alphaMulti);

    // Required events for various scenarios
    const eventsNeededSingle = calculateRequiredEvents(inputHR, targetPower, alphaSingle);
    const eventsNeededMulti = calculateRequiredEvents(inputHR, targetPower, alphaMulti);

    // Generate power curves
    const powerCurveSingle = generatePowerCurve(events, alphaSingle);
    const powerCurveMulti = generatePowerCurve(events, alphaMulti);

    // Generate table data
    const tableData = generateTableData(events, alphaSingle, alphaMulti);

    return {
      alphaMulti,
      se,
      hrMinSingle,
      hrMinMulti,
      inflation,
      powerAtInputSingle,
      powerAtInputMulti,
      eventsNeededSingle,
      eventsNeededMulti,
      powerCurveSingle,
      powerCurveMulti,
      tableData,
    };
  }, [sampleSize, events, numTests, fdrQ, targetPower, inputHR]);

  // Slider component with improved UX
  const Slider = ({
    label,
    value,
    onChange,
    min,
    max,
    step,
    unit = '',
    description = '',
    decimals = 0,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step: number;
    unit?: string;
    description?: string;
    decimals?: number;
  }) => {
    // Handle direct input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        // Clamp value to valid range
        const clampedValue = Math.min(max, Math.max(min, newValue));
        onChange(clampedValue);
      }
    };

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={decimals > 0 ? value.toFixed(decimals) : value}
            onChange={handleInputChange}
            className="w-24 px-2 py-1 text-right text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="relative pt-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="slider-improved w-full h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          />
          {/* Progress fill indicator */}
          <div
            className="absolute top-1 left-0 h-3 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full pointer-events-none"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{decimals > 0 ? min.toFixed(decimals) : min.toLocaleString()}{unit}</span>
          <span>{decimals > 0 ? max.toFixed(decimals) : max.toLocaleString()}{unit}</span>
        </div>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    );
  };

  // Result card component
  const ResultCard = ({
    title,
    value,
    subtitle,
    color = 'indigo',
    icon,
  }: {
    title: string;
    value: string;
    subtitle?: string;
    color?: 'indigo' | 'green' | 'red' | 'amber' | 'purple';
    icon?: React.ReactNode;
  }) => {
    const colorClasses = {
      indigo: 'from-indigo-500 to-indigo-600',
      green: 'from-green-500 to-green-600',
      red: 'from-red-500 to-red-600',
      amber: 'from-amber-500 to-amber-600',
      purple: 'from-purple-500 to-purple-600',
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          {icon && (
            <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white`}>
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600 truncate">{title}</p>
            <p className={`text-xl font-bold bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
              {value}
            </p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Proteome-Wide Cox Power Calculator
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Control Panel */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Study Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Slider
              label="Sample Size (n)"
              value={sampleSize}
              onChange={setSampleSize}
              min={100}
              max={50000}
              step={100}
              description="Total participants in cohort"
            />

            <Slider
              label="Number of Events (d)"
              value={events}
              onChange={setEvents}
              min={10}
              max={1000}
              step={1}
              description="CVD events observed"
            />

            <Slider
              label="Number of Tests (m)"
              value={numTests}
              onChange={setNumTests}
              min={1}
              max={5000}
              step={1}
              description="Proteins/hypotheses tested"
            />

            <Slider
              label="FDR Threshold (q)"
              value={fdrQ}
              onChange={setFdrQ}
              min={0.01}
              max={0.20}
              step={0.01}
              decimals={2}
              description="Benjamini-Hochberg FDR level"
            />

            <Slider
              label="Target Power"
              value={targetPower}
              onChange={setTargetPower}
              min={0.50}
              max={0.99}
              step={0.01}
              decimals={2}
              description={`${(targetPower * 100).toFixed(0)}% probability of detecting true effect`}
            />

            <Slider
              label="Minimal Hazard Ratio"
              value={inputHR}
              onChange={setInputHR}
              min={1.0}
              max={3.0}
              step={0.01}
              decimals={2}
              description="Effect size to evaluate"
            />
          </div>
        </section>

        {/* Key Results Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ResultCard
            title="Min Detectable HR (Single)"
            value={calculations.hrMinSingle.toFixed(2)}
            subtitle={`α = ${alphaSingle}, Power = ${(targetPower * 100).toFixed(0)}%`}
            color="green"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <ResultCard
            title="Min Detectable HR (Multi)"
            value={calculations.hrMinMulti.toFixed(2)}
            subtitle={`α ≈ ${calculations.alphaMulti.toExponential(2)}`}
            color="red"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />

          <ResultCard
            title="Effect Size Inflation"
            value={`~${calculations.inflation.toFixed(1)}%`}
            subtitle="Increase needed for multi-test"
            color="amber"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />

          <ResultCard
            title={`SE(log HR)`}
            value={calculations.se.toFixed(4)}
            subtitle={`Based on ${events} events`}
            color="purple"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />
        </section>

        {/* Power at Input HR */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Power for HR = {inputHR.toFixed(2)}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">Single-Protein Test</span>
                <span className="text-xs text-green-600">α = 0.05</span>
              </div>
              <div className="text-3xl font-bold text-green-700">
                {(calculations.powerAtInputSingle * 100).toFixed(1)}%
              </div>
              <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{ width: `${calculations.powerAtInputSingle * 100}%` }}
                />
              </div>
              <p className="text-xs text-green-600 mt-2">
                {calculations.powerAtInputSingle >= 0.8 ? '✓ Adequately powered' :
                 calculations.powerAtInputSingle >= 0.5 ? '⚠ Marginally powered' : '✗ Underpowered'}
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-800">Proteome-Wide Scan</span>
                <span className="text-xs text-red-600">α ≈ {calculations.alphaMulti.toExponential(2)}</span>
              </div>
              <div className="text-3xl font-bold text-red-700">
                {(calculations.powerAtInputMulti * 100).toFixed(1)}%
              </div>
              <div className="mt-2 h-2 bg-red-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${calculations.powerAtInputMulti * 100}%` }}
                />
              </div>
              <p className="text-xs text-red-600 mt-2">
                {calculations.powerAtInputMulti >= 0.8 ? '✓ Adequately powered' :
                 calculations.powerAtInputMulti >= 0.5 ? '⚠ Marginally powered' : '✗ Underpowered'}
              </p>
            </div>
          </div>

          {/* Min HR Formula */}
          <div className="mt-6">
            <MinHRFormula />
          </div>

          {/* Events needed */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Events Required to Achieve {(targetPower * 100).toFixed(0)}% Power at HR = {inputHR.toFixed(2)}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {calculations.eventsNeededSingle === Infinity ? '∞' : calculations.eventsNeededSingle.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Single-protein test</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {calculations.eventsNeededMulti === Infinity ? '∞' : calculations.eventsNeededMulti.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Proteome-wide scan</p>
              </div>
            </div>
          </div>
        </section>

        {/* Power Chart */}
        <PowerChart
          dataSingle={calculations.powerCurveSingle}
          dataMulti={calculations.powerCurveMulti}
          targetPower={targetPower}
          inputHR={inputHR}
          alphaSingle={alphaSingle}
          alphaMulti={calculations.alphaMulti}
        />

        {/* Results Table */}
        <ResultsTable
          data={calculations.tableData}
          alphaSingle={alphaSingle}
          alphaMulti={calculations.alphaMulti}
        />

        {/* Power by Number of Proteins */}
        <PowerByProteinsChart
          events={events}
          fdrQ={fdrQ}
          targetPower={targetPower}
        />

        {/* Power Formula Display - at the very bottom */}
        <PowerFormula />
      </main>
    </div>
  );
}

export default App;
