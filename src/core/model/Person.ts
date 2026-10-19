import type { Gender } from "./Character";

/**
 * Anyone who is not the player: parents, partner, children, descendants.
 *
 * Kept as plain data with a stable id so the family tree links people by
 * id instead of by name (ADR 0004: a woman's surname changes on marriage,
 * so names can never carry the lineage). familyName is mutable for the
 * same reason.
 */
export interface Person {
  readonly id: string;
  readonly givenName: string;
  familyName: string;
  readonly gender: Gender;
  /** Year the person was born. */
  readonly birthYear: number;
  /** Year the person died, while they are still part of the dynasty. */
  deathYear?: number;
  /** Id of the blood parent who links this person to the dynasty root. */
  parentId?: string;
}
