/**
 * Deterministic random number generator (mulberry32).
 *
 * Why: every random draw in the game must be reproducible. A save file can
 * then carry the generator state forward, and a playtest can be replayed
 * from the same seed to reproduce a bug.
 */
export class SeededRng {
  private current: number;

  constructor(seed: number) {
    this.current = seed >>> 0;
  }

  /** Current generator state. Store this in the save file. */
  get state(): number {
    return this.current;
  }

  /** Float in [0, 1). */
  next(): number {
    this.current = (this.current + 0x6d2b79f5) >>> 0;
    let t = this.current;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [minInclusive, maxExclusive). */
  int(minInclusive: number, maxExclusive: number): number {
    if (maxExclusive <= minInclusive) {
      throw new RangeError(
        `SeededRng.int needs maxExclusive > minInclusive, got [${minInclusive}, ${maxExclusive})`,
      );
    }
    return minInclusive + Math.floor(this.next() * (maxExclusive - minInclusive));
  }

  /** Integer in [min, max], both ends included. */
  between(min: number, max: number): number {
    return this.int(min, max + 1);
  }

  /** True with the given probability, where 0 never fires and 1 always fires. */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Random member of a non-empty list. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError("SeededRng.pick needs a non-empty list");
    }
    return items[this.int(0, items.length)] ?? items[0]!;
  }
}
