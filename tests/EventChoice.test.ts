import { describe, expect, test } from "bun:test";
import { Game } from "../src/core/Game";
import { GameState } from "../src/core/model/GameState";
import type { GameContent } from "../src/core/model/GameContent";
import { deserializeGame, serializeGame } from "../src/core/save/SaveManager";
import { GAME_CONTENT } from "../src/content/gameContent";
import { makeCharacter } from "./helpers";

/**
 * Yearly events that ask the player a question (ADR 0017).
 *
 * The engine picks the event and freezes its rendered text, but the effects
 * wait for the answer. These tests drive that hand-off: nothing lands until
 * the player chooses, only the chosen option is applied, and the question
 * survives a save round trip.
 */

const ASKING_CONTENT: GameContent = {
  ...GAME_CONTENT,
  events: [
    {
      id: "always-asks",
      category: "money",
      text: "มีคนยื่นข้อเสนอให้เลือกที่{place}",
      weight: 1,
      effects: {},
      options: [
        { text: "รับเงินก้อน", effects: { money: 0.001 }, resultText: "เลือกรับเงินก้อน" },
        {
          text: "เลือกความสงบ",
          effects: { stats: { happiness: 10 } },
          resultText: "เลือกความสงบของใจ",
        },
      ],
    },
  ],
};

/** Content with a single event that never asks: it just happens. */
const PLAIN_CONTENT: GameContent = {
  ...GAME_CONTENT,
  events: [
    {
      id: "always-happens",
      category: "money",
      text: "ได้เงินจาก{place}",
      weight: 1,
      effects: { money: 0.002 },
    },
  ],
};

function makeGame(content: GameContent, age = 20): Game {
  const character = makeCharacter({ birthYear: 2000, money: 0, maxLifespan: 110 });
  const state = new GameState({
    year: 2000 + age,
    seed: 11,
    rngState: 11,
    character,
    founderFamilyName: "หนึ่งชีวิต",
    timeLeft: 100,
  });
  return new Game(state, content);
}

/** Advances until the yearly chance actually rolls the event. */
function advanceUntilAsked(game: Game): void {
  for (let year = 0; year < 40 && game.pendingEvent === null; year += 1) {
    game.advanceYear();
  }
  if (game.pendingEvent === null) {
    throw new Error("the event never fired");
  }
}

describe("yearly events with choices", () => {
  test("a question waits for the player instead of applying itself", () => {
    const game = makeGame(ASKING_CONTENT);
    advanceUntilAsked(game);

    const pending = game.pendingEvent;
    expect(pending?.eventId).toBe("always-asks");
    expect(pending?.options).toHaveLength(2);
    // Tokens are resolved once, for the prompt and for every option.
    expect(pending?.text).not.toMatch(/\{[a-z]+\}/);
    for (const option of pending?.options ?? []) {
      expect(option.label).not.toMatch(/\{[a-z]+\}/);
      expect(option.result).not.toMatch(/\{[a-z]+\}/);
    }
    // Nothing from the event has landed yet.
    expect(game.character.money).toBe(0);
    expect(game.gameState.timeline.map((entry) => entry.text)).not.toContain(
      "เลือกรับเงินก้อน",
    );
  });

  test("answering applies only the chosen option and logs its line once", () => {
    const game = makeGame(ASKING_CONTENT);
    advanceUntilAsked(game);
    const happinessBefore = game.character.stats.get("happiness");

    expect(game.resolveEvent(0)).toBe(true);
    expect(game.character.money).toBeCloseTo(0.001, 10);
    // Option 0 is about money only, so mood is untouched by the choice.
    expect(game.character.stats.get("happiness")).toBe(happinessBefore);

    const lines = game.gameState.timeline.map((entry) => entry.text);
    expect(lines).toContain("เลือกรับเงินก้อน");
    expect(lines).not.toContain("เลือกความสงบของใจ");

    // The question is gone, so it cannot be answered twice.
    expect(game.pendingEvent).toBeNull();
    expect(game.resolveEvent(0)).toBe(false);
    expect(game.character.money).toBeCloseTo(0.001, 10);
  });

  test("the second option takes its own effects", () => {
    const game = makeGame(ASKING_CONTENT);
    advanceUntilAsked(game);
    const happinessBefore = game.character.stats.get("happiness");

    expect(game.resolveEvent(1)).toBe(true);
    expect(game.character.money).toBe(0);
    expect(game.character.stats.get("happiness")).toBe(happinessBefore + 10);
  });

  test("an unknown option index is refused without clearing the question", () => {
    const game = makeGame(ASKING_CONTENT);
    advanceUntilAsked(game);

    expect(game.resolveEvent(7)).toBe(false);
    expect(game.pendingEvent).not.toBeNull();
    expect(game.character.money).toBe(0);
  });

  test("an ignored question expires with the year and holds that year's roll", () => {
    const game = makeGame(ASKING_CONTENT);
    advanceUntilAsked(game);
    const yearOfQuestion = game.gameState.year;

    game.advanceYear();
    expect(game.gameState.year).toBe(yearOfQuestion + 1);
    // The unanswered question is gone, and no new event replaced it.
    expect(game.pendingEvent).toBeNull();
    expect(game.gameState.timeline.map((entry) => entry.text)).toContain(
      "ปล่อยเรื่องที่ค้างไว้ผ่านไปโดยไม่ได้ตัดสินใจ",
    );

    // A later year can ask again.
    advanceUntilAsked(game);
    expect(game.pendingEvent).not.toBeNull();
  });

  test("an event without options still happens on the spot", () => {
    const game = makeGame(PLAIN_CONTENT);
    for (let year = 0; year < 40 && game.character.money === 0; year += 1) {
      game.advanceYear();
    }
    expect(game.character.money).toBeCloseTo(0.002, 10);
    expect(game.pendingEvent).toBeNull();
    const lines = game.gameState.timeline.map((entry) => entry.text);
    expect(lines.some((line) => line.startsWith("ได้เงินจาก"))).toBe(true);
    expect(lines.join(" ")).not.toMatch(/\{[a-z]+\}/);
  });

  test("a question survives the save round trip and can still be answered", () => {
    const game = makeGame(ASKING_CONTENT);
    advanceUntilAsked(game);

    const restored = deserializeGame(serializeGame(game.gameState, 100_000));
    expect(restored).not.toBeNull();
    if (restored === null) {
      return;
    }
    expect(restored.state.pendingEvent).toEqual(game.pendingEvent);

    const reloaded = new Game(restored.state, ASKING_CONTENT);
    expect(reloaded.resolveEvent(0)).toBe(true);
    expect(reloaded.character.money).toBeCloseTo(0.001, 10);
  });

  test("a malformed saved question is dropped instead of breaking the load", () => {
    const game = makeGame(ASKING_CONTENT);
    advanceUntilAsked(game);

    const payload = JSON.parse(serializeGame(game.gameState, 100_000)) as {
      pendingEvent: unknown;
    };
    payload.pendingEvent = { eventId: "always-asks", text: "ค้างอยู่", options: [] };
    const restored = deserializeGame(JSON.stringify(payload));
    expect(restored?.state.pendingEvent).toBeNull();
  });

  test("a dead character cannot answer, so a stale question cannot pay out", () => {
    const game = makeGame(ASKING_CONTENT);
    advanceUntilAsked(game);
    game.character.die("oldAge");

    expect(game.resolveEvent(0)).toBe(false);
    expect(game.pendingEvent).not.toBeNull();
    expect(game.character.money).toBe(0);
  });
});
