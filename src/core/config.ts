/**
 * Tunable rules of the time and energy economy.
 *
 * Everything a designer might change while balancing lives in this one file.
 * Per-action costs stay next to their actions in content/actions.ts, the
 * same way money amounts already do.
 */

/** Free time per year by age band, in time units. Bands cover every age. */
const TIME_BANDS: readonly { readonly maxAge: number; readonly time: number }[] = [
  { maxAge: 5, time: 60 },
  { maxAge: 17, time: 80 },
  { maxAge: 64, time: 100 },
  { maxAge: 120, time: 70 },
];

export const ENERGY_MAX = 100;
/** Energy restored at the start of every year; fatigue carries over (Q43). */
export const ENERGY_YEAR_RESTORE = 20;
/** Below this, tiring actions are blocked and rest stays open (Q44). */
export const ENERGY_BLOCK_THRESHOLD = 30;

/** Money the family sends each year while the character is young, in BTC. */
const ALLOWANCE_BANDS: readonly { readonly maxAge: number; readonly btc: number }[] = [
  { maxAge: 5, btc: 0 },
  { maxAge: 13, btc: 0.0002 },
  { maxAge: 19, btc: 0.0005 },
  { maxAge: 120, btc: 0 },
];

/** Year time budget for an age. */
export function timeBudgetForAge(age: number): number {
  for (const band of TIME_BANDS) {
    if (age <= band.maxAge) {
      return band.time;
    }
  }
  // Unreachable while the last band ends at 120; kept for type safety.
  return TIME_BANDS.at(-1)?.time ?? 0;
}

/** Family allowance for an age. Zero once the character earns on their own. */
export function allowanceForAge(age: number): number {
  for (const band of ALLOWANCE_BANDS) {
    if (age <= band.maxAge) {
      return band.btc;
    }
  }
  return ALLOWANCE_BANDS.at(-1)?.btc ?? 0;
}
