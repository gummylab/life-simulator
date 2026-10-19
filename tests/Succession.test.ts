import { describe, expect, test } from "bun:test";
import { SeededRng } from "../src/core/rng/SeededRng";
import { GAME_CONTENT } from "../src/content/gameContent";
import { createLife, continueLife } from "../src/core/GameFactory";
import { planSuccession } from "../src/core/systems/SuccessionSystem";
import type { Game } from "../src/core/Game";

/** Plays one life from birth, marrying and having two children at 25. */
function playLife(seed: number): Game {
  const game = createLife(
    { givenName: "อีธาน", familyName: "มิลเลอร์", gender: "male" },
    seed,
    2026,
    GAME_CONTENT,
  );
  game.character.family.partner = {
    id: "spouse",
    givenName: "เอมม่า",
    familyName: "มิลเลอร์",
    gender: "female",
    birthYear: 2026,
  };
  game.character.family.married = true;
  for (let i = 0; i < 2; i += 1) {
    game.character.family.children.push({
      id: `child-${i + 1}`,
      givenName: i === 0 ? "ลีแอม" : "โนอา",
      familyName: "มิลเลอร์",
      gender: "male",
      birthYear: 2051 + i,
      parentId: game.character.id,
    });
  }
  // Walk the years until death; the lifespan ceiling guarantees an end.
  let years = 0;
  while (game.character.alive && years < 150) {
    game.advanceYear();
    years += 1;
  }
  return game;
}

describe("succession", () => {
  test("the time skip lands 60 to 100 years after the death", () => {
    const game = playLife(12);
    const deathYear = game.gameState.year;
    const plan = planSuccession(game.gameState, GAME_CONTENT, new SeededRng(99));
    expect(plan).not.toBeNull();
    if (!plan) {
      return;
    }
    const jump = plan.rebirthYear - deathYear;
    expect(jump).toBeGreaterThanOrEqual(60);
    expect(jump).toBeLessThanOrEqual(100);
  });

  test("the heir is a blood descendant of the dead character", () => {
    const game = playLife(12);
    const plan = planSuccession(game.gameState, GAME_CONTENT, new SeededRng(99));
    expect(plan).not.toBeNull();
    if (!plan) {
      return;
    }
    // Walk parent links up: the chain must end at the dead player or one
    // of his children — both are legitimate blood heirs.
    const byId = new Map(plan.tree.map((person) => [person.id, person]));
    let cursor = plan.heir;
    let guard = 0;
    while (cursor.parentId !== undefined && guard < 20) {
      const parent = byId.get(cursor.parentId);
      if (!parent) {
        break;
      }
      cursor = parent;
      guard += 1;
    }
    expect([game.character.id, "child-1", "child-2"]).toContain(cursor.id);
  });

  test("the fortune is cut to 30-60 percent, with a small generation bonus", () => {
    const game = playLife(12);
    const money = game.character.money;
    const plan = planSuccession(game.gameState, GAME_CONTENT, new SeededRng(99));
    if (!plan) {
      throw new Error("expected an heir");
    }
    const ratio = plan.legacyMoney / money;
    // Min haircut 0.3, max 0.6 with a +10 percent bonus at generation 2.
    expect(ratio).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(0.7);
    expect(plan.newGeneration).toBe(2);
  });

  test("the chronicle tells every crossed generation in order", () => {
    const game = playLife(12);
    const plan = planSuccession(game.gameState, GAME_CONTENT, new SeededRng(99));
    if (!plan) {
      throw new Error("expected an heir");
    }
    expect(plan.chronicle.length).toBeGreaterThan(0);
    for (const line of plan.chronicle) {
      expect(line).toMatch(/[ก-๙]/); // readable Thai, no placeholders
    }
    // The player's own children appear (married or single) in the lines.
    const joined = plan.chronicle.join("\n");
    expect(joined).toContain("ลีแอม");
  });

  test("the same seed replays the exact same plan", () => {
    const game = playLife(12);
    const first = planSuccession(game.gameState, GAME_CONTENT, new SeededRng(555));
    const second = planSuccession(game.gameState, GAME_CONTENT, new SeededRng(555));
    expect(first?.heir.id).toBe(second?.heir.id);
    expect(first?.rebirthYear).toBe(second?.rebirthYear);
    expect(first?.legacyMoney).toBe(second?.legacyMoney);
    expect(first?.chronicle).toEqual(second?.chronicle);
  });

  test("continueLife reborns the heir with the fortune and the dynasty records", () => {
    const game = playLife(12);
    const plan = planSuccession(game.gameState, GAME_CONTENT, new SeededRng(99));
    if (!plan) {
      throw new Error("expected an heir");
    }
    const heir = continueLife(plan, game.gameState, GAME_CONTENT);

    expect(heir.gameState.year).toBe(plan.rebirthYear);
    expect(heir.character.id).toBe(plan.heir.id);
    expect(heir.character.givenName).toBe(plan.heir.givenName);
    expect(heir.character.money).toBeCloseTo(plan.legacyMoney, 10);
    expect(heir.gameState.dynasty.generation).toBe(2);
    expect(heir.gameState.dynasty.chronicle).toEqual(plan.chronicle);
    expect(heir.gameState.dynasty.tree.length).toBe(plan.tree.length);
    // The dynasty name stays with the run, not with the heir's own branch.
    expect(heir.gameState.founderFamilyName).toBe("มิลเลอร์");
  });

  test("a childless line ends the dynasty with no plan", () => {
    const game = playLife(12);
    game.character.family.children.length = 0;
    const plan = planSuccession(game.gameState, GAME_CONTENT, new SeededRng(99));
    expect(plan).toBeNull();
  });
});
