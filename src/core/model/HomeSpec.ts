import type { StatKey } from "./StatBlock";

/**
 * One place to live in the housing catalog (ADR 0020).
 *
 * Kept as data so a test can scan every home for typos and the housing
 * panel renders without importing logic, exactly like JobSpec does.
 */
export interface HomeSpec {
  readonly id: string;
  /** Thai label shown in the housing panel. */
  readonly label: string;
  /** Age before the character can rent or buy a place of their own. */
  readonly minAge: number;
  /** BTC paid once when moving in. */
  readonly downPayment: number;
  /** BTC charged every year the character lives there. */
  readonly yearlyCost: number;
  /** Comfort the home gives, applied each year it is lived in. */
  readonly effects: {
    readonly stats?: Partial<Record<StatKey, number>>;
  };
}
