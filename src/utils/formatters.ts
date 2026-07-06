export type PowerStatus = 'adequate' | 'marginal' | 'inadequate';

/**
 * Determines the status of a power value based on target thresholds.
 * @param power The statistical power value (0 to 1)
 * @param targetPower The target power threshold (e.g., 0.8)
 * @param marginalThreshold The threshold for marginal power (default: 0.5)
 * @returns The power status
 */
export const getPowerStatus = (
  power: number,
  targetPower: number,
  marginalThreshold: number = 0.5
): PowerStatus => {
  if (power >= targetPower) return 'adequate';
  if (power >= marginalThreshold) return 'marginal';
  return 'inadequate';
};

export const POWER_STATUS_COLORS = {
  adequate: '#10b981', // green
  marginal: '#f59e0b', // amber
  inadequate: '#ef4444', // red
};

export const POWER_STATUS_TEXT_CLASSES = {
  adequate: 'text-green-600 font-semibold',
  marginal: 'text-amber-600',
  inadequate: 'text-red-600',
};

export const POWER_STATUS_BG_CLASSES = {
  adequate: 'bg-green-100 text-green-800',
  marginal: 'bg-amber-100 text-amber-800',
  inadequate: 'bg-red-100 text-red-800',
};
