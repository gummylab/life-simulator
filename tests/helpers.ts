import { Character, type Gender } from "../src/core/model/Character";
import type { StatKey } from "../src/core/model/StatBlock";
import { Game } from "../src/core/Game";
import { GameState } from "../src/core/model/GameState";
import { timeBudgetForAge } from "../src/core/config";
import { GAME_CONTENT } from "../src/content/gameContent";

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

export interface GameOptions extends CharacterOverride {
  /** Character's age at construction; the year shifts to match birthYear. */
  readonly age?: number;
}

/**
 * A Game wired with the real content bundle, starting at a chosen age.
 * Phase 2 systems (school, jobs, events) all run, unlike the bare Game
 * used by the older tests.
 */
export function makeContentGame(options: GameOptions = {}): Game {
  const birthYear = options.birthYear ?? 2026;
  const age = options.age ?? 0;
  const character = makeCharacter({ ...options, birthYear });
  const state = new GameState({
    year: birthYear + age,
    seed: 7,
    rngState: 7,
    character,
    founderFamilyName: character.familyName,
    timeLeft: timeBudgetForAge(age),
  });
  return new Game(state, GAME_CONTENT);
}
