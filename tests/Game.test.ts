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
    // 0.0002 allowance at age 6 + 0.002 earned earlier - 0.001 the action costs
    expect(game.character.money).toBeCloseTo(0.0012, 12);
    // the age-6 allowance line came first, the action line sits on top
    expect(game.gameState.history).toHaveLength(2);
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

  test("showFrom reveals an action early, still blocked until minAge", () => {
    const plan: PlayerAction = {
      id: "plan",
      label: "วางแผนล่วงหน้า",
      minAge: 7,
      maxAge: 9,
      showFrom: 5,
      resultText: "วางแผน",
      timeCost: 5,
      effects: {},
    };
    const game = makeGame();
    for (let i = 0; i < 5; i += 1) {
      game.advanceYear();
    }
    // Visible one year early, but the engine still refuses to run it.
    expect(game.availableActions([plan])).toHaveLength(1);
    expect(game.actionBlockReason(plan)).toBe("age");
    for (let i = 0; i < 2; i += 1) {
      game.advanceYear();
    }
    expect(game.actionBlockReason(plan)).toBeNull();
  });

  test("a paid action is refused when money cannot cover its cost", () => {
    const game = makeGame();
    for (let i = 0; i < 7; i += 1) {
      game.advanceYear();
    }
    // two years of childhood allowance (ages 6 and 7) still cannot cover it
    game.character.addMoney(0.00005);
    expect(game.performAction(study)).toEqual({ accepted: false, reason: "money" });
    expect(game.character.money).toBeCloseTo(0.00045, 12);
  });

  test("the family sends an age-based allowance every year", () => {
    const game = makeGame();
    for (let i = 0; i < 6; i += 1) {
      game.advanceYear();
    }
    // nothing under 6, then 0.0002 starting at age 6
    expect(game.character.money).toBeCloseTo(0.0002, 12);

    for (let i = 0; i < 8; i += 1) {
      game.advanceYear();
    }
    // ages 7 to 13 add 0.0002 each, age 14 jumps to 0.0005
    expect(game.character.money).toBeCloseTo(0.0021, 12);
    const texts = game.gameState.history.map((entry) => entry.text);
    expect(texts.some((text) => text.startsWith("ได้ค่าขนมจากทางบ้าน"))).toBe(true);
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

  test("the timeline is the single log: year-start lines and actions both land there", () => {
    const game = makeGame();
    for (let i = 0; i < 6; i += 1) {
      game.advanceYear();
    }
    // The age-6 allowance lands in the year it fired, and the newest
    // allowance line belongs to the current year.
    game.advanceYear();
    const allowanceLines = game.gameState.history.filter((entry) =>
      entry.text.startsWith("ได้ค่าขนมจากทางบ้าน"),
    );
    expect(allowanceLines.length).toBeGreaterThan(0);
    expect(allowanceLines.some((entry) => entry.year === game.gameState.year)).toBe(true);

    // The player's own actions record into the same log the feed reads.
    game.character.addMoney(0.01);
    game.gameState.timeLeft = 100;
    const outcome = game.performAction(study);
    expect(outcome.accepted).toBe(true);
    expect(game.gameState.history[0]?.text).toBe("นั่งอ่านหนังสือทั้งวัน");
  });

  test("markActionsSeen remembers ids exactly once", () => {
    const game = makeGame();
    game.markActionsSeen(["study", "sleep"]);
    game.markActionsSeen(["study", "gym"]);
    expect([...game.seenActions].sort()).toEqual(["gym", "sleep", "study"]);
  });
});
