import { describe, expect, test } from "bun:test";
import { SeededRng } from "../src/core/rng/SeededRng";
import { DeathSystem } from "../src/core/systems/DeathSystem";
import { makeCharacter } from "./helpers";

function deathsOver(seed: number, age: number, health: number, rolls: number): number {
  const system = new DeathSystem(new SeededRng(seed));
  const character = makeCharacter({ maxLifespan: 999, stats: { health } });
  let deaths = 0;
  for (let i = 0; i < rolls; i += 1) {
    if (system.check(character, age).died) {
      deaths += 1;
    }
  }
  return deaths;
}

describe("DeathSystem", () => {
  test("nobody survives past the lifespan rolled at birth", () => {
    const system = new DeathSystem(new SeededRng(1));
    const character = makeCharacter({ maxLifespan: 100 });
    for (let i = 0; i < 20; i += 1) {
      const outcome = system.check(character, 100);
      expect(outcome.died).toBe(true);
      expect(outcome.cause).toBe("oldAge");
    }
  });

  test("a healthy twenty year old almost never dies", () => {
    const rate = deathsOver(2, 20, 100, 5000) / 5000;
    expect(rate).toBeLessThan(0.01);
  });

  test("low health raises the risk at the same age", () => {
    const frail = deathsOver(3, 80, 10, 3000);
    const fit = deathsOver(3, 80, 100, 3000);
    expect(frail).toBeGreaterThan(fit);
  });

  test("risk rises with age", () => {
    const young = deathsOver(4, 40, 60, 5000);
    const old = deathsOver(4, 85, 60, 5000);
    expect(old).toBeGreaterThan(young);
  });

  test("very low health kills by illness before seventy", () => {
    const system = new DeathSystem(new SeededRng(5));
    const character = makeCharacter({ maxLifespan: 999, stats: { health: 10 } });
    let outcome = system.check(character, 40);
    for (let i = 0; i < 200000 && !outcome.died; i += 1) {
      outcome = system.check(character, 40);
    }
    expect(outcome.died).toBe(true);
    expect(outcome.cause).toBe("illness");
  });

  test("an active death before seventy with good health is an accident", () => {
    const system = new DeathSystem(new SeededRng(6));
    const character = makeCharacter({ maxLifespan: 999, stats: { health: 95 } });
    let outcome = system.check(character, 45);
    for (let i = 0; i < 200000 && !outcome.died; i += 1) {
      outcome = system.check(character, 45);
    }
    expect(outcome.died).toBe(true);
    expect(outcome.cause).toBe("accident");
  });
});
