/**
 * Money formatting for the UI layer.
 *
 * BTC is the only currency of the fictional world, but eight decimals are
 * unreadable at a glance, so every screen leads with the USD check figure
 * and keeps the BTC amount right next to it. Cents stay visible below $100
 * so a small amount never rounds away to "$0".
 */

const USD_LARGE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const USD_SMALL = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Below this the cents carry meaning; above it they are noise. */
const CENTS_CEILING = 100;

/** USD check figure shown next to every BTC amount. */
export function formatUsd(amount: number): string {
  return Math.abs(amount) < CENTS_CEILING
    ? USD_SMALL.format(amount)
    : USD_LARGE.format(amount);
}

/** BTC amount as text. Screens use four decimals, records the full eight. */
export function formatBtc(amount: number, digits = 4): string {
  return amount.toFixed(digits);
}
