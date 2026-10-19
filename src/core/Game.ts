import { GameState } from "./model/GameState";
import type { Character, DeathCause } from "./model/Character";
import type { PlayerAction, SpecialAction } from "./model/PlayerAction";
import type { GameContent } from "./model/GameContent";
import type { JobSpec } from "./model/JobSpec";
import { SeededRng } from "./rng/SeededRng";
import { AgingSystem } from "./systems/AgingSystem";
import { CareerSystem, type JobBlockReason } from "./systems/CareerSystem";
import { DeathSystem } from "./systems/DeathSystem";
import { EducationSystem } from "./systems/EducationSystem";
import { EventEngine } from "./systems/EventEngine";
import { RelationshipSystem } from "./systems/RelationshipSystem";
import {
  allowanceForAge,
  ENERGY_BLOCK_THRESHOLD,
  ENERGY_YEAR_RESTORE,
  timeBudgetForAge,
} from "./config";

export interface YearResult {
  readonly age: number;
  readonly died: boolean;
  readonly cause: DeathCause | null;
  /**
   * What the year-start systems recorded: random events, allowance,
   * promotions, graduations. The UI shows it as the year report card.
   */
  readonly news: readonly string[];
}

/** Why an action cannot run right now. Feeds the menu's block messages. */
export type ActionBlockReason =
  | "age"
  | "time"
  | "tired"
  | "money"
  | "partner"
  | "taken"
  | "spouse"
  | "done";

export type PerformActionResult =
  | {
      /** The action ran. yearEnded is set when it emptied the time budget. */
      readonly accepted: true;
      readonly yearEnded: YearResult | null;
    }
  | {
      readonly accepted: false;
      readonly reason: ActionBlockReason;
    };

/**
 * Orchestrates one year of play. The UI only calls this class, so all rules
 * stay testable without a browser (separation of concerns: no DOM here).
 */
export class Game {
  private readonly rng: SeededRng;
  private readonly aging: AgingSystem;
  private readonly death: DeathSystem;
  private readonly education: EducationSystem;
  private readonly career: CareerSystem;
  private readonly relationships: RelationshipSystem;
  private readonly events: EventEngine;

  /**
   * content stays optional so a Game built without it (older tests,
   * minimal harnesses) behaves exactly like the pre-Phase-2 engine.
   */
  constructor(private readonly state: GameState, private readonly content: GameContent | null = null) {
    this.rng = new SeededRng(state.rngState);
    this.aging = new AgingSystem(this.rng);
    this.death = new DeathSystem(this.rng);
    this.education = new EducationSystem();
    this.career = new CareerSystem();
    this.relationships = new RelationshipSystem();
    this.events = new EventEngine(this.rng);
  }

  get gameState(): GameState {
    return this.state;
  }

  get character(): Character {
    return this.state.character;
  }

  /** World and catalog data; null when the game runs without content. */
  get gameContent(): GameContent | null {
    return this.content;
  }

  /** Thai school-stage line for the HUD, e.g. "ชั้นมัธยมปีที่ 3". */
  stageLabel(): string {
    return this.education.stageLabel(this.state);
  }

  get age(): number {
    return this.state.character.ageAt(this.state.year);
  }

  /** Free time left in the current year. */
  get timeLeft(): number {
    return this.state.timeLeft;
  }

  /** The year's full time budget; committed school or work time counts in. */
  get timeBudget(): number {
    return timeBudgetForAge(this.age);
  }

  /**
   * Actions the current age may see in the menu. `showFrom` widens the
   * window so a future decision can show up disabled before its minAge;
   * actionBlockReason still guards the actual run by minAge.
   */
  availableActions(actions: readonly PlayerAction[]): readonly PlayerAction[] {
    const age = this.age;
    return actions.filter(
      (action) => age >= (action.showFrom ?? action.minAge) && age <= action.maxAge,
    );
  }

  /**
   * Remembers the action ids the player has been offered this life. The
   * menu shows the "ใหม่" badge only while an id is missing here, so a
   * milestone card is highlighted for exactly its first visible year.
   */
  markActionsSeen(ids: readonly string[]): void {
    const known = new Set(this.state.seenActions);
    for (const id of ids) {
      if (!known.has(id)) {
        known.add(id);
        this.state.seenActions.push(id);
      }
    }
  }

  /** Seen action ids as a set, for the menu's badge check. */
  get seenActions(): ReadonlySet<string> {
    return new Set(this.state.seenActions);
  }

  /** Why an action is blocked right now, or null when it can run. */
  actionBlockReason(action: PlayerAction): ActionBlockReason | null {
    const age = this.age;
    if (age < action.minAge || age > action.maxAge) {
      return "age";
    }
    if (this.state.timeLeft < action.timeCost) {
      return "time";
    }
    // Rest activities carry no energy cost, so they never hit this block.
    if ((action.energyCost ?? 0) > 0 && this.state.character.energy < ENERGY_BLOCK_THRESHOLD) {
      return "tired";
    }
    const moneyEffect = action.effects.money ?? 0;
    if (moneyEffect < 0 && this.state.character.money + moneyEffect < 0) {
      return "money";
    }
    return this.specialBlockReason(action.special ?? null);
  }

  /** Extra gates for the Phase 2 special actions. */
  private specialBlockReason(special: SpecialAction | null): ActionBlockReason | null {
    const family = this.state.character.family;
    switch (special) {
      case "enroll-university":
        return this.state.character.education.enrolledUniversity ? "done" : null;
      case "date":
        return family.partner !== null ? "taken" : null;
      case "marry":
        if (family.partner === null) return "partner";
        return family.married ? "done" : null;
      case "divorce":
        return family.married ? null : "partner";
      case "have-child":
        return family.married ? null : "spouse";
      default:
        return null;
    }
  }

  /**
   * Applies one action, spends its time and energy, and logs the result.
   * An empty time budget ends the year on the spot, which is why the
   * result carries the year's outcome when a year ended.
   */
  performAction(action: PlayerAction): PerformActionResult {
    const blocked = this.actionBlockReason(action);
    if (blocked !== null) {
      return { accepted: false, reason: blocked };
    }

    const character = this.state.character;
    this.state.timeLeft -= action.timeCost;
    character.changeEnergy(-(action.energyCost ?? 0) + (action.energyRestore ?? 0));

    const { stats, money } = action.effects;
    if (stats !== undefined) {
      character.stats.changeMany(stats);
    }
    if (money !== undefined) {
      character.addMoney(money);
    }

    // Special actions delegate to a system; the system logs its own line.
    if (action.special === undefined) {
      this.state.record(action.resultText);
    } else {
      this.runSpecial(action.special);
    }

    if (this.state.timeLeft <= 0) {
      this.state.record("ปีนี้หมดเวลา");
      return { accepted: true, yearEnded: this.advanceYear() };
    }

    this.syncRngState();
    return { accepted: true, yearEnded: null };
  }

  /** Sends a special action to its Phase 2 system. */
  private runSpecial(special: SpecialAction): void {
    const character = this.state.character;
    switch (special) {
      case "enroll-university":
        character.education.enrolledUniversity = true;
        this.state.record("วางแผนเรียนต่อมหาวิทยาลัย");
        break;
      case "date":
        this.withContent((content) => this.relationships.date(this.state, content, this.rng));
        break;
      case "marry":
        this.relationships.marry(this.state);
        break;
      case "divorce":
        this.relationships.divorce(this.state);
        break;
      case "have-child":
        this.withContent((content) => this.relationships.haveChild(this.state, content, this.rng));
        break;
    }
  }

  /** Runs the callback only when content was injected. */
  private withContent(run: (content: GameContent) => void): void {
    if (this.content !== null) {
      run(this.content);
    }
  }

  /** Whether this job can be taken right now, and why not when refused. */
  jobBlockReason(spec: JobSpec): JobBlockReason | null {
    return this.career.canApply(this.state, spec);
  }

  /** Applies for a job the player picked from the jobs panel. */
  applyForJob(spec: JobSpec): boolean {
    if (this.content === null || this.career.canApply(this.state, spec) !== null) {
      return false;
    }
    this.career.apply(this.state, this.content, spec);
    this.syncRngState();
    return true;
  }

  /** Quits the current job; next year's budget comes back whole. */
  quitJob(): void {
    if (this.content === null || this.state.character.job.id === null) {
      return;
    }
    this.career.leaveJob(this.state, this.content, "ออกจากงาน");
    this.syncRngState();
  }

  /** Moves the calendar forward one year and resolves the year's systems. */
  advanceYear(): YearResult {
    this.state.year += 1;
    // Only the year-start systems below land in the news report.
    this.state.clearNews();
    const age = this.age;
    const character = this.state.character;

    // New year, new budget: school and work claim their time first.
    if (character.alive && this.content !== null) {
      this.state.committedTime = 0;
      this.education.startYear(this.state, this.content);
      this.career.startYear(this.state, this.content);
      const eventText = this.events.fire(this.state, this.content);
      if (eventText !== null) {
        this.state.record(eventText);
      }
    }

    this.aging.advance(character, age);
    const outcome = this.death.check(character, age);

    if (outcome.died) {
      character.die(outcome.cause);
    }

    this.state.timeLeft = Math.max(0, timeBudgetForAge(age) - this.state.committedTime);
    character.changeEnergy(ENERGY_YEAR_RESTORE);

    // The family still supports the young, and stops once they can earn.
    const allowance = allowanceForAge(age);
    if (character.alive && allowance > 0) {
      character.addMoney(allowance);
      this.state.record(`ได้ค่าขนมจากทางบ้าน ${allowance} BTC`);
    }

    this.syncRngState();
    return { age, died: outcome.died, cause: outcome.cause, news: this.state.drainNews() };
  }

  /** Keeps the save file in step with the generator after every random draw. */
  private syncRngState(): void {
    this.state.rngState = this.rng.state;
  }
}
