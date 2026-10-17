import { describe, expect, test } from "bun:test";
import { Game } from "../src/core/Game";
import { GameState } from "../src/core/model/GameState";
import type { PlayerAction } from "../src/core/model/PlayerAction";
import { makeCharacter } from "./helpers";

function makeGame(): Game {
  const state = new GameState({
    year: 2026,
    seed: 4242,
    rngState: 4242,
    character: makeCharacter({ birthYear: 2026, maxLifespan: 100 }),
    founderFamilyName: "หนึ่งชีวิต",
    timeLeft: 100,
  });
  return new Game(state);
}

const study: PlayerAction = {
  id: "study",
  label: "อ่านหนังสือ",
  minAge: 6,
  maxAge: 30,
  resultText: "นั่งอ่านหนังสือทั้งวัน",
  timeCost: 30,
  effects: { stats: { smarts: 3 }, money: -0.001 },
};

describe("Game", () => {
  test("a new life starts at age zero", () => {
    expect(makeGame().age).toBe(0);
  });

  test("advanceYear moves the calendar by one and ages the character", () => {
    const game = makeGame();
    const result = game.advanceYear();
    expect(result.age).toBe(1);
    expect(game.age).toBe(1);
    expect(game.gameState.year).toBe(2027);
    expect(result.died).toBe(false);
  });

  test("advanceYear stores the generator state in the save data", () => {
    const game = makeGame();
    game.advanceYear();
    expect(game.gameState.rngState).not.toBe(4242);
  });

  test("performAction applies effects and writes a timeline entry", () => {
    const game = makeGame();
    game.advanceYear();
    game.advanceYear();
    for (let i = 0; i < 4; i += 1) {
      game.advanceYear();
    }
    game.character.addMoney(0.002);

    // 50 base + 6 years of childhood learning + 3 from the action
    const outcome = game.performAction(study);
    expect(outcome.accepted).toBe(true);
    expect(game.character.stats.get("smarts")).toBe(59);
    // 0.002 earned earlier minus the 0.001 the action costs
    expect(game.character.money).toBe(0.001);
    expect(game.gameState.history).toHaveLength(1);
    expect(game.gameState.history[0]?.text).toBe("นั่งอ่านหนังสือทั้งวัน");
  });

  test("performAction is rejected outside its age range", () => {
    const game = makeGame();
    expect(game.performAction(study)).toEqual({ accepted: false, reason: "age" });
    expect(game.gameState.history).toHaveLength(0);
    expect(game.character.stats.get("smarts")).toBe(50);
  });

  test("availableActions filters by age", () => {
    const game = makeGame();
    expect(game.availableActions([study])).toHaveLength(0);
    for (let i = 0; i < 8; i += 1) {
      game.advanceYear();
    }
    expect(game.availableActions([study])).toHaveLength(1);
  });

  test("a paid action is refused when money cannot cover its cost", () => {
    const game = makeGame();
    for (let i = 0; i < 7; i += 1) {
      game.advanceYear();
    }
    game.character.addMoney(0.00005);
    expect(game.performAction(study)).toEqual({ accepted: false, reason: "money" });
    expect(game.character.money).toBe(0.00005);
  });

  test("the character dies once the lifespan is reached", () => {
    const state = new GameState({
      year: 2026,
      seed: 1,
      rngState: 1,
      character: makeCharacter({ birthYear: 2026, maxLifespan: 5 }),
      founderFamilyName: "หนึ่งชีวิต",
      timeLeft: 100,
    });
    const game = new Game(state);
    let result = game.advanceYear();
    for (let i = 0; i < 5 && !result.died; i += 1) {
      result = game.advanceYear();
    }
    expect(result.died).toBe(true);
    expect(result.cause).toBe("oldAge");
    expect(state.character.alive).toBe(false);
  });
});
