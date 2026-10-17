import type { Gender } from "./Character";

/**
 * What the player typed on the birth setup screen.
 *
 * Collected in one value object so the factory can build a character from
 * a single, fully validated input instead of reading the DOM itself.
 */
export interface BirthSetup {
  readonly givenName: string;
  readonly familyName: string;
  readonly gender: Gender;
}
