import { StatBlock, type StatKey } from "./StatBlock";
import { ENERGY_MAX } from "../config";
import type { Person } from "./Person";

export type Gender = "female" | "male";

/**
 * Why a character stores a pre-rolled lifespan: death must be decided by age
 * plus yearly risk, and the fixed ceiling keeps a save file stable across
 * sessions instead of rerolling it on every load.
 */
export type DeathCause = "oldAge" | "illness" | "accident";

export interface CharacterSpec {
  readonly givenName: string;
  readonly familyName: string;
  readonly gender: Gender;
  readonly birthYear: number;
  readonly maxLifespan: number;
  readonly money: number;
  /** 0-100 fatigue meter. Defaults to full; carried across years. */
  readonly energy?: number;
  readonly stats?: Partial<Record<StatKey, number>>;
  /** Stable person id; defaults to a name-and-year handle for determinism. */
  readonly id?: string;
  /** Id of the starting home; null means living with the family. */
  readonly home?: string | null;
}

/**
 * One person in the current life. Age is derived from the game year.
 * The family name is a field of its own because realistic surname rules
 * change it on marriage (see ADR 0004), so it cannot stay part of the
 * immutable given name.
 */

/** Which schools were attended, plus the university opt-in flag. */
export interface EducationState {
  primarySchool: string | null;
  secondarySchool: string | null;
  universitySchool: string | null;
  enrolledUniversity: boolean;
}

/** Current job: id into the jobs catalog, seniority and promotion level. */
export interface JobState {
  id: string | null;
  years: number;
  level: number;
}

/** Family ties: parents from birth, then partner and children. */
export interface FamilyState {
  parents: Person[];
  partner: Person | null;
  married: boolean;
  children: Person[];
}

export class Character {
  /**
   * Stable person id. Children link to their parent with it (ADR 0004:
   * surnames change on marriage, so the tree cannot follow names).
   */
  readonly id: string;
  readonly givenName: string;
  /** Changes for a woman who marries, and for her children at birth. */
  familyName: string;
  readonly gender: Gender;
  readonly birthYear: number;
  readonly maxLifespan: number;
  readonly stats: StatBlock;
  money: number;
  /** Tiring actions drain this; rest restores it. Never leaves 0..100. */
  energy: number;
  /** Id of the current home, or null while living with the family (ADR 0020). */
  home: string | null;
  alive = true;
  deathCause: DeathCause | null = null;
  /** Education, job and family all live on the character: they are per-life. */
  readonly education: EducationState;
  readonly job: JobState;
  readonly family: FamilyState;

  constructor(spec: CharacterSpec) {
    this.id = spec.id ?? `c-${spec.birthYear}-${spec.givenName}`;
    this.givenName = spec.givenName;
    this.familyName = spec.familyName;
    this.gender = spec.gender;
    this.birthYear = spec.birthYear;
    this.maxLifespan = spec.maxLifespan;
    this.money = spec.money;
    this.energy = Math.min(ENERGY_MAX, Math.max(0, spec.energy ?? ENERGY_MAX));
    this.home = spec.home ?? null;
    this.stats = new StatBlock(spec.stats);
    // Phase 2 state starts empty; systems fill it in as the years pass.
    this.education = {
      primarySchool: null,
      secondarySchool: null,
      universitySchool: null,
      enrolledUniversity: false,
    };
    this.job = { id: null, years: 0, level: 0 };
    this.family = { parents: [], partner: null, married: false, children: [] };
  }

  /** Full name as shown in the HUD and in the biography. */
  get name(): string {
    return `${this.givenName} ${this.familyName}`;
  }

  ageAt(year: number): number {
    return Math.max(0, year - this.birthYear);
  }

  die(cause: DeathCause): void {
    this.alive = false;
    this.deathCause = cause;
  }

  /** Money never drops below zero; debt is out of scope for the MVP. */
  addMoney(amount: number): void {
    this.money = Math.max(0, this.money + amount);
  }

  /** Energy clamps to 0..100, the same spirit as money never going negative. */
  changeEnergy(delta: number): void {
    this.energy = Math.min(ENERGY_MAX, Math.max(0, this.energy + delta));
  }
}
