import { useMemo } from 'react';
import { calculateEffectiveAlpha, type CorrectionMethod } from '../utils/statistics';
import {
  POWER_BY_PROTEIN_TABLE_GRID,
  POWER_CHART_LINEAR_GRID,
  POWER_CHART_LOG_GRID,
} from '../constants/analysisGrids';

// Pre-compute the unique counts across all visualizations
const ALL_COUNTS: readonly number[] = Object.freeze(
  Array.from(new Set([...POWER_CHART_LINEAR_GRID, ...POWER_CHART_LOG_GRID, ...POWER_BY_PROTEIN_TABLE_GRID]))
);
const MAX_COUNT = Math.max(...ALL_COUNTS);

interface UsePowerChartDataParams {
  fdrQ: number;
  effectSizes: readonly number[];
  correctionMethod: CorrectionMethod;
  calculatePower: (effectSize: number, alpha: number) => number;
}

export function usePowerChartData({
  fdrQ,
  effectSizes,
  correctionMethod,
  calculatePower,
}: UsePowerChartDataParams) {
  // Color palette for effect size curves
  const effectColors = useMemo(() => {
    const colors: Record<number, string> = {};
    const colorScale = [
      '#991b1b', '#dc2626', '#ea580c', '#d97706', '#ca8a04',
      '#65a30d', '#16a34a', '#0d9488', '#0284c7', '#2563eb',
    ];
    effectSizes.forEach((es, idx) => {
      colors[es] = colorScale[idx];
    });
    return colors;
  }, [effectSizes]);

  const { linearChartData, logChartData, sensitivityTableData } = useMemo(() => {
    // Array pre-allocated to MAX_COUNT + 1 for O(1) integer index lookups.
    // This is faster than ES6 Map or Object for integer keys in tight loops.
    const cache = new Array<Record<string, number>>(MAX_COUNT + 1);

    // Compute exact set of required protein counts once
    for (let i = 0; i < ALL_COUNTS.length; i++) {
      const numProteins = ALL_COUNTS[i];
      const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins, correctionMethod);
      const dataPoint: Record<string, number> = { proteins: numProteins, alphaMulti };
      for (let j = 0; j < effectSizes.length; j++) {
        const es = effectSizes[j];
        dataPoint[`es_${es}`] = calculatePower(es, alphaMulti);
      }
      cache[numProteins] = dataPoint;
    }

    return {
      linearChartData: POWER_CHART_LINEAR_GRID.map(count => cache[count]),
      logChartData: POWER_CHART_LOG_GRID.map(count => cache[count]),
      sensitivityTableData: POWER_BY_PROTEIN_TABLE_GRID.map(count => cache[count]),
    };
  }, [fdrQ, correctionMethod, effectSizes, calculatePower]);

  return {
    effectColors,
    linearChartData,
    logChartData,
    sensitivityTableData,
  };
}
