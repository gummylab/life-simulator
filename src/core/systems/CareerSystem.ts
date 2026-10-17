import type { GameContent } from "../model/GameContent";
import type { EducationStage, JobSpec } from "../model/JobSpec";
import type { GameState } from "../model/GameState";
import { PROMOTION_EVERY_YEARS, PROMOTION_MAX_LEVEL, PROMOTION_RAISE, YEARLY_EXPENSES } from "../config";

/** Why a job application is refused. Feeds the jobs panel messages. */
export type JobBlockReason = "age" | "education" | "stat" | "already";

const STAGE_RANK: Readonly<Record<EducationStage, number>> = {
  none: 0,
  primary: 1,
  secondary: 2,
  university: 3,
};

/**
 * Resolves employment at the start of a year: salary in, living costs out,
 * seniority up, promotions by years served. Unemployment simply returns the
 * committed time to the free pool.
 */
export class CareerSystem {
  startYear(state: GameState, content: GameContent): void {
    const character = state.character;
    if (!character.alive) return;
    const age = character.ageAt(state.year);
    const job = character.job;
    const spec = content.jobs.find((j) => j.id === job.id);
    if (!spec || age < spec.minAge) {
      this.leaveJob(state, content, "ออกจากงาน");
      return;
    }

    job.years += 1;
    const levelBefore = job.level;
    if (job.years % PROMOTION_EVERY_YEARS === 0 && job.level < PROMOTION_MAX_LEVEL) {
      job.level += 1;
      state.record(`เลื่อนขั้นเป็น${spec.label} ระดับ ${job.level}`);
    }
    const salary = this.salaryOf(spec, levelBefore);
    character.addMoney(salary - YEARLY_EXPENSES);
    state.committedTime += spec.timeCost;
  }

  /** Whether the character can take this job right now. */
  canApply(state: GameState, spec: JobSpec): JobBlockReason | null {
    const character = state.character;
    const age = character.ageAt(state.year);
    if (age < spec.minAge) return "age";
    if (character.job.id === spec.id) return "already";

    const stage = this.currentEducationStage(character);
    if (STAGE_RANK[stage] < STAGE_RANK[spec.educationRequired]) return "education";

    const req = spec.statRequirement;
    if (req && character.stats.get(req.stat) < req.min) return "stat";
    return null;
  }

  /** Hires the character; the job's time is committed from the next year. */
  apply(state: GameState, content: GameContent, spec: JobSpec): void {
    const character = state.character;
    character.job.id = spec.id;
    character.job.years = 0;
    character.job.level = 0;
    const workplace = content.workplaces[0] ?? "";
    state.record(`ได้งานเป็น${spec.label}ที่${workplace}`);
  }

  /** Quits or retires; the next year's budget comes back whole. */
  leaveJob(state: GameState, content: GameContent, reason: string): void {
    const character = state.character;
    const spec = content.jobs.find((j) => j.id === character.job.id);
    character.job.id = null;
    character.job.years = 0;
    character.job.level = 0;
    if (spec) {
      state.record(`${reason}จากตำแหน่ง${spec.label}`);
    }
  }

  /** Salary for a level: base plus a raise share per promotion. */
  salaryOf(spec: JobSpec, level: number): number {
    return spec.salary * (1 + PROMOTION_RAISE * level);
  }

  private currentEducationStage(character: GameState["character"]): EducationStage {
    const education = character.education;
    if (education.universitySchool !== null) return "university";
    if (education.secondarySchool !== null) return "secondary";
    if (education.primarySchool !== null) return "primary";
    return "none";
  }
}
