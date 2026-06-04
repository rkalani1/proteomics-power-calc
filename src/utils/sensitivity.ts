import type { AnalysisType } from './statistics';

export type SensitivityVariable = 'sampleSize' | 'events' | 'effectSize' | 'proteinCount';

export const normalizeSensitivityVariable = (
  analysisType: AnalysisType,
  variable: SensitivityVariable
): SensitivityVariable => {
  if (analysisType === 'cox' && variable === 'sampleSize') return 'events';
  if (analysisType !== 'cox' && variable === 'events') return 'sampleSize';
  return variable;
};
