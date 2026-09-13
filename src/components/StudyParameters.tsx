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
    <section className="assay-parameters assay-card assay-card--accent assay-card--padded">
      <h2 className="section-title mb-4">
        <svg aria-hidden="true" focusable="false" className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Study Parameters
      </h2>

      {/* Standardization Assumption Note */}
      <div className="note note--gold mb-6">
        <svg aria-hidden="true" focusable="false" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <strong>Assumption: standardized protein levels</strong>
          All calculations assume protein levels are standardized (mean = 0, variance = 1).
          Effect sizes are interpreted per 1 standard deviation increase in protein level.
        </div>
      </div>

      <div className="parameters-grid">
        {/* Sample Size - shown for models sized by total n. Cox power depends on
            the number of EVENTS, not total n, so the slider is hidden for Cox to
            avoid an inert control (and, in case-cohort, a third size slider that
            does nothing). */}
        {analysisType !== 'cox' && studyDesign !== 'case-control' && studyDesign !== 'nested-case-control' && (
          <Slider
            label={analysisType === 'gee' ? 'Total Observations (n)' : 'Sample Size (n)'}
            value={sampleSize}
            onChange={setSampleSize}
            min={100}
            max={50000}
            step={100}
            description={
              analysisType === 'gee'
                ? 'Total observations across all subjects (subjects × observations each), not the number of participants'
                : 'Total participants in study'
            }
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
            description={
              analysisType === 'poisson'
                ? `${(prevalence * 100).toFixed(0)}% of sample has outcome. Power uses a conservative (naive-Poisson) SE, so power is slightly understated for common outcomes.`
                : `${(prevalence * 100).toFixed(0)}% of sample has outcome`
            }
          />
        )}

        {/* Case-control / Nested case-control: Cases and Controls. Cox nested
            case-control is excluded: its power depends only on the number of
            events (= cases) and the matching ratio, so case/control sliders
            would be inert and would contradict the events input on screen. */}
        {(studyDesign === 'case-control' || studyDesign === 'nested-case-control') && analysisType !== 'cox' && (
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
          <fieldset className="analysis-method-selector">
            <legend className="field-label">Multiple Testing Correction</legend>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Multiple testing correction">
              <button
                type="button"
                aria-pressed={correctionMethod === 'fdr'}
                onClick={() => setCorrectionMethod('fdr')}
                className="option-tile"
              >
                <span className="option-tile__label">FDR (BH)</span>
                <span className="option-tile__meta">False Discovery Rate</span>
              </button>
              <button
                type="button"
                aria-pressed={correctionMethod === 'bonferroni'}
                onClick={() => setCorrectionMethod('bonferroni')}
                className="option-tile"
              >
                <span className="option-tile__label">Bonferroni</span>
                <span className="option-tile__meta">Family-Wise Error Rate</span>
              </button>
            </div>
          </fieldset>
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
