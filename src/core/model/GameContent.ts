import type { JobSpec } from "./JobSpec";
import type { LifeEvent } from "./LifeEvent";

/**
 * Everything the core needs from the content layer, injected once.
 *
 * The core never imports from src/content directly (ADR 0001 layering),
 * so a Game without content behaves exactly like the pre-Phase-2 engine
 * and existing tests stay valid. The UI passes GAME_CONTENT in.
 */
export interface GameContent {
  readonly currency: string;
  readonly schools: {
    readonly primary: readonly string[];
    readonly secondary: readonly string[];
    readonly university: readonly string[];
  };
  readonly places: readonly string[];
  readonly workplaces: readonly string[];
  readonly givenNames: {
    readonly female: readonly string[];
    readonly male: readonly string[];
  };
  readonly familyNames: readonly string[];
  readonly jobs: readonly JobSpec[];
  readonly events: readonly LifeEvent[];
}
