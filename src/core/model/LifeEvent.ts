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

/** Stat deltas and a BTC delta applied when an event fires. */
export interface EventEffects {
  readonly stats?: Partial<Record<StatKey, number>>;
  readonly money?: number;
}

/**
 * One choice a player can pick when the event asks them something.
 *
 * Options carry effects and their own result line; they never carry a
 * condition, so the choice the player sees is always the choice that is
 * available. Effects stay plain data for the same reason conditions do:
 * a test can scan every option for typos.
 */
export interface EventOption {
  /** Thai label on the choice button. */
  readonly text: string;
  /** Applied when the player picks this option. */
  readonly effects: EventEffects;
  /** Timeline line recorded after the choice. */
  readonly resultText: string;
}

/**
 * One yearly random event.
 *
 * The text may contain tokens ({school}, {place}, {currency}, {name}) that
 * the engine replaces from the world pack before the player sees it.
 * An event without options simply happens; one with options waits for the
 * player on the year screen (ADR 0017).
 */
export interface LifeEvent {
  readonly id: string;
  readonly category: EventCategory;
  readonly text: string;
  readonly weight: number;
  readonly condition?: EventCondition;
  readonly effects: EventEffects;
  /** Choices offered when the event asks the player to decide. */
  readonly options?: readonly EventOption[];
}
