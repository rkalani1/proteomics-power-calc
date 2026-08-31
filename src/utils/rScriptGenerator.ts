import type { AnalysisType, CorrectionMethod, StudyDesign } from './statistics';
import {
  ADVANCED_TARGET_POWER_GRID,
  CONTOUR_ADDITIVE_EFFECT_GRID,
  CONTOUR_COX_DIMENSION_GRID,
  CONTOUR_RATIO_EFFECT_GRID,
  CONTOUR_SAMPLE_SIZE_GRID,
  DISPLAY_EFFECT_GRIDS,
  POWER_BY_PROTEIN_TABLE_GRID,
  POWER_CURVE_POINT_COUNT,
  POWER_CURVE_RANGES,
  SENSITIVITY_ADDITIVE_EFFECT_GRID,
  SENSITIVITY_EVENT_GRID,
  SENSITIVITY_PROTEIN_GRID,
  SENSITIVITY_RATIO_EFFECT_GRID,
  SENSITIVITY_SAMPLE_SIZE_GRID,
  SUPPORTED_STUDY_DESIGNS,
} from '../constants/analysisGrids';

export interface AnalysisSnapshot {
  analysisType: AnalysisType;
  studyDesign: StudyDesign;
  proteinCounts: readonly number[];
  correctionMethod: CorrectionMethod;
  fdrQ: number;
}

export interface RScriptInput extends AnalysisSnapshot {
  effectSize: number;
  targetPower: number;
  sampleSize: number;
  events: number;
  prevalence: number;
  residualSD: number;
  numCases: number;
  numControls: number;
  subcohortSize: number;
  totalCohort: number;
  matchingRatio: number;
  clusterSize: number;
  icc: number;
  covariateR2: number;
}

export interface RScriptOptions {
  includeSensitivity: boolean;
  includeVisualizations: boolean;
  includeCsv: boolean;
  includeSessionInfo: boolean;
}

export const DEFAULT_R_SCRIPT_OPTIONS: RScriptOptions = {
  includeSensitivity: true,
  includeVisualizations: true,
  includeCsv: true,
  includeSessionInfo: true,
};

const finite = (value: number): boolean => Number.isFinite(value);

export const validateRScriptInput = (data: RScriptInput): string[] => {
  const errors: string[] = [];
  const proteinCounts = data.proteinCounts;

  if (!SUPPORTED_STUDY_DESIGNS[data.analysisType]?.includes(data.studyDesign)) {
    errors.push(`Study design ${data.studyDesign} is not supported for ${data.analysisType}.`);
  }
  if (data.correctionMethod !== 'fdr' && data.correctionMethod !== 'bonferroni') {
    errors.push('Correction method must be either fdr or bonferroni.');
  }
  if (proteinCounts.length === 0) errors.push('At least one protein-count scenario is required.');
  if (proteinCounts.some((count) => !Number.isInteger(count) || count < 1 || count > 100000)) {
    errors.push('Protein counts must be integers from 1 to 100,000.');
  }
  if (new Set(proteinCounts).size !== proteinCounts.length) errors.push('Protein counts must be unique.');

  const numericValues = [
    data.effectSize,
    data.targetPower,
    data.fdrQ,
    data.sampleSize,
    data.events,
    data.prevalence,
    data.residualSD,
    data.numCases,
    data.numControls,
    data.subcohortSize,
    data.totalCohort,
    data.matchingRatio,
    data.clusterSize,
    data.icc,
    data.covariateR2,
  ];
  if (numericValues.some((value) => !finite(value))) errors.push('All calculator inputs must be finite numbers.');
  if (data.targetPower <= 0 || data.targetPower >= 1) errors.push('Target power must be between 0 and 1.');
  if (data.fdrQ <= 0 || data.fdrQ >= 1) errors.push('The multiple-testing threshold must be between 0 and 1.');
  if (data.covariateR2 < 0 || data.covariateR2 >= 1) errors.push('Covariate R-squared must be at least 0 and less than 1.');
  if (data.effectSize <= 0 && data.analysisType !== 'linear' && data.analysisType !== 'gee') {
    errors.push('Ratio effect sizes must be greater than 0.');
  }
  if (data.analysisType === 'cox' && data.events <= 0) errors.push('Cox analyses require at least one event.');
  if (data.analysisType === 'linear' && data.sampleSize <= 2) {
    errors.push('Linear analyses require more than two observations.');
  }
  if (data.analysisType === 'linear' && data.residualSD <= 0) {
    errors.push('Linear analyses require a positive residual SD.');
  }
  if (data.analysisType === 'logistic'
    && data.studyDesign !== 'case-control'
    && data.studyDesign !== 'nested-case-control'
    && data.sampleSize <= 0) {
    errors.push('Cohort and cross-sectional logistic analyses require a positive sample size.');
  }
  if (data.analysisType === 'poisson' && data.sampleSize <= 0) {
    errors.push('Poisson analyses require a positive sample size.');
  }
  if ((data.analysisType === 'logistic' || data.analysisType === 'poisson')
    && data.studyDesign !== 'case-control'
    && data.studyDesign !== 'nested-case-control'
    && (data.prevalence <= 0 || data.prevalence >= 1)) {
    errors.push('Outcome prevalence must be between 0 and 1.');
  }
  if ((data.studyDesign === 'case-control' || data.studyDesign === 'nested-case-control')
    && data.analysisType === 'logistic'
    && (data.numCases <= 0 || data.numControls <= 0)) {
    errors.push('Case-control analyses require positive case and control counts.');
  }
  if (data.analysisType === 'cox' && data.studyDesign === 'case-cohort'
    && (data.subcohortSize <= 0 || data.totalCohort <= 0)) {
    errors.push('Case-cohort analyses require positive subcohort and total cohort sizes.');
  }
  if (data.analysisType === 'cox' && data.studyDesign === 'nested-case-control' && data.matchingRatio <= 0) {
    errors.push('Nested case-control Cox analyses require a positive controls-per-case ratio.');
  }
  if (data.analysisType === 'gee' && (data.clusterSize <= 0 || data.icc < 0 || data.icc > 1)) {
    errors.push('GEE analyses require a positive cluster size and ICC from 0 to 1.');
  }
  if (data.analysisType === 'gee' && data.sampleSize <= 2) {
    errors.push('GEE analyses require more than two observations.');
  }
  if (data.analysisType === 'gee' && data.residualSD <= 0) {
    errors.push('GEE analyses require a positive residual SD.');
  }

  return errors;
};

const rNumber = (value: number): string => {
  if (Object.is(value, -0)) return '0';
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(15)));
};

const rVector = (values: readonly number[]): string => `c(${values.map(rNumber).join(', ')})`;
const rStringVector = (values: readonly string[]): string =>
  `c(${values.map((value) => JSON.stringify(value)).join(', ')})`;

const titleCase = (value: string): string => value
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

export const getRScriptFilename = (data: Pick<AnalysisSnapshot, 'analysisType' | 'studyDesign'>): string =>
  `proteomics-power-${data.analysisType}-${data.studyDesign}.R`;

const sensitivitySection = `
# ---- One-way sensitivity analyses ----
effect_grid <- if (ratio_model) {
  merge_current(${rVector(SENSITIVITY_RATIO_EFFECT_GRID)}, effect_size)
} else {
  merge_current(${rVector(SENSITIVITY_ADDITIVE_EFFECT_GRID)}, effect_size)
}

dimension_grid <- if (analysis_type == "cox") {
  merge_current(${rVector(SENSITIVITY_EVENT_GRID)}, primary_dimension)
} else {
  merge_current(${rVector(SENSITIVITY_SAMPLE_SIZE_GRID)}, primary_dimension)
}

protein_grid <- ${rVector(SENSITIVITY_PROTEIN_GRID)}

sensitivity_effect <- expand.grid(
  effect = effect_grid,
  proteins = protein_counts,
  KEEP.OUT.ATTRS = FALSE
)
sensitivity_effect$effective_alpha <- effective_alpha(sensitivity_effect$proteins)
sensitivity_effect$power <- mapply(
  power_for,
  sensitivity_effect$effect,
  sensitivity_effect$effective_alpha
)

sensitivity_dimension <- expand.grid(
  dimension = dimension_grid,
  proteins = protein_counts,
  KEEP.OUT.ATTRS = FALSE
)
sensitivity_dimension$effective_alpha <- effective_alpha(sensitivity_dimension$proteins)
sensitivity_dimension$power <- mapply(
  function(dimension, alpha) power_for(effect_size, alpha, dimension),
  sensitivity_dimension$dimension,
  sensitivity_dimension$effective_alpha
)

sensitivity_proteins <- data.frame(
  proteins = protein_grid,
  effective_alpha = effective_alpha(protein_grid)
)
sensitivity_proteins$power <- mapply(
  power_for,
  MoreArgs = list(effect = effect_size),
  alpha = sensitivity_proteins$effective_alpha
)

results$sensitivity_effect <- sensitivity_effect
results$sensitivity_dimension <- sensitivity_dimension
results$sensitivity_proteins <- sensitivity_proteins
`;

const visualizationSection = `
# ---- Six-panel visualization receipt (base R) ----
figure_path <- file.path(output_dir, "proteomics_power_visualizations.pdf")
figure_temp_path <- tempfile(pattern = ".proteomics-power-", tmpdir = output_dir, fileext = ".pdf")

render_visualization <- function() {
  device_open <- FALSE
  completed <- FALSE

  tryCatch({
    grDevices::pdf(figure_temp_path, width = 12, height = 9)
    device_open <- TRUE
    graphics::par(mfrow = c(2, 3), mar = c(4.2, 4.2, 2.8, 1.0), las = 1)
    plot_colors <- c("#0891b2", "#3b82f6", "#8b5cf6", "#f97316", "#ec4899", "#14b8a6")
    scenario_colors <- rep(plot_colors, length.out = length(protein_counts))

# 1. Power by effect size
graphics::plot(
  NA,
  xlim = range(power_curve$effect), ylim = c(0, 1),
  xlab = effect_label, ylab = "Statistical power",
  main = "Power by effect size"
)
graphics::abline(h = target_power, col = "#d97706", lty = 2)
for (i in seq_along(protein_counts)) {
  block <- power_curve[power_curve$proteins == protein_counts[i], ]
  graphics::lines(block$effect, block$power, col = scenario_colors[i], lwd = 2)
}
graphics::legend(
  "bottomright", legend = paste(format(protein_counts, big.mark = ","), "proteins"),
  col = scenario_colors, lty = 1, lwd = 2, cex = 0.7, bty = "n"
)

# 2. Power by proteins for the calculator's displayed effect grid
graphics::plot(
  NA,
  xlim = range(power_by_proteins$proteins), ylim = c(0, 1), log = "x",
  xlab = "Proteins tested (log scale)", ylab = "Statistical power",
  main = "Power by proteins"
)
graphics::abline(h = target_power, col = "#d97706", lty = 2)
display_effects_unique <- unique(power_by_proteins$effect)
effect_colors <- grDevices::hcl.colors(length(display_effects_unique), "Teal")
for (i in seq_along(display_effects_unique)) {
  block <- power_by_proteins[power_by_proteins$effect == display_effects_unique[i], ]
  graphics::lines(block$proteins, block$power, col = effect_colors[i], lwd = 1.5)
}

# 3. Power by events / sample size
viz_dimension_grid <- if (analysis_type == "cox") {
  merge_current(${rVector(SENSITIVITY_EVENT_GRID)}, primary_dimension)
} else {
  merge_current(${rVector(SENSITIVITY_SAMPLE_SIZE_GRID)}, primary_dimension)
}
graphics::plot(
  NA,
  xlim = range(viz_dimension_grid), ylim = c(0, 1),
  xlab = dimension_label, ylab = "Statistical power",
  main = paste("Power by", dimension_label)
)
graphics::abline(h = target_power, col = "#d97706", lty = 2)
for (i in seq_along(protein_counts)) {
  alpha_i <- effective_alpha(protein_counts[i])
  powers <- vapply(viz_dimension_grid, function(n) power_for(effect_size, alpha_i, n), numeric(1))
  graphics::lines(viz_dimension_grid, powers, col = scenario_colors[i], lwd = 2)
}

# 4. Required events / sample size by target power
finite_required <- required_size_curve$required_dimension[is.finite(required_size_curve$required_dimension)]
if (length(finite_required) > 0) {
  graphics::plot(
    NA,
    xlim = range(required_size_curve$target_power), ylim = range(finite_required),
    xlab = "Target power", ylab = paste("Required", dimension_label),
    main = "Required size curve"
  )
  for (i in seq_along(protein_counts)) {
    block <- required_size_curve[required_size_curve$proteins == protein_counts[i], ]
    graphics::lines(block$target_power, block$required_dimension, col = scenario_colors[i], lwd = 2)
  }
} else {
  graphics::plot.new(); graphics::title("Required size curve")
  graphics::text(0.5, 0.5, "Target effect is the null value")
}

# 5. Minimum detectable effect by protein scenario
finite_mde <- is.finite(scenario_results$minimum_detectable_effect)
if (any(finite_mde)) {
  graphics::barplot(
    scenario_results$minimum_detectable_effect[finite_mde],
    names.arg = format(scenario_results$proteins[finite_mde], big.mark = ","),
    col = scenario_colors[finite_mde], border = NA,
    xlab = "Proteins tested", ylab = paste("Minimum detectable", effect_symbol),
    main = "Minimum detectable effect"
  )
} else {
  graphics::plot.new(); graphics::title("Minimum detectable effect")
  graphics::text(0.5, 0.5, "No finite values")
}

# 6. Effect-by-size power contour at the first protein scenario
contour_x <- sort(unique(power_contour$dimension))
contour_y <- sort(unique(power_contour$effect))
contour_z <- stats::xtabs(power ~ dimension + effect, data = power_contour)
graphics::image(
  contour_x, contour_y, contour_z,
  col = grDevices::hcl.colors(20, "YlGnBu", rev = TRUE),
  xlab = dimension_label, ylab = effect_label,
  main = paste("Power grid:", format(protein_counts[1], big.mark = ","), "proteins")
)
graphics::contour(contour_x, contour_y, contour_z, add = TRUE, levels = target_power, drawlabels = TRUE)

    grDevices::dev.off()
    device_open <- FALSE
    assert_input(file.exists(figure_temp_path), "the visualization PDF was not created.")
    renamed <- file.rename(figure_temp_path, figure_path)
    assert_input(isTRUE(renamed) && file.exists(figure_path),
                 "the visualization PDF could not be finalized.")
    completed <- TRUE
  }, finally = {
    if (device_open) try(grDevices::dev.off(), silent = TRUE)
    if (!completed) unlink(figure_temp_path)
  })
}

render_visualization()
message("Saved visualization PDF: ", figure_path)
`;

const csvSection = (includeSensitivity: boolean): string => `
# ---- Machine-readable output files ----
parameter_table <- data.frame(
  parameter = names(parameters),
  value = vapply(parameters, function(value) paste(value, collapse = ";"), character(1))
)
utils::write.csv(parameter_table, file.path(output_dir, "parameters.csv"), row.names = FALSE)
utils::write.csv(scenario_results, file.path(output_dir, "scenario_results.csv"), row.names = FALSE)
utils::write.csv(power_curve, file.path(output_dir, "power_by_effect.csv"), row.names = FALSE)
utils::write.csv(power_by_proteins, file.path(output_dir, "power_by_proteins.csv"), row.names = FALSE)
utils::write.csv(required_size_curve, file.path(output_dir, "required_size_curve.csv"), row.names = FALSE)
utils::write.csv(power_contour, file.path(output_dir, "power_contour.csv"), row.names = FALSE)
${includeSensitivity ? `utils::write.csv(sensitivity_effect, file.path(output_dir, "sensitivity_effect.csv"), row.names = FALSE)
utils::write.csv(sensitivity_dimension, file.path(output_dir, "sensitivity_dimension.csv"), row.names = FALSE)
utils::write.csv(sensitivity_proteins, file.path(output_dir, "sensitivity_proteins.csv"), row.names = FALSE)` : ''}
message("Saved CSV results in: ", normalizePath(output_dir, mustWork = FALSE))
`;

const sessionInfoSection = `
# ---- Reproducibility receipt ----
session_info <- utils::capture.output(utils::sessionInfo())
writeLines(session_info, file.path(output_dir, "sessionInfo.txt"))
results$session_info <- session_info
`;

export const generateRScript = (
  data: RScriptInput,
  options: RScriptOptions = DEFAULT_R_SCRIPT_OPTIONS
): string => {
  const errors = validateRScriptInput(data);
  if (errors.length > 0) throw new Error(`Cannot generate R script: ${errors.join(' ')}`);

  const proteinCounts = data.proteinCounts;
  const isRatio = data.analysisType === 'cox' || data.analysisType === 'logistic' || data.analysisType === 'poisson';
  const analysisLabel = data.analysisType === 'cox'
    ? 'Cox proportional hazards'
    : data.analysisType === 'gee'
      ? 'GEE / mixed effects planning approximation'
      : `${titleCase(data.analysisType)} regression`;
  const effectGrid = rVector(DISPLAY_EFFECT_GRIDS[data.analysisType]);
  const [curveMin, curveMax] = POWER_CURVE_RANGES[data.analysisType];
  const curveRange = `seq(${rNumber(curveMin)}, ${rNumber(curveMax)}, length.out = ${POWER_CURVE_POINT_COUNT})`;
  const contourEffects = rVector(isRatio ? CONTOUR_RATIO_EFFECT_GRID : CONTOUR_ADDITIVE_EFFECT_GRID);
  const validDesigns = (Object.entries(SUPPORTED_STUDY_DESIGNS) as Array<[AnalysisType, readonly StudyDesign[]]>)
    .map(([analysisType, designs]) => `  ${analysisType} = ${rStringVector(designs)}`)
    .join(',\n');

  const sections = [`# Proteomics Power Calculator - reproducible R analysis
# Generated locally in the browser from the current calculator inputs.
# Analysis: ${analysisLabel}; design: ${titleCase(data.studyDesign)}.
#
# This planning script mirrors the calculator's large-sample, two-sided Wald
# approximations. Protein values are assumed standardized (mean 0, variance 1).
# For FDR, threshold / proteins is a conservative planning approximation, not
# the adaptive Benjamini-Hochberg rejection rule. Review before analytic use.
# Uses base R only; no packages are required.

# ---- Editable inputs ----
analysis_type <- "${data.analysisType}"
study_design <- "${data.studyDesign}"
correction_method <- "${data.correctionMethod}"
multiple_testing_threshold <- ${rNumber(data.fdrQ)}
protein_counts <- ${rVector(proteinCounts)}
target_power <- ${rNumber(data.targetPower)}
effect_size <- ${rNumber(data.effectSize)}

events <- ${rNumber(data.events)}
sample_size <- ${rNumber(data.sampleSize)}
residual_sd <- ${rNumber(data.residualSD)}
outcome_prevalence <- ${rNumber(data.prevalence)}
num_cases <- ${rNumber(data.numCases)}
num_controls <- ${rNumber(data.numControls)}
subcohort_size <- ${rNumber(data.subcohortSize)}
total_cohort <- ${rNumber(data.totalCohort)}
controls_per_case <- ${rNumber(data.matchingRatio)}
cluster_size <- ${rNumber(data.clusterSize)}
icc <- ${rNumber(data.icc)}
covariate_r2 <- ${rNumber(data.covariateR2)}

# Each run gets a new child directory under this editable output root.
output_root <- file.path(getwd(), "proteomics-power-results")

# ---- Input checks and shared helpers ----
valid_designs <- list(
${validDesigns}
)

invalid_input <- function(message) stop(paste("Invalid input:", message), call. = FALSE)
assert_input <- function(condition, message) {
  if (length(condition) != 1L || is.na(condition) || !condition) invalid_input(message)
}
assert_finite_scalar <- function(value, name) {
  assert_input(is.numeric(value) && length(value) == 1L && is.finite(value), paste(name, "must be a finite number."))
}

assert_input(is.character(analysis_type) && length(analysis_type) == 1L && analysis_type %in% names(valid_designs),
             "analysis_type is not supported.")
assert_input(is.character(study_design) && length(study_design) == 1L && study_design %in% valid_designs[[analysis_type]],
             "study_design is not supported for analysis_type.")
assert_input(is.character(correction_method) && length(correction_method) == 1L &&
               correction_method %in% c("fdr", "bonferroni"),
             "correction_method must be 'fdr' or 'bonferroni'.")
assert_input(is.numeric(protein_counts) && length(protein_counts) >= 1L && all(is.finite(protein_counts)),
             "protein_counts must contain finite numbers.")
assert_input(all(protein_counts == floor(protein_counts)), "protein_counts must contain integers.")
assert_input(all(protein_counts >= 1 & protein_counts <= 100000), "protein_counts must be between 1 and 100000.")
assert_input(!anyDuplicated(protein_counts), "protein_counts must be unique.")

numeric_inputs <- list(
  multiple_testing_threshold = multiple_testing_threshold, target_power = target_power,
  effect_size = effect_size, events = events, sample_size = sample_size,
  residual_sd = residual_sd, outcome_prevalence = outcome_prevalence,
  num_cases = num_cases, num_controls = num_controls,
  subcohort_size = subcohort_size, total_cohort = total_cohort,
  controls_per_case = controls_per_case, cluster_size = cluster_size,
  icc = icc, covariate_r2 = covariate_r2
)
for (input_name in names(numeric_inputs)) assert_finite_scalar(numeric_inputs[[input_name]], input_name)

assert_input(multiple_testing_threshold > 0 && multiple_testing_threshold < 1,
             "multiple_testing_threshold must be between 0 and 1.")
assert_input(target_power > 0 && target_power < 1, "target_power must be between 0 and 1.")
assert_input(covariate_r2 >= 0 && covariate_r2 < 1, "covariate_r2 must be at least 0 and less than 1.")

ratio_model <- analysis_type %in% c("cox", "logistic", "poisson")
case_control_design <- analysis_type == "logistic" && study_design %in% c("case-control", "nested-case-control")
if (ratio_model) assert_input(effect_size > 0, "ratio effect_size must be greater than 0.")
if (analysis_type == "cox") {
  assert_input(events > 0, "Cox analyses require events greater than 0.")
  if (study_design == "case-cohort") {
    assert_input(subcohort_size > 0 && total_cohort > 0,
                 "case-cohort analyses require positive subcohort_size and total_cohort.")
  }
  if (study_design == "nested-case-control") {
    assert_input(controls_per_case > 0, "nested case-control Cox analyses require controls_per_case greater than 0.")
  }
}
if (analysis_type == "linear") {
  assert_input(sample_size > 2, "linear analyses require sample_size greater than 2.")
  assert_input(residual_sd > 0, "linear analyses require residual_sd greater than 0.")
}
if (analysis_type == "logistic") {
  if (case_control_design) {
    assert_input(num_cases > 0 && num_controls > 0,
                 "case-control logistic analyses require positive num_cases and num_controls.")
  } else {
    assert_input(sample_size > 0, "cohort logistic analyses require sample_size greater than 0.")
    assert_input(outcome_prevalence > 0 && outcome_prevalence < 1,
                 "cohort logistic analyses require outcome_prevalence between 0 and 1.")
  }
}
if (analysis_type == "poisson") {
  assert_input(sample_size > 0, "Poisson analyses require sample_size greater than 0.")
  assert_input(outcome_prevalence > 0 && outcome_prevalence < 1,
               "Poisson analyses require outcome_prevalence between 0 and 1.")
}
if (analysis_type == "gee") {
  assert_input(sample_size > 2, "GEE analyses require sample_size greater than 2.")
  assert_input(residual_sd > 0, "GEE analyses require residual_sd greater than 0.")
  assert_input(cluster_size > 0, "GEE analyses require cluster_size greater than 0.")
  assert_input(icc >= 0 && icc <= 1, "GEE analyses require icc between 0 and 1.")
}

merge_current <- function(grid, current) {
  if (!is.finite(current) || current <= 0 || current %in% grid) return(sort(unique(grid)))
  sort(unique(c(grid, current)))
}

# Create a collision-safe receipt directory only after every input has passed.
dir.create(output_root, showWarnings = FALSE, recursive = TRUE)
assert_input(dir.exists(output_root), "output_root could not be created.")
run_stamp <- gsub("[^0-9]", "", format(Sys.time(), "%Y%m%d-%H%M%OS6"))
run_prefix <- paste(analysis_type, study_design, run_stamp, paste0("pid", Sys.getpid()), sep = "-")
output_dir <- file.path(output_root, run_prefix)
collision_index <- 0L
while (dir.exists(output_dir)) {
  collision_index <- collision_index + 1L
  output_dir <- file.path(output_root, paste0(run_prefix, "-", collision_index))
}
assert_input(dir.create(output_dir, recursive = TRUE), "a unique output directory could not be created.")

primary_dimension <- if (analysis_type == "cox") events else if (case_control_design) num_cases + num_controls else sample_size
dimension_label <- if (analysis_type == "cox") "events" else if (analysis_type == "gee") "total observations" else "sample size"
effect_symbol <- switch(analysis_type, cox = "HR", linear = "beta", logistic = "OR", poisson = "RR", gee = "beta")
effect_label <- switch(
  analysis_type,
  cox = "Hazard ratio (HR)",
  linear = "Per-SD beta",
  logistic = "Odds ratio (OR)",
  poisson = "Relative risk (RR)",
  gee = "Per-SD beta"
)

effective_alpha <- function(proteins) {
  ifelse(proteins > 0, multiple_testing_threshold / proteins, multiple_testing_threshold)
}

effect_on_test_scale <- function(effect) {
  if (ratio_model) abs(log(effect)) else abs(effect)
}

standard_error <- function(dimension = primary_dimension) {
  if (analysis_type == "cox") {
    if (dimension <= 0) return(Inf)
    base_se <- 1 / sqrt(dimension * (1 - covariate_r2))
    if (study_design == "case-cohort") {
      sampling_fraction <- min(1, subcohort_size / total_cohort)
      return(sqrt(1 / sampling_fraction) * base_se)
    }
    if (study_design == "nested-case-control") {
      return(base_se * sqrt(1 + 1 / controls_per_case))
    }
    return(base_se)
  }

  if (analysis_type == "linear") {
    if (dimension <= 2) return(Inf)
    return(residual_sd / sqrt((dimension - 2) * (1 - covariate_r2)))
  }

  if (analysis_type == "logistic") {
    if (case_control_design) {
      ratio <- num_controls / num_cases
      cases_at_dimension <- dimension / (1 + ratio)
      controls_at_dimension <- dimension * ratio / (1 + ratio)
      if (cases_at_dimension <= 0 || controls_at_dimension <= 0) return(Inf)
      return(sqrt((1 / cases_at_dimension + 1 / controls_at_dimension) / (1 - covariate_r2)))
    }
    if (dimension <= 0 || outcome_prevalence <= 0 || outcome_prevalence >= 1) return(Inf)
    return(1 / sqrt(dimension * outcome_prevalence * (1 - outcome_prevalence) * (1 - covariate_r2)))
  }

  if (analysis_type == "poisson") {
    if (dimension <= 0 || outcome_prevalence <= 0 || outcome_prevalence >= 1) return(Inf)
    # Deliberately conservative naive-Poisson information SE, matching the page.
    return(sqrt(1 / (dimension * outcome_prevalence * (1 - covariate_r2))))
  }

  if (analysis_type == "gee") {
    if (dimension <= 2 || cluster_size <= 0 || icc < 0 || icc > 1) return(Inf)
    design_effect <- 1 + (cluster_size - 1) * icc
    return(residual_sd * sqrt(design_effect) / sqrt((dimension - 2) * (1 - covariate_r2)))
  }

  stop("Unsupported analysis type")
}

power_from_se <- function(test_scale_effect, se, alpha) {
  if (!is.finite(se) || se <= 0 || alpha <= 0 || alpha >= 1) return(0)
  z_alpha <- stats::qnorm(alpha / 2, lower.tail = FALSE)
  noncentrality <- test_scale_effect / se
  power <- stats::pnorm(noncentrality - z_alpha) +
    stats::pnorm(noncentrality + z_alpha, lower.tail = FALSE)
  min(max(power, 0), 1)
}

power_for <- function(effect, alpha, dimension = primary_dimension) {
  if (ratio_model && effect <= 0) return(0)
  power_from_se(effect_on_test_scale(effect), standard_error(dimension), alpha)
}

minimum_detectable_effect <- function(alpha, dimension = primary_dimension, power = target_power) {
  se <- standard_error(dimension)
  if (!is.finite(se) || se <= 0) return(Inf)
  test_scale_effect <- (stats::qnorm(alpha / 2, lower.tail = FALSE) + stats::qnorm(power)) * se
  if (ratio_model) exp(test_scale_effect) else test_scale_effect
}

required_dimension <- function(effect, alpha, power = target_power) {
  test_scale_effect <- effect_on_test_scale(effect)
  if (!is.finite(test_scale_effect) || test_scale_effect <= 0) return(Inf)
  z_sum <- stats::qnorm(alpha / 2, lower.tail = FALSE) + stats::qnorm(power)

  if (analysis_type == "cox") {
    base <- ceiling((z_sum / test_scale_effect)^2 / (1 - covariate_r2))
    if (study_design == "case-cohort") {
      sampling_fraction <- min(1, subcohort_size / total_cohort)
      return(ceiling(base / sampling_fraction))
    }
    if (study_design == "nested-case-control") return(ceiling(base * (1 + 1 / controls_per_case)))
    return(base)
  }

  if (analysis_type == "linear") {
    variance_factor <- residual_sd^2 / (1 - covariate_r2)
    return(ceiling((z_sum / test_scale_effect)^2 * variance_factor + 2))
  }

  if (analysis_type == "logistic") {
    if (case_control_design) {
      ratio <- num_controls / num_cases
      variance_factor <- (1 + ratio)^2 / (ratio * (1 - covariate_r2))
    } else {
      variance_factor <- 1 / (outcome_prevalence * (1 - outcome_prevalence) * (1 - covariate_r2))
    }
    return(ceiling((z_sum / test_scale_effect)^2 * variance_factor))
  }

  if (analysis_type == "poisson") {
    variance_factor <- 1 / (outcome_prevalence * (1 - covariate_r2))
    return(ceiling((z_sum / test_scale_effect)^2 * variance_factor))
  }

  if (analysis_type == "gee") {
    design_effect <- 1 + (cluster_size - 1) * icc
    variance_factor <- residual_sd^2 * design_effect / (1 - covariate_r2)
    return(ceiling((z_sum / test_scale_effect)^2 * variance_factor + 2))
  }

  stop("Unsupported analysis type")
}

# ---- Results shown by the calculator ----
parameters <- list(
  analysis_type = analysis_type,
  study_design = study_design,
  correction_method = correction_method,
  multiple_testing_threshold = multiple_testing_threshold,
  protein_counts = protein_counts,
  target_power = target_power,
  effect_size = effect_size,
  primary_dimension = primary_dimension,
  residual_sd = residual_sd,
  outcome_prevalence = outcome_prevalence,
  num_cases = num_cases,
  num_controls = num_controls,
  subcohort_size = subcohort_size,
  total_cohort = total_cohort,
  controls_per_case = controls_per_case,
  cluster_size = cluster_size,
  icc = icc,
  covariate_r2 = covariate_r2
)

scenario_results <- data.frame(
  proteins = protein_counts,
  effective_alpha = effective_alpha(protein_counts)
)
scenario_results$standard_error <- standard_error(primary_dimension)
scenario_results$minimum_detectable_effect <- vapply(
  scenario_results$effective_alpha,
  minimum_detectable_effect,
  numeric(1)
)
scenario_results$power_at_input_effect <- vapply(
  scenario_results$effective_alpha,
  function(alpha) power_for(effect_size, alpha),
  numeric(1)
)
scenario_results$required_dimension <- vapply(
  scenario_results$effective_alpha,
  function(alpha) required_dimension(effect_size, alpha),
  numeric(1)
)

power_curve <- expand.grid(
  effect = ${curveRange},
  proteins = protein_counts,
  KEEP.OUT.ATTRS = FALSE
)
power_curve$effective_alpha <- effective_alpha(power_curve$proteins)
power_curve$power <- mapply(power_for, power_curve$effect, power_curve$effective_alpha)

display_effects <- ${effectGrid}
protein_table_counts <- ${rVector(POWER_BY_PROTEIN_TABLE_GRID)}
power_by_proteins <- expand.grid(
  effect = display_effects,
  proteins = protein_table_counts,
  KEEP.OUT.ATTRS = FALSE
)
power_by_proteins$effective_alpha <- effective_alpha(power_by_proteins$proteins)
power_by_proteins$power <- mapply(power_for, power_by_proteins$effect, power_by_proteins$effective_alpha)

target_power_grid <- ${rVector(ADVANCED_TARGET_POWER_GRID)}
required_size_curve <- expand.grid(
  target_power = target_power_grid,
  proteins = protein_counts,
  KEEP.OUT.ATTRS = FALSE
)
required_size_curve$effective_alpha <- effective_alpha(required_size_curve$proteins)
required_size_curve$required_dimension <- mapply(
  function(alpha, power) required_dimension(effect_size, alpha, power),
  required_size_curve$effective_alpha,
  required_size_curve$target_power
)

contour_effects <- ${contourEffects}
contour_dimensions <- if (analysis_type == "cox") {
  ${rVector(CONTOUR_COX_DIMENSION_GRID)}
} else {
  ${rVector(CONTOUR_SAMPLE_SIZE_GRID)}
}
power_contour <- expand.grid(
  effect = contour_effects,
  dimension = contour_dimensions,
  KEEP.OUT.ATTRS = FALSE
)
power_contour$proteins <- protein_counts[1]
power_contour$effective_alpha <- effective_alpha(protein_counts[1])
power_contour$power <- mapply(
  function(effect, dimension) power_for(effect, effective_alpha(protein_counts[1]), dimension),
  power_contour$effect,
  power_contour$dimension
)

results <- list(
  parameters = parameters,
  scenario_results = scenario_results,
  power_curve = power_curve,
  power_by_proteins = power_by_proteins,
  required_size_curve = required_size_curve,
  minimum_detectable_effects = scenario_results[, c("proteins", "effective_alpha", "minimum_detectable_effect")],
  power_contour = power_contour
)

print(parameters)
print(scenario_results, digits = 5)
`];

  if (options.includeSensitivity) sections.push(sensitivitySection);
  if (options.includeVisualizations) sections.push(visualizationSection);
  if (options.includeCsv) sections.push(csvSection(options.includeSensitivity));
  if (options.includeSessionInfo) sections.push(sessionInfoSection);

  sections.push(`
# ---- Completion manifest ----
# This file is written last. Its presence means every selected output section
# above completed without raising an R error.
write_completion_manifest <- function(lines, final_path) {
  temp_path <- tempfile(pattern = ".completion-manifest-", tmpdir = dirname(final_path))
  on.exit(unlink(temp_path), add = TRUE)
  writeLines(lines, temp_path)
  assert_input(file.exists(temp_path), "the completion manifest temporary file was not created.")
  renamed <- file.rename(temp_path, final_path)
  assert_input(isTRUE(renamed), "the completion manifest could not be finalized.")
  assert_input(file.exists(final_path), "the finalized completion manifest is missing.")
  final_path
}

manifest_lines <- c(
  "status=complete",
  paste0("analysis_type=", analysis_type),
  paste0("study_design=", study_design),
  paste0("completed_at=", format(Sys.time(), "%Y-%m-%dT%H:%M:%S%z")),
  paste0("include_sensitivity=", ${options.includeSensitivity ? 'TRUE' : 'FALSE'}),
  paste0("include_visualizations=", ${options.includeVisualizations ? 'TRUE' : 'FALSE'}),
  paste0("include_csv=", ${options.includeCsv ? 'TRUE' : 'FALSE'}),
  paste0("include_session_info=", ${options.includeSessionInfo ? 'TRUE' : 'FALSE'}),
  paste0("output_dir=", normalizePath(output_dir, mustWork = TRUE))
)
manifest_path <- write_completion_manifest(
  manifest_lines,
  file.path(output_dir, "completion-manifest.txt")
)
results$output_dir <- normalizePath(output_dir, mustWork = TRUE)
results$completion_manifest <- normalizePath(manifest_path, mustWork = TRUE)
message("Completed analysis receipt: ", results$completion_manifest)

# When sourced, the script returns every generated table in this list.
invisible(results)
`);

  return `${sections.join('\n').trim()}\n`;
};

export const downloadRScript = (script: string, filename: string): void => {
  const blob = new Blob([script], { type: 'text/x-r-source;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  let anchor: HTMLAnchorElement | null = null;
  try {
    anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor?.remove();
    URL.revokeObjectURL(url);
  }
};
