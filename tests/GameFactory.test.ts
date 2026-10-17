import { describe, expect, test } from "bun:test";
import { createLife } from "../src/core/GameFactory";
import { timeBudgetForAge } from "../src/core/config";
import type { BirthSetup } from "../src/core/model/BirthSetup";

const setup: BirthSetup = {
  givenName: "เอมม่า",
  familyName: "มิลเลอร์",
  gender: "female",
};

describe("createLife", () => {
  test("builds the character from what the player typed", () => {
    const game = createLife(setup, 999, 2026);
    expect(game.character.givenName).toBe("เอมม่า");
    expect(game.character.familyName).toBe("มิลเลอร์");
    expect(game.character.name).toBe("เอมม่า มิลเลอร์");
    expect(game.character.gender).toBe("female");
  });

  test("keeps the founding family name in the save data", () => {
    const game = createLife(setup, 999, 2026);
    expect(game.gameState.founderFamilyName).toBe("มิลเลอร์");
  });

  test("rolls a lifespan between 85 and 110", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const character = createLife(setup, seed, 2026).character;
      expect(character.maxLifespan).toBeGreaterThanOrEqual(85);
      expect(character.maxLifespan).toBeLessThanOrEqual(110);
    }
  });

  test("the same seed rolls the same lifespan", () => {
    const first = createLife(setup, 1234, 2026).character.maxLifespan;
    const second = createLife(setup, 1234, 2026).character.maxLifespan;
    expect(first).toBe(second);
  });

  test("starts the life at age zero with no money and a full child budget", () => {
    const game = createLife(setup, 5, 2026);
    expect(game.age).toBe(0);
    expect(game.character.money).toBe(0);
    expect(game.gameState.year).toBe(2026);
    expect(game.timeLeft).toBe(timeBudgetForAge(0));
    expect(game.character.energy).toBe(100);
  });
});
