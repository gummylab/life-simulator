import type { Character } from "./Character";
import type { Person } from "./Person";

/** One line in the scrolling life log. */
export interface TimelineEntry {
  readonly year: number;
  readonly age: number;
  readonly text: string;
}

/**
 * Dynasty-wide facts that survive across lives (Phase 3).
 *
 * The current character is deliberately absent: they live on GameState
 * and get filed into the tree only when they die.
 */
export interface DynastyState {
  /** 1 for the founder life, +1 on every succession. */
  generation: number;
  /** Every known family member except the current character. */
  tree: Person[];
  /** Chronicle lines of past successions, oldest first. */
  chronicle: string[];
}

export interface GameStateSpec {
  readonly year: number;
  /** Original seed. Kept for display and for starting a fresh life. */
  readonly seed: number;
  /** Live generator state. Written back after every random draw. */
  readonly rngState: number;
  readonly character: Character;
  /** Family name the dynasty was founded with. Stays for the records. */
  readonly founderFamilyName: string;
  /** Free time left in the first year. Reset on every age up. */
  readonly timeLeft: number;
  /** Time the school or job already claimed at the start of the year. */
  readonly committedTime?: number;
  /** Life log restored from a save, oldest first. */
  readonly timeline?: readonly TimelineEntry[];
  /** Restored dynasty records; a fresh founder starts at generation 1. */
  readonly dynasty?: DynastyState;
  /** Action ids already offered this life; older files default to empty. */
  readonly seenActions?: readonly string[];
}

/**
 * The whole serializable state of a run.
 *
 * Everything a save file needs lives here. The class holds no logic beyond
 * appending to the timeline, which keeps export and import trivial later.
 */
export class GameState {
  year: number;
  seed: number;
  rngState: number;
  character: Character;
  founderFamilyName: string;
  timeLeft: number;
  committedTime: number;
  dynasty: DynastyState;
  /** Action ids the player has already been offered this life (Phase 5). */
  seenActions: string[];
  private readonly entries: TimelineEntry[] = [];
  /** Lines recorded since the year opened; drained by advanceYear into news. */
  private readonly newsLines: string[] = [];

  constructor(spec: GameStateSpec) {
    this.year = spec.year;
    this.seed = spec.seed;
    this.rngState = spec.rngState;
    this.character = spec.character;
    this.founderFamilyName = spec.founderFamilyName;
    this.timeLeft = spec.timeLeft;
    this.committedTime = spec.committedTime ?? 0;
    this.seenActions = [...(spec.seenActions ?? [])];
    this.dynasty = {
      generation: spec.dynasty?.generation ?? 1,
      tree: [...(spec.dynasty?.tree ?? [])],
      chronicle: [...(spec.dynasty?.chronicle ?? [])],
    };
    this.entries = [...(spec.timeline ?? [])];
  }

  /** Appends a line to the life log using the current year and age. */
  record(text: string): void {
    this.entries.push({
      year: this.year,
      age: this.character.ageAt(this.year),
      text,
    });
    this.newsLines.push(text);
  }

  /**
   * Drops everything recorded so far. advanceYear calls this right after
   * the year ticks, so only the year-start systems (events, allowance,
   * promotions, graduations) end up in the returned news.
   */
  clearNews(): void {
    this.newsLines.length = 0;
  }

  /** The news of the year that just resolved, oldest first. */
  drainNews(): string[] {
    const out = [...this.newsLines];
    this.newsLines.length = 0;
    return out;
  }

  /** Newest first, ready for the timeline view to render. */
  get history(): readonly TimelineEntry[] {
    return [...this.entries].reverse();
  }

  /** Oldest first, the order a save file stores the log in. */
  get timeline(): readonly TimelineEntry[] {
    return this.entries;
  }
}
