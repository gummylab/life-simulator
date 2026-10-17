import { Character, type DeathCause, type Gender } from "../model/Character";
import { GameState, type TimelineEntry } from "../model/GameState";

/**
 * Save schema serialization.
 *
 * Pure string in, string out, so the core never touches localStorage
 * (browser storage lives in src/infra/localSave.ts). Bump SAVE_VERSION
 * whenever the payload shape changes; older files refuse to load and the
 * game starts fresh instead of crashing on missing fields.
 */

export const SAVE_VERSION = 1;

export interface LoadedGame {
  readonly state: GameState;
  /** Rate the dynasty's price model drifts from, so future years stay stable. */
  readonly baseRateUsd: number;
}

interface SavePayload {
  version: number;
  baseRateUsd: number;
  year: number;
  seed: number;
  rngState: number;
  founderFamilyName: string;
  timeLeft: number;
  committedTime: number;
  character: {
    givenName: string;
    familyName: string;
    gender: Gender;
    birthYear: number;
    maxLifespan: number;
    money: number;
    energy: number;
    stats: Record<string, number>;
    alive: boolean;
    deathCause: DeathCause | null;
  };
  timeline: TimelineEntry[];
}

/** Turns the live run into a JSON string safe to park in storage. */
export function serializeGame(state: GameState, baseRateUsd: number): string {
  const character = state.character;
  const payload: SavePayload = {
    version: SAVE_VERSION,
    baseRateUsd,
    year: state.year,
    seed: state.seed,
    rngState: state.rngState,
    founderFamilyName: state.founderFamilyName,
    timeLeft: state.timeLeft,
    committedTime: state.committedTime,
    character: {
      givenName: character.givenName,
      familyName: character.familyName,
      gender: character.gender,
      birthYear: character.birthYear,
      maxLifespan: character.maxLifespan,
      money: character.money,
      energy: character.energy,
      stats: {
        health: character.stats.get("health"),
        happiness: character.stats.get("happiness"),
        smarts: character.stats.get("smarts"),
        looks: character.stats.get("looks"),
      },
      alive: character.alive,
      deathCause: character.deathCause,
    },
    timeline: [...state.timeline],
  };
  return JSON.stringify(payload);
}

function isDeathCause(value: unknown): value is DeathCause | null {
  return value === null || value === "oldAge" || value === "illness" || value === "accident";
}

/** Rebuilds a run from JSON. Any malformed or older file yields null. */
export function deserializeGame(json: string): LoadedGame | null {
  try {
    const parsed: unknown = JSON.parse(json);
    const data = parsed as Partial<SavePayload>;
    if (data.version !== SAVE_VERSION) {
      return null;
    }
    if (
      typeof data.baseRateUsd !== "number" ||
      typeof data.year !== "number" ||
      typeof data.seed !== "number" ||
      typeof data.rngState !== "number" ||
      typeof data.timeLeft !== "number" ||
      typeof data.committedTime !== "number" ||
      typeof data.founderFamilyName !== "string"
    ) {
      return null;
    }

    const saved = data.character;
    if (
      !saved ||
      typeof saved.givenName !== "string" ||
      typeof saved.familyName !== "string" ||
      typeof saved.birthYear !== "number" ||
      typeof saved.maxLifespan !== "number" ||
      typeof saved.money !== "number" ||
      typeof saved.energy !== "number" ||
      (saved.gender !== "female" && saved.gender !== "male") ||
      !saved.stats ||
      typeof saved.alive !== "boolean" ||
      !isDeathCause(saved.deathCause)
    ) {
      return null;
    }

    const character = new Character({
      givenName: saved.givenName,
      familyName: saved.familyName,
      gender: saved.gender,
      birthYear: saved.birthYear,
      maxLifespan: saved.maxLifespan,
      money: saved.money,
      energy: saved.energy,
      stats: saved.stats as Partial<Record<string, number>>,
    });
    character.alive = saved.alive;
    character.deathCause = saved.deathCause;

    const state = new GameState({
      year: data.year,
      seed: data.seed,
      rngState: data.rngState,
      character,
      founderFamilyName: data.founderFamilyName,
      timeLeft: data.timeLeft,
      committedTime: data.committedTime,
      timeline: data.timeline ?? [],
    });

    return { state, baseRateUsd: data.baseRateUsd };
  } catch {
    return null;
  }
}
