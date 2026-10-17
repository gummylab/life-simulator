/**
 * Live BTC price lookup.
 *
 * The game ships as a static site, so it pulls the rate in the browser.
 * Every failure path returns something usable: live rate, then the last
 * cached rate, then a fixed fallback, because a dead network must never
 * block play.
 */

const ENDPOINT =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";
const CACHE_KEY = "life-simulator.btcRate";
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
/** Used when both the network and the cache are empty. */
export const FALLBACK_RATE_USD = 100_000;

export type RateSource = "live" | "cache" | "fallback";

export interface BtcQuote {
  readonly rateUsd: number;
  readonly source: RateSource;
  /** Thai note telling the player where the number came from. */
  readonly note: string;
}

interface CachedRate {
  readonly rateUsd: number;
  readonly at: number;
}

const NOTES: Record<RateSource, string> = {
  live: "ราคาจาก CoinGecko",
  cache: "ใช้ราคาที่เก็บไว้ล่าสุด",
  fallback: "ใช้ราคาประมาณการ (ออฟไลน์)",
};

async function fetchLiveRate(): Promise<number | null> {
  try {
    const response = await fetch(ENDPOINT);
    if (!response.ok) {
      return null;
    }
    const data: unknown = await response.json();
    const rate = (data as { bitcoin?: { usd?: unknown } })?.bitcoin?.usd;
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

function readCache(): CachedRate | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    const cache = parsed as Partial<CachedRate>;
    if (typeof cache.rateUsd !== "number" || typeof cache.at !== "number") {
      return null;
    }
    if (Date.now() - cache.at > CACHE_MAX_AGE_MS) {
      return null;
    }
    return { rateUsd: cache.rateUsd, at: cache.at };
  } catch {
    return null;
  }
}

function writeCache(rateUsd: number): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rateUsd, at: Date.now() }));
  } catch {
    // Private browsing can refuse writes. The game plays on without a cache.
  }
}

/** Best available rate, cheapest failure path first. */
export async function resolveBtcQuote(): Promise<BtcQuote> {
  const live = await fetchLiveRate();
  if (live !== null) {
    writeCache(live);
    return { rateUsd: live, source: "live", note: NOTES.live };
  }

  const cached = readCache();
  if (cached) {
    return { rateUsd: cached.rateUsd, source: "cache", note: NOTES.cache };
  }

  return { rateUsd: FALLBACK_RATE_USD, source: "fallback", note: NOTES.fallback };
}
