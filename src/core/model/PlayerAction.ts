import type { StatKey } from "./StatBlock";

/** Actions the engine routes to a Phase 2 system instead of plain effects. */
export type SpecialAction =
  | "enroll-university"
  | "date"
  | "marry"
  | "divorce"
  | "have-child"
  | "family-time"
  | "gift-partner"
  | "help-parents";

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
  /**
   * Age the action first appears in the menu, when it should be visible
   * before it can run. Defaults to minAge. A visible-but-blocked action
   * lets the player see an upcoming decision early (e.g. university at 16).
   */
  readonly showFrom?: number;
  /** Thai line added to the timeline after the action runs. */
  readonly resultText: string;
  /** Time units the action eats from this year's budget. */
  readonly timeCost: number;
  /** Energy drained. A positive cost marks the action as tiring. */
  readonly energyCost?: number;
  /** Energy granted instead, used by rest activities. */
  readonly energyRestore?: number;
  /** Hands the action to a relationship or education system. */
  readonly special?: SpecialAction;
  readonly effects: {
    readonly money?: number;
    readonly stats?: Partial<Record<StatKey, number>>;
  };
}
