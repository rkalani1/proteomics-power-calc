var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/components/MathEquation.tsx
var MathEquation_exports = {};
__export(MathEquation_exports, {
  MinHRFormula: () => MinHRFormula,
  PowerFormula: () => PowerFormula,
  default: () => MathEquation_default
});
module.exports = __toCommonJS(MathEquation_exports);
var import_react = require("react");
var import_katex = __toESM(require("katex"), 1);

// src/constants/formulas.ts
var FORMULA_CONFIGS = {
  cox: {
    title: "Cox Proportional Hazards",
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\log(\text{HR})|}{\sigma} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\log(\text{HR})|}{\sigma} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\text{HR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)`,
    minEffectLabel: "Minimum Detectable Hazard Ratio",
    // cox definitions are built per study design by coxDefinitions()
    definitions: ""
  },
  linear: {
    title: "Linear Regression",
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\beta_{\min} = (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma_\beta`,
    minEffectLabel: "Minimum Detectable Beta",
    definitions: String.raw`\begin{aligned}
    \sigma_\beta &= \frac{\sigma_{\text{residual}}}{\sqrt{(n-2) \cdot (1 - R^2_x)}} \quad \text{(standard error of } \beta \text{)} \\[0.5em]
    n &= \text{sample size} \\[0.5em]
    \sigma_{\text{residual}} &= \text{residual standard deviation} \\[0.5em]
    R^2_x &= \text{proportion of protein variance explained by covariates} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)}
    \end{aligned}`
  },
  logistic: {
    title: "Logistic Regression",
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\log(\text{OR})|}{\sigma} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\log(\text{OR})|}{\sigma} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\text{OR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)`,
    minEffectLabel: "Minimum Detectable Odds Ratio",
    // logistic definitions are built per study design by logisticDefinitions()
    definitions: ""
  },
  poisson: {
    title: "Modified Poisson Regression",
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\log(\text{RR})|}{\sigma} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\log(\text{RR})|}{\sigma} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\text{RR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)`,
    minEffectLabel: "Minimum Detectable Relative Risk",
    definitions: String.raw`\begin{aligned}
    \sigma &= \sqrt{\frac{1}{n \cdot p \cdot (1 - R^2_x)}} \quad \text{(conservative large-sample SE; covariate-adjusted)} \\[0.5em]
    n &= \text{sample size} \\[0.5em]
    p &= \text{outcome prevalence} \\[0.5em]
    R^2_x &= \text{proportion of protein variance explained by covariates} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)} \\[0.5em]
    &\text{Note: the modified-Poisson robust SE } \sqrt{\tfrac{1-p}{n p}} \text{ is smaller, so this is conservative.}
    \end{aligned}`
  },
  gee: {
    title: "GEE/Mixed Effects Model",
    mainFormula: String.raw`\text{Power} = \Phi\left( \frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right) + \Phi\left( -\frac{|\beta|}{\sigma_\beta} - z_{1-\alpha/2} \right)`,
    minEffectFormula: String.raw`\beta_{\min} = (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma_\beta`,
    minEffectLabel: "Minimum Detectable Beta",
    definitions: String.raw`\begin{aligned}
    \sigma_\beta &= \frac{\sigma_{\text{residual}} \cdot \sqrt{\text{DE}}}{\sqrt{(n-2) \cdot (1 - R^2_x)}} \quad \text{(clustering-adjusted SE with covariate adjustment)} \\[0.5em]
    \text{DE} &= 1 + (m-1) \cdot \text{ICC} \quad \text{(design effect)} \\[0.5em]
    m &= \text{cluster size (observations per subject)} \\[0.5em]
    \text{ICC} &= \text{intraclass correlation coefficient} \\[0.5em]
    R^2_x &= \text{proportion of protein variance explained by covariates} \\[0.5em]
    n_{\text{eff}} &= \frac{n}{\text{DE}} \quad \text{(effective sample size)} \\[0.5em]
    \Phi(z) &= P(Z \leq z) \text{ for } Z \sim N(0,1) \quad \text{(standard normal CDF)}
    \end{aligned}`
  }
};
var coxDefinitions = (studyDesign) => {
  let sigma;
  let extra = "";
  if (studyDesign === "case-cohort") {
    sigma = String.raw`\sigma &= \frac{1}{\sqrt{f \cdot d \cdot (1 - R^2_x)}} \quad \text{(case-cohort SE of } \log(\text{HR}) \text{)} \\[0.5em]`;
    extra = String.raw`f &= \text{subcohort size} / \text{cohort size} \quad \text{(sampling fraction, } 0 < f \le 1\text{)} \\[0.5em]`;
  } else if (studyDesign === "nested-case-control") {
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
var logisticDefinitions = (studyDesign) => {
  if (studyDesign === "case-control" || studyDesign === "nested-case-control") {
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
var definitionsFor = (analysisType, studyDesign) => {
  if (analysisType === "cox") return coxDefinitions(studyDesign);
  if (analysisType === "logistic") return logisticDefinitions(studyDesign);
  return FORMULA_CONFIGS[analysisType].definitions;
};

// src/components/MathEquation.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var MathEquation = ({
  latex,
  displayMode = true,
  className = ""
}) => {
  const containerRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (containerRef.current) {
      try {
        import_katex.default.render(latex, containerRef.current, {
          displayMode,
          throwOnError: false,
          strict: false,
          trust: false
        });
      } catch (error) {
        console.error("KaTeX rendering error:", error);
        containerRef.current.textContent = latex;
      }
    }
  }, [latex, displayMode]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: containerRef, className });
};
var PowerFormula = ({
  analysisType = "cox",
  studyDesign = "cohort"
}) => {
  const [isExpanded, setIsExpanded] = (0, import_react.useState)(false);
  const config = FORMULA_CONFIGS[analysisType];
  const definitions = definitionsFor(analysisType, studyDesign);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm overflow-hidden", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        onClick: () => setIsExpanded(!isExpanded),
        className: "w-full px-6 py-4 flex items-center justify-between text-left hover:bg-blue-100/50 transition-colors",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "text-lg font-semibold text-gray-800 flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { className: "w-5 h-5 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" }) }),
            "Statistical Formulas (",
            config.title,
            ")"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "svg",
            {
              className: `w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`,
              fill: "none",
              stroke: "currentColor",
              viewBox: "0 0 24 24",
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" })
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: `transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`,
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "px-6 pb-6", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "overflow-x-auto", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "min-w-fit", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mb-6", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-gray-700 mb-2 font-medium", children: "Power Formula:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              MathEquation,
              {
                latex: config.mainFormula,
                className: "text-center py-2"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mb-6 bg-amber-50/50 rounded-lg p-4 border border-amber-100", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "text-sm text-gray-700 mb-2 font-medium", children: [
              config.minEffectLabel,
              ":"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MathEquation, { latex: config.minEffectFormula, className: "text-center" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "text-xs text-gray-500 mt-2 text-center", children: [
              "where z",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "\u03B2" }),
              " = \u03A6",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("sup", { children: "-1" }),
              "(target power)"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "border-t border-blue-200 pt-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-gray-600 mb-3 font-medium", children: "Where:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              MathEquation,
              {
                latex: definitions,
                className: "text-sm"
              }
            )
          ] })
        ] }) }) })
      }
    )
  ] });
};
var MinHRFormula = () => {
  const formula = String.raw`
    \text{HR}_{\min} = \exp\left( (z_{1-\alpha/2} + z_{\beta}) \cdot \sigma \right)
  `;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-amber-50/50 rounded-lg p-4 border border-amber-100", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-gray-700 mb-2 font-medium", children: "Minimum Detectable Effect Size:" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MathEquation, { latex: formula, className: "text-sm" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "text-xs text-gray-500 mt-2", children: [
      "where z",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("sub", { children: "\u03B2" }),
      " = \u03A6",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("sup", { children: "-1" }),
      "(target power)"
    ] })
  ] });
};
var MathEquation_default = MathEquation;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MinHRFormula,
  PowerFormula
});
