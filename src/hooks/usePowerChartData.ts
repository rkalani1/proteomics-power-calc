import { useMemo } from 'react';
import { calculateEffectiveAlpha, type CorrectionMethod } from '../utils/statistics';

const PROTEIN_COUNTS_FOR_TABLE = [1, 5, 10, 25, 50, 100, 200, 500, 1000, 3000, 5000];

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

  // Generate data for linear chart (1-1000 range)
  const linearChartData = useMemo(() => {
    const counts: number[] = [];
    for (let i = 1; i <= 1000; i += 1) {
      counts.push(i);
    }
    return counts.map((numProteins) => {
      const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins, correctionMethod);
      const dataPoint: Record<string, number> = { proteins: numProteins, alphaMulti };
      effectSizes.forEach((es) => {
        dataPoint[`es_${es}`] = calculatePower(es, alphaMulti);
      });
      return dataPoint;
    });
  }, [fdrQ, correctionMethod, effectSizes, calculatePower]);

  // Generate data for log chart (full 1-5000 range)
  const logChartData = useMemo(() => {
    const counts: number[] = [];
    for (let i = 1; i <= 100; i += 1) counts.push(i);
    for (let i = 110; i <= 500; i += 10) counts.push(i);
    for (let i = 550; i <= 1000; i += 50) counts.push(i);
    for (let i = 1100; i <= 5000; i += 100) counts.push(i);

    return counts.map((numProteins) => {
      const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins, correctionMethod);
      const dataPoint: Record<string, number> = { proteins: numProteins, alphaMulti };
      effectSizes.forEach((es) => {
        dataPoint[`es_${es}`] = calculatePower(es, alphaMulti);
      });
      return dataPoint;
    });
  }, [fdrQ, correctionMethod, effectSizes, calculatePower]);

  // Generate sensitivity table data
  const sensitivityTableData = useMemo(() => {
    return PROTEIN_COUNTS_FOR_TABLE.map((numProteins) => {
      const alphaMulti = calculateEffectiveAlpha(fdrQ, numProteins, correctionMethod);
      const row: Record<string, number> = { proteins: numProteins, alphaMulti };
      effectSizes.forEach((es) => {
        row[`es_${es}`] = calculatePower(es, alphaMulti);
      });
      return row;
    });
  }, [fdrQ, correctionMethod, effectSizes, calculatePower]);

  return {
    effectColors,
    linearChartData,
    logChartData,
    sensitivityTableData,
  };
}
