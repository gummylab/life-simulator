import type { StatKey } from "./StatBlock";

/**
 * One job in the fictional job catalog.
 *
 * Kept as data so tests can scan every job for typos and the UI can render
 * a jobs panel without importing logic.
 */
export interface JobSpec {
  readonly id: string;
  /** Thai label shown in the jobs panel. */
  readonly label: string;
  readonly minAge: number;
  /** Lowest education stage that can apply. */
  readonly educationRequired: EducationStage;
  /** Optional stat floor, e.g. smarts for engineer roles. */
  readonly statRequirement?: { readonly stat: StatKey; readonly min: number };
  /** Yearly salary in BTC once employed. */
  readonly salary: number;
  /** Time units the job eats from the yearly budget (committed time). */
  readonly timeCost: number;
}

export type EducationStage = "none" | "primary" | "secondary" | "university";
