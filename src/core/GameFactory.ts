import { Game } from "./Game";
import { Character } from "./model/Character";
import { GameState } from "./model/GameState";
import type { BirthSetup } from "./model/BirthSetup";
import type { GameContent } from "./model/GameContent";
import type { SuccessionPlan } from "./systems/SuccessionSystem";
import { SeededRng } from "./rng/SeededRng";
import { RelationshipSystem } from "./systems/RelationshipSystem";
import { timeBudgetForAge } from "./config";

/** Lifespan range rolled once at birth, in years. */
const LIFESPAN_MIN = 85;
const LIFESPAN_MAX = 110;

/** Keeps each generation's seed distinct yet reproducible from the save. */
function deriveSeed(previousSeed: number, generation: number): number {
  return (previousSeed * 31 + generation * 7919) % 2147483647;
}

/**
 * Builds a brand new life from what the player set up.
 *
 * Kept apart from the UI so a test can start a life from a plain object
 * without a browser, and so a future menu screen reuses the same path.
 * Content stays optional: without it the life has no parents or schools,
 * which is exactly the pre-Phase-2 behavior old tests rely on.
 */
export function createLife(setup: BirthSetup, seed: number, birthYear: number, content?: GameContent): Game {
  const rng = new SeededRng(seed);

  const character = new Character({
    givenName: setup.givenName,
    familyName: setup.familyName,
    gender: setup.gender,
    birthYear,
    maxLifespan: rng.between(LIFESPAN_MIN, LIFESPAN_MAX),
    money: 0,
  });

  const state = new GameState({
    year: birthYear,
    seed,
    rngState: seed,
    character,
    founderFamilyName: setup.familyName,
    timeLeft: timeBudgetForAge(0),
  });

  // The child is born into a family; roll the two parents from the world.
  if (content) {
    new RelationshipSystem().birthFamily(state, content, rng);
    state.rngState = rng.state;
  }

  return new Game(state, content);
}

/**
 * Starts the next life from a succession plan (Task 3.2): the heir is
 * reborn at the jump year carrying the cut-down fortune, and the dynasty
 * records (tree, chronicle, generation) move into the new state. The
 * founder family name stays untouched across the whole dynasty.
 */
export function continueLife(plan: SuccessionPlan, previous: GameState, content?: GameContent): Game {
  const seed = deriveSeed(previous.seed, plan.newGeneration);
  const rng = new SeededRng(seed);

  const character = new Character({
    id: plan.heir.id,
    givenName: plan.heir.givenName,
    familyName: plan.heir.familyName,
    gender: plan.heir.gender,
    birthYear: plan.rebirthYear,
    maxLifespan: rng.between(LIFESPAN_MIN, LIFESPAN_MAX),
    money: plan.legacyMoney,
  });

  const state = new GameState({
    year: plan.rebirthYear,
    seed,
    rngState: seed,
    character,
    founderFamilyName: previous.founderFamilyName,
    timeLeft: timeBudgetForAge(0),
    dynasty: {
      generation: plan.newGeneration,
      tree: plan.tree,
      chronicle: plan.chronicle,
    },
  });

  // The heir's parents are already filed in the dynasty tree, so no new
  // birth family is rolled here.
  return new Game(state, content);
}
