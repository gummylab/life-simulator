import { describe, expect, test } from "bun:test";
import { makeContentGame } from "./helpers";
import { JOBS } from "../src/content/jobs";
import { SALARY, SCHOOL_TIME, TUITION, YEARLY_EXPENSES, allowanceForAge, timeBudgetForAge } from "../src/core/config";

const clerk = JOBS.find((job) => job.id === "clerk");
const partTime = JOBS.find((job) => job.id === "part-time-shop");
const engineer = JOBS.find((job) => job.id === "engineer");

describe("CareerSystem", () => {
  test("a young applicant is refused until the job's age", () => {
    const tooYoung = makeContentGame({ age: 13 });
    if (clerk) {
      expect(tooYoung.jobBlockReason(clerk)).toBe("age");
    }
    if (partTime) {
      expect(tooYoung.jobBlockReason(partTime)).toBe("age");
    }
    // At 14 the part-time job opens up.
    const teen = makeContentGame({ age: 14 });
    if (partTime) {
      expect(teen.jobBlockReason(partTime)).toBeNull();
    }
  });

  test("education gates the better jobs", () => {
    // Age 18 with no secondary school name recorded: clerk needs secondary.
    const game = makeContentGame({ age: 18 });
    if (clerk) {
      expect(game.jobBlockReason(clerk)).toBe("education");
    }
  });

  test("a stat floor blocks the engineer job until smarts catch up", () => {
    const game = makeContentGame({ age: 22, stats: { smarts: 60 } });
    // Simulate a finished university so only the stat gate can block.
    game.character.education.universitySchool = "เลคไซด์ ยูนิเวอร์ซิตี้";
    if (engineer) {
      expect(game.jobBlockReason(engineer)).toBe("stat");
      game.character.stats.change("smarts", 20);
      expect(game.jobBlockReason(engineer)).toBeNull();
    }
  });

  test("salary arrives and expenses leave every year on the job", () => {
    // Start with a balance so tuition does not hit the zero floor.
    const game = makeContentGame({ age: 14, money: 0.05 });
    if (!partTime) {
      throw new Error("missing part-time job in catalog");
    }
    expect(game.applyForJob(partTime)).toBe(true);
    expect(game.character.job.id).toBe(partTime.id);

    game.advanceYear(); // 15: first full year worked (still in secondary school)
    const net = SALARY["part-time-shop"] - YEARLY_EXPENSES - TUITION.secondary;
    expect(game.character.money).toBeCloseTo(0.05 + net + allowanceForAge(15), 10);
    expect(game.character.job.years).toBe(1);
  });

  test("promotions raise the level every few years on the job", () => {
    const game = makeContentGame({ age: 15, money: 0.05 });
    if (!partTime) {
      throw new Error("missing part-time job in catalog");
    }
    game.applyForJob(partTime);
    for (let i = 0; i < 3; i += 1) {
      game.advanceYear();
    }
    expect(game.character.job.level).toBeGreaterThanOrEqual(1);
    const texts = game.gameState.history.map((entry) => entry.text);
    expect(texts.some((text) => text.startsWith("เลื่อนขั้น"))).toBe(true);
  });

  test("job time is committed, leaving less free time than unemployment", () => {
    const game = makeContentGame({ age: 15, money: 0.05 });
    if (!partTime) {
      throw new Error("missing part-time job in catalog");
    }
    game.applyForJob(partTime);
    game.advanceYear(); // 16: working year (still in secondary school)
    expect(game.timeLeft).toBe(timeBudgetForAge(16) - SCHOOL_TIME.secondary - partTime.timeCost);

    game.quitJob();
    game.advanceYear(); // 17: unemployed again, school still commits
    expect(game.timeLeft).toBe(timeBudgetForAge(17) - SCHOOL_TIME.secondary);
  });

  test("quitting is refused with no job in hand", () => {
    const game = makeContentGame({ age: 15 });
    game.quitJob(); // should not throw
    expect(game.character.job.id).toBeNull();
  });

  test("applying under the job's minimum age is refused", () => {
    const game = makeContentGame({ age: 13, money: 0.05 });
    if (partTime) {
      expect(game.applyForJob(partTime)).toBe(false);
      expect(game.character.job.id).toBeNull();
    }
  });
});
