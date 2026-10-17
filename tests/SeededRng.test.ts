import { describe, expect, test } from "bun:test";
import { SeededRng } from "../src/core/rng/SeededRng";

function draw(rng: SeededRng, count: number): number[] {
  return Array.from({ length: count }, () => rng.next());
}

describe("SeededRng", () => {
  test("the same seed replays the same sequence", () => {
    const first = draw(new SeededRng(42), 5);
    const second = draw(new SeededRng(42), 5);
    expect(first).toEqual(second);
  });

  test("different seeds diverge", () => {
    expect(draw(new SeededRng(1), 3)).not.toEqual(draw(new SeededRng(2), 3));
  });

  test("state can be stored and resumed by a save file", () => {
    const rng = new SeededRng(7);
    draw(rng, 3);
    const saved = rng.state;

    const resumed = new SeededRng(saved);
    expect(resumed.next()).toBe(rng.next());
  });

  test("int stays inside the requested range", () => {
    const rng = new SeededRng(9);
    for (let i = 0; i < 500; i += 1) {
      const value = rng.int(3, 8);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThan(8);
    }
  });

  test("between includes both ends", () => {
    const rng = new SeededRng(11);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const value = rng.between(60, 100);
      expect(value).toBeGreaterThanOrEqual(60);
      expect(value).toBeLessThanOrEqual(100);
      seen.add(value);
    }
    expect(seen.size).toBeGreaterThan(20);
  });

  test("chance honours 0 and 1", () => {
    const rng = new SeededRng(3);
    for (let i = 0; i < 50; i += 1) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  test("pick returns a member of a non-empty list", () => {
    const rng = new SeededRng(5);
    const list = ["a", "b", "c"] as const;
    for (let i = 0; i < 50; i += 1) {
      expect(list).toContain(rng.pick(list));
    }
  });

  test("pick refuses an empty list", () => {
    expect(() => new SeededRng(1).pick([])).toThrow(RangeError);
  });

  test("int refuses an empty range", () => {
    expect(() => new SeededRng(1).int(5, 5)).toThrow(RangeError);
  });
});
