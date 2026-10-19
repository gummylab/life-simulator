import type { Character, DeathCause } from "../model/Character";
import type { SeededRng } from "../rng/SeededRng";

export type DeathOutcome =
  | { readonly died: true; readonly cause: DeathCause }
  | { readonly died: false; readonly cause: null };

interface AgeRisk {
  readonly minAge: number;
  /** Yearly chance of dying before any health modifier. */
  readonly chance: number;
}

const AGE_RISK: readonly AgeRisk[] = [
  { minAge: 0, chance: 0.0002 },
  { minAge: 30, chance: 0.001 },
  { minAge: 50, chance: 0.004 },
  { minAge: 65, chance: 0.012 },
  { minAge: 75, chance: 0.04 },
  { minAge: 85, chance: 0.12 },
];

const HEALTH_FACTOR_FIT = 0.4;
const HEALTH_FACTOR_FRAIL = 1.4;

function baseRisk(age: number): number {
  let risk = AGE_RISK[0]?.chance ?? 0;
  for (const band of AGE_RISK) {
    if (age >= band.minAge) {
      risk = band.chance;
    }
  }
  return risk;
}

/**
 * Yearly chance of dying at an age, before any health modifier.
 *
 * Exported so relatives (who have no health bar of their own) age on the
 * same curve as the player instead of a second, drifting copy of it
 * (ADR 0019).
 */
export function yearlyDeathChance(age: number): number {
  return baseRisk(age);
}

function causeFor(age: number, health: number): DeathCause {
  if (health <= 35) {
    return "illness";
  }
  if (age >= 70) {
    return "oldAge";
  }
  return "accident";
}

/**
 * Rolls once per year whether the character dies.
 *
 * Two rules decide it: a hard lifespan ceiling rolled at birth, and a yearly
 * risk that rises with age and with low health. A discriminated union result
 * forces callers to handle the cause without null checks.
 */
export class DeathSystem {
  constructor(private readonly rng: SeededRng) {}

  check(character: Character, age: number): DeathOutcome {
    if (age >= character.maxLifespan) {
      return { died: true, cause: "oldAge" };
    }

    const health = character.stats.get("health");
    const healthFactor =
      HEALTH_FACTOR_FIT +
      ((HEALTH_FACTOR_FRAIL - HEALTH_FACTOR_FIT) * (100 - health)) / 100;

    if (!this.rng.chance(baseRisk(age) * healthFactor)) {
      return { died: false, cause: null };
    }

    return { died: true, cause: causeFor(age, health) };
  }
}
