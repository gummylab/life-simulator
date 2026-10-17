import { GameState } from "./model/GameState";
import type { Character, DeathCause } from "./model/Character";
import type { PlayerAction } from "./model/PlayerAction";
import { SeededRng } from "./rng/SeededRng";
import { AgingSystem } from "./systems/AgingSystem";
import { DeathSystem } from "./systems/DeathSystem";
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
}

/** Why an action cannot run right now. Feeds the menu's block messages. */
export type ActionBlockReason = "age" | "time" | "tired" | "money";

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

  constructor(private readonly state: GameState) {
    this.rng = new SeededRng(state.rngState);
    this.aging = new AgingSystem(this.rng);
    this.death = new DeathSystem(this.rng);
  }

  get gameState(): GameState {
    return this.state;
  }

  get character(): Character {
    return this.state.character;
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

  /** Actions the current age is allowed to take. */
  availableActions(actions: readonly PlayerAction[]): readonly PlayerAction[] {
    const age = this.age;
    return actions.filter((action) => age >= action.minAge && age <= action.maxAge);
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
    return null;
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

    this.state.record(action.resultText);

    if (this.state.timeLeft <= 0) {
      this.state.record("ปีนี้หมดเวลา");
      return { accepted: true, yearEnded: this.advanceYear() };
    }

    this.syncRngState();
    return { accepted: true, yearEnded: null };
  }

  /** Moves the calendar forward one year and resolves aging plus death. */
  advanceYear(): YearResult {
    this.state.year += 1;
    const age = this.age;
    const character = this.state.character;

    this.aging.advance(character, age);
    const outcome = this.death.check(character, age);

    if (outcome.died) {
      character.die(outcome.cause);
    }

    // New year, new budget. Committed school or work time comes off first.
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

  /** Keeps the save file in step with the generator after every random draw. */
  private syncRngState(): void {
    this.state.rngState = this.rng.state;
  }
}
