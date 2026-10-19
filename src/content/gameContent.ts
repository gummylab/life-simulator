import type { GameContent } from "../core/model/GameContent";
import { EVENTS } from "./events";
import { HOMES } from "./homes";
import { JOBS } from "./jobs";
import { WORLD } from "./world";

/**
 * The single world pack the UI injects into the core (ADR 0006, ADR 0010).
 *
 * Core systems receive this once at Game construction and never import
 * from src/content themselves, so tests can build a Game with fixture
 * content or with none at all.
 */
export const GAME_CONTENT: GameContent = {
  currency: WORLD.currency,
  schools: WORLD.schools,
  places: WORLD.places,
  workplaces: WORLD.workplaces,
  givenNames: WORLD.givenNames,
  familyNames: WORLD.familyNames,
  jobs: JOBS,
  homes: HOMES,
  events: EVENTS,
};
