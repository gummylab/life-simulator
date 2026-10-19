import { describe, expect, test } from "bun:test";
import { EVENTS } from "../src/content/events";
import { STAT_KEYS, type StatKey } from "../src/core/model/StatBlock";
import type { EventCategory } from "../src/core/model/LifeEvent";

const CATEGORY_LABELS: readonly EventCategory[] = [
  "health",
  "money",
  "relationship",
  "career",
  "education",
  "accident",
];

const KNOWN_TOKENS = ["{school}", "{place}", "{currency}", "{name}"];
const CONDITION_KEYS = [
  "minAge",
  "maxAge",
  "married",
  "employed",
  "student",
  "minSmarts",
  "minHappiness",
  "minHealth",
  "minMoney",
  "minBond",
  "maxBond",
];

/** Every event that asks the player something, for the choice-shaped scans. */
const CHOICE_EVENTS = EVENTS.filter(
  (event) => event.options !== undefined && event.options.length > 0,
);

/** All texts a player can see for one event: prompt, labels and results. */
function textsOf(event: (typeof EVENTS)[number]): string[] {
  return [
    event.text,
    ...(event.options ?? []).flatMap((option) => [option.text, option.resultText]),
  ];
}

describe("event library", () => {
  test("has between 40 and 60 events", () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(40);
    expect(EVENTS.length).toBeLessThanOrEqual(60);
  });

  test("every id is unique and non-empty", () => {
    const ids = new Set<string>();
    for (const event of EVENTS) {
      expect(event.id.length).toBeGreaterThan(0);
      expect(ids.has(event.id)).toBe(false);
      ids.add(event.id);
    }
  });

  test("each of the six categories has at least five events", () => {
    for (const category of CATEGORY_LABELS) {
      const count = EVENTS.filter((event) => event.category === category).length;
      expect(count).toBeGreaterThanOrEqual(5);
    }
  });

  test("conditions only reference real model fields", () => {
    for (const event of EVENTS) {
      for (const key of Object.keys(event.condition ?? {})) {
        expect(CONDITION_KEYS).toContain(key);
      }
    }
  });

  test("effects only touch real stats and a numeric money delta", () => {
    for (const event of EVENTS) {
      for (const key of Object.keys(event.effects.stats ?? {})) {
        expect(STAT_KEYS).toContain(key as StatKey);
      }
      if (event.effects.money !== undefined) {
        expect(typeof event.effects.money).toBe("number");
      }
      for (const option of event.options ?? []) {
        for (const key of Object.keys(option.effects.stats ?? {})) {
          expect(STAT_KEYS).toContain(key as StatKey);
        }
        if (option.effects.money !== undefined) {
          expect(typeof option.effects.money).toBe("number");
        }
      }
    }
  });

  test("weights are positive and texts are Thai with only known tokens", () => {
    for (const event of EVENTS) {
      expect(event.weight).toBeGreaterThan(0);
      for (const text of textsOf(event)) {
        expect(text.length).toBeGreaterThan(0);
        // Any braces in a text must come from the known token list.
        const braces = text.match(/\{[^}]*\}/g) ?? [];
        for (const token of braces) {
          expect(KNOWN_TOKENS).toContain(token);
        }
        // Text should be readable Thai, not placeholder Latin.
        expect(text).toMatch(/[ก-๙]/);
      }
    }
  });

  test("age windows are sane where both ends are given", () => {
    for (const event of EVENTS) {
      const condition = event.condition;
      if (condition?.minAge !== undefined && condition.maxAge !== undefined) {
        expect(condition.minAge).toBeLessThanOrEqual(condition.maxAge);
      }
    }
  });

  test("choice events offer two to three real options", () => {
    expect(CHOICE_EVENTS.length).toBeGreaterThanOrEqual(5);
    for (const event of CHOICE_EVENTS) {
      const options = event.options ?? [];
      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(options.length).toBeLessThanOrEqual(3);
      for (const option of options) {
        expect(option.resultText.length).toBeGreaterThan(0);
      }
      // Two options must actually differ, or the choice is decoration.
      const first = JSON.stringify(options[0]?.effects);
      const differ = options.some((option) => JSON.stringify(option.effects) !== first);
      expect(differ).toBe(true);
    }
  });

  test("a choice event carries no separate effects of its own", () => {
    // The engine skips event.effects when options exist, so content must
    // not put a second, hidden set of consequences next to the choices.
    for (const event of CHOICE_EVENTS) {
      expect(Object.keys(event.effects.stats ?? {})).toEqual([]);
      expect(event.effects.money).toBeUndefined();
    }
  });
});
