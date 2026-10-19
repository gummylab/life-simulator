import { describe, expect, test } from "bun:test";
import { FamilyTree } from "../src/core/model/FamilyTree";
import { SeededRng } from "../src/core/rng/SeededRng";
import type { Person } from "../src/core/model/Person";

function person(override: Partial<Person> & { readonly id: string }): Person {
  return {
    givenName: "ทดสอบ",
    familyName: "หนึ่งชีวิต",
    gender: "female",
    birthYear: 2000,
    ...override,
  };
}

describe("FamilyTree", () => {
  test("descendants follow parent ids up to any depth", () => {
    const tree = new FamilyTree([
      person({ id: "root", birthYear: 1950, deathYear: 2030 }),
      person({ id: "a", parentId: "root", birthYear: 1975 }),
      person({ id: "b", parentId: "a", birthYear: 2000 }),
      person({ id: "c", parentId: "b", birthYear: 2025 }),
      // A stranger with no link to the line never shows up.
      person({ id: "x", birthYear: 2000 }),
    ]);

    const heirs = tree.descendantsOf("root", 2030).map((member) => member.id);
    expect(heirs).toContain("a");
    expect(heirs).toContain("b");
    expect(heirs).toContain("c");
    expect(heirs).not.toContain("x");
  });

  test("dead generations are skipped as heirs but still lead to living ones", () => {
    const tree = new FamilyTree([
      person({ id: "root", birthYear: 1950, deathYear: 2030 }),
      person({ id: "a", parentId: "root", birthYear: 1975, deathYear: 2020 }),
      person({ id: "b", parentId: "a", birthYear: 2000 }),
    ]);

    const heirs = tree.descendantsOf("root", 2030).map((member) => member.id);
    expect(heirs).not.toContain("a"); // died before the succession year
    expect(heirs).toContain("b"); // grandchild still counts
  });

  test("pickHeir returns a living descendant and stays null when the line ends", () => {
    const populated = new FamilyTree([
      person({ id: "root", birthYear: 1950, deathYear: 2030 }),
      person({ id: "a", parentId: "root", birthYear: 1980 }),
      person({ id: "b", parentId: "root", birthYear: 1982 }),
    ]);
    for (let seed = 0; seed < 20; seed += 1) {
      const heir = populated.pickHeir("root", 2030, new SeededRng(seed));
      expect(heir?.id === "a" || heir?.id === "b").toBe(true);
    }

    const empty = new FamilyTree([
      person({ id: "root", birthYear: 1950, deathYear: 2030 }),
    ]);
    expect(empty.pickHeir("root", 2030, new SeededRng(1))).toBeNull();
  });

  test("registerCharacter files the player and their children by id", () => {
    const character = {
      id: "c-2026-ลีแอม",
      givenName: "ลีแอม",
      familyName: "มิลเลอร์",
      gender: "male" as const,
      birthYear: 2026,
      family: {
        children: [
          person({ id: "child-1", parentId: "c-2026-ลีแอม", birthYear: 2055 }),
        ],
      },
    };
    const tree = new FamilyTree();
    // Cast is safe here: only id, name, gender, birthYear and children read.
    tree.registerCharacter(
      character as unknown as Parameters<FamilyTree["registerCharacter"]>[0],
      2106,
    );
    expect(tree.size).toBe(2);
    const heirs = tree.descendantsOf("c-2026-ลีแอม", 2100).map((member) => member.id);
    expect(heirs).toEqual(["child-1"]);
  });

  test("snapshot is a copy: editing it never mutates the tree", () => {
    const tree = new FamilyTree([person({ id: "root" })]);
    const copy = tree.snapshot();
    // familyName is the one mutable field (marriage renames), so it is the
    // honest probe for whether the copy is detached from the tree.
    copy[0]!.familyName = "แก้ไขแล้ว";
    expect(tree.snapshot()[0]?.familyName).toBe("หนึ่งชีวิต");
  });
});
