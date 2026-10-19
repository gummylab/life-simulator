import { describe, expect, test } from "bun:test";
import { Game } from "../src/core/Game";
import { GameState } from "../src/core/model/GameState";
import { HouseholdSystem } from "../src/core/systems/HouseholdSystem";
import { deserializeGame, serializeGame } from "../src/core/save/SaveManager";
import { GAME_CONTENT } from "../src/content/gameContent";
import { HOMES } from "../src/content/homes";
import {
  CHILD_COST,
  CHILD_DEPENDENT_AGE,
  HOUSING,
  HOME_RESALE_SHARE,
} from "../src/core/config";
import type { Person } from "../src/core/model/Person";
import { makeCharacter } from "./helpers";

/**
 * Phase 10: living somewhere costs money every year (ADR 0020).
 *
 * These tests pin the household bill down: what moving in costs, what it
 * refunds, what the purse can and cannot do, what a year in a home takes
 * out of the account, and what a dependent child adds to the bill.
 */

const BIRTH_YEAR = 2000;

function home(id: string) {
  const found = HOMES.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`missing home ${id}`);
  }
  return found;
}

function child(id: string, birthYear: number): Person {
  return {
    id,
    givenName: id,
    familyName: "ทดสอบ",
    gender: "male",
    birthYear,
    parentId: "parent",
  };
}

interface HomeOptions {
  readonly age?: number;
  readonly money?: number;
  readonly home?: string | null;
  readonly children?: readonly Person[];
}

function makeGame(options: HomeOptions = {}): Game {
  const age = options.age ?? 30;
  const character = makeCharacter({ birthYear: BIRTH_YEAR, money: options.money ?? 0.01 });
  character.home = options.home ?? null;
  character.family.children = [...(options.children ?? [])];
  const state = new GameState({
    year: BIRTH_YEAR + age,
    seed: 5,
    rngState: 5,
    character,
    founderFamilyName: "ทดสอบ",
    timeLeft: 100,
  });
  return new Game(state, GAME_CONTENT);
}

function load(json: string) {
  const loaded = deserializeGame(json);
  if (loaded === null) {
    throw new Error("the save did not load");
  }
  return loaded;
}

describe("moving home", () => {
  test("a move charges the down payment and logs both sides", () => {
    const game = makeGame({ money: 0.01 });
    const rent = home("rent-house");

    expect(game.moveHome(rent)).toBe(true);
    expect(game.character.home).toBe("rent-house");
    expect(game.character.money).toBeCloseTo(0.01 - rent.downPayment, 10);
    expect(game.gameState.timeline.map((entry) => entry.text).join(" ")).toContain("เงินดาวน์");
  });

  test("a child cannot rent a place of their own", () => {
    const game = makeGame({ age: 12, money: 0.01 });
    expect(game.homeBlockReason(home("rent-room"))).toBe("age");
    expect(game.moveHome(home("rent-room"))).toBe(false);
    expect(game.character.home).toBeNull();
  });

  test("a home nobody can pay for is refused with the money reason", () => {
    const game = makeGame({ money: 0.0001 });
    expect(game.homeBlockReason(home("own-house"))).toBe("money");
    expect(game.moveHome(home("own-house"))).toBe(false);
    expect(game.character.home).toBeNull();
    expect(game.character.money).toBe(0.0001);
  });

  test("moving between homes resells the old one at half price", () => {
    const room = home("rent-room");
    const game = makeGame({ money: 0.01, home: "rent-room" });
    const resale = room.downPayment * HOME_RESALE_SHARE;
    const house = home("own-house");

    expect(game.moveHome(house)).toBe(true);
    expect(game.character.home).toBe("own-house");
    expect(game.character.money).toBeCloseTo(0.01 + resale - house.downPayment, 10);
    expect(game.gameState.timeline.map((entry) => entry.text).join(" ")).toContain("ได้คืน");
  });

  test("moving back in with the family refunds the old place and clears the bill", () => {
    const game = makeGame({ money: 0.01, home: "rent-house" });
    const resale = home("rent-house").downPayment * HOME_RESALE_SHARE;

    expect(game.moveInWithFamily()).toBe(true);
    expect(game.character.home).toBeNull();
    expect(game.character.money).toBeCloseTo(0.01 + resale, 10);
    expect(game.yearlyHousingCost).toBe(0);
    // Nothing to move out of any more.
    expect(game.moveInWithFamily()).toBe(false);
  });

  test("the resale is a real share of the catalog, not a magic number", () => {
    for (const entry of HOMES) {
      expect(entry.downPayment).toBe(HOUSING[entry.id]?.down ?? -1);
      expect(entry.yearlyCost).toBe(HOUSING[entry.id]?.yearly ?? -1);
    }
    expect(HOME_RESALE_SHARE).toBeGreaterThan(0);
    expect(HOME_RESALE_SHARE).toBeLessThan(1);
  });
});

describe("the yearly household bill", () => {
  test("a year in a rented house takes its cost out of the purse", () => {
    const game = makeGame({ money: 0.01, home: "rent-house" });
    const yearly = home("rent-house").yearlyCost;
    const before = game.character.money;

    game.advanceYear();

    // The home also pays out comfort, so the stats move as well as the money.
    expect(game.character.money).toBeCloseTo(before - yearly, 10);
    expect(game.gameState.timeline.map((entry) => entry.text).join(" ")).toContain("ค่าที่อยู่");
  });

  test("living with the family costs nothing", () => {
    const game = makeGame({ money: 0.01 });
    game.advanceYear();
    expect(game.character.money).toBe(0.01);
    expect(game.yearlyHousingCost).toBe(0);
  });

  test("a home nobody can pay for says so instead of silently spending nothing", () => {
    const game = makeGame({ money: 0, home: "rent-house" });
    game.advanceYear();
    expect(game.character.money).toBe(0);
    expect(game.gameState.timeline.map((entry) => entry.text).join(" ")).toContain("เงินไม่พอ");
  });

  test("each dependent child adds a yearly cost and adults stop costing", () => {
    const game = makeGame({
      money: 0.02,
      children: [child("เด็ก", BIRTH_YEAR + 25), child("โต", BIRTH_YEAR - 1)],
    });
    const system = new HouseholdSystem();

    expect(game.yearlyHousingCost).toBe(CHILD_COST);

    game.advanceYear();

    const log = game.gameState.timeline.map((entry) => entry.text).join(" ");
    expect(log).toContain("ค่าดูแลบุตร 1 คน");
    expect(log).not.toContain("ค่าดูแลบุตร 2 คน");
    expect(system.yearlyCost(game.gameState, GAME_CONTENT)).toBe(CHILD_COST);
  });

  test("a child stops costing money at the dependent age", () => {
    const justUnder = BIRTH_YEAR + 30 - (CHILD_DEPENDENT_AGE - 1);
    const justOver = BIRTH_YEAR + 30 - CHILD_DEPENDENT_AGE;
    const game = makeGame({ money: 0.02, children: [child("เล็ก", justUnder), child("โต", justOver)] });
    const system = new HouseholdSystem();

    expect(system.yearlyCost(game.gameState, GAME_CONTENT)).toBe(CHILD_COST);
  });

  test("a dead child stops costing money", () => {
    const game = makeGame({ money: 0.02, children: [child("จากไป", BIRTH_YEAR + 25)] });
    const person = game.character.family.children[0];
    if (person === undefined) {
      throw new Error("the fixture is missing a child");
    }
    person.deathYear = game.gameState.year;

    expect(game.yearlyHousingCost).toBe(0);
  });
});

describe("the home in the save file", () => {
  test("the current home survives a round trip", () => {
    const game = makeGame({ money: 0.02, home: "own-house" });
    const restored = load(serializeGame(game.gameState, 100_000));
    expect(restored.state.character.home).toBe("own-house");
  });

  test("a file written before homes existed reads as the family home", () => {
    const game = makeGame({ money: 0.02, home: "rent-room" });
    const payload = JSON.parse(serializeGame(game.gameState, 100_000)) as {
      character: { home?: string | null };
    };
    delete payload.character.home;

    const restored = load(JSON.stringify(payload));
    expect(restored.state.character.home).toBeNull();
  });

  test("a home id that is not a string is dropped instead of breaking the load", () => {
    const game = makeGame({ money: 0.02, home: "rent-room" });
    const payload = JSON.parse(serializeGame(game.gameState, 100_000)) as {
      character: { home?: unknown };
    };
    payload.character.home = 42;

    const restored = load(JSON.stringify(payload));
    expect(restored.state.character.home).toBeNull();
  });
});
