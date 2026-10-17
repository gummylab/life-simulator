import type { Character } from "./Character";

/** One line in the scrolling life log. */
export interface TimelineEntry {
  readonly year: number;
  readonly age: number;
  readonly text: string;
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
  private readonly timeline: TimelineEntry[] = [];

  constructor(spec: GameStateSpec) {
    this.year = spec.year;
    this.seed = spec.seed;
    this.rngState = spec.rngState;
    this.character = spec.character;
    this.founderFamilyName = spec.founderFamilyName;
    this.timeLeft = spec.timeLeft;
    this.committedTime = spec.committedTime ?? 0;
  }

  /** Appends a line to the life log using the current year and age. */
  record(text: string): void {
    this.timeline.push({
      year: this.year,
      age: this.character.ageAt(this.year),
      text,
    });
  }

  /** Newest first, ready for the timeline view to render. */
  get history(): readonly TimelineEntry[] {
    return [...this.timeline].reverse();
  }
}
