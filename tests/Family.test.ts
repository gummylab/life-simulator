import { describe, expect, test } from "bun:test";
import { Game } from "../src/core/Game";
import { GameState } from "../src/core/model/GameState";
import { continueLife } from "../src/core/GameFactory";
import { planSuccession } from "../src/core/systems/SuccessionSystem";
import { RelationshipSystem } from "../src/core/systems/RelationshipSystem";
import { EventEngine } from "../src/core/systems/EventEngine";
import { SeededRng } from "../src/core/rng/SeededRng";
import { bondOf, changeBond, isAlive, type Person } from "../src/core/model/Person";
import { deserializeGame, serializeGame } from "../src/core/save/SaveManager";
import { ACTIONS } from "../src/content/actions";
import { GAME_CONTENT } from "../src/content/gameContent";
import { BOND_DECAY, BOND_DEFAULT, BOND_GAIN } from "../src/core/config";
import { makeCharacter } from "./helpers";

/**
 * Phase 9: the family keeps living after the wedding (ADR 0019).
 *
 * Relatives carry a bond that family actions raise and time wears down, and
 * they grow old and pass away on the same risk curve as the player. These
 * tests pin the whole loop down: who a family action reaches, what the gates
 * refuse, what a death does to the marriage state, and what survives a save.
 */

const BIRTH_YEAR = 2000;

function action(id: string) {
  const found = ACTIONS.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`missing action ${id}`);
  }
  return found;
}

/** A relative with a readable id, no explicit bond unless asked for. */
function relative(
  id: string,
  gender: "female" | "male",
  birthYear: number,
  bond?: number,
): Person {
  return {
    id,
    givenName: id,
    familyName: "ทดสอบ",
    gender,
    birthYear,
    ...(bond === undefined ? {} : { bond }),
  };
}

interface FamilyOptions {
  readonly age?: number;
  readonly parents?: readonly Person[];
  readonly partner?: Person | null;
  readonly children?: readonly Person[];
}

/** A 25-year-old with two living parents and a partner by default. */
function makeGame(options: FamilyOptions = {}): Game {
  const age = options.age ?? 25;
  const character = makeCharacter({ birthYear: BIRTH_YEAR, money: 0.02, gender: "female" });
  const family = character.family;
  family.parents = [
    ...(options.parents ?? [relative("พ่อ", "male", BIRTH_YEAR - 24), relative("แม่", "female", BIRTH_YEAR - 22)]),
  ];
  family.partner = options.partner === undefined ? relative("คู่", "male", BIRTH_YEAR - 2) : options.partner;
  family.married = family.partner !== null;
  family.children = [...(options.children ?? [])];

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

function livingRelatives(game: Game): Person[] {
  const family = game.character.family;
  return [
    ...family.parents,
    ...(family.partner === null ? [] : [family.partner]),
    ...family.children,
  ].filter(isAlive);
}

function load(json: string) {
  const loaded = deserializeGame(json);
  if (loaded === null) {
    throw new Error("the save did not load");
  }
  return loaded;
}

describe("family bond", () => {
  test("every relative starts from the default bond, action lines included", () => {
    const game = makeGame({ children: [relative("ลูก", "male", BIRTH_YEAR + 3, BOND_DEFAULT)] });
    for (const person of livingRelatives(game)) {
      expect(bondOf(person)).toBe(BOND_DEFAULT);
    }
  });

  test("family time lifts the bond of everyone still alive", () => {
    const game = makeGame({ children: [relative("ลูก", "male", BIRTH_YEAR + 3)] });
    const before = new Map(livingRelatives(game).map((person) => [person.id, bondOf(person)]));

    expect(game.performAction(action("family-time")).accepted).toBe(true);

    for (const person of livingRelatives(game)) {
      expect(bondOf(person)).toBe((before.get(person.id) ?? 0) + BOND_GAIN["family-time"]);
    }
    expect(game.gameState.timeline.map((entry) => entry.text).join(" ")).toContain("ลูก");
  });

  test("a gift needs a partner and moves only that partner's bond", () => {
    const single = makeGame({ partner: null, parents: [] });
    expect(single.actionBlockReason(action("gift-partner"))).toBe("partner");

    const game = makeGame({});
    const partner = game.character.family.partner;
    if (partner === null) {
      throw new Error("the fixture is missing a partner");
    }
    expect(game.performAction(action("gift-partner")).accepted).toBe(true);
    expect(bondOf(partner)).toBe(BOND_DEFAULT + BOND_GAIN["gift-partner"]);
    for (const parent of game.character.family.parents) {
      expect(bondOf(parent)).toBe(BOND_DEFAULT);
    }
  });

  test("caring for parents is refused once they are gone", () => {
    const game = makeGame({});
    for (const parent of game.character.family.parents) {
      parent.deathYear = game.gameState.year;
    }
    expect(game.actionBlockReason(action("help-parents"))).toBe("orphan");

    const orphan = makeGame({ parents: [], partner: null });
    expect(orphan.actionBlockReason(action("help-parents"))).toBe("orphan");
    expect(orphan.actionBlockReason(action("family-time"))).toBe("alone");
  });

  test("closeness decays every year nobody shows up", () => {
    const game = makeGame({
      parents: [relative("พ่อ", "male", BIRTH_YEAR - 24), relative("แม่", "female", BIRTH_YEAR - 22)],
      children: [relative("ลูก", "female", BIRTH_YEAR + 3)],
    });
    const before = new Map(livingRelatives(game).map((person) => [person.id, bondOf(person)]));

    game.advanceYear();

    for (const person of livingRelatives(game)) {
      expect(bondOf(person)).toBe((before.get(person.id) ?? 0) - BOND_DECAY);
    }
  });

  test("bond stays inside 0..100", () => {
    const person = relative("ทดลอง", "male", 1990, 98);
    expect(changeBond(person, 50)).toBe(100);
    expect(changeBond(person, -500)).toBe(0);
  });
});

describe("relatives age and pass away", () => {
  test("a very old relative passes away and is written into the log", () => {
    const game = makeGame({ parents: [relative("ทวด", "male", 1890)], partner: null });
    const system = new RelationshipSystem();
    const rng = new SeededRng(3);
    const elder = game.character.family.parents[0];
    if (elder === undefined) {
      throw new Error("the fixture is missing a parent");
    }

    for (let attempt = 0; attempt < 200 && isAlive(elder); attempt += 1) {
      system.rollFamilyDeaths(game.gameState, rng);
    }

    expect(isAlive(elder)).toBe(false);
    expect(elder.deathYear).toBe(game.gameState.year);
    expect(game.gameState.timeline.map((entry) => entry.text).join(" ")).toContain(
      "เสียชีวิตเมื่ออายุ",
    );
  });

  test("a widowed character keeps the record but is no longer married", () => {
    const game = makeGame({ partner: relative("คู่", "male", 1890) });
    const system = new RelationshipSystem();
    const rng = new SeededRng(11);
    const partner = game.character.family.partner;
    if (partner === null) {
      throw new Error("the fixture is missing a partner");
    }

    for (let attempt = 0; attempt < 200 && isAlive(partner); attempt += 1) {
      system.rollFamilyDeaths(game.gameState, rng);
    }

    expect(isAlive(partner)).toBe(false);
    expect(game.character.family.married).toBe(false);
    // The record stays for the family screen, and the marriage gates now
    // read as a widow: there is no spouse to divorce or raise a child with.
    expect(game.character.family.partner).toBe(partner);
    expect(game.actionBlockReason(action("divorce"))).toBe("partner");
    expect(game.actionBlockReason(action("have-child"))).toBe("spouse");
  });
});

describe("events that read the bond", () => {
  test("partner events only fire when the bond fits", () => {
    const game = makeGame({});
    const partner = game.character.family.partner;
    if (partner === null) {
      throw new Error("the fixture is missing a partner");
    }
    const engine = new EventEngine(new SeededRng(1));
    const state = game.gameState;
    const event = (id: string) => {
      const found = GAME_CONTENT.events.find((candidate) => candidate.id === id);
      if (found === undefined) {
        throw new Error(`missing event ${id}`);
      }
      return found;
    };

    // Default bond 60: the anniversary needs 70, the argument needs 55 or less.
    expect(engine.eligible(event("rel-partner-gift"), state)).toBe(false);
    expect(engine.eligible(event("rel-partner-argue"), state)).toBe(false);

    changeBond(partner, 20);
    expect(engine.eligible(event("rel-partner-gift"), state)).toBe(true);

    changeBond(partner, -40);
    expect(engine.eligible(event("rel-partner-argue"), state)).toBe(true);

    // Without a partner there is nobody to have a bond with.
    state.character.family.partner = null;
    expect(engine.eligible(event("rel-partner-gift"), state)).toBe(false);
    expect(engine.eligible(event("rel-partner-argue"), state)).toBe(false);
  });
});

describe("family in the save file", () => {
  test("bond survives a round trip", () => {
    const game = makeGame({});
    const partner = game.character.family.partner;
    if (partner === null) {
      throw new Error("the fixture is missing a partner");
    }
    changeBond(partner, -12);

    const restored = load(serializeGame(game.gameState, 100_000));
    const restoredPartner = restored.state.character.family.partner;
    expect(restoredPartner).not.toBeNull();
    expect(bondOf(restoredPartner as Person)).toBe(BOND_DEFAULT - 12);
  });

  test("a file written before bonds existed still loads with the default", () => {
    const game = makeGame({});
    const payload = JSON.parse(serializeGame(game.gameState, 100_000)) as {
      character: { family: { partner: { bond?: number }; parents: { bond?: number }[] } };
    };
    delete payload.character.family.partner.bond;
    delete payload.character.family.parents[0]?.bond;

    const restored = load(JSON.stringify(payload));
    const family = restored.state.character.family;
    expect(bondOf(family.partner as Person)).toBe(BOND_DEFAULT);
    expect(family.parents.map(bondOf)).toEqual([BOND_DEFAULT, BOND_DEFAULT]);
  });

  test("an impossible bond from a broken file is clamped", () => {
    const game = makeGame({});
    const payload = JSON.parse(serializeGame(game.gameState, 100_000)) as {
      character: { family: { partner: { bond?: number } } };
    };
    payload.character.family.partner.bond = 900;

    const restored = load(JSON.stringify(payload));
    expect(bondOf(restored.state.character.family.partner as Person)).toBe(100);
  });

  test("a dead relative keeps their death year across a reload", () => {
    const game = makeGame({});
    const parent = game.character.family.parents[0];
    if (parent === undefined) {
      throw new Error("the fixture is missing a parent");
    }
    parent.deathYear = game.gameState.year;
    parent.bond = 12;

    const restored = load(serializeGame(game.gameState, 100_000));
    const restoredParent = restored.state.character.family.parents[0];
    expect(restoredParent?.deathYear).toBe(game.gameState.year);
    expect(restoredParent === undefined ? 0 : bondOf(restoredParent)).toBe(12);
  });
});

describe("a heir born into the dynasty", () => {
  test("generation two opens the family screen with a parent", () => {
    const founder = makeGame({ partner: null, parents: [] });
    founder.character.family.children.push({
      id: "child-1",
      givenName: "ลูก",
      familyName: "ทดสอบ",
      gender: "male",
      birthYear: founder.gameState.year + 5,
      parentId: founder.character.id,
      bond: BOND_DEFAULT,
    });
    founder.character.die("oldAge");

    const plan = planSuccession(founder.gameState, GAME_CONTENT, new SeededRng(founder.gameState.rngState));
    expect(plan).not.toBeNull();
    if (plan === null) {
      return;
    }

    const next = continueLife(plan, founder.gameState, GAME_CONTENT);
    expect(next.character.family.parents.length).toBeGreaterThan(0);
    expect(livingRelatives(next).length).toBeGreaterThan(0);
  });
});
