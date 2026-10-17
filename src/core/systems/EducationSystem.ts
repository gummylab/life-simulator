import type { GameContent } from "../model/GameContent";
import type { EducationStage } from "../model/JobSpec";
import type { GameState } from "../model/GameState";
import {
  SCHOOL_SMARTS,
  SCHOOL_TIME,
  SECONDARY_GRADUATION_AGE,
  PRIMARY_GRADUATION_AGE,
  SECONDARY_MIN_AGE,
  PRIMARY_MIN_AGE,
  TUITION,
  UNIVERSITY_GRADUATION_AGE,
  UNIVERSITY_MIN_AGE,
} from "../config";

/** Thai stage labels used by the HUD and the timeline. */
export const STAGE_LABELS: Readonly<Record<EducationStage, string>> = {
  none: "วัยเรียน",
  primary: "ชั้นประถม",
  secondary: "ชั้นมัธยม",
  university: "มหาวิทยาลัย",
};

/**
 * Which stage a character is in for the current year.
 * University only happens when the player opted in before turning 18.
 */
export function stageAt(age: number, enrolledUniversity: boolean): EducationStage {
  if (age < PRIMARY_MIN_AGE) return "none";
  if (age < SECONDARY_MIN_AGE) return "primary";
  if (age < UNIVERSITY_MIN_AGE) return "secondary";
  if (age < UNIVERSITY_GRADUATION_AGE && enrolledUniversity) return "university";
  return "none";
}

/**
 * Resolves school enrollment, tuition and learning at the start of a year.
 * Committed school time comes off the year budget; the player keeps the
 * rest for free actions.
 */
export class EducationSystem {
  startYear(state: GameState, content: GameContent): void {
    const character = state.character;
    if (!character.alive) return;
    const age = character.ageAt(state.year);
    const education = character.education;
    const stage = stageAt(age, education.enrolledUniversity);

    this.recordGraduations(state, age, education.enrolledUniversity);

    if (stage === "none") return;

    // Pick a school once per stage so the name stays stable for four years.
    const school = this.schoolFor(state, stage, content);
    if (stage === "primary") education.primarySchool = school;
    if (stage === "secondary") education.secondarySchool = school;
    if (stage === "university") education.universitySchool = school;

    character.addMoney(-TUITION[stage]);
    character.stats.change("smarts", SCHOOL_SMARTS[stage]);
    state.committedTime += SCHOOL_TIME[stage];
  }

  /** Stage label in Thai for the HUD, e.g. "ชั้นมัธยมปีที่ 3". */
  stageLabel(state: GameState): string {
    const character = state.character;
    const age = character.ageAt(state.year);
    const stage = stageAt(age, character.education.enrolledUniversity);
    if (stage === "none") return "ไม่ได้เรียน";
    const yearInStage = this.yearInStage(age, stage);
    return `${STAGE_LABELS[stage]}ปีที่ ${yearInStage}`;
  }

  private yearInStage(age: number, stage: Exclude<EducationStage, "none">): number {
    const startAge = { primary: PRIMARY_MIN_AGE, secondary: SECONDARY_MIN_AGE, university: UNIVERSITY_MIN_AGE }[stage];
    return age - startAge + 1;
  }

  /** Rolls a school name the first time a stage is entered. */
  private schoolFor(state: GameState, stage: Exclude<EducationStage, "none">, content: GameContent): string {
    const pool = content.schools[stage];
    if (pool.length === 0) return "";
    // Deterministic per character: one draw the first year, then cached.
    const index = Math.abs(state.seed + state.character.birthYear) % pool.length;
    return pool[index] ?? "";
  }

  /** Logs graduation lines once, on the year the stage ends. */
  private recordGraduations(state: GameState, age: number, enrolledUniversity: boolean): void {
    const character = state.character;
    if (age === PRIMARY_GRADUATION_AGE && character.education.primarySchool !== null) {
      state.record(`จบชั้นประถมที่ ${character.education.primarySchool}`);
    }
    if (age === SECONDARY_GRADUATION_AGE && character.education.secondarySchool !== null) {
      state.record(`จบชั้นมัธยมที่ ${character.education.secondarySchool}`);
    }
    if (age === UNIVERSITY_GRADUATION_AGE && enrolledUniversity && character.education.universitySchool !== null) {
      state.record(`จบมหาวิทยาลัยที่ ${character.education.universitySchool}`);
    }
  }
}
