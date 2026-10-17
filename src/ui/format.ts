const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Fiat check figure shown next to every BTC amount. */
export function formatUsd(amount: number): string {
  return USD.format(amount);
}
