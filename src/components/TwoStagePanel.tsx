import { useMemo } from 'react';
import {
  type AnalysisType,
  type TwoStageResult,
  calculateTwoStagePower,
  findOptimalStage1FDR,
} from '../utils/statistics';

interface TwoStagePanelProps {
  /** Whether two-stage mode is enabled */
  enabled: boolean;
  /** Toggle two-stage mode */
  onToggle: (enabled: boolean) => void;
  /** Analysis type for power calculations */
  analysisType: AnalysisType;
  /** Effect size to detect */
  effectSize: number;
  /** Stage 1 protein count */
  stage1Proteins: number;
  onStage1ProteinsChange: (value: number) => void;
  /** Stage 1 sample size */
  stage1SampleSize: number;
  onStage1SampleSizeChange: (value: number) => void;
  /** Stage 2 sample size */
  stage2SampleSize: number;
  onStage2SampleSizeChange: (value: number) => void;
  /** Stage 1 FDR threshold */
  stage1FDR: number;
  onStage1FDRChange: (value: number) => void;
  /** Stage 2 alpha */
  stage2Alpha: number;
  onStage2AlphaChange: (value: number) => void;
  /** Expected number of true hits */
  expectedHits: number;
  onExpectedHitsChange: (value: number) => void;
  /** Sample overlap proportion */
  sampleOverlap: number;
  onSampleOverlapChange: (value: number) => void;
  /** Additional study params for power calculation */
  studyParams: {
    studyDesign?: 'cohort' | 'case-control' | 'cross-sectional' | 'case-cohort' | 'nested-case-control';
    events?: number;
    residualSD?: number;
    prevalence?: number;
    cases?: number;
    controls?: number;
    clusterSize?: number;
    icc?: number;
  };
}

/**
 * TwoStagePanel Component
 *
 * Allows configuration and display of two-stage design power analysis.
 * Shows Stage 1 discovery, Stage 2 validation, and joint power metrics.
 */
const TwoStagePanel: React.FC<TwoStagePanelProps> = ({
  enabled,
  onToggle,
  analysisType,
  effectSize,
  stage1Proteins,
  onStage1ProteinsChange,
  stage1SampleSize,
  onStage1SampleSizeChange,
  stage2SampleSize,
  onStage2SampleSizeChange,
  stage1FDR,
  onStage1FDRChange,
  stage2Alpha,
  onStage2AlphaChange,
  expectedHits,
  onExpectedHitsChange,
  sampleOverlap,
  onSampleOverlapChange,
  studyParams,
}) => {
  // Calculate two-stage results
  const results: TwoStageResult | null = useMemo(() => {
    if (!enabled) return null;

    return calculateTwoStagePower(
      effectSize,
      analysisType,
      {
        stage1Proteins,
        stage1SampleSize,
        stage2SampleSize,
        stage1FDR,
        stage2Alpha,
        expectedHits,
        sampleOverlap,
      },
      studyParams
    );
  }, [
    enabled,
    effectSize,
    analysisType,
    stage1Proteins,
    stage1SampleSize,
    stage2SampleSize,
    stage1FDR,
    stage2Alpha,
    expectedHits,
    sampleOverlap,
    studyParams,
  ]);

  // Find optimal FDR
  const optimalFDR = useMemo(() => {
    if (!enabled) return null;

    return findOptimalStage1FDR(
      effectSize,
      analysisType,
      {
        stage1Proteins,
        stage1SampleSize,
        stage2SampleSize,
        stage2Alpha,
        expectedHits,
        sampleOverlap,
      },
      studyParams
    );
  }, [
    enabled,
    effectSize,
    analysisType,
    stage1Proteins,
    stage1SampleSize,
    stage2SampleSize,
    stage2Alpha,
    expectedHits,
    sampleOverlap,
    studyParams,
  ]);

  // Power status helper
  const getPowerStatus = (power: number) => {
    if (power >= 0.8) return { color: 'text-green-600', bg: 'bg-green-50', label: 'Adequate' };
    if (power >= 0.5) return { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Marginal' };
    return { color: 'text-red-600', bg: 'bg-red-50', label: 'Low' };
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with Toggle */}
      <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Two-Stage Design</h3>
              <p className="text-sm text-gray-600">Discovery + Validation phases</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
          </label>
        </div>
      </div>

      {enabled && (
        <>
          {/* Configuration Grid */}
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stage 1 Section */}
              <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <h4 className="font-medium text-blue-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Discovery Phase
                </h4>

                <div>
                  <label className="text-xs text-gray-600 font-medium">Proteins Screened</label>
                  <input
                    type="number"
                    value={stage1Proteins}
                    onChange={(e) => onStage1ProteinsChange(Number(e.target.value))}
                    min={10}
                    max={100000}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 font-medium">Sample Size (n₁)</label>
                  <input
                    type="number"
                    value={stage1SampleSize}
                    onChange={(e) => onStage1SampleSizeChange(Number(e.target.value))}
                    min={50}
                    max={100000}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 font-medium flex items-center justify-between">
                    <span>FDR Threshold (q₁)</span>
                    <span className="text-blue-600">{(stage1FDR * 100).toFixed(0)}%</span>
                  </label>
                  <input
                    type="range"
                    value={stage1FDR}
                    onChange={(e) => onStage1FDRChange(Number(e.target.value))}
                    min={0.01}
                    max={0.50}
                    step={0.01}
                    className="w-full mt-1 accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Stringent</span>
                    <span>Liberal</span>
                  </div>
                </div>
              </div>

              {/* Stage 2 Section */}
              <div className="space-y-3 p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                <h4 className="font-medium text-purple-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  Validation Phase
                </h4>

                <div>
                  <label className="text-xs text-gray-600 font-medium">Sample Size (n₂)</label>
                  <input
                    type="number"
                    value={stage2SampleSize}
                    onChange={(e) => onStage2SampleSizeChange(Number(e.target.value))}
                    min={50}
                    max={100000}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-600 font-medium flex items-center justify-between">
                    <span>Alpha (α₂)</span>
                    <span className="text-purple-600">{stage2Alpha}</span>
                  </label>
                  <select
                    value={stage2Alpha}
                    onChange={(e) => onStage2AlphaChange(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value={0.05}>0.05 (Standard)</option>
                    <option value={0.01}>0.01 (Stringent)</option>
                    <option value={0.001}>0.001 (Very Stringent)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600 font-medium flex items-center justify-between">
                    <span>Sample Overlap</span>
                    <span className="text-purple-600">{(sampleOverlap * 100).toFixed(0)}%</span>
                  </label>
                  <input
                    type="range"
                    value={sampleOverlap}
                    onChange={(e) => onSampleOverlapChange(Number(e.target.value))}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full mt-1 accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Independent</span>
                    <span>Full Overlap</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expected Hits */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="text-xs text-gray-600 font-medium flex items-center justify-between">
                <span>Expected True Associations</span>
                <span className="text-gray-700">{expectedHits}</span>
              </label>
              <input
                type="range"
                value={expectedHits}
                onChange={(e) => onExpectedHitsChange(Number(e.target.value))}
                min={1}
                max={100}
                step={1}
                className="w-full mt-1 accent-gray-600"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Estimate of proteins with true effects. Affects expected false discovery rate.
              </p>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-200">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Power Analysis Results
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Stage 1 Power */}
                <div className={`p-3 rounded-lg ${getPowerStatus(results.stage1Power).bg}`}>
                  <div className="text-xs text-gray-500 mb-1">Stage 1 Power</div>
                  <div className={`text-xl font-bold ${getPowerStatus(results.stage1Power).color}`}>
                    {(results.stage1Power * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-gray-500">
                    α₁ = {results.stage1Alpha.toExponential(2)}
                  </div>
                </div>

                {/* Stage 2 Power */}
                <div className={`p-3 rounded-lg ${getPowerStatus(results.stage2Power).bg}`}>
                  <div className="text-xs text-gray-500 mb-1">Stage 2 Power</div>
                  <div className={`text-xl font-bold ${getPowerStatus(results.stage2Power).color}`}>
                    {(results.stage2Power * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-gray-500">
                    α₂ = {results.stage2PerProteinAlpha.toExponential(2)}
                  </div>
                </div>

                {/* Joint Power */}
                <div className={`p-3 rounded-lg ${getPowerStatus(results.jointPower).bg} ring-2 ring-offset-1 ${results.jointPower >= 0.8 ? 'ring-green-300' : results.jointPower >= 0.5 ? 'ring-amber-300' : 'ring-red-300'}`}>
                  <div className="text-xs text-gray-500 mb-1">Joint Power</div>
                  <div className={`text-xl font-bold ${getPowerStatus(results.jointPower).color}`}>
                    {(results.jointPower * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-gray-500">
                    P(Stage 1 ∩ Stage 2)
                  </div>
                </div>

                {/* Expected Advancing */}
                <div className="p-3 rounded-lg bg-slate-100">
                  <div className="text-xs text-gray-500 mb-1">Expected Advancing</div>
                  <div className="text-xl font-bold text-slate-700">
                    {results.expectedAdvancing}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    proteins to Stage 2
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="p-2 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Total Sample Size</span>
                    <span className="font-semibold text-gray-800">{results.totalSampleSize.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Cost Efficiency</span>
                    <span className={`font-semibold ${results.costEfficiency >= 1 ? 'text-green-600' : 'text-amber-600'}`}>
                      {results.costEfficiency.toFixed(2)}×
                    </span>
                  </div>
                </div>
              </div>

              {/* Optimal FDR Suggestion */}
              {optimalFDR && optimalFDR.optimalFDR !== stage1FDR && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-amber-800 font-medium">
                        Optimal Stage 1 FDR: {(optimalFDR.optimalFDR * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-amber-700">
                        Would increase joint power to {(optimalFDR.maxJointPower * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Methodology Note */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            <p>
              <strong>Two-Stage Design:</strong> Screen all proteins in Stage 1 with liberal FDR,
              then validate promising hits in Stage 2 with standard α=0.05.
              Joint power is the probability of detecting a true effect in both stages.
            </p>
            <p className="mt-1 text-gray-400">
              References: Skol AD et al. Nat Genet. 2006;38:209-213 | Satagopan JM, Elston RC. Genet Epidemiol. 2003;25:149-157
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default TwoStagePanel;
