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

/* ------------------------------------------------------------------ *
 * Phase 2: education, career and events balance.
 * All numbers live here so a single file stays the tuning surface.
 * ------------------------------------------------------------------ */

/** Thai education stages by age band. Ages fall into exactly one stage. */
export const PRIMARY_MIN_AGE = 6;
export const SECONDARY_MIN_AGE = 12;
export const UNIVERSITY_MIN_AGE = 18;
export const PRIMARY_GRADUATION_AGE = 12;
export const SECONDARY_GRADUATION_AGE = 18;
export const UNIVERSITY_GRADUATION_AGE = 22;

/** Yearly tuition per stage in BTC; university is the expensive one. */
export const TUITION: Readonly<Record<"primary" | "secondary" | "university", number>> = {
  primary: 0.00002,
  secondary: 0.00005,
  university: 0.0004,
};

/** Time units school commits each year; the rest of the budget stays free. */
export const SCHOOL_TIME: Readonly<Record<"primary" | "secondary" | "university", number>> = {
  primary: 30,
  secondary: 40,
  university: 50,
};

/** Smarts gained per school year; university teaches the most. */
export const SCHOOL_SMARTS: Readonly<Record<"primary" | "secondary" | "university", number>> = {
  primary: 1,
  secondary: 2,
  university: 4,
};

/** Living costs while employed; deducted with each salary payment. */
export const YEARLY_EXPENSES = 0.00015;

/** Promotion every N years on the same job; each level adds this salary share. */
export const PROMOTION_EVERY_YEARS = 3;
export const PROMOTION_RAISE = 0.25;
/** Levels cap out so a 60-year career never pays billions. */
export const PROMOTION_MAX_LEVEL = 5;

/** Chance a yearly event fires at all; a second pick never happens. */
export const EVENT_YEAR_CHANCE = 0.6;

/** Yearly salary per job id, in BTC. Kept here so one file tunes the economy. */
export const SALARY = {
  "part-time-shop": 0.0004,
  "kitchen-helper": 0.0006,
  "delivery-rider": 0.0008,
  clerk: 0.0012,
  sales: 0.0015,
  technician: 0.0018,
  teacher: 0.0024,
  engineer: 0.0035,
} as const satisfies Record<string, number>;
