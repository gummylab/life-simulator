import { SeededRng } from "../rng/SeededRng";

/**
 * Yearly BTC swing bounds. Crypto can move hard, but a single in-game year
 * never wipes the rate out or multiplies it by ten.
 */
const MIN_DRIFT = -0.45;
const MAX_DRIFT = 0.55;
const MIN_RATE_USD = 1;

/**
 * The BTC rate the dynasty lives with.
 *
 * The start year carries the real market rate pulled from CoinGecko. Every
 * later game year drifts from it deterministically, because the real market
 * has no prices for the future the game walks into. Seeding each year makes
 * a save file replay the same path on any machine.
 */
export class BtcPrice {
  constructor(
    private readonly baseRateUsd: number,
    private readonly startYear: number,
    private readonly seed: number,
  ) {}

  /** The live rate the whole simulation drifts from, kept for the save file. */
  get base(): number {
    return this.baseRateUsd;
  }

  /** Rate for one game year, in USD. */
  rateForYear(gameYear: number): number {
    if (gameYear <= this.startYear) {
      return this.baseRateUsd;
    }

    let rate = this.baseRateUsd;
    for (let year = this.startYear + 1; year <= gameYear; year += 1) {
      rate = this.step(rate, year);
    }
    return rate;
  }

  private step(rate: number, year: number): number {
    const rng = new SeededRng((this.seed ^ Math.imul(year, 2654435761)) >>> 0);
    const drift = MIN_DRIFT + rng.next() * (MAX_DRIFT - MIN_DRIFT);
    return Math.max(MIN_RATE_USD, rate * (1 + drift));
  }
}
