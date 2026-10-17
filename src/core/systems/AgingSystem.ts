import type { Character } from "../model/Character";
import type { SeededRng } from "../rng/SeededRng";

/**
 * Passive stat drift that comes with growing one year older.
 *
 * The thresholds are simple on purpose: a young brain still learns, an aging
 * body loses health, looks fade after the mid thirties, and mood wobbles.
 * Balance numbers live here so Phase 2 tuning touches one file only.
 */
export class AgingSystem {
  constructor(private readonly rng: SeededRng) {}

  advance(character: Character, age: number): void {
    const stats = character.stats;

    // Peak learning years: smarts climb until the mid twenties.
    if (age <= 25) {
      stats.change("smarts", 1);
    }

    // Health loss accelerates once the body is past its prime.
    if (age >= 30) {
      stats.change("health", age >= 60 ? -2 : -1);
    }

    if (age >= 35) {
      stats.change("looks", -1);
    }

    // Mood jitter keeps an unchanged year from feeling static.
    stats.change("happiness", this.rng.between(-2, 2));
  }
}
