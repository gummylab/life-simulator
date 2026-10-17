import type { StatKey } from "./StatBlock";

export type EventCategory =
  | "health"
  | "money"
  | "relationship"
  | "career"
  | "education"
  | "accident";

/**
 * Data-driven condition on the character's current state.
 * Every field is optional; an absent field never blocks the event.
 * A test scans these keys against the real model so typos fail fast.
 */
export interface EventCondition {
  readonly minAge?: number;
  readonly maxAge?: number;
  readonly married?: boolean;
  readonly employed?: boolean;
  readonly student?: boolean;
  readonly minSmarts?: number;
  readonly minHappiness?: number;
  readonly minHealth?: number;
  readonly minMoney?: number;
}

/** Stat deltas and a BTC delta applied when the event fires. */
export interface EventEffects {
  readonly stats?: Partial<Record<StatKey, number>>;
  readonly money?: number;
}

/**
 * One yearly random event.
 *
 * The text may contain tokens ({school}, {place}, {currency}) that the
 * engine replaces from the world pack before the player sees it.
 */
export interface LifeEvent {
  readonly id: string;
  readonly category: EventCategory;
  readonly text: string;
  readonly weight: number;
  readonly condition?: EventCondition;
  readonly effects: EventEffects;
}
