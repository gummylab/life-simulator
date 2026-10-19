import { describe, expect, test } from "bun:test";
import { ACTIONS } from "../src/content/actions";
import { JOBS } from "../src/content/jobs";
import { GAME_CONTENT } from "../src/content/gameContent";
import { createLife } from "../src/core/GameFactory";
import type { Game } from "../src/core/Game";
import { STAT_KEYS } from "../src/core/model/StatBlock";

/**
 * Task 2.8 balance playtests: play whole lives with the real content and
 * prove the numbers stay inside the designed bands. These are statistical
 * guardrails, not exact-value tests, so seeds may wobble within the band.
 */

const BIRTH_YEAR = 2026;

function action(id: string) {
  const found = ACTIONS.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`missing action ${id}`);
  }
  return found;
}

const engineer = JOBS.find((job) => job.id === "engineer");

/**
 * Plays a full life from birth with a fixed strategy: university at 17,
 * engineer career from 22, then dating, marriage and one child. Returns
 * the finished game once the character has died of old age.
 */
function playWorkingLife(seed: number): Game {
  const game = createLife(
    { givenName: "อีธาน", familyName: "มิลเลอร์", gender: "male" },
    seed,
    BIRTH_YEAR,
    GAME_CONTENT,
  );
  let years = 0;
  while (game.character.alive && years < 150) {
    const age = game.age;
    if (age === 17) {
      game.performAction(action("enroll-university"));
    }
    if (age === 22 && engineer) {
      game.applyForJob(engineer);
    }
    if (age === 25 && game.character.family.partner === null) {
      game.performAction(action("date"));
    }
    if (age === 27 && game.character.family.married === false) {
      game.performAction(action("marry"));
    }
    game.advanceYear();
    years += 1;
  }
  return game;
}

/** A life that never studies, never works and never spends effort. */
function playIdleLife(seed: number): Game {
  const game = createLife(
    { givenName: "อวา", familyName: "คลาร์ก", gender: "female" },
    seed,
    BIRTH_YEAR,
    GAME_CONTENT,
  );
  let years = 0;
  while (game.character.alive && years < 150) {
    game.advanceYear();
    years += 1;
  }
  return game;
}

describe("balance playtest", () => {
  test("a working life ends comfortably rich, never absurd", () => {
    for (const seed of [11, 47, 90]) {
      const game = playWorkingLife(seed);
      expect(game.character.alive).toBe(false);
      // Engineer career over 60+ years: comfortable, nowhere near a billion.
      // At the fallback rate the band reads roughly $25k to $120k.
      expect(game.character.money).toBeGreaterThan(0.025);
      expect(game.character.money).toBeLessThan(1.2);
    }
  });

  test("an idle life lives on allowance and never gets rich", () => {
    for (const seed of [5, 33, 78]) {
      const game = playIdleLife(seed);
      expect(game.character.alive).toBe(false);
      // Allowance ends at 20; random events may add scraps, never wealth.
      expect(game.character.money).toBeLessThan(0.02);
    }
  });

  test("the engineer career is actually held in a working life", () => {
    const game = playWorkingLife(47);
    expect(game.character.job.id).toBe("engineer");
    expect(game.character.job.years).toBeGreaterThan(40);
    expect(game.character.education.universitySchool).not.toBeNull();
  });

  test("stats stay inside 0..100 at every year of a whole life", () => {
    const game = createLife(
      { givenName: "มิอา", familyName: "ฮาร์ต", gender: "female" },
      2026,
      BIRTH_YEAR,
      GAME_CONTENT,
    );
    let years = 0;
    while (game.character.alive && years < 150) {
      game.advanceYear();
      for (const key of STAT_KEYS) {
        const value = game.character.stats.get(key);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
      // Money never goes negative: the world floors the purse at zero.
      expect(game.character.money).toBeGreaterThanOrEqual(0);
      years += 1;
    }
    expect(game.character.alive).toBe(false);
  });
});
