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
];

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
    }
  });

  test("weights are positive and texts are Thai with only known tokens", () => {
    for (const event of EVENTS) {
      expect(event.weight).toBeGreaterThan(0);
      expect(event.text.length).toBeGreaterThan(0);
      // Any braces in the text must come from the known token list.
      const braces = event.text.match(/\{[^}]*\}/g) ?? [];
      for (const token of braces) {
        expect(KNOWN_TOKENS).toContain(token);
      }
      // Text should be readable Thai, not placeholder Latin.
      expect(event.text).toMatch(/[ก-๙]/);
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
});
