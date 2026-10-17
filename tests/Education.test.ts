import { describe, expect, test } from "bun:test";
import {
  SCHOOL_SMARTS,
  SCHOOL_TIME,
  TUITION,
  timeBudgetForAge,
} from "../src/core/config";
import { WORLD } from "../src/content/world";
import { ACTIONS } from "../src/content/actions";
import { makeContentGame } from "./helpers";

describe("EducationSystem", () => {
  test("primary school starts at 6 with the world's school names", () => {
    const game = makeContentGame({ age: 5, money: 0.01 });
    game.advanceYear(); // 5 -> 6, primary begins
    const school = game.character.education.primarySchool;
    expect(WORLD.schools.primary).toContain(school ?? "");
    expect(game.stageLabel()).toBe("ชั้นประถมปีที่ 1");
  });

  test("learning raises smarts by the configured amount", () => {
    const game = makeContentGame({ age: 5, money: 0.01, stats: { smarts: 50 } });
    const before = game.character.stats.get("smarts");
    game.advanceYear(); // age 6: primary school + aging (+1 smarts until 25)
    const gained = game.character.stats.get("smarts") - before;
    // AgingSystem adds 1 until age 25; schooling adds the primary share.
    expect(gained).toBeGreaterThanOrEqual(SCHOOL_SMARTS.primary);
  });

  test("tuition is deducted in BTC each school year", () => {
    const game = makeContentGame({ age: 5, money: 0.01 });
    game.advanceYear();
    // Allowance at 6 is 0.0002; tuition comes out of the pocket money.
    const expected = 0.01 + 0.0002 - TUITION.primary;
    expect(game.character.money).toBeCloseTo(expected, 10);
  });

  test("school time is committed, leaving the rest of the budget free", () => {
    const game = makeContentGame({ age: 5, money: 0.01 });
    game.advanceYear();
    expect(game.timeBudget).toBe(timeBudgetForAge(6));
    expect(game.timeLeft).toBe(timeBudgetForAge(6) - SCHOOL_TIME.primary);
  });

  test("secondary school takes over at 12 and university needs the opt-in", () => {
    const game = makeContentGame({ age: 11, money: 0.01 });
    game.advanceYear(); // 11 -> 12: secondary begins
    expect(WORLD.schools.secondary).toContain(game.character.education.secondarySchool ?? "");
    expect(game.stageLabel()).toBe("ชั้นมัธยมปีที่ 1");

    // Without the age-17 opt-in, age 18 is out of school entirely.
    const plain = makeContentGame({ age: 17, money: 0.01 });
    plain.advanceYear(); // 17 -> 18
    expect(plain.stageLabel()).toBe("ไม่ได้เรียน");
    expect(plain.timeLeft).toBe(plain.timeBudget);
  });

  test("the age-17 action opts into university, which then runs 18 to 21", () => {
    const game = makeContentGame({ age: 17, money: 0.02 });
    const enroll = ACTIONS.find((action) => action.id === "enroll-university");
    expect(enroll).toBeDefined();
    if (enroll) {
      expect(game.performAction(enroll).accepted).toBe(true);
      // Still 17 and already enrolled: the second tap is refused.
      expect(game.actionBlockReason(enroll)).toBe("done");
    }
    expect(game.character.education.enrolledUniversity).toBe(true);

    game.advanceYear(); // 18: university year 1
    expect(game.stageLabel()).toBe("มหาวิทยาลัยปีที่ 1");
    expect(WORLD.schools.university).toContain(game.character.education.universitySchool ?? "");
    expect(game.timeLeft).toBe(timeBudgetForAge(18) - SCHOOL_TIME.university);
  });

  test("graduation lines are written once, at the right ages", () => {
    // Walk a real life from age 5 so every school stage is actually attended.
    const game = makeContentGame({ age: 5, money: 0.02 });
    for (let i = 0; i < 7; i += 1) {
      game.advanceYear(); // 5 -> 12: primary attended, then graduates
    }
    expect(game.age).toBe(12);
    const texts = game.gameState.history.map((entry) => entry.text);
    expect(texts.some((text) => text.startsWith("จบชั้นประถม"))).toBe(true);

    // A life that opts into university graduates it at 22.
    const uni = makeContentGame({ age: 5, money: 0.5 });
    const enroll = ACTIONS.find((action) => action.id === "enroll-university");
    for (let i = 0; i < 12; i += 1) {
      uni.advanceYear(); // 5 -> 17
    }
    if (enroll) {
      uni.performAction(enroll);
    }
    for (let i = 0; i < 5; i += 1) {
      uni.advanceYear(); // 17 -> 22
    }
    expect(uni.age).toBe(22);
    const uniTexts = uni.gameState.history.map((entry) => entry.text);
    expect(uniTexts.some((text) => text.startsWith("จบมหาวิทยาลัย"))).toBe(true);
  });
});
