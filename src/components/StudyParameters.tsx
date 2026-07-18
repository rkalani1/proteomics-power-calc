import React from 'react';
import { calculateDesignEffect } from '../utils/statistics';
import type { AnalysisType, StudyDesign } from '../utils/statistics';
import { Slider } from './Slider';

interface EffectConfig {
  label: string;
  symbol: string;
  min: number;
  max: number;
  default: number;
  step: number;
  inputLabel: string;
  inputDescription: string;
}

interface StudyParametersProps {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  sampleSize: number;
  setSampleSize: (v: number) => void;
  events: number;
  setEvents: (v: number) => void;
  subcohortSize: number;
  setSubcohortSize: (v: number) => void;
  totalCohort: number;
  setTotalCohort: (v: number) => void;
  matchingRatio: number;
  setMatchingRatio: (v: number) => void;
  residualSD: number;
  setResidualSD: (v: number) => void;
  prevalence: number;
  setPrevalence: (v: number) => void;
  numCases: number;
  setNumCases: (v: number) => void;
  numControls: number;
  setNumControls: (v: number) => void;
  clusterSize: number;
  setClusterSize: (v: number) => void;
  icc: number;
  setICC: (v: number) => void;
  covariateR2: number;
  setCovariateR2: (v: number) => void;
  correctionMethod: 'fdr' | 'bonferroni';
  setCorrectionMethod: (method: 'fdr' | 'bonferroni') => void;
  fdrQ: number;
  setFdrQ: (v: number) => void;
  targetPower: number;
  setTargetPower: (v: number) => void;
  effectSize: number;
  setEffectSize: (v: number) => void;
  effectConfig: EffectConfig;
  effectDecimals: number;
}

export const StudyParameters: React.FC<StudyParametersProps> = ({
  analysisType,
  studyDesign,
  sampleSize,
  setSampleSize,
  events,
  setEvents,
  subcohortSize,
  setSubcohortSize,
  totalCohort,
  setTotalCohort,
  matchingRatio,
  setMatchingRatio,
  residualSD,
  setResidualSD,
  prevalence,
  setPrevalence,
  numCases,
  setNumCases,
  numControls,
  setNumControls,
  clusterSize,
  setClusterSize,
  icc,
  setICC,
  covariateR2,
  setCovariateR2,
  correctionMethod,
  setCorrectionMethod,
  fdrQ,
  setFdrQ,
  targetPower,
  setTargetPower,
  effectSize,
  setEffectSize,
  effectConfig,
  effectDecimals,
}) => {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Study Parameters
      </h2>

      {/* Standardization Assumption Note */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Assumption: Standardized Protein Levels</p>
            <p className="text-xs text-amber-700 mt-1">
              All calculations assume protein levels are <strong>standardized</strong> (mean = 0, variance = 1).
              Effect sizes are interpreted per 1 standard deviation increase in protein level.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Sample Size - shown for models sized by total n. Cox power depends on
            the number of EVENTS, not total n, so the slider is hidden for Cox to
            avoid an inert control (and, in case-cohort, a third size slider that
            does nothing). */}
        {analysisType !== 'cox' && studyDesign !== 'case-control' && studyDesign !== 'nested-case-control' && (
          <Slider
            label="Sample Size (n)"
            value={sampleSize}
            onChange={setSampleSize}
            min={100}
            max={50000}
            step={100}
            description="Total participants in study"
          />
        )}

        {/* Cox-specific: Number of Events */}
        {analysisType === 'cox' && (
          <Slider
            label="Number of Events (d)"
            value={events}
            onChange={setEvents}
            min={10}
            max={1000}
            step={1}
            description="Outcome events observed"
          />
        )}

        {/* Case-cohort: Subcohort size and Total cohort */}
        {analysisType === 'cox' && studyDesign === 'case-cohort' && (
          <>
            <Slider
              label="Subcohort Size"
              value={subcohortSize}
              onChange={setSubcohortSize}
              min={100}
              max={5000}
              step={50}
              description={
                subcohortSize >= totalCohort
                  ? '⚠ Subcohort ≥ total cohort — treated as a full cohort (no variance inflation)'
                  : 'Random sample from full cohort'
              }
            />
            <Slider
              label="Total Cohort Size"
              value={totalCohort}
              onChange={setTotalCohort}
              min={1000}
              max={100000}
              step={500}
              description="Full cohort before sampling"
            />
          </>
        )}

        {/* Nested case-control: Matching ratio */}
        {studyDesign === 'nested-case-control' && analysisType === 'cox' && (
          <Slider
            label="Matching Ratio (Controls per Case)"
            value={matchingRatio}
            onChange={setMatchingRatio}
            min={1}
            max={10}
            step={1}
            description={`${matchingRatio}:1 matching (${events} cases × ${matchingRatio} controls)`}
          />
        )}

        {/* Linear regression: Residual SD */}
        {analysisType === 'linear' && (
          <Slider
            label="Residual SD"
            value={residualSD}
            onChange={setResidualSD}
            min={0.1}
            max={5.0}
            step={0.1}
            decimals={1}
            description="Standard deviation of residuals"
          />
        )}

        {/* Logistic/Poisson: Prevalence (for cohort/cross-sectional designs) */}
        {(analysisType === 'logistic' || analysisType === 'poisson') &&
         studyDesign !== 'case-control' && studyDesign !== 'nested-case-control' && (
          <Slider
            label="Outcome Prevalence"
            value={prevalence}
            onChange={setPrevalence}
            min={0.01}
            max={0.50}
            step={0.01}
            decimals={2}
            description={`${(prevalence * 100).toFixed(0)}% of sample has outcome`}
          />
        )}

        {/* Case-control / Nested case-control: Cases and Controls */}
        {(studyDesign === 'case-control' || studyDesign === 'nested-case-control') && (
          <>
            <Slider
              label="Number of Cases"
              value={numCases}
              onChange={setNumCases}
              min={50}
              max={5000}
              step={10}
              description="Participants with outcome"
            />
            <Slider
              label="Number of Controls"
              value={numControls}
              onChange={setNumControls}
              min={50}
              max={10000}
              step={10}
              description="Participants without outcome"
            />
          </>
        )}

        {/* GEE/Mixed Effects: Cluster size and ICC */}
        {analysisType === 'gee' && (
          <>
            <Slider
              label="Cluster Size (m)"
              value={clusterSize}
              onChange={setClusterSize}
              min={2}
              max={50}
              step={1}
              description={`Observations per cluster/subject (design effect DE = ${calculateDesignEffect(clusterSize, icc).toFixed(2)})`}
            />
            <Slider
              label="Intraclass Correlation (ICC)"
              value={icc}
              onChange={setICC}
              min={0.00}
              max={0.50}
              step={0.01}
              decimals={2}
              description="Correlation between observations in same cluster"
            />
            <Slider
              label="Residual SD"
              value={residualSD}
              onChange={setResidualSD}
              min={0.1}
              max={5.0}
              step={0.1}
              decimals={1}
              description="Standard deviation of residuals"
            />
          </>
        )}

        {/* Covariate Adjustment R² - applies to all models */}
        <Slider
          label="Covariate R² (protein ~ covariates)"
          value={covariateR2}
          onChange={setCovariateR2}
          min={0.00}
          max={0.80}
          step={0.01}
          decimals={2}
          description={`Variance of the protein (predictor) explained by adjustment covariates (${(covariateR2 * 100).toFixed(0)}%). Higher values inflate the SE by 1/√(1−R²ₓ) and therefore reduce power.`}
        />

        {/* Multiple Testing Correction */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Multiple Testing Correction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={correctionMethod === 'fdr'}
                onClick={() => setCorrectionMethod('fdr')}
                className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                  correctionMethod === 'fdr'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-sm">FDR (BH)</div>
                <div className="text-xs text-gray-500">False Discovery Rate</div>
              </button>
              <button
                type="button"
                aria-pressed={correctionMethod === 'bonferroni'}
                onClick={() => setCorrectionMethod('bonferroni')}
                className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                  correctionMethod === 'bonferroni'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-sm">Bonferroni</div>
                <div className="text-xs text-gray-500">Family-Wise Error Rate</div>
              </button>
            </div>
          </div>
          <Slider
            label={correctionMethod === 'fdr' ? 'FDR Threshold (q)' : 'FWER Alpha (α)'}
            value={fdrQ}
            onChange={setFdrQ}
            min={0.01}
            max={0.20}
            step={0.01}
            decimals={2}
            description={
              correctionMethod === 'fdr'
                ? 'Benjamini-Hochberg: power uses a conservative per-test α ≈ q/m (same as Bonferroni here; true BH power is typically higher)'
                : 'Bonferroni: controls the probability of any false positive (α/m per test)'
            }
          />
        </div>

        {/* Target Power */}
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

        {/* Dynamic Effect Size Slider */}
        <Slider
          label={effectConfig.inputLabel}
          value={effectSize}
          onChange={setEffectSize}
          min={effectConfig.min}
          max={effectConfig.max}
          step={effectConfig.step}
          decimals={effectDecimals}
          description={effectConfig.inputDescription}
        />
      </div>
    </section>
  );
};
