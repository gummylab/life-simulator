import { Character, type Gender } from "../src/core/model/Character";
import type { StatKey } from "../src/core/model/StatBlock";

export interface CharacterOverride {
  readonly givenName?: string;
  readonly familyName?: string;
  readonly gender?: Gender;
  readonly birthYear?: number;
  readonly maxLifespan?: number;
  readonly money?: number;
  readonly energy?: number;
  readonly stats?: Partial<Record<StatKey, number>>;
}

/** Shared factory so every test builds a character the same way. */
export function makeCharacter(override: CharacterOverride = {}): Character {
  return new Character({
    givenName: override.givenName ?? "ทดสอบ",
    familyName: override.familyName ?? "หนึ่งชีวิต",
    gender: override.gender ?? "female",
    birthYear: override.birthYear ?? 2026,
    maxLifespan: override.maxLifespan ?? 100,
    money: override.money ?? 0,
    ...(override.energy !== undefined ? { energy: override.energy } : {}),
    ...(override.stats ? { stats: override.stats } : {}),
  });
}
