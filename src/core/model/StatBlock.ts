/** The four life stats shown in the HUD. All values stay inside 0..100. */
export type StatKey = "health" | "happiness" | "smarts" | "looks";

export const STAT_KEYS: readonly StatKey[] = ["health", "happiness", "smarts", "looks"];

export const STAT_MIN = 0;
export const STAT_MAX = 100;
export const STAT_DEFAULT = 50;

function clamp(value: number): number {
  return Math.min(STAT_MAX, Math.max(STAT_MIN, value));
}

/**
 * Owns the four life stats of one character.
 *
 * Why a class instead of a plain object: every write has to be clamped, and
 * a single place for that rule prevents the UI from showing a health of 140.
 */
export class StatBlock {
  private readonly values: Record<StatKey, number>;

  constructor(initial?: Partial<Record<StatKey, number>>) {
    this.values = {
      health: clamp(initial?.health ?? STAT_DEFAULT),
      happiness: clamp(initial?.happiness ?? STAT_DEFAULT),
      smarts: clamp(initial?.smarts ?? STAT_DEFAULT),
      looks: clamp(initial?.looks ?? STAT_DEFAULT),
    };
  }

  get(key: StatKey): number {
    return this.values[key];
  }

  /** Applies a signed delta and clamps the result into 0..100. */
  change(key: StatKey, delta: number): void {
    this.values[key] = clamp(this.values[key] + delta);
  }

  changeMany(deltas: Partial<Record<StatKey, number>>): void {
    for (const key of STAT_KEYS) {
      const delta = deltas[key];
      if (delta !== undefined) {
        this.change(key, delta);
      }
    }
  }

  /** Plain copy for rendering. Mutating the result never affects the block. */
  snapshot(): Record<StatKey, number> {
    return { ...this.values };
  }
}
