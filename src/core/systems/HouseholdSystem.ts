import type { GameContent } from "../model/GameContent";
import type { GameState } from "../model/GameState";
import type { HomeSpec } from "../model/HomeSpec";
import { isAlive } from "../model/Person";
import {
  CHILD_COST,
  CHILD_DEPENDENT_AGE,
  HOME_RESALE_SHARE,
} from "../config";

/** Why a home cannot be moved into right now. */
export type HomeBlockReason = "age" | "money";

/**
 * What living costs each year (ADR 0020).
 *
 * One responsibility: the yearly bill of a household. Rent or upkeep for
 * the current home, plus one charge per dependent child. The base cost of
 * living stays where it was, charged with the salary by CareerSystem, so
 * this system only adds the parts that depend on the player's choices.
 *
 * Everything it spends is written to the timeline, because a silent
 * deduction is how money stops meaning anything.
 */
export class HouseholdSystem {
  /** The home the character lives in now, or null for the family home. */
  homeOf(state: GameState, content: GameContent): HomeSpec | null {
    const id = state.character.home;
    if (id === null) {
      return null;
    }
    return content.homes.find((home) => home.id === id) ?? null;
  }

  /** What the household costs every year at the current setup, in BTC. */
  yearlyCost(state: GameState, content: GameContent): number {
    const home = this.homeOf(state, content);
    return (home?.yearlyCost ?? 0) + this.childrenCost(state);
  }

  /** Why this home cannot be moved into, or null when it can. */
  blockReason(state: GameState, home: HomeSpec): HomeBlockReason | null {
    const character = state.character;
    if (character.ageAt(state.year) < home.minAge) {
      return "age";
    }
    return null;
  }

  /** What moving out of the current home hands back. */
  resaleValue(state: GameState, content: GameContent): number {
    const home = this.homeOf(state, content);
    return home === null ? 0 : home.downPayment * HOME_RESALE_SHARE;
  }

  /** Whether the purse covers the down payment after the old home's resale. */
  canAfford(state: GameState, content: GameContent, home: HomeSpec): boolean {
    const purse = state.character.money + this.resaleValue(state, content);
    return purse >= home.downPayment;
  }

  /**
   * Moves into a new home: sells the old one, pays the down payment for the
   * new one, and logs both sides so the player can see what the move cost.
   */
  moveIn(state: GameState, content: GameContent, home: HomeSpec): void {
    const resale = this.resaleValue(state, content);
    state.character.home = home.id;
    state.character.addMoney(resale - home.downPayment);
    if (resale > 0) {
      state.record(`ขายที่อยู่เดิมได้คืน ${resale} BTC`);
    }
    state.record(`ย้ายเข้า${home.label} จ่ายเงินดาวน์ ${home.downPayment} BTC`);
  }

  /** Moves back in with the family: no down payment, resale still paid. */
  moveInWithFamily(state: GameState, content: GameContent): void {
    const resale = this.resaleValue(state, content);
    state.character.home = null;
    state.character.addMoney(resale);
    state.record(
      resale > 0
        ? `ขายที่อยู่เดิมได้คืน ${resale} BTC แล้วย้ายกลับไปอยู่กับครอบครัว`
        : "ย้ายกลับไปอยู่กับครอบครัว",
    );
  }

  /**
   * Charges one year of the household bill. The comfort of the home lands
   * here too, so a better place is worth its rent every single year.
   */
  startYear(state: GameState, content: GameContent): void {
    const character = state.character;
    if (!character.alive) {
      return;
    }

    const home = this.homeOf(state, content);
    if (home !== null) {
      this.pay(state, home.yearlyCost, `ค่าที่อยู่${home.label}`);
      if (home.effects.stats !== undefined) {
        character.stats.changeMany(home.effects.stats);
      }
    }

    const dependents = this.dependents(state);
    if (dependents > 0) {
      this.pay(state, dependents * CHILD_COST, `ค่าดูแลบุตร ${dependents} คน`);
    }
  }

  /** Children young enough to still cost money. */
  private dependents(state: GameState): number {
    return state.character.family.children.filter(
      (child) => isAlive(child) && state.year - child.birthYear < CHILD_DEPENDENT_AGE,
    ).length;
  }

  private childrenCost(state: GameState): number {
    return this.dependents(state) * CHILD_COST;
  }

  /** Spends what the purse holds and says honestly what was paid. */
  private pay(state: GameState, amount: number, what: string): void {
    if (amount <= 0) {
      return;
    }
    const paid = Math.min(amount, state.character.money);
    state.character.addMoney(-paid);
    state.record(
      paid < amount
        ? `จ่าย${what}ได้ไม่ครบ ${paid} BTC (เงินไม่พอ)`
        : `จ่าย${what} ${paid} BTC`,
    );
  }
}
