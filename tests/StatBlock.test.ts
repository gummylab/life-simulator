import { describe, expect, test } from "bun:test";
import { STAT_DEFAULT, StatBlock } from "../src/core/model/StatBlock";

describe("StatBlock", () => {
  test("every stat starts at the default value", () => {
    const stats = new StatBlock();
    expect(stats.get("health")).toBe(STAT_DEFAULT);
    expect(stats.get("happiness")).toBe(STAT_DEFAULT);
    expect(stats.get("smarts")).toBe(STAT_DEFAULT);
    expect(stats.get("looks")).toBe(STAT_DEFAULT);
  });

  test("constructor accepts partial overrides", () => {
    const stats = new StatBlock({ health: 80 });
    expect(stats.get("health")).toBe(80);
    expect(stats.get("smarts")).toBe(STAT_DEFAULT);
  });

  test("change clamps into 0..100", () => {
    const stats = new StatBlock({ health: 99 });
    stats.change("health", 50);
    expect(stats.get("health")).toBe(100);

    stats.change("health", -999);
    expect(stats.get("health")).toBe(0);
  });

  test("changeMany applies only the keys it receives", () => {
    const stats = new StatBlock();
    stats.changeMany({ smarts: 10, happiness: -20 });
    expect(stats.get("smarts")).toBe(60);
    expect(stats.get("happiness")).toBe(30);
    expect(stats.get("health")).toBe(STAT_DEFAULT);
  });

  test("snapshot returns an isolated copy", () => {
    const stats = new StatBlock({ looks: 70 });
    const copy = stats.snapshot();
    copy.looks = 10;
    expect(stats.get("looks")).toBe(70);
  });
});
