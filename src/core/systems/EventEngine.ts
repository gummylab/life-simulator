import type { SeededRng } from "../rng/SeededRng";
import type { GameContent } from "../model/GameContent";
import type { EventCondition, EventEffects, LifeEvent } from "../model/LifeEvent";
import type { GameState, PendingEvent } from "../model/GameState";
import { EVENT_YEAR_CHANCE } from "../config";
import { stageAt } from "./EducationSystem";

/** Values a bracketed token in event text resolves to. */
interface Tokens {
  readonly school: string;
  readonly place: string;
  readonly currency: string;
  readonly name: string;
}

/** Replaces every known token in one string. Pure, so it can be reused. */
function fill(text: string, tokens: Tokens): string {
  return text
    .replaceAll("{school}", tokens.school)
    .replaceAll("{place}", tokens.place)
    .replaceAll("{currency}", tokens.currency)
    .replaceAll("{name}", tokens.name);
}

/**
 * Picks at most one weighted yearly event and returns it ready to show.
 *
 * Conditions are plain data (never functions) so a test can scan every
 * event for typos, and rendered text resolves every token before the
 * player sees it — braces never leak into the timeline.
 *
 * An event with `options` is returned without applying anything: the player
 * answers it on the year screen and `Game` applies the chosen option
 * (ADR 0017). An event without options happens right away, exactly as it
 * always has.
 */
export class EventEngine {
  constructor(private readonly rng: SeededRng) {}

  /**
   * Rolls the yearly chance, picks one eligible event by weight and renders
   * it. Null when nothing fires. The option-less events apply their effects
   * here; the ones that ask a question are left for the player to answer.
   */
  fire(state: GameState, content: GameContent): PendingEvent | null {
    if (content.events.length === 0) return null;
    if (!this.rng.chance(EVENT_YEAR_CHANCE)) return null;

    const eligible = content.events.filter((event) => this.eligible(event, state));
    if (eligible.length === 0) return null;

    const event = this.weightedPick(eligible);
    // One place draw per fired event: every token in the prompt and in
    // every option resolves to the same town.
    const tokens = this.tokensFor(state, content);
    const options = (event.options ?? []).map((option) => ({
      label: fill(option.text, tokens),
      result: fill(option.resultText, tokens),
    }));

    if (options.length === 0) {
      this.applyEffects(state, event.effects);
    }

    return { eventId: event.id, text: fill(event.text, tokens), options };
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
    return fill(event.text, this.tokensFor(state, content));
  }

  /** Writes a stat and money delta onto the character. Never below zero. */
  applyEffects(state: GameState, effects: EventEffects): void {
    const character = state.character;
    if (effects.stats !== undefined) {
      character.stats.changeMany(effects.stats);
    }
    if (effects.money !== undefined) {
      character.addMoney(effects.money);
    }
  }

  private tokensFor(state: GameState, content: GameContent): Tokens {
    const character = state.character;
    const education = character.education;
    return {
      school:
        education.universitySchool ?? education.secondarySchool ?? education.primarySchool ?? "โรงเรียน",
      place: content.places.length > 0 ? (this.rng.pick(content.places) ?? "เมือง") : "เมือง",
      currency: content.currency,
      name: character.givenName,
    };
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
