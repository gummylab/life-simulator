import type { GameContent } from "../model/GameContent";
import type { GameState } from "../model/GameState";
import type { Person } from "../model/Person";
import { FamilyTree } from "../model/FamilyTree";
import type { SeededRng } from "../rng/SeededRng";

/** Time skip range between one life's death and the heir's birth (ADR 0002). */
const JUMP_MIN = 60;
const JUMP_MAX = 100;
/** Share of the remaining fortune that survives the jump, per roll. */
const HAIRCUT_MIN = 0.3;
const HAIRCUT_MAX = 0.6;
/** Small compounding bonus: each generation of history adds 5 percent. */
const LEGACY_BONUS_PER_GENERATION = 0.05;

/**
 * Everything a succession needs to start the next life.
 * Produced as plain data so the UI can show the chronicle first and let
 * the player decide when to be reborn (even after a refresh, as long as
 * the same rng seed is used).
 */
export interface SuccessionPlan {
  readonly heir: Person;
  readonly rebirthYear: number;
  /** BTC carried over after the haircut and the ancestor bonus. */
  readonly legacyMoney: number;
  /** Full family tree to hand to the next life's state. */
  readonly tree: Person[];
  /** Chronicle lines of every generation crossed, oldest first. */
  readonly chronicle: string[];
  readonly newGeneration: number;
}

/**
 * Runs the dynasty forward after the player dies: simulates the
 * intermediate generations coarsely, picks a living descendant as the
 * heir, and cuts the fortune down to a fraction (Task 3.2).
 *
 * Simulation is rule-based, never a year-by-year replay: the succession
 * screen waits for the player, so it must finish instantly. The rng is
 * passed in and only used through it, so a reloaded save replays the
 * exact same plan.
 */
export function planSuccession(
  state: GameState,
  content: GameContent,
  rng: SeededRng,
): SuccessionPlan | null {
  const character = state.character;
  const deathYear = state.year;
  const tree = new FamilyTree(state.dynasty.tree);
  tree.registerCharacter(character, deathYear);

  const rebirthYear = deathYear + rng.between(JUMP_MIN, JUMP_MAX);
  const lines = simulateGenerations(tree, character.family.children, content, rng, rebirthYear);

  const heir = tree.pickHeir(character.id, rebirthYear, rng);
  if (heir === null) {
    return null;
  }

  // between() is integer-only, so the fractional haircut rolls on next().
  const haircut = HAIRCUT_MIN + rng.next() * (HAIRCUT_MAX - HAIRCUT_MIN);
  const newGeneration = state.dynasty.generation + 1;
  const bonus = 1 + LEGACY_BONUS_PER_GENERATION * newGeneration;

  return {
    heir,
    rebirthYear,
    legacyMoney: character.money * haircut * bonus,
    tree: tree.snapshot(),
    chronicle: [...state.dynasty.chronicle, ...lines],
    newGeneration,
  };
}

/**
 * Coarsely grows each starting child into their own family until the
 * rebirth year, appending one chronicle line per person and returning
 * the new tree members as Person records.
 */
function simulateGenerations(
  tree: FamilyTree,
  starters: readonly Person[],
  content: GameContent,
  rng: SeededRng,
  rebirthYear: number,
): string[] {
  const lines: string[] = [];
  let current = [...starters];
  // Each pass is one generation; the window (~80 years) allows ~3 passes.
  while (current.length > 0) {
    const next: Person[] = [];
    for (const person of current) {
      const { line, children } = simulateOneLife(tree, person, content, rng, rebirthYear);
      if (line !== null) {
        lines.push(line);
      }
      next.push(...children);
    }
    current = next;
  }
  return lines;
}

/**
 * Rolls one intermediate life: marriage, children, work, death.
 * Returns the chronicle line (null when nothing notable happened in the
 * window) and the children born before the rebirth year.
 */
function simulateOneLife(
  tree: FamilyTree,
  person: Person,
  content: GameContent,
  rng: SeededRng,
  rebirthYear: number,
): { line: string | null; children: Person[] } {
  const marriageAge = rng.between(22, 35);
  const marriageYear = person.birthYear + marriageAge;
  // Marries after the window: their story never reaches the heir.
  if (marriageYear > rebirthYear) {
    if (person.birthYear < rebirthYear) {
      return {
        line: `${person.givenName} ${person.familyName} ใช้ชีวิตโสด`,
        children: [],
      };
    }
    return { line: null, children: [] };
  }

  const partner = rollName(content, rng, person.gender === "male" ? "female" : "male");
  const childCount = rng.between(0, 3);
  const job = rng.pick(content.jobs)?.label ?? null;
  const deathAge = rng.between(55, 100);
  const deathYear = person.birthYear + deathAge;

  const children: Person[] = [];
  for (let i = 0; i < childCount; i += 1) {
    const birthYear = marriageYear + i * rng.between(2, 4);
    if (birthYear > rebirthYear) {
      break;
    }
    const child: Person = {
      id: `${person.id}.${i + 1}`,
      givenName: rollName(content, rng, rng.chance(0.5) ? "male" : "female"),
      familyName: person.familyName,
      gender: rng.chance(0.5) ? "male" : "female",
      birthYear,
      parentId: person.id,
    };
    children.push(child);
    tree.add(child);
  }

  const jobPart = job === null ? "" : ` เป็น${job}`;
  const deathPart = deathYear <= rebirthYear ? ` เสียชีวิตอายุ ${deathAge} ปี` : "";
  return {
    line:
      `${person.givenName} ${person.familyName} แต่งงานกับ ${partner}${jobPart} ` +
      `มีลูก ${children.length} คน${deathPart}`,
    children,
  };
}

function rollName(content: GameContent, rng: SeededRng, gender: "male" | "female"): string {
  const pool = content.givenNames[gender];
  return pool.length > 0 ? (rng.pick(pool) ?? "") : "";
}
