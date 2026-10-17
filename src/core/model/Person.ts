import type { Gender } from "./Character";

/**
 * Anyone who is not the player: parents, partner, children.
 *
 * Kept as plain data with a stable id so a future family tree (Phase 3)
 * can link people without parsing names. familyName is mutable because a
 * woman takes her husband's surname on marriage (ADR 0004).
 */
export interface Person {
  readonly id: string;
  readonly givenName: string;
  familyName: string;
  readonly gender: Gender;
  /** Year the person was born; children need it for the family tree. */
  readonly birthYear: number;
}
