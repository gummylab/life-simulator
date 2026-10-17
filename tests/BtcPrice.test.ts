import { describe, expect, test } from "bun:test";
import { BtcPrice } from "../src/core/economy/BtcPrice";

describe("BtcPrice", () => {
  test("the start year carries the live base rate untouched", () => {
    const price = new BtcPrice(100_000, 2026, 42);
    expect(price.rateForYear(2026)).toBe(100_000);
  });

  test("years further in the future drift away from the base", () => {
    const price = new BtcPrice(100_000, 2026, 42);
    expect(price.rateForYear(2040)).not.toBe(100_000);
  });

  test("the same seed and year always give the same rate", () => {
    const first = new BtcPrice(100_000, 2026, 42).rateForYear(2050);
    const second = new BtcPrice(100_000, 2026, 42).rateForYear(2050);
    expect(first).toBe(second);
  });

  test("drift stays inside one game year swing bounds", () => {
    const price = new BtcPrice(100_000, 2026, 7);
    let rate = price.rateForYear(2026);
    for (let year = 2027; year <= 2060; year += 1) {
      const next = price.rateForYear(year);
      const ratio = next / rate;
      expect(ratio).toBeGreaterThanOrEqual(0.55);
      expect(ratio).toBeLessThanOrEqual(1.55);
      rate = next;
    }
  });

  test("the rate never collapses to zero no matter how long the run", () => {
    const price = new BtcPrice(100_000, 2026, 3);
    expect(price.rateForYear(3000)).toBeGreaterThan(0);
  });
});
