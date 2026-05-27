/**
 * Scientific Tooltips for Epidemiologists and Biostatisticians
 *
 * These tooltips provide detailed explanations of statistical concepts
 * and parameters used in proteomics power calculations.
 */

import type { ReactNode } from 'react';

type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';
type StudyDesign = 'cohort' | 'case-control' | 'cross-sectional' | 'case-cohort' | 'nested-case-control';

// Analysis type tooltips
export const ANALYSIS_TYPE_TOOLTIPS: Record<AnalysisType, ReactNode> = {
  cox: (
    <div className="space-y-1">
      <p className="font-semibold">Cox Proportional Hazards Model</p>
      <p>Semi-parametric survival model for time-to-event outcomes. Estimates hazard ratios (HR) comparing instantaneous event rates.</p>
      <p className="text-gray-300 text-[10px]">Reference: Cox DR. J R Stat Soc B. 1972;34:187-220.</p>
      <p className="mt-1"><strong>Power based on:</strong> Schoenfeld's formula using expected number of events (d), not total sample size.</p>
      <p><strong>Assumption:</strong> Proportional hazards (constant HR over time).</p>
    </div>
  ),
  linear: (
    <div className="space-y-1">
      <p className="font-semibold">Linear Regression</p>
      <p>Models continuous outcomes as a linear function of predictors. Estimates standardized regression coefficients (β).</p>
      <p className="mt-1"><strong>Effect size (β):</strong> Change in outcome (in SD units) per 1-SD increase in protein level.</p>
      <p><strong>Power based on:</strong> t-test for regression coefficient with (n-2) degrees of freedom.</p>
      <p><strong>Assumption:</strong> Normality of residuals, homoscedasticity.</p>
    </div>
  ),
  logistic: (
    <div className="space-y-1">
      <p className="font-semibold">Logistic Regression</p>
      <p>Models binary outcomes via log-odds. Estimates odds ratios (OR) for predictor-outcome association.</p>
      <p className="text-gray-300 text-[10px]">Reference: Hsieh FY et al. Stat Med. 1998;17:1623-34.</p>
      <p className="mt-1"><strong>Power based on:</strong> Wald test; SE derived from Fisher information.</p>
      <p><strong>Note:</strong> OR ≈ RR only when outcome is rare (&lt;10%). Use Modified Poisson for common outcomes.</p>
    </div>
  ),
  poisson: (
    <div className="space-y-1">
      <p className="font-semibold">Modified Poisson Regression</p>
      <p>Log-linear model with robust variance for binary outcomes. Directly estimates relative risk (RR).</p>
      <p className="text-gray-300 text-[10px]">Reference: Zou G. Am J Epidemiol. 2004;159:702-6.</p>
      <p className="mt-1"><strong>When to use:</strong> Outcome prevalence &gt;10%, or when RR interpretation is preferred over OR.</p>
      <p><strong>Power based on:</strong> Wald test with robust (sandwich) variance estimator.</p>
    </div>
  ),
  gee: (
    <div className="space-y-1">
      <p className="font-semibold">GEE/Mixed Effects Model</p>
      <p>Generalized Estimating Equations for clustered or longitudinal data. Accounts for within-cluster correlation.</p>
      <p className="text-gray-300 text-[10px]">Reference: Liang KY, Zeger SL. Biometrika. 1986;73:13-22.</p>
      <p className="mt-1"><strong>Design Effect:</strong> DE = 1 + (m-1)×ICC, inflates variance proportionally to cluster size and correlation.</p>
      <p><strong>Key parameter:</strong> ICC (intraclass correlation) represents correlation between observations in same cluster.</p>
    </div>
  ),
};

// Study design tooltips
export const STUDY_DESIGN_TOOLTIPS: Record<StudyDesign, ReactNode> = {
  cohort: (
    <div className="space-y-1">
      <p className="font-semibold">Cohort Study</p>
      <p>Prospective or retrospective follow-up design where participants are classified by exposure and followed for outcomes.</p>
      <p className="mt-1"><strong>Strengths:</strong> Can calculate incidence rates, temporal sequence established.</p>
      <p><strong>For proteomics:</strong> Baseline protein levels predict future disease risk.</p>
    </div>
  ),
  'case-control': (
    <div className="space-y-1">
      <p className="font-semibold">Case-Control Study</p>
      <p>Participants selected based on outcome status. Compares exposure (protein levels) between cases and controls.</p>
      <p className="mt-1"><strong>SE formula:</strong> √(1/n₁ + 1/n₀) where n₁=cases, n₀=controls.</p>
      <p><strong>Note:</strong> Cannot directly estimate prevalence or incidence. OR is the estimable effect measure.</p>
    </div>
  ),
  'cross-sectional': (
    <div className="space-y-1">
      <p className="font-semibold">Cross-Sectional Study</p>
      <p>Exposure and outcome measured simultaneously. Prevalence-based analysis.</p>
      <p className="mt-1"><strong>Limitation:</strong> Cannot establish temporal sequence; associations may reflect reverse causation.</p>
      <p><strong>For proteomics:</strong> Useful for biomarker discovery, but causal inference limited.</p>
    </div>
  ),
  'case-cohort': (
    <div className="space-y-1">
      <p className="font-semibold">Case-Cohort Design</p>
      <p>All cases + random subcohort from full cohort. Efficient for expensive biomarker measurements.</p>
      <p className="text-gray-300 text-[10px]">Reference: Prentice RL. Biometrika. 1986;73:1-11.</p>
      <p className="mt-1"><strong>Variance inflation:</strong> Factor of √(1 + (1-f)/f) where f = subcohort fraction.</p>
      <p><strong>Analysis:</strong> Weighted Cox regression with Barlow or Self-Prentice weights.</p>
    </div>
  ),
  'nested-case-control': (
    <div className="space-y-1">
      <p className="font-semibold">Nested Case-Control</p>
      <p>Cases matched to controls from the risk set at time of case occurrence. Preserves cohort sampling frame.</p>
      <p className="text-gray-300 text-[10px]">Reference: Dupont WD. Biometrics. 1988;44:1157-68.</p>
      <p className="mt-1"><strong>Variance inflation:</strong> Factor of √(1 + 1/m) where m = matching ratio.</p>
      <p><strong>Analysis:</strong> Conditional logistic regression or stratified Cox model.</p>
    </div>
  ),
};

// Parameter tooltips
export const PARAMETER_TOOLTIPS = {
  sampleSize: (
    <div className="space-y-1">
      <p className="font-semibold">Sample Size (n)</p>
      <p>Total number of participants in the study. For power calculations, this affects the standard error of effect estimates.</p>
      <p className="mt-1"><strong>Rule of thumb:</strong> Power increases with √n; doubling sample size increases precision by ~40%.</p>
    </div>
  ),
  events: (
    <div className="space-y-1">
      <p className="font-semibold">Number of Events (d)</p>
      <p>Total observed outcome events (e.g., deaths, disease diagnoses). This is the key driver of power in survival analysis.</p>
      <p className="mt-1"><strong>Schoenfeld formula:</strong> SE(log HR) ≈ 1/√d for a standardized predictor.</p>
      <p><strong>Important:</strong> Power depends on events, not total sample size. A study with n=10,000 but d=50 events has less power than n=500 with d=100 events.</p>
    </div>
  ),
  fdrQ: (
    <div className="space-y-1">
      <p className="font-semibold">FDR Threshold (q)</p>
      <p>Benjamini-Hochberg false discovery rate level. Controls expected proportion of false positives among discoveries.</p>
      <p className="text-gray-300 text-[10px]">Reference: Benjamini Y, Hochberg Y. J R Stat Soc B. 1995;57:289-300.</p>
      <p className="mt-1"><strong>Interpretation:</strong> At q=0.05, expect ≤5% of significant findings to be false positives.</p>
      <p><strong>Effective α:</strong> Approximately q/m for m independent tests when all nulls are true.</p>
    </div>
  ),
  targetPower: (
    <div className="space-y-1">
      <p className="font-semibold">Target Power (1-β)</p>
      <p>Probability of detecting a true effect of the specified magnitude. Convention: 80% minimum, 90% preferred.</p>
      <p className="mt-1"><strong>Type II error (β):</strong> Probability of false negative. Power = 1-β.</p>
      <p><strong>Trade-off:</strong> Higher power requires larger sample size or detectable only larger effects.</p>
    </div>
  ),
  prevalence: (
    <div className="space-y-1">
      <p className="font-semibold">Outcome Prevalence</p>
      <p>Proportion of sample with the outcome of interest. Affects information content and variance of effect estimates.</p>
      <p className="mt-1"><strong>For logistic/Poisson:</strong> SE ∝ 1/√(n·p·(1-p)). Maximum information at p=0.5.</p>
      <p><strong>Rare outcomes:</strong> Require larger samples; consider case-control design for efficiency.</p>
    </div>
  ),
  residualSD: (
    <div className="space-y-1">
      <p className="font-semibold">Residual Standard Deviation</p>
      <p>SD of the outcome after accounting for predictor effects. Reflects unexplained outcome variability.</p>
      <p className="mt-1"><strong>Estimation:</strong> From pilot data or similar studies. Related to R² as σ_res = σ_y·√(1-R²).</p>
      <p><strong>Impact:</strong> Larger residual SD → wider confidence intervals → lower power.</p>
    </div>
  ),
  subcohortSize: (
    <div className="space-y-1">
      <p className="font-semibold">Subcohort Size</p>
      <p>Random sample from full cohort for case-cohort design. All subcohort members have protein measurements.</p>
      <p className="mt-1"><strong>Efficiency:</strong> Larger subcohort → more precision but higher cost.</p>
      <p><strong>Typical:</strong> 5-20% of full cohort, balancing precision with cost.</p>
    </div>
  ),
  matchingRatio: (
    <div className="space-y-1">
      <p className="font-semibold">Matching Ratio (m:1)</p>
      <p>Number of controls matched to each case in nested case-control design.</p>
      <p className="mt-1"><strong>Efficiency:</strong> Gains diminish beyond 4:1 matching. 1:1 captures ~50% of cohort information; 4:1 captures ~80%.</p>
      <p><strong>Variance factor:</strong> √(1 + 1/m) relative to full cohort analysis.</p>
    </div>
  ),
  proteinCount: (
    <div className="space-y-1">
      <p className="font-semibold">Number of Proteins Tested</p>
      <p>Total proteins in the analysis panel. Determines multiple testing burden.</p>
      <p className="mt-1"><strong>Common platforms:</strong></p>
      <ul className="text-[10px] ml-2">
        <li>• Targeted panel: 10-100 proteins</li>
        <li>• Olink Explore 3072: ~3,000 proteins</li>
        <li>• SomaScan 7K: ~7,000 proteins</li>
        <li>• Mass spec discovery: 5,000-10,000 proteins</li>
      </ul>
    </div>
  ),
};

// Effect size tooltips by analysis type
export const EFFECT_SIZE_TOOLTIPS: Record<AnalysisType, ReactNode> = {
  cox: (
    <div className="space-y-1">
      <p className="font-semibold">Hazard Ratio (HR)</p>
      <p>Ratio of instantaneous event rates. HR=1.2 means 20% higher hazard per 1-SD increase in protein level.</p>
      <p className="mt-1"><strong>Interpretation:</strong></p>
      <ul className="text-[10px] ml-2">
        <li>• HR 1.1-1.2: Small effect</li>
        <li>• HR 1.3-1.5: Moderate effect</li>
        <li>• HR &gt;1.5: Large effect</li>
      </ul>
      <p><strong>Note:</strong> Enter the smallest HR you want to reliably detect (minimum clinically meaningful effect).</p>
    </div>
  ),
  linear: (
    <div className="space-y-1">
      <p className="font-semibold">Standardized Beta (β)</p>
      <p>Regression coefficient for standardized predictor and outcome. Effect size in SD units.</p>
      <p className="mt-1"><strong>Cohen's conventions:</strong></p>
      <ul className="text-[10px] ml-2">
        <li>• β ≈ 0.1: Small effect</li>
        <li>• β ≈ 0.3: Medium effect</li>
        <li>• β ≈ 0.5: Large effect</li>
      </ul>
      <p><strong>Note:</strong> For proteomics, β=0.1-0.2 is typical for individual protein associations.</p>
    </div>
  ),
  logistic: (
    <div className="space-y-1">
      <p className="font-semibold">Odds Ratio (OR)</p>
      <p>Ratio of odds of outcome. OR=1.3 means 30% higher odds per 1-SD increase in protein level.</p>
      <p className="mt-1"><strong>Interpretation:</strong></p>
      <ul className="text-[10px] ml-2">
        <li>• OR 1.2-1.4: Small effect</li>
        <li>• OR 1.5-2.0: Moderate effect</li>
        <li>• OR &gt;2.0: Large effect</li>
      </ul>
      <p><strong>Note:</strong> OR ≈ RR only when outcome prevalence &lt;10%.</p>
    </div>
  ),
  poisson: (
    <div className="space-y-1">
      <p className="font-semibold">Relative Risk (RR)</p>
      <p>Ratio of outcome probabilities. RR=1.2 means 20% higher risk per 1-SD increase in protein level.</p>
      <p className="mt-1"><strong>Advantage over OR:</strong> Direct probability interpretation; doesn't inflate with common outcomes.</p>
      <p><strong>When to use:</strong> Preferred when prevalence &gt;10% and RR interpretation is desired.</p>
    </div>
  ),
  gee: (
    <div className="space-y-1">
      <p className="font-semibold">Standardized Beta (β) with Clustering</p>
      <p>Regression coefficient adjusted for within-cluster correlation via design effect.</p>
      <p className="mt-1"><strong>Interpretation:</strong> Same as linear regression β, but accounts for clustering.</p>
      <p><strong>Design Effect:</strong> DE = 1 + (m-1)×ICC inflates the required sample size.</p>
      <p><strong>Typical ICC:</strong> 0.01-0.05 (low), 0.05-0.15 (moderate), &gt;0.15 (high).</p>
    </div>
  ),
};

// Standard error tooltip
export const SE_TOOLTIP = (analysisType: AnalysisType, effectSymbol: string): ReactNode => (
  <div className="space-y-1">
    <p className="font-semibold">Standard Error of {analysisType === 'linear' ? 'β' : `log(${effectSymbol})`}</p>
    <p>Precision of the effect estimate. Smaller SE → narrower CI → more power.</p>
    <p className="mt-1"><strong>Formula varies by design:</strong></p>
    {analysisType === 'cox' && (
      <p className="text-[10px]">Cohort: SE = 1/√d | Case-cohort: includes variance inflation</p>
    )}
    {analysisType === 'linear' && (
      <p className="text-[10px]">SE = σ_residual / √(n-2)</p>
    )}
    {analysisType === 'logistic' && (
      <p className="text-[10px]">Cohort: SE = 1/√(n·p·(1-p)) | Case-control: SE = √(1/n₁ + 1/n₀)</p>
    )}
    {analysisType === 'poisson' && (
      <p className="text-[10px]">SE = √(1/(n·p)) with robust variance</p>
    )}
  </div>
);

// Effect size inflation tooltip
export const INFLATION_TOOLTIP = (
  <div className="space-y-1">
    <p className="font-semibold">Effect Size Inflation</p>
    <p>Percentage increase in minimum detectable effect when moving from fewer to more proteins tested.</p>
    <p className="mt-1"><strong>Interpretation:</strong> With proteome-wide testing, you need to detect ~X% larger effects to maintain the same power.</p>
    <p><strong>Implication:</strong> Small true effects may be undetectable in discovery analyses but confirmable in targeted validation.</p>
  </div>
);
