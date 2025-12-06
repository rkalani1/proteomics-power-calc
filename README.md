# Proteome-Wide Cox Power Calculator

Interactive web application for power calculations in proteome-wide association studies (PWAS) using Cox proportional hazards models. Compares statistical power between single-protein tests (α=0.05) and proteome-wide scans with Benjamini-Hochberg FDR correction.

## Live Demo

🔗 **[https://rkalani1.github.io/proteomics-power-calc](https://rkalani1.github.io/proteomics-power-calc)**

## Features

- **Interactive Controls**: Adjustable sliders for sample size, events, number of tests, FDR threshold, target power, and hazard ratio
- **Mathematical Display**: Power formula rendered in textbook-style LaTeX notation using KaTeX
- **Power Visualization**: Interactive chart comparing power curves for single vs. multi-test scenarios
- **Results Table**: Sortable/filterable table of power values across hazard ratios
- **Real-time Calculations**: Instant updates as parameters change

## Key Calculations

For Cox proportional hazards regression with a standardized continuous predictor (Var(X) = 1):

```
Power = Φ(|log(HR)|/σ - z_{1-α/2}) + Φ(-|log(HR)|/σ - z_{1-α/2})

where:
  σ = 1/√d (standard error of log(HR))
  d = number of events
  Φ = standard normal CDF
  z_{1-α/2} = critical value for two-sided test
```

**Multiple Testing Correction:**
- Uses Benjamini-Hochberg FDR procedure
- Conservative approximation: α_effective ≈ q/m

## Default Context

Defaults are configured for a UK Biobank endometriosis cohort study:
- n = 3,000 women with endometriosis
- d = 70 incident CVD events
- m = 3,000 Olink proteins tested
- FDR q = 0.05

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
3. **Proportional Hazards**: Cox PH model assumptions are satisfied
4. **Two-sided Tests**: All hypothesis tests are two-sided
5. **BH-FDR**: Conservative α ≈ q/m approximation for the Benjamini-Hochberg procedure

## References

- Schoenfeld, D. (1983). Sample-size formula for the proportional-hazards regression model. *Biometrics*, 39(2), 499-503.
- Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate. *JRSS-B*, 57(1), 289-300.

## License

MIT License

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
