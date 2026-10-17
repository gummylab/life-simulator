import { describe, expect, test } from "bun:test";
import { ACTIONS } from "../src/content/actions";
import { WORLD } from "../src/content/world";
import { GAME_CONTENT } from "../src/content/gameContent";
import { createLife } from "../src/core/GameFactory";
import { makeContentGame } from "./helpers";
import type { Game } from "../src/core/Game";

function action(id: string) {
  const found = ACTIONS.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`missing action ${id}`);
  }
  return found;
}

/** A game whose character is already dating and then married. */
function marriedGame(gender: "female" | "male"): Game {
  const game = makeContentGame({ age: 25, gender, money: 0.01 });
  game.performAction(action("date"));
  game.performAction(action("marry"));
  return game;
}

describe("RelationshipSystem", () => {
  test("a newborn has two parents, and single adults face the partner gates", () => {
    const game = createLife(
      { givenName: "เอมม่า", familyName: "มิลเลอร์", gender: "female" },
      42,
      2026,
      GAME_CONTENT,
    );
    expect(game.character.family.parents.length).toBe(2);
    const [father, mother] = game.character.family.parents;
    expect(father?.gender).toBe("male");
    expect(mother?.gender).toBe("female");
    expect(father?.familyName).toBe("มิลเลอร์"); // child takes the father's name

    // An adult who never dated: marriage and children stay locked.
    const single = makeContentGame({ age: 25, gender: "female" });
    expect(single.actionBlockReason(action("marry"))).toBe("partner");
    expect(single.actionBlockReason(action("divorce"))).toBe("partner");
    expect(single.actionBlockReason(action("have-child"))).toBe("spouse");
    expect(single.actionBlockReason(action("date"))).toBeNull();
  });

  test("dating creates a partner of the opposite sex from the world pools", () => {
    const game = makeContentGame({ age: 20, gender: "female" });
    expect(game.performAction(action("date")).accepted).toBe(true);
    const partner = game.character.family.partner;
    expect(partner).not.toBeNull();
    expect(partner?.gender).toBe("male");
    if (partner) {
      expect(WORLD.givenNames.male).toContain(partner.givenName);
      expect(WORLD.familyNames).toContain(partner.familyName);
    }
    // A second date is refused while the first partner is still around.
    expect(game.actionBlockReason(action("date"))).toBe("taken");
  });

  test("a woman takes her husband's surname on marriage", () => {
    const game = marriedGame("female");
    const partner = game.character.family.partner;
    expect(game.character.family.married).toBe(true);
    expect(game.character.familyName).toBe(partner?.familyName ?? "");
    expect(game.character.familyName).not.toBe("หนึ่งชีวิต");
  });

  test("a man keeps his surname and the wife takes his", () => {
    const game = marriedGame("male");
    const partner = game.character.family.partner;
    expect(game.character.familyName).toBe("หนึ่งชีวิต");
    expect(partner?.familyName).toBe("หนึ่งชีวิต");
  });

  test("divorce removes the partner but keeps the children", () => {
    const game = marriedGame("female");
    game.performAction(action("have-child"));
    expect(game.character.family.children.length).toBe(1);

    expect(game.performAction(action("divorce")).accepted).toBe(true);
    expect(game.character.family.partner).toBeNull();
    expect(game.character.family.married).toBe(false);
    expect(game.character.family.children.length).toBe(1);
  });

  test("children are NPCs with a name, birth year and the father's surname", () => {
    const game = marriedGame("male");
    game.performAction(action("have-child"));
    const child = game.character.family.children[0];
    expect(child).toBeDefined();
    if (child) {
      expect(child.givenName.length).toBeGreaterThan(0);
      expect(child.familyName).toBe("หนึ่งชีวิต"); // father's surname
      expect(child.birthYear).toBe(game.gameState.year);
    }
  });

  test("happiness moves as designed by the relationship actions", () => {
    const game = makeContentGame({ age: 25, gender: "female", money: 0.01 });
    const beforeDate = game.character.stats.get("happiness");
    game.performAction(action("date"));
    expect(game.character.stats.get("happiness")).toBeGreaterThan(beforeDate);

    const beforeMarry = game.character.stats.get("happiness");
    game.performAction(action("marry"));
    expect(game.character.stats.get("happiness")).toBeGreaterThan(beforeMarry);

    const beforeDivorce = game.character.stats.get("happiness");
    game.performAction(action("divorce"));
    expect(game.character.stats.get("happiness")).toBeLessThan(beforeDivorce);
  });
});
