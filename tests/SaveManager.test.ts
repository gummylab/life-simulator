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
});
