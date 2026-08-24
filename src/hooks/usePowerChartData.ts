import { useMemo } from 'react';
import { calculateEffectiveAlpha, type CorrectionMethod } from '../utils/statistics';

const PROTEIN_COUNTS_FOR_TABLE = Object.freeze([1, 5, 10, 25, 50, 100, 200, 500, 1000, 3000, 5000]);

// Pre-compute arrays outside the component. The linear-scale axis stays dense
// where the power curve moves fastest (few proteins) and thins out above 50, so
// the chart is visually identical with ~4x fewer points to compute and render.
const LINEAR_COUNTS: readonly number[] = Object.freeze(
  Array.from({ length: 50 }, (_, i) => i + 1).concat(
    Array.from({ length: 190 }, (_, i) => 55 + i * 5)
  )
);

const LOG_COUNTS: readonly number[] = Object.freeze(
  Array.from({ length: 100 }, (_, i) => i + 1).concat(
    Array.from({ length: 40 }, (_, i) => 110 + i * 10),
    Array.from({ length: 10 }, (_, i) => 550 + i * 50),
    Array.from({ length: 40 }, (_, i) => 1100 + i * 100)
  )
);

// Pre-compute the unique counts across all visualizations
const ALL_COUNTS: readonly number[] = Object.freeze(
  Array.from(new Set([...LINEAR_COUNTS, ...LOG_COUNTS, ...PROTEIN_COUNTS_FOR_TABLE]))
);
const MAX_COUNT = Math.max(...ALL_COUNTS);

interface UsePowerChartDataParams {
  fdrQ: number;
  effectSizes: number[];
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
      linearChartData: LINEAR_COUNTS.map(count => cache[count]),
      logChartData: LOG_COUNTS.map(count => cache[count]),
      sensitivityTableData: PROTEIN_COUNTS_FOR_TABLE.map(count => cache[count]),
    };
  }, [fdrQ, correctionMethod, effectSizes, calculatePower]);

  return {
    effectColors,
    linearChartData,
    logChartData,
    sensitivityTableData,
  };
}
