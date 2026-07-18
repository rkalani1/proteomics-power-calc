/**
 * LaTeX definitions for the power formulas shown in the app.
 *
 * Kept in a standalone module (not the component file) so the strings can be
 * unit-tested by rendering them through KaTeX, and so the component file only
 * exports components (React Fast Refresh requirement).
 *
 * Every standard error below matches exactly what src/utils/statistics.ts and
 * src/App.tsx compute, including the study-design-specific variance inflation.
 */

export type FormulaAnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';
export type FormulaStudyDesign =
  | 'cohort'
  | 'case-control'
  | 'cross-sectional'
  | 'case-cohort'
  | 'nested-case-control';

export interface FormulaConfig {
  title: string;
  mainFormula: string;
  minEffectFormula: string;
  minEffectLabel: string;
  definitions: string;
}

export const FORMULA_CONFIGS: Record<FormulaAnalysisType, FormulaConfig> = {
  cox: {
    title: 'Cox Proportional Hazards',
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\log(\text{HR})|}{\sigma} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\log(\text{HR})|}{\sigma} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\text{HR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)`,
    minEffectLabel: 'Minimum Detectable Hazard Ratio',
    // cox definitions are built per study design by coxDefinitions()
    definitions: '',
  },
  linear: {
    title: 'Linear Regression',
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\beta_{\min} = (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma_\beta`,
    minEffectLabel: 'Minimum Detectable Beta',
    definitions: String.raw`\begin{aligned}
    \sigma_\beta &= \frac{\sigma_{\text{residual}}}{\sqrt{(n-2) \cdot (1 - R^2_x)}} \quad \text{(standard error of } \beta \text{)} \\[0.5em]
    n &= \text{sample size} \\[0.5em]
    \sigma_{\text{residual}} &= \text{residual standard deviation} \\[0.5em]
    R^2_x &= \text{proportion of protein variance explained by covariates} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)}
    \end{aligned}`,
  },
  logistic: {
    title: 'Logistic Regression',
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\log(\text{OR})|}{\sigma} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\log(\text{OR})|}{\sigma} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\text{OR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)`,
    minEffectLabel: 'Minimum Detectable Odds Ratio',
    // logistic definitions are built per study design by logisticDefinitions()
    definitions: '',
  },
  poisson: {
    title: 'Modified Poisson Regression',
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\log(\text{RR})|}{\sigma} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\log(\text{RR})|}{\sigma} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\text{RR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)`,
    minEffectLabel: 'Minimum Detectable Relative Risk',
    definitions: String.raw`\begin{aligned}
    \sigma &= \sqrt{\frac{1}{n \cdot p \cdot (1 - R^2_x)}} \quad \text{(conservative large-sample SE; covariate-adjusted)} \\[0.5em]
    n &= \text{sample size} \\[0.5em]
    p &= \text{outcome prevalence} \\[0.5em]
    R^2_x &= \text{proportion of protein variance explained by covariates} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)} \\[0.5em]
    &\text{Note: the modified-Poisson robust SE } \sqrt{\tfrac{1-p}{n p (1 - R^2_x)}} \text{ is smaller, so this is conservative.}
    \end{aligned}`,
  },
  gee: {
    title: 'GEE/Mixed Effects Model',
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\beta_{\min} = (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma_\beta`,
    minEffectLabel: 'Minimum Detectable Beta',
    definitions: String.raw`\begin{aligned}
    \sigma_\beta &= \frac{\sigma_{\text{residual}} \cdot \sqrt{\text{DE}}}{\sqrt{(n-2) \cdot (1 - R^2_x)}} \quad \text{(clustering-adjusted SE with covariate adjustment)} \\[0.5em]
    \text{DE} &= 1 + (m-1) \cdot \text{ICC} \quad \text{(design effect)} \\[0.5em]
    m &= \text{cluster size (observations per subject)} \\[0.5em]
    \text{ICC} &= \text{intraclass correlation coefficient} \\[0.5em]
    R^2_x &= \text{proportion of protein variance explained by covariates} \\[0.5em]
    n_{\text{eff}} &= \frac{n}{\text{DE}} \quad \text{(effective sample size)} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)}
    \end{aligned}`,
  },
};

/**
 * Cox variable-definitions block. The standard error depends on study design:
 * case-cohort inflates the variance by 1/f (f = subcohort sampling fraction) and
 * nested case-control by (m+1)/m (m = controls per case).
 */
export const coxDefinitions = (studyDesign: FormulaStudyDesign): string => {
  let sigma: string;
  let extra = '';
  if (studyDesign === 'case-cohort') {
    sigma = String.raw`\sigma &= \frac{1}{\sqrt{f \cdot d \cdot (1 - R^2_x)}} \quad \text{(case-cohort SE of } \log(\text{HR}) \text{)} \\[0.5em]`;
    extra = String.raw`f &= \text{subcohort size} / \text{cohort size} \quad \text{(sampling fraction, } 0 < f \le 1\text{)} \\[0.5em]`;
  } else if (studyDesign === 'nested-case-control') {
    sigma = String.raw`\sigma &= \sqrt{\tfrac{m+1}{m}} \cdot \frac{1}{\sqrt{d \cdot (1 - R^2_x)}} \quad \text{(nested case-control SE of } \log(\text{HR}) \text{)} \\[0.5em]`;
    extra = String.raw`m &= \text{controls matched per case} \\[0.5em]`;
  } else {
    sigma = String.raw`\sigma &= \frac{1}{\sqrt{d \cdot (1 - R^2_x)}} \quad \text{(standard error of } \log(\text{HR}) \text{)} \\[0.5em]`;
  }
  return String.raw`\begin{aligned}
    ${sigma}
    d &= \text{number of events} \\[0.5em]
    ${extra}R^2_x &= \text{proportion of protein variance explained by covariates} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)} \\[0.5em]
    z_{1-\alpha/2} &= \Phi^{-1}(1 - \alpha/2) \quad \text{(critical value)}
    \end{aligned}`;
};

/**
 * Logistic variable-definitions block. Cohort / cross-sectional designs use the
 * marginal prevalence; case-control and nested-case-control use the case and
 * control counts directly.
 */
export const logisticDefinitions = (studyDesign: FormulaStudyDesign): string => {
  if (studyDesign === 'case-control' || studyDesign === 'nested-case-control') {
    return String.raw`\begin{aligned}
    \sigma &= \sqrt{\frac{1/n_{\text{cases}} + 1/n_{\text{controls}}}{1 - R^2_x}} \quad \text{(case-control SE of } \log(\text{OR}) \text{)} \\[0.5em]
    n_{\text{cases}} &= \text{number of cases}, \quad n_{\text{controls}} = \text{number of controls} \\[0.5em]
    R^2_x &= \text{proportion of protein variance explained by covariates} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)}
    \end{aligned}`;
  }
  return String.raw`\begin{aligned}
    \sigma &= \frac{1}{\sqrt{n \cdot p \cdot (1-p) \cdot (1 - R^2_x)}} \quad \text{(Hsieh's formula with covariate adjustment)} \\[0.5em]
    n &= \text{sample size} \\[0.5em]
    p &= \text{outcome prevalence} \\[0.5em]
    R^2_x &= \text{proportion of protein variance explained by covariates} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)}
    \end{aligned}`;
};

/** Resolve the design-aware variable-definitions block for any model. */
export const definitionsFor = (
  analysisType: FormulaAnalysisType,
  studyDesign: FormulaStudyDesign
): string => {
  if (analysisType === 'cox') return coxDefinitions(studyDesign);
  if (analysisType === 'logistic') return logisticDefinitions(studyDesign);
  return FORMULA_CONFIGS[analysisType].definitions;
};
