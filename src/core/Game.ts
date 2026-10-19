import { GameState, type PendingEvent } from "./model/GameState";
import type { Character, DeathCause } from "./model/Character";
import type { PlayerAction, SpecialAction } from "./model/PlayerAction";
import type { GameContent } from "./model/GameContent";
import type { JobSpec } from "./model/JobSpec";
import type { HomeSpec } from "./model/HomeSpec";
import { SeededRng } from "./rng/SeededRng";
import { AgingSystem } from "./systems/AgingSystem";
import { CareerSystem, type JobBlockReason } from "./systems/CareerSystem";
import { DeathSystem } from "./systems/DeathSystem";
import { EducationSystem } from "./systems/EducationSystem";
import { EventEngine } from "./systems/EventEngine";
import { HouseholdSystem, type HomeBlockReason } from "./systems/HouseholdSystem";
import { RelationshipSystem } from "./systems/RelationshipSystem";
import {
  allowanceForAge,
  ENERGY_BLOCK_THRESHOLD,
  ENERGY_YEAR_RESTORE,
  LOOKS_FOR_DATING,
  timeBudgetForAge,
} from "./config";

export interface YearResult {
  readonly age: number;
  readonly died: boolean;
  readonly cause: DeathCause | null;
}

/** Why an action cannot run right now. Feeds the menu's block messages. */
export type ActionBlockReason =
  | "age"
  | "time"
  | "tired"
  | "money"
  | "looks"
  | "partner"
  | "taken"
  | "spouse"
  | "alone"
  | "orphan"
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
  private readonly household: HouseholdSystem;

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
    this.household = new HouseholdSystem();
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

  /** The event waiting for the player's answer, or null (ADR 0017). */
  get pendingEvent(): PendingEvent | null {
    return this.state.pendingEvent;
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
        // Dating asks for a presentable appearance, so looks can be raised
        // on purpose instead of only decaying with age (ADR 0018).
        if (family.partner !== null) return "taken";
        return this.state.character.stats.get("looks") < LOOKS_FOR_DATING ? "looks" : null;
      case "marry":
        if (family.partner === null) return "partner";
        return family.married ? "done" : null;
      case "divorce":
        return family.married ? null : "partner";
      case "have-child":
        return family.married ? null : "spouse";
      case "family-time":
      case "gift-partner":
      case "help-parents":
        // A family action needs someone left to care for (ADR 0019).
        return this.relationships.blockReason(special, this.state);
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
      case "family-time":
      case "gift-partner":
      case "help-parents":
        this.relationships.runFamilyAction(special, this.state);
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

  /** The home the character lives in, or null for the family home. */
  get home(): HomeSpec | null {
    return this.content === null ? null : this.household.homeOf(this.state, this.content);
  }

  /** What the household costs every year: home upkeep plus dependent children. */
  get yearlyHousingCost(): number {
    return this.content === null ? 0 : this.household.yearlyCost(this.state, this.content);
  }

  /** Whether moving into this home is possible now, and why not when it is not. */
  homeBlockReason(home: HomeSpec): HomeBlockReason | null {
    if (this.content === null) {
      return "age";
    }
    const blocked = this.household.blockReason(this.state, home);
    if (blocked !== null) {
      return blocked;
    }
    return this.household.canAfford(this.state, this.content, home) ? null : "money";
  }

  /** Moves into a home the player picked from the housing panel. */
  moveHome(home: HomeSpec): boolean {
    const content = this.content;
    if (content === null || this.homeBlockReason(home) !== null) {
      return false;
    }
    this.household.moveIn(this.state, content, home);
    return true;
  }

  /** Moves back in with the family; the old place is sold on the way out. */
  moveInWithFamily(): boolean {
    const content = this.content;
    if (content === null || this.state.character.home === null) {
      return false;
    }
    this.household.moveInWithFamily(this.state, content);
    return true;
  }

  /**
   * Answers the pending event with the option the player picked. The
   * effects come from the content (single source of truth) while the result
   * line comes from the frozen rendered text, so a reload shows the same
   * story it would have shown before (ADR 0017).
   */
  resolveEvent(index: number): boolean {
    const pending = this.state.pendingEvent;
    const content = this.content;
    if (pending === null || content === null || !this.state.character.alive) {
      return false;
    }
    const event = content.events.find((candidate) => candidate.id === pending.eventId);
    const option = event?.options?.[index];
    const rendered = pending.options[index];
    if (option === undefined || rendered === undefined) {
      return false;
    }
    this.events.applyEffects(this.state, option.effects);
    this.state.record(rendered.result);
    this.state.pendingEvent = null;
    return true;
  }

  /** Moves the calendar forward one year and resolves the year's systems. */
  advanceYear(): YearResult {
    this.state.year += 1;
    const age = this.age;
    const character = this.state.character;

    // New year, new budget: school and work claim their time first.
    if (character.alive && this.content !== null) {
      this.state.committedTime = 0;
      this.education.startYear(this.state, this.content);
      this.career.startYear(this.state, this.content);
      this.household.startYear(this.state, this.content);
      this.rollEvent(this.content);
    }

    this.aging.advance(character, age);
    const outcome = this.death.check(character, age);

    if (outcome.died) {
      character.die(outcome.cause);
    }

    // Relatives age and pass away after the player's own roll. Keeping
    // these draws last means the same seed still produces the same player
    // life it did before the family ever had a bond (ADR 0019).
    if (character.alive) {
      this.relationships.rollFamilyDeaths(this.state, this.rng);
      this.relationships.applyBondDecay(this.state);
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
    return { age, died: outcome.died, cause: outcome.cause };
  }

  /**
   * Rolls the year's event. A question still waiting for an answer expires
   * with the year it belongs to: the player spent that year without
   * deciding, and no new event rolls in its place, so a choice can never be
   * buried under a newer one (ADR 0017).
   */
  private rollEvent(content: GameContent): void {
    if (this.state.pendingEvent !== null) {
      this.state.pendingEvent = null;
      this.state.record("ปล่อยเรื่องที่ค้างไว้ผ่านไปโดยไม่ได้ตัดสินใจ");
      return;
    }
    const fired = this.events.fire(this.state, content);
    if (fired === null) {
      return;
    }
    if (fired.options.length === 0) {
      this.state.record(fired.text);
      return;
    }
    this.state.pendingEvent = fired;
  }

  /** Keeps the save file in step with the generator after every random draw. */
  private syncRngState(): void {
    this.state.rngState = this.rng.state;
  }
}
