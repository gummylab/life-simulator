import type { SeededRng } from "../rng/SeededRng";
import type { GameContent } from "../model/GameContent";
import type { EventCondition, LifeEvent } from "../model/LifeEvent";
import type { GameState } from "../model/GameState";
import { EVENT_YEAR_CHANCE } from "../config";
import { stageAt } from "./EducationSystem";

/**
 * Picks at most one weighted yearly event and applies it.
 *
 * Conditions are plain data (never functions) so a test can scan every
 * event for typos, and rendered text resolves every token before the
 * player sees it — braces never leak into the timeline.
 */
export class EventEngine {
  constructor(private readonly rng: SeededRng) {}

  /**
   * Rolls the yearly chance, picks one eligible event by weight, applies
   * its effects and returns the rendered Thai text. Null when nothing fires.
   */
  fire(state: GameState, content: GameContent): string | null {
    if (content.events.length === 0) return null;
    if (!this.rng.chance(EVENT_YEAR_CHANCE)) return null;

    const eligible = content.events.filter((event) => this.eligible(event, state));
    if (eligible.length === 0) return null;

    const event = this.weightedPick(eligible);
    this.applyEffects(state, event);
    return this.render(event, state, content);
  }

  /** Whether an event's condition matches the character right now. */
  eligible(event: LifeEvent, state: GameState): boolean {
    const character = state.character;
    const age = character.ageAt(state.year);
    const condition: EventCondition = event.condition ?? {};
    if (condition.minAge !== undefined && age < condition.minAge) return false;
    if (condition.maxAge !== undefined && age > condition.maxAge) return false;
    if (condition.married !== undefined && character.family.married !== condition.married) return false;
    if (condition.employed !== undefined && (character.job.id !== null) !== condition.employed) return false;
    if (
      condition.student !== undefined &&
      (stageAt(age, character.education.enrolledUniversity) !== "none") !== condition.student
    ) {
      return false;
    }
    if (condition.minSmarts !== undefined && character.stats.get("smarts") < condition.minSmarts) return false;
    if (condition.minHappiness !== undefined && character.stats.get("happiness") < condition.minHappiness) return false;
    if (condition.minHealth !== undefined && character.stats.get("health") < condition.minHealth) return false;
    if (condition.minMoney !== undefined && character.money < condition.minMoney) return false;
    return true;
  }

  /** Replaces {school} {place} {currency} {name} with world or state data. */
  render(event: LifeEvent, state: GameState, content: GameContent): string {
    const character = state.character;
    const education = character.education;
    const school =
      education.universitySchool ?? education.secondarySchool ?? education.primarySchool ?? "โรงเรียน";
    const place = content.places.length > 0 ? (this.rng.pick(content.places) ?? "เมือง") : "เมือง";
    return event.text
      .replaceAll("{school}", school)
      .replaceAll("{place}", place)
      .replaceAll("{currency}", content.currency)
      .replaceAll("{name}", character.givenName);
  }

  private applyEffects(state: GameState, event: LifeEvent): void {
    const character = state.character;
    const { stats, money } = event.effects;
    if (stats !== undefined) {
      character.stats.changeMany(stats);
    }
    if (money !== undefined) {
      character.addMoney(money);
    }
  }

  /** Weighted draw: heavier events fire more often, order stays stable. */
  private weightedPick(events: readonly LifeEvent[]): LifeEvent {
    const total = events.reduce((sum, event) => sum + Math.max(0, event.weight), 0);
    let roll = this.rng.next() * total;
    for (const event of events) {
      roll -= Math.max(0, event.weight);
      if (roll <= 0) return event;
    }
    return events[events.length - 1] ?? (events[0] as LifeEvent);
  }
}
