# Proteomics Power Calculator

Interactive web application for power calculations in proteome-wide association studies (PWAS). Supports multiple regression models including Cox proportional hazards, linear, logistic, modified Poisson, and GEE/mixed effects models with Benjamini-Hochberg FDR or Bonferroni correction for multiple testing.

## Live Demo

🔗 **<https://rkalani1.github.io/proteomics-power-calc/>**

Machine-readable summary: [`llms.txt`](https://rkalani1.github.io/proteomics-power-calc/llms.txt) (purpose, models, assumptions, planning-tool boundary).

## Data Guardrail

Use aggregate or synthetic planning assumptions in the public demo. Do not paste patient identifiers, restricted research data, unpublished proprietary cohort details, or confidential institutional information. Calculations are methodological estimates and are not medical, regulatory, or statistical-consulting advice.

## Features

- **Multiple Analysis Types**:
  - Cox Proportional Hazards (time-to-event outcomes)
  - Linear Regression (continuous outcomes)
  - Logistic Regression (binary outcomes)
  - Modified Poisson Regression (binary outcomes with common, ≥10% prevalence)
  - GEE/Mixed Effects (clustered/longitudinal data)

- **Flexible Study Designs**:
  - Cohort studies
  - Case-Cohort designs
  - Nested Case-Control studies

- **Multiple Testing Correction**:
  - Benjamini-Hochberg FDR (False Discovery Rate)
  - Bonferroni correction (Family-Wise Error Rate)

- **Interactive Controls**: Adjustable inputs for sample size, events/prevalence, number of proteins, FDR/FWER threshold, target power, and effect sizes

- **Mathematical Display**: Power formulas rendered in textbook-style LaTeX notation using KaTeX

- **Rich Visualizations**:
  - Power vs Effect Size curves
  - Power vs Number of Proteins charts
  - Sensitivity analysis plots
  - Required events/sample size curves
  - Forest plots and power grids

- **Results Tables**: Sortable/filterable power comparison tables

- **Export Options**: CSV download, PDF printing, and summary copying

## Key Calculations

All models use the same two-sided large-sample (Wald) power expression; they
differ only in the standard error (σ) of the estimated effect. The predictor
(protein level) is assumed standardized to unit variance, and **R²ₓ is the
proportion of *predictor* variance explained by the adjustment covariates**
(`covariateR2`), which inflates every standard error by a factor of 1/√(1−R²ₓ).
These formulas match exactly what the app renders (see `src/components/MathEquation.tsx`).

```
Power = Φ(λ − z_{1-α/2}) + Φ(−λ − z_{1-α/2}),  where λ = |effect on the log/linear scale| / σ
```

### Cox Proportional Hazards (Schoenfeld, 1983)

```
effect = log(HR)
σ = 1 / √(d × (1 − R²ₓ))

where:
  d   = number of events
  R²ₓ = proportion of predictor variance explained by covariates
```

### Linear Regression (Hsieh, Bloch & Larsen, 1998)

```
effect = β  (standardized regression coefficient)
σ_β = σ_residual / √((n − 2) × (1 − R²ₓ))

where:
  n          = sample size
  σ_residual = residual standard deviation
```

### Logistic Regression (Hsieh, Bloch & Larsen, 1998)

```
effect = log(OR)
σ = 1 / √(n × p × (1 − p) × (1 − R²ₓ))

where:
  p = outcome prevalence
```

For case-control / nested-case-control designs the SE instead uses the case and
control counts: σ = √((1/n_cases + 1/n_controls) / (1 − R²ₓ)).

### Modified Poisson Regression (Zou, 2004)

```
effect = log(RR)
σ = √(1 / (n × p × (1 − R²ₓ)))     (conservative naive-Poisson SE)

where:
  p = outcome prevalence
```

This uses the naive-Poisson information as a **conservative** standard error. The
modified-Poisson robust (sandwich) SE for binary data is smaller — approximately
√((1 − p) / (n × p × (1 − R²ₓ))) — so the tool slightly under-states power (and
over-states the required sample size) for common outcomes; the two coincide as the
outcome becomes rare (p → 0). This keeps planning estimates on the safe side.

### GEE / Mixed Effects (Liang & Zeger, 1986)

```
effect = β  (standardized coefficient)
σ_β = σ_residual × √DE / √((n − 2) × (1 − R²ₓ))
DE  = 1 + (m − 1) × ICC        (design effect; n_eff = n / DE)

where:
  m   = cluster size (observations per subject)
  ICC = intraclass correlation coefficient
```

### Minimum Detectable Effect

The smallest detectable effect at the target power (1 − β) inverts the power
expression: the standardized minimum effect is (z_{1-α/2} + z_β) × σ, mapped back
to the HR/OR/RR scale via exp(·), or used directly for β.

### Multiple Testing Correction

- **FDR (Benjamini-Hochberg)**: α_effective ≈ q/m (conservative planning bound; true FDR power is typically higher)
- **Bonferroni**: α_effective = α/m

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/rkalani1/proteomics-power-calc.git
cd proteomics-power-calc

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Deploy

The app automatically deploys to GitHub Pages on push to `main` branch via GitHub Actions.

## Technical Stack

- **React 19** + TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Recharts** for interactive charts
- **KaTeX** for LaTeX math rendering
- **jstat** for statistical functions

## Assumptions

1. **Standardized Predictor**: Protein levels are standardized (Var(X) = 1), which is standard practice in proteomics
2. **Large Sample Approximation**: Wald test-based power approximation is valid
3. **Model Assumptions**: Respective model assumptions (proportional hazards, linearity, etc.) are satisfied
4. **Two-sided Tests**: All hypothesis tests are two-sided
5. **Independence**: For FDR/Bonferroni, tests are assumed approximately independent

## References

1. Schoenfeld, D. A. (1983). Sample-size formula for the proportional-hazards regression model. *Biometrics*, 39(2), 499-503. [DOI: 10.2307/2531021](https://doi.org/10.2307/2531021)

2. Hsieh, F. Y., Bloch, D. A., & Larsen, M. D. (1998). A simple method of sample size calculation for linear and logistic regression. *Statistics in Medicine*, 17(14), 1623-1634. [DOI: 10.1002/(SICI)1097-0258(19980730)17:14<1623::AID-SIM871>3.0.CO;2-S](https://doi.org/10.1002/(SICI)1097-0258(19980730)17:14%3C1623::AID-SIM871%3E3.0.CO;2-S)

   *Note:* covariate adjustment via R²ₓ (inflating the SE by 1/√(1−R²ₓ)) follows Hsieh, F. Y., & Lavori, P. W. (2000). Sample-size calculations for the Cox proportional hazards regression model with nonbinary covariates. *Controlled Clinical Trials*, 21(6), 552-560. [DOI: 10.1016/S0197-2456(00)00104-5](https://doi.org/10.1016/S0197-2456(00)00104-5)

3. Zou, G. (2004). A modified Poisson regression approach to prospective studies with binary data. *American Journal of Epidemiology*, 159(7), 702-706. [DOI: 10.1093/aje/kwh090](https://doi.org/10.1093/aje/kwh090)

4. Liang, K. Y., & Zeger, S. L. (1986). Longitudinal data analysis using generalized linear models. *Biometrika*, 73(1), 13-22. [DOI: 10.1093/biomet/73.1.13](https://doi.org/10.1093/biomet/73.1.13)

5. Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: a practical and powerful approach to multiple testing. *JRSS-B*, 57(1), 289-300. [DOI: 10.1111/j.2517-6161.1995.tb02031.x](https://doi.org/10.1111/j.2517-6161.1995.tb02031.x)

6. Storey, J. D. (2002). A direct approach to false discovery rates. *JRSS-B*, 64(3), 479-498. [DOI: 10.1111/1467-9868.00346](https://doi.org/10.1111/1467-9868.00346)

7. Vittinghoff, E., & McCulloch, C. E. (2007). Relaxing the rule of ten events per variable in logistic and Cox regression. *American Journal of Epidemiology*, 165(6), 710-718. [DOI: 10.1093/aje/kwk052](https://doi.org/10.1093/aje/kwk052)

8. Goeman, J. J., & Solari, A. (2014). Multiple hypothesis testing in genomics. *Statistics in Medicine*, 33(11), 1946-1978. [DOI: 10.1002/sim.6082](https://doi.org/10.1002/sim.6082)

## License

MIT License

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
