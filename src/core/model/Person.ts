import { BOND_DEFAULT } from "../config";
import type { Gender } from "./Character";

/**
 * Anyone who is not the player: parents, partner, children, descendants.
 *
 * Kept as plain data with a stable id so the family tree links people by
 * id instead of by name (ADR 0004: a woman's surname changes on marriage,
 * so names can never carry the lineage). familyName and bond are mutable
 * for the same reason.
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
  /**
   * Closeness to the player, 0 to 100 (ADR 0019). Optional so a save
   * written before the family had a bond still loads; read it through
   * `bondOf` rather than touching the field.
   */
  bond?: number;
}

/** Closeness of a relative, with the default applied for older saves. */
export function bondOf(person: Person): number {
  return person.bond ?? BOND_DEFAULT;
}

/** Applies a bond delta and clamps it into 0..100, like the four stats. */
export function changeBond(person: Person, delta: number): number {
  const next = Math.min(100, Math.max(0, bondOf(person) + delta));
  person.bond = next;
  return next;
}

/** Whether this relative is still alive. */
export function isAlive(person: Person): boolean {
  return person.deathYear === undefined;
}
