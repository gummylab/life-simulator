import type { StatKey } from "./StatBlock";

/**
 * One option the player can pick during a year.
 *
 * Kept as data instead of code so the content file stays declarative and a
 * test can scan every action for typos in its effect keys.
 */
export interface PlayerAction {
  readonly id: string;
  /** Thai label shown in the action menu. */
  readonly label: string;
  readonly minAge: number;
  readonly maxAge: number;
  /** Thai line added to the timeline after the action runs. */
  readonly resultText: string;
  /** Time units the action eats from this year's budget. */
  readonly timeCost: number;
  /** Energy drained. A positive cost marks the action as tiring. */
  readonly energyCost?: number;
  /** Energy granted instead, used by rest activities. */
  readonly energyRestore?: number;
  readonly effects: {
    readonly money?: number;
    readonly stats?: Partial<Record<StatKey, number>>;
  };
}
