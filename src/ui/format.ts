const MONEY = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

/** Money without decimals, grouped the way Thai readers expect. */
export function formatMoney(amount: number): string {
  return MONEY.format(amount);
}

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Fiat check figure shown next to every BTC amount. */
export function formatUsd(amount: number): string {
  return USD.format(amount);
}

/** Escapes text before it goes into innerHTML. Saves us if an imported
 * save file ever carries a hostile name. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
