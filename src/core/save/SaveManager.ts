import { Character, type DeathCause, type Gender } from "../model/Character";
import {
  GameState,
  type DynastyState,
  type PendingEvent,
  type PendingEventOption,
  type TimelineEntry,
} from "../model/GameState";
import type { Person } from "../model/Person";
import { BOND_DEFAULT } from "../config";

/**
 * Save schema serialization.
 *
 * Pure string in, string out, so the core never touches localStorage
 * (browser storage lives in src/infra/localSave.ts). Bump SAVE_VERSION
 * whenever the payload shape changes; older files refuse to load and the
 * game starts fresh instead of crashing on missing fields.
 *
 * Fields added after the first release stay optional and fall back to a
 * safe default, so a live save on GitHub Pages never dies of a new feature.
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
    /** Phase 2 fields; optional so version-1 files from before them still load. */
    education?: {
      primarySchool: string | null;
      secondarySchool: string | null;
      universitySchool: string | null;
      enrolledUniversity: boolean;
    };
    job?: { id: string | null; years: number; level: number };
    /** Phase 10 home id; optional so older files keep loading. */
    home?: string | null;
    family?: {
      parents: Person[];
      partner: Person | null;
      married: boolean;
      children: Person[];
    };
  };
  /** Phase 3 dynasty records; optional so older files keep loading. */
  dynasty?: {
    generation: number;
    tree: Person[];
    chronicle: string[];
  };
  /** Phase 5 "new action" badges; optional so older files keep loading. */
  seenActions?: string[];
  /** Phase 8 event waiting for an answer; optional for the same reason. */
  pendingEvent?: PendingEvent | null;
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
      education: {
        primarySchool: character.education.primarySchool,
        secondarySchool: character.education.secondarySchool,
        universitySchool: character.education.universitySchool,
        enrolledUniversity: character.education.enrolledUniversity,
      },
      job: { id: character.job.id, years: character.job.years, level: character.job.level },
      home: character.home,
      family: {
        parents: [...character.family.parents],
        partner: character.family.partner,
        married: character.family.married,
        children: [...character.family.children],
      },
    },
    dynasty: {
      generation: state.dynasty.generation,
      tree: state.dynasty.tree.map((person) => ({ ...person })),
      chronicle: [...state.dynasty.chronicle],
    },
    seenActions: [...state.seenActions],
    pendingEvent:
      state.pendingEvent === null
        ? null
        : {
            eventId: state.pendingEvent.eventId,
            text: state.pendingEvent.text,
            options: state.pendingEvent.options.map((option) => ({ ...option })),
          },
    timeline: [...state.timeline],
  };
  return JSON.stringify(payload);
}

/** A tree member must at least look like a Person to be trusted. */
function isPerson(value: unknown): value is Person {
  const candidate = value as Partial<Person> | null;
  return (
    candidate !== null &&
    typeof candidate === "object" &&
    typeof candidate.id === "string" &&
    typeof candidate.givenName === "string" &&
    typeof candidate.familyName === "string" &&
    (candidate.gender === "female" || candidate.gender === "male") &&
    typeof candidate.birthYear === "number"
  );
}

/** Closeness a file may carry, clamped so a broken one cannot flood a bar. */
function readBond(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : BOND_DEFAULT;
}

/** A person as the game wants them: valid shape, bond inside 0..100. */
function normalizePerson(person: Person): Person {
  return { ...person, bond: readBond(person.bond) };
}

/** Reads a list of relatives, dropping anything that is not a person. */
function readPeople(value: unknown): Person[] {
  return Array.isArray(value) ? value.filter(isPerson).map(normalizePerson) : [];
}

/** Reads the partner slot, which may legitimately be empty. */
function readPartner(value: unknown): Person | null {
  return isPerson(value) ? normalizePerson(value) : null;
}

/** Accepts the dynasty block when well-formed, or returns a safe default. */
function readDynasty(value: unknown): DynastyState | undefined {
  const candidate = value as Partial<DynastyState> | null;
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    typeof candidate.generation !== "number" ||
    !Array.isArray(candidate.tree) ||
    !Array.isArray(candidate.chronicle)
  ) {
    return undefined;
  }
  return {
    generation: Math.max(1, Math.floor(candidate.generation)),
    tree: candidate.tree.filter(isPerson).map(normalizePerson),
    chronicle: candidate.chronicle.filter((line): line is string => typeof line === "string"),
  };
}

function isRenderedOption(value: unknown): value is PendingEventOption {
  const candidate = value as Partial<PendingEventOption> | null;
  return (
    candidate !== null &&
    typeof candidate === "object" &&
    typeof candidate.label === "string" &&
    typeof candidate.result === "string"
  );
}

/**
 * Accepts a pending event only when it still has at least one usable
 * choice; anything else is dropped, which simply costs the player one
 * event instead of breaking the load.
 */
function readPendingEvent(value: unknown): PendingEvent | null {
  const candidate = value as Partial<PendingEvent> | null;
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    typeof candidate.eventId !== "string" ||
    typeof candidate.text !== "string" ||
    !Array.isArray(candidate.options)
  ) {
    return null;
  }
  const options = candidate.options.filter(isRenderedOption).map((option) => ({ ...option }));
  if (options.length === 0) {
    return null;
  }
  return { eventId: candidate.eventId, text: candidate.text, options };
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
    // Version-1 saves from before Phase 2 simply keep the empty defaults.
    if (saved.education) {
      character.education.primarySchool = saved.education.primarySchool ?? null;
      character.education.secondarySchool = saved.education.secondarySchool ?? null;
      character.education.universitySchool = saved.education.universitySchool ?? null;
      character.education.enrolledUniversity = saved.education.enrolledUniversity ?? false;
    }
    if (saved.job) {
      character.job.id = saved.job.id ?? null;
      character.job.years = saved.job.years ?? 0;
      character.job.level = saved.job.level ?? 0;
    }
    // An unknown home id reads as the family home instead of a broken screen.
    character.home = typeof saved.home === "string" ? saved.home : null;
    if (saved.family) {
      character.family.parents = readPeople(saved.family.parents);
      character.family.partner = readPartner(saved.family.partner);
      character.family.married = saved.family.married ?? false;
      character.family.children = readPeople(saved.family.children);
    }

    const state = new GameState({
      year: data.year,
      seed: data.seed,
      rngState: data.rngState,
      character,
      founderFamilyName: data.founderFamilyName,
      timeLeft: data.timeLeft,
      committedTime: data.committedTime,
      timeline: data.timeline ?? [],
      dynasty: readDynasty(data.dynasty),
      seenActions: Array.isArray(data.seenActions)
        ? data.seenActions.filter((id): id is string => typeof id === "string")
        : [],
      pendingEvent: readPendingEvent(data.pendingEvent),
    });

    return { state, baseRateUsd: data.baseRateUsd };
  } catch {
    return null;
  }
}
