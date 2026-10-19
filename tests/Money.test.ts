import { describe, expect, test } from "bun:test";
import { formatBtc, formatUsd } from "../src/ui/money";

/**
 * Money is the one number that appears on nearly every screen, so the
 * formatting rules get their own tests: the USD check figure leads, cents
 * survive below $100, and BTC keeps enough decimals to be a real amount.
 */
describe("money formatting", () => {
  test("small amounts keep their cents instead of rounding away to $0", () => {
    expect(formatUsd(30)).toBe("$30.00");
    expect(formatUsd(0.3)).toBe("$0.30");
    expect(formatUsd(0)).toBe("$0.00");
  });

  test("large amounts drop the cents", () => {
    expect(formatUsd(2000)).toBe("$2,000");
    expect(formatUsd(10_000_000_000)).toBe("$10,000,000,000");
  });

  test("BTC reads as four decimals on screens and eight in records", () => {
    expect(formatBtc(0.0003)).toBe("0.0003");
    expect(formatBtc(0.02, 8)).toBe("0.02000000");
    expect(formatBtc(0.00000001, 8)).toBe("0.00000001");
  });
});
