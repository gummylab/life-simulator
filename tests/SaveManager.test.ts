import { describe, expect, test } from "bun:test";
import { GameState } from "../src/core/model/GameState";
import {
  SAVE_VERSION,
  deserializeGame,
  serializeGame,
} from "../src/core/save/SaveManager";
import { makeCharacter } from "./helpers";

function makeState(): GameState {
  const state = new GameState({
    year: 2030,
    seed: 42,
    rngState: 777,
    character: makeCharacter({
      birthYear: 2026,
      money: 0.0042,
      energy: 55,
      stats: { health: 70, happiness: 40, smarts: 80, looks: 30 },
    }),
    founderFamilyName: "มิลเลอร์",
    timeLeft: 45,
    committedTime: 30,
  });
  state.record("บรรทัดแรกของบันทึกชีวิต");
  return state;
}

describe("SaveManager", () => {
  test("a round trip keeps every field of the run", () => {
    const original = makeState();
    const restored = deserializeGame(serializeGame(original, 81_470));

    expect(restored).not.toBeNull();
    if (!restored) {
      return;
    }
    const state = restored.state;
    expect(restored.baseRateUsd).toBe(81_470);
    expect(state.year).toBe(2030);
    expect(state.seed).toBe(42);
    expect(state.rngState).toBe(777);
    expect(state.founderFamilyName).toBe("มิลเลอร์");
    expect(state.timeLeft).toBe(45);
    expect(state.committedTime).toBe(30);
    expect(state.character.name).toBe("ทดสอบ หนึ่งชีวิต");
    expect(state.character.money).toBe(0.0042);
    expect(state.character.energy).toBe(55);
    expect(state.character.stats.get("smarts")).toBe(80);
    expect(state.timeline).toHaveLength(1);
    expect(state.timeline[0]?.text).toBe("บรรทัดแรกของบันทึกชีวิต");
  });

  test("a dead character round trips with its cause of death", () => {
    const original = makeState();
    original.character.die("illness");
    const restored = deserializeGame(serializeGame(original, 1));

    expect(restored?.state.character.alive).toBe(false);
    expect(restored?.state.character.deathCause).toBe("illness");
  });

  test("malformed json and foreign objects load as no save at all", () => {
    expect(deserializeGame("not json at all")).toBeNull();
    expect(deserializeGame('{"hello": "world"}')).toBeNull();
    expect(deserializeGame('{"version": 9999}')).toBeNull();
  });

  test("a file with broken field types is refused instead of crashing", () => {
    const broken = JSON.parse(serializeGame(makeState(), 1)) as Record<string, unknown>;
    broken.year = "not a number";
    expect(deserializeGame(JSON.stringify(broken))).toBeNull();

    const brokenCharacter = JSON.parse(serializeGame(makeState(), 1)) as {
      character: Record<string, unknown>;
    };
    brokenCharacter.character.gender = "other";
    expect(deserializeGame(JSON.stringify(brokenCharacter))).toBeNull();
  });

  test("the payload carries the schema version it was written with", () => {
    const payload = JSON.parse(serializeGame(makeState(), 1)) as { version: number };
    expect(payload.version).toBe(SAVE_VERSION);
  });

  test("education, job and family survive a round trip", () => {
    const original = makeState();
    const character = original.character;
    character.education.primarySchool = "ซันนี่เดล เอเลเมนทารี";
    character.education.secondarySchool = "กรีนฟิลด์ ไฮ";
    character.education.enrolledUniversity = true;
    character.job.id = "engineer";
    character.job.years = 12;
    character.job.level = 3;
    character.family.parents.push({
      id: "npc-male-2000-1111",
      givenName: "โนอา",
      familyName: "หนึ่งชีวิต",
      gender: "male",
      birthYear: 2000,
    });
    character.family.partner = {
      id: "npc-female-2028-2222",
      givenName: "เอมม่า",
      familyName: "หนึ่งชีวิต",
      gender: "female",
      birthYear: 2028,
    };
    character.family.married = true;
    character.family.children.push({
      id: "child-1",
      givenName: "ลีแอม",
      familyName: "หนึ่งชีวิต",
      gender: "male",
      birthYear: 2030,
    });

    const restored = deserializeGame(serializeGame(original, 1));
    expect(restored).not.toBeNull();
    if (!restored) {
      return;
    }
    const saved = restored.state.character;
    expect(saved.education.primarySchool).toBe("ซันนี่เดล เอเลเมนทารี");
    expect(saved.education.enrolledUniversity).toBe(true);
    expect(saved.job.id).toBe("engineer");
    expect(saved.job.years).toBe(12);
    expect(saved.job.level).toBe(3);
    expect(saved.family.parents).toHaveLength(1);
    expect(saved.family.parents[0]?.id).toBe("npc-male-2000-1111");
    expect(saved.family.partner?.givenName).toBe("เอมม่า");
    expect(saved.family.married).toBe(true);
    expect(saved.family.children[0]?.familyName).toBe("หนึ่งชีวิต");
  });

  test("a Phase-1 save without the newer fields loads with empty defaults", () => {
    // Simulates a file written before Phase 2 existed: strip the new
    // sections entirely and confirm the game still resumes.
    const payload = JSON.parse(serializeGame(makeState(), 1)) as {
      character: Record<string, unknown>;
    };
    delete payload.character.education;
    delete payload.character.job;
    delete payload.character.family;

    const restored = deserializeGame(JSON.stringify(payload));
    expect(restored).not.toBeNull();
    if (!restored) {
      return;
    }
    const character = restored.state.character;
    expect(character.education.primarySchool).toBeNull();
    expect(character.education.enrolledUniversity).toBe(false);
    expect(character.job.id).toBeNull();
    expect(character.job.years).toBe(0);
    expect(character.family.parents).toEqual([]);
    expect(character.family.partner).toBeNull();
    expect(character.family.married).toBe(false);
    expect(character.family.children).toEqual([]);
  });

  test("a family block with broken member types is ignored, not a crash", () => {
    const payload = JSON.parse(serializeGame(makeState(), 1)) as {
      character: Record<string, unknown>;
    };
    payload.character.family = { parents: "not an array", children: 42 };

    const restored = deserializeGame(JSON.stringify(payload));
    expect(restored).not.toBeNull();
    const family = restored?.state.character.family;
    expect(family?.parents).toEqual([]);
    expect(family?.children).toEqual([]);
  });

  test("the dynasty block round trips: generation, tree and chronicle", () => {
    const original = makeState();
    original.dynasty.generation = 3;
    original.dynasty.tree.push({
      id: "ancestor-1",
      givenName: "ลีแอม",
      familyName: "มิลเลอร์",
      gender: "male",
      birthYear: 1990,
      deathYear: 2070,
      parentId: "ancestor-0",
    });
    original.dynasty.chronicle.push("ลีแอม มิลเลอร์ แต่งงานกับ เอมม่า คลาร์ก มีลูก 2 คน");

    const restored = deserializeGame(serializeGame(original, 1));
    const dynasty = restored?.state.dynasty;
    expect(dynasty?.generation).toBe(3);
    expect(dynasty?.tree).toHaveLength(1);
    expect(dynasty?.tree[0]?.parentId).toBe("ancestor-0");
    expect(dynasty?.tree[0]?.deathYear).toBe(2070);
    expect(dynasty?.chronicle[0]).toContain("แต่งงานกับ");
  });

  test("a pre-Phase-3 save loads as generation 1 with no records", () => {
    const payload = JSON.parse(serializeGame(makeState(), 1)) as Record<string, unknown>;
    delete payload.dynasty;

    const restored = deserializeGame(JSON.stringify(payload));
    const dynasty = restored?.state.dynasty;
    expect(dynasty?.generation).toBe(1);
    expect(dynasty?.tree).toEqual([]);
    expect(dynasty?.chronicle).toEqual([]);
  });

  test("a dynasty block with broken shapes falls back to defaults", () => {
    const payload = JSON.parse(serializeGame(makeState(), 1)) as Record<string, unknown>;
    payload.dynasty = { generation: "two", tree: "branch", chronicle: 7 };

    const restored = deserializeGame(JSON.stringify(payload));
    const dynasty = restored?.state.dynasty;
    expect(dynasty?.generation).toBe(1);
    expect(dynasty?.tree).toEqual([]);
    expect(dynasty?.chronicle).toEqual([]);
  });

  test("seenActions round trips and defaults to empty on older saves", () => {
    const original = makeState();
    original.seenActions.push("enroll-university", "date");

    const restored = deserializeGame(serializeGame(original, 1));
    expect(restored?.state.seenActions).toEqual(["enroll-university", "date"]);

    // Pre-Phase-5 files carry no seenActions; the badges start over.
    const payload = JSON.parse(serializeGame(makeState(), 1)) as Record<string, unknown>;
    delete payload.seenActions;
    const legacy = deserializeGame(JSON.stringify(payload));
    expect(legacy?.state.seenActions).toEqual([]);

    // A corrupted shape is filtered instead of crashing the load.
    const broken = JSON.parse(serializeGame(makeState(), 1)) as Record<string, unknown>;
    broken.seenActions = ["study", 42, null];
    const filtered = deserializeGame(JSON.stringify(broken));
    expect(filtered?.state.seenActions).toEqual(["study"]);
  });
});
