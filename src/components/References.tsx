import { useState } from 'react';

type AnalysisType = 'cox' | 'linear' | 'logistic' | 'poisson' | 'gee';
type StudyDesign = 'cohort' | 'case-control' | 'cross-sectional' | 'case-cohort' | 'nested-case-control';

interface ReferencesProps {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
}

interface Reference {
  id: number;
  authors: string;
  year: number;
  title: string;
  journal: string;
  volume: string;
  pages: string;
  doi: string;
  analysisTypes: AnalysisType[];
  studyDesigns?: StudyDesign[];
}

/**
 * References Component
 *
 * Displays methodology descriptions and citations relevant to the
 * selected analysis type and study design. Collapsible dropdown.
 */
const References: React.FC<ReferencesProps> = ({ analysisType, studyDesign }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // All available references with their applicable analysis types and study designs
  const allReferences: Reference[] = [
    {
      id: 1,
      authors: 'Schoenfeld DA',
      year: 1983,
      title: 'Sample-size formula for the proportional-hazards regression model',
      journal: 'Biometrics',
      volume: '39(2)',
      pages: '499-503',
      doi: '10.2307/2531021',
      analysisTypes: ['cox'],
    },
    {
      id: 2,
      authors: 'Hsieh FY, Bloch DA, Larsen MD',
      year: 1998,
      title: 'A simple method of sample size calculation for linear and logistic regression',
      journal: 'Statistics in Medicine',
      volume: '17(14)',
      pages: '1623-1634',
      doi: '10.1002/(SICI)1097-0258(19980730)17:14<1623::AID-SIM871>3.0.CO;2-S',
      analysisTypes: ['linear', 'logistic'],
    },
    {
      id: 3,
      authors: 'Benjamini Y, Hochberg Y',
      year: 1995,
      title: 'Controlling the false discovery rate: a practical and powerful approach to multiple testing',
      journal: 'Journal of the Royal Statistical Society: Series B',
      volume: '57(1)',
      pages: '289-300',
      doi: '10.1111/j.2517-6161.1995.tb02031.x',
      analysisTypes: ['cox', 'linear', 'logistic', 'poisson'],
    },
    {
      id: 4,
      authors: 'Zou G',
      year: 2004,
      title: 'A modified Poisson regression approach to prospective studies with binary data',
      journal: 'American Journal of Epidemiology',
      volume: '159(7)',
      pages: '702-706',
      doi: '10.1093/aje/kwh090',
      analysisTypes: ['poisson'],
    },
    {
      id: 5,
      authors: 'Prentice RL',
      year: 1986,
      title: 'A case-cohort design for epidemiologic cohort studies and disease prevention trials',
      journal: 'Biometrika',
      volume: '73(1)',
      pages: '1-11',
      doi: '10.1093/biomet/73.1.1',
      analysisTypes: ['cox'],
      studyDesigns: ['case-cohort'],
    },
    {
      id: 6,
      authors: 'Self SG, Prentice RL',
      year: 1988,
      title: 'Asymptotic distribution theory and efficiency results for case-cohort studies',
      journal: 'Annals of Statistics',
      volume: '16(1)',
      pages: '64-81',
      doi: '10.1214/aos/1176350691',
      analysisTypes: ['cox'],
      studyDesigns: ['case-cohort'],
    },
    {
      id: 7,
      authors: 'Dupont WD',
      year: 1988,
      title: 'Power calculations for matched case-control studies',
      journal: 'Biometrics',
      volume: '44(4)',
      pages: '1157-1168',
      doi: '10.2307/2531743',
      analysisTypes: ['cox', 'logistic'],
      studyDesigns: ['nested-case-control', 'case-control'],
    },
    // Recent references
    {
      id: 8,
      authors: 'Storey JD',
      year: 2002,
      title: 'A direct approach to false discovery rates',
      journal: 'Journal of the Royal Statistical Society: Series B',
      volume: '64(3)',
      pages: '479-498',
      doi: '10.1111/1467-9868.00346',
      analysisTypes: ['cox', 'linear', 'logistic', 'poisson'],
    },
    {
      id: 9,
      authors: 'Goeman JJ, Solari A',
      year: 2014,
      title: 'Multiple hypothesis testing in genomics',
      journal: 'Statistics in Medicine',
      volume: '33(11)',
      pages: '1946-1978',
      doi: '10.1002/sim.6082',
      analysisTypes: ['cox', 'linear', 'logistic', 'poisson'],
    },
    {
      id: 10,
      authors: 'Chen W, Qian L, Shi J, Franklin M',
      year: 2018,
      title: 'Comparing performance between log-binomial and robust Poisson regression models for estimating risk ratios under model misspecification',
      journal: 'BMC Medical Research Methodology',
      volume: '18(1)',
      pages: '63',
      doi: '10.1186/s12874-018-0519-5',
      analysisTypes: ['poisson'],
    },
    {
      id: 11,
      authors: 'Vittinghoff E, McCulloch CE',
      year: 2007,
      title: 'Relaxing the rule of ten events per variable in logistic and Cox regression',
      journal: 'American Journal of Epidemiology',
      volume: '165(6)',
      pages: '710-718',
      doi: '10.1093/aje/kwk052',
      analysisTypes: ['cox', 'logistic'],
    },
    // GEE/Mixed Effects references
    {
      id: 12,
      authors: 'Liang KY, Zeger SL',
      year: 1986,
      title: 'Longitudinal data analysis using generalized linear models',
      journal: 'Biometrika',
      volume: '73(1)',
      pages: '13-22',
      doi: '10.1093/biomet/73.1.13',
      analysisTypes: ['gee'],
    },
    {
      id: 13,
      authors: 'Zeger SL, Liang KY',
      year: 1986,
      title: 'Longitudinal data analysis for discrete and continuous outcomes',
      journal: 'Biometrics',
      volume: '42(1)',
      pages: '121-130',
      doi: '10.2307/2531248',
      analysisTypes: ['gee'],
    },
    {
      id: 14,
      authors: 'Liu G, Liang KY',
      year: 1997,
      title: 'Sample size calculations for studies with correlated observations',
      journal: 'Biometrics',
      volume: '53(3)',
      pages: '937-947',
      doi: '10.2307/2533554',
      analysisTypes: ['gee'],
    },
    {
      id: 15,
      authors: 'Kish L',
      year: 1965,
      title: 'Survey Sampling',
      journal: 'Wiley (New York)',
      volume: '',
      pages: '',
      doi: '',
      analysisTypes: ['gee'],
    },
  ];

  // Filter references relevant to current analysis type and study design
  const relevantReferences = allReferences.filter(ref => {
    const matchesAnalysis = ref.analysisTypes.includes(analysisType);
    const matchesDesign = !ref.studyDesigns || ref.studyDesigns.includes(studyDesign);
    return matchesAnalysis && matchesDesign;
  });

  // Get analysis-specific methodology description
  const getMethodologyDescription = () => {
    switch (analysisType) {
      case 'cox':
        return {
          model: 'Cox Proportional Hazards Model',
          description: 'Semi-parametric survival model for time-to-event outcomes. Estimates hazard ratios (HR) comparing instantaneous event rates between groups.',
          effectSize: 'The hazard ratio represents the relative change in the instantaneous risk of the event per one standard deviation increase in the protein level.',
          powerBasis: 'Power is based on Schoenfeld\'s formula using the expected number of events (d), not total sample size. SE(log HR) ≈ 1/√d for a standardized predictor.',
          assumptions: 'The proportional hazards assumption must hold (constant HR over time). The predictor variable (protein level) is assumed to be standardized with unit variance.',
        };
      case 'linear':
        return {
          model: 'Linear Regression',
          description: 'Models continuous outcomes as a linear function of predictors. Estimates standardized regression coefficients (β).',
          effectSize: 'The standardized beta coefficient represents the change in outcome (in SD units) per one standard deviation increase in the protein level.',
          powerBasis: 'Power is based on the t-test for the regression coefficient with (n-2) degrees of freedom. SE(β) depends on sample size and residual variance.',
          assumptions: 'Residuals are normally distributed with constant variance (homoscedasticity). The predictor variable is standardized with unit variance.',
        };
      case 'logistic':
        return {
          model: 'Logistic Regression',
          description: 'Models binary outcomes via log-odds. Estimates odds ratios (OR) for the predictor-outcome association.',
          effectSize: 'The odds ratio represents the multiplicative change in odds of the outcome per one standard deviation increase in the protein level.',
          powerBasis: 'Power is based on the Wald test with standard error derived from Fisher information. For case-control designs, SE = √(1/n₁ + 1/n₀).',
          assumptions: 'The log-odds are linear in the predictor. Note that OR ≈ RR only when outcome prevalence is low (<10%). For common outcomes, consider Modified Poisson regression.',
        };
      case 'poisson':
        return {
          model: 'Modified Poisson Regression',
          description: 'Log-linear model with robust variance for binary outcomes. Directly estimates relative risk (RR) rather than odds ratio.',
          effectSize: 'The relative risk represents the multiplicative change in the probability of the outcome per one standard deviation increase in the protein level.',
          powerBasis: 'Power is based on the Wald test with robust (sandwich) variance estimator. SE = √(1/(n·p)) where p is outcome prevalence.',
          assumptions: 'Appropriate when outcome prevalence >10% or when relative risk interpretation is preferred over odds ratio. Uses robust variance to correct for binary outcome.',
        };
      case 'gee':
        return {
          model: 'GEE/Mixed Effects Model',
          description: 'Generalized Estimating Equations or Mixed Effects models for clustered/longitudinal data. Accounts for within-cluster correlation via the intraclass correlation coefficient (ICC).',
          effectSize: 'The standardized beta coefficient represents the change in outcome per one SD increase in protein level, adjusted for clustering.',
          powerBasis: 'Power incorporates the design effect DE = 1 + (m-1)×ICC, which inflates variance proportional to cluster size and correlation. Effective sample size n_eff = n/DE.',
          assumptions: 'Observations within clusters are correlated with constant ICC. The working correlation structure is correctly specified. Large sample approximation requires adequate number of clusters (≥30-50).',
        };
    }
  };

  // Get study design-specific description
  const getStudyDesignDescription = () => {
    switch (studyDesign) {
      case 'cohort':
        return 'Prospective or retrospective follow-up design where participants are classified by exposure (protein levels) and followed for outcomes. Can calculate incidence rates with temporal sequence established.';
      case 'case-control':
        return 'Participants selected based on outcome status. Compares exposure (protein levels) between cases and controls. Cannot directly estimate prevalence or incidence; odds ratio is the estimable effect measure.';
      case 'cross-sectional':
        return 'Exposure and outcome measured simultaneously. Prevalence-based analysis. Cannot establish temporal sequence; associations may reflect reverse causation.';
      case 'case-cohort':
        return 'All cases plus a random subcohort from the full cohort. Efficient for expensive biomarker measurements. Analysis uses weighted Cox regression with variance inflation factor √(1 + (1-f)/f) where f is the subcohort fraction.';
      case 'nested-case-control':
        return 'Cases matched to controls from the risk set at time of case occurrence. Preserves cohort sampling frame. Variance inflation factor √(1 + 1/m) where m is the matching ratio. Analysis uses conditional logistic regression or stratified Cox model.';
    }
  };

  const methodology = getMethodologyDescription();

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Methodology & References
        </h2>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="px-6 pb-6">
          {/* Analysis Type Methodology */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-indigo-700 mb-2">{methodology.model}</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>{methodology.description}</p>
              <p><strong>Effect Size Interpretation:</strong> {methodology.effectSize}</p>
              <p><strong>Power Calculation:</strong> {methodology.powerBasis}</p>
              <p><strong>Assumptions:</strong> {methodology.assumptions}</p>
            </div>
          </div>

          {/* Study Design Description */}
          <div className="mb-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-purple-700 mb-2">
              {studyDesign.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Design
            </h3>
            <p className="text-sm text-gray-600">{getStudyDesignDescription()}</p>
          </div>

          {/* Multiple Testing Correction */}
          <div className="mb-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Multiple Testing Correction</h3>
            <p className="text-sm text-gray-600">
              The Benjamini-Hochberg FDR procedure controls the expected proportion of false discoveries among significant findings.
              The effective per-test α level is approximated as α<sub>eff</sub> ≈ q × π<sub>0</sub> / m, where q is the FDR threshold,
              π<sub>0</sub> is the proportion of true nulls (assumed ≈1), and m is the number of tests.
            </p>
          </div>

          {/* References */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Key References</h3>
            <div className="space-y-3">
              {relevantReferences.map((ref, index) => (
                <div key={ref.id} className="text-xs text-gray-600 pl-4 border-l-2 border-indigo-200">
                  <p className="font-medium text-gray-800">
                    [{index + 1}] {ref.authors} ({ref.year})
                  </p>
                  <p className="italic">{ref.title}</p>
                  <p>
                    {ref.journal}, {ref.volume}: {ref.pages}.
                    {ref.doi && (
                      <a
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 ml-1"
                      >
                        DOI: {ref.doi}
                      </a>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default References;
