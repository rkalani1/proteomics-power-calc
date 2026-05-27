# Proteomics Power Calculator

Interactive web application for power calculations in proteome-wide association studies (PWAS). Supports multiple regression models including Cox proportional hazards, linear, logistic, modified Poisson, and GEE/mixed effects models with Benjamini-Hochberg FDR or Bonferroni correction for multiple testing.

## Live Demo

🔗 **[ /proteomics-power-calc](/proteomics-power-calc)**

## Data Guardrail

Use aggregate or synthetic planning assumptions in the public demo. Do not paste patient identifiers, restricted research data, unpublished proprietary cohort details, or confidential institutional information. Calculations are methodological estimates and are not medical, regulatory, or statistical-consulting advice.

## Features

- **Multiple Analysis Types**:
  - Cox Proportional Hazards (time-to-event outcomes)
  - Linear Regression (continuous outcomes)
  - Logistic Regression (binary outcomes)
  - Modified Poisson Regression (binary outcomes with prevalence >10%)
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

### Cox Proportional Hazards (Schoenfeld, 1983)

```
Power = Φ(|log(HR)|/σ - z_{1-α/2}) + Φ(-|log(HR)|/σ - z_{1-α/2})

where:
  σ = 1/√d (standard error of log(HR))
  d = number of events
  Φ = standard normal CDF
  z_{1-α/2} = critical value for two-sided test
```

### Linear Regression

```
Power = Φ(|β|/SE - z_{1-α/2}) + Φ(-|β|/SE - z_{1-α/2})

where:
  SE = σ_y / √(n × R²_x)
  σ_y = residual standard deviation
  R²_x = variance explained by predictor
```

### Logistic Regression

```
Power = Φ(|log(OR)|/SE - z_{1-α/2}) + Φ(-|log(OR)|/SE - z_{1-α/2})

where:
  SE = 1/√(n × p × (1-p))
  p = case prevalence
```

### Modified Poisson Regression

```
Power = Φ(|log(RR)|/SE - z_{1-α/2}) + Φ(-|log(RR)|/SE - z_{1-α/2})

where:
  SE = √(1/(n × p))
  p = outcome prevalence
```

### Multiple Testing Correction

- **FDR (Benjamini-Hochberg)**: α_effective ≈ q/m
- **Bonferroni**: α_effective = α/m

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/example/proteomics-power-calc.git
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

2. Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: a practical and powerful approach to multiple testing. *JRSS-B*, 57(1), 289-300. [DOI: 10.1111/j.2517-6161.1995.tb02031.x](https://doi.org/10.1111/j.2517-6161.1995.tb02031.x)

3. Storey, J. D. (2002). A direct approach to false discovery rates. *JRSS-B*, 64(3), 479-498. [DOI: 10.1111/1467-9868.00346](https://doi.org/10.1111/1467-9868.00346)

4. Vittinghoff, E., & McCulloch, C. E. (2007). Relaxing the rule of ten events per variable in logistic and Cox regression. *American Journal of Epidemiology*, 165(6), 710-718. [DOI: 10.1093/aje/kwk052](https://doi.org/10.1093/aje/kwk052)

5. Goeman, J. J., & Solari, A. (2014). Multiple hypothesis testing in genomics. *Statistics in Medicine*, 33(11), 1946-1978. [DOI: 10.1002/sim.6082](https://doi.org/10.1002/sim.6082)

## License

MIT License

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
