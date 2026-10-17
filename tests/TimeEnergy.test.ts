import { describe, expect, test } from "bun:test";
import { Game } from "../src/core/Game";
import { GameState } from "../src/core/model/GameState";
import type { PlayerAction } from "../src/core/model/PlayerAction";
import {
  ENERGY_BLOCK_THRESHOLD,
  ENERGY_MAX,
  ENERGY_YEAR_RESTORE,
  timeBudgetForAge,
} from "../src/core/config";
import { ACTIONS } from "../src/content/actions";
import { makeCharacter } from "./helpers";

interface GameOptions {
  readonly age?: number;
  readonly energy?: number;
  readonly money?: number;
  readonly timeLeft?: number;
  readonly committedTime?: number;
}

function makeGame(options: GameOptions = {}): Game {
  const age = options.age ?? 0;
  const state = new GameState({
    year: 2026 + age,
    seed: 7,
    rngState: 7,
    character: makeCharacter({
      birthYear: 2026,
      maxLifespan: 100,
      money: options.money ?? 0,
      energy: options.energy ?? ENERGY_MAX,
    }),
    founderFamilyName: "หนึ่งชีวิต",
    timeLeft: options.timeLeft ?? timeBudgetForAge(age),
    committedTime: options.committedTime ?? 0,
  });
  return new Game(state);
}

function findAction(id: string): PlayerAction {
  const action = ACTIONS.find((candidate) => candidate.id === id);
  if (!action) {
    throw new Error(`missing action in content: ${id}`);
  }
  return action;
}

describe("time budget", () => {
  test("an action eats its time cost and drains energy", () => {
    const game = makeGame({ age: 14 });
    const partTime = findAction("part-time");

    expect(game.performAction(partTime).accepted).toBe(true);
    expect(game.timeLeft).toBe(timeBudgetForAge(14) - partTime.timeCost);
    expect(game.character.energy).toBe(ENERGY_MAX - (partTime.energyCost ?? 0));
  });

  test("an action is refused when the year has no time left", () => {
    const game = makeGame({ age: 14, timeLeft: 10 });
    expect(game.performAction(findAction("part-time"))).toEqual({
      accepted: false,
      reason: "time",
    });
  });

  test("running out of time ends the year on the spot", () => {
    const game = makeGame({ timeLeft: 20 });
    const outcome = game.performAction(findAction("rest"));

    expect(outcome.accepted).toBe(true);
    if (!outcome.accepted) {
      return;
    }
    expect(outcome.yearEnded).not.toBeNull();
    expect(game.gameState.year).toBe(2027);
    const texts = game.gameState.history.map((entry) => entry.text);
    expect(texts).toContain("ปีนี้หมดเวลา");
  });

  test("the time budget follows the age band", () => {
    expect(timeBudgetForAge(3)).toBe(60);
    expect(timeBudgetForAge(10)).toBe(80);
    expect(timeBudgetForAge(30)).toBe(100);
    expect(timeBudgetForAge(70)).toBe(70);
  });

  test("committed school or work time comes off the new year budget", () => {
    const game = makeGame({ age: 14, committedTime: 30 });
    game.advanceYear();
    expect(game.timeLeft).toBe(timeBudgetForAge(15) - 30);
  });

  test("the cheapest rest always fits in the smallest yearly budget", () => {
    const restCosts = ACTIONS.filter(
      (action) => action.energyRestore !== undefined && (action.energyCost ?? 0) === 0,
    ).map((action) => action.timeCost);
    expect(restCosts.length).toBeGreaterThan(0);
    expect(Math.min(...restCosts)).toBeLessThanOrEqual(timeBudgetForAge(3));
  });
});

describe("energy", () => {
  test("tiring actions are blocked below the threshold but rest stays open", () => {
    const game = makeGame({ age: 14, energy: ENERGY_BLOCK_THRESHOLD - 1 });

    expect(game.performAction(findAction("part-time"))).toEqual({
      accepted: false,
      reason: "tired",
    });
    expect(game.performAction(findAction("rest")).accepted).toBe(true);
    expect(game.character.energy).toBe(ENERGY_BLOCK_THRESHOLD - 1 + 40);
  });

  test("rest restores energy even from zero", () => {
    const game = makeGame({ energy: 0 });
    expect(game.performAction(findAction("sleep")).accepted).toBe(true);
    expect(game.character.energy).toBe(ENERGY_MAX);
  });

  test("a paid relaxing action is refused without enough money", () => {
    const game = makeGame({ age: 10 });
    const before = game.timeLeft;

    expect(game.performAction(findAction("cafe-movie"))).toEqual({
      accepted: false,
      reason: "money",
    });
    expect(game.character.money).toBe(0);
    expect(game.timeLeft).toBe(before);
  });

  test("a paid relaxing action restores energy and costs money", () => {
    const game = makeGame({ age: 10, money: 0.001, energy: 0 });
    expect(game.performAction(findAction("cafe-movie")).accepted).toBe(true);
    expect(game.character.energy).toBe(65);
    expect(game.character.money).toBeCloseTo(0.0007, 10);
  });

  test("every new year restores energy and caps it at the maximum", () => {
    const almostFull = makeGame({ energy: ENERGY_MAX - ENERGY_YEAR_RESTORE + 10 });
    almostFull.advanceYear();
    expect(almostFull.character.energy).toBe(ENERGY_MAX);

    const drained = makeGame({ energy: 10 });
    drained.advanceYear();
    expect(drained.character.energy).toBe(10 + ENERGY_YEAR_RESTORE);
  });

  test("energy never leaves the 0 to 100 range", () => {
    const game = makeGame({ energy: 5 });
    game.character.changeEnergy(-1000);
    expect(game.character.energy).toBe(0);
    game.character.changeEnergy(1000);
    expect(game.character.energy).toBe(ENERGY_MAX);
  });
});
