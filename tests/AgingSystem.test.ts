import { describe, expect, test } from "bun:test";
import { SeededRng } from "../src/core/rng/SeededRng";
import { AgingSystem } from "../src/core/systems/AgingSystem";
import { makeCharacter } from "./helpers";

function aging(): AgingSystem {
  return new AgingSystem(new SeededRng(1234));
}

describe("AgingSystem", () => {
  test("a young character gains smarts each year", () => {
    const character = makeCharacter({ stats: { smarts: 50 } });
    aging().advance(character, 20);
    expect(character.stats.get("smarts")).toBe(51);
  });

  test("an adult stops gaining smarts and starts losing health", () => {
    const character = makeCharacter({ stats: { smarts: 50, health: 50, looks: 50 } });
    aging().advance(character, 40);
    expect(character.stats.get("smarts")).toBe(50);
    expect(character.stats.get("health")).toBe(49);
    expect(character.stats.get("looks")).toBe(49);
  });

  test("health loss doubles past sixty", () => {
    const character = makeCharacter({ stats: { health: 50 } });
    aging().advance(character, 70);
    expect(character.stats.get("health")).toBe(48);
  });

  test("stats never fall below zero after many years", () => {
    const character = makeCharacter({ stats: { health: 1, looks: 1, happiness: 1 } });
    const system = aging();
    for (let age = 30; age < 120; age += 1) {
      system.advance(character, age);
    }
    expect(character.stats.get("health")).toBe(0);
    expect(character.stats.get("looks")).toBe(0);
    expect(character.stats.get("happiness")).toBeGreaterThanOrEqual(0);
  });
});
