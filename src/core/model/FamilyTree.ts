import type { Person } from "../model/Person";
import type { Character } from "../model/Character";
import type { SeededRng } from "../rng/SeededRng";

/**
 * Every person of the dynasty across generations, linked by parent ids.
 *
 * Names never carry lineage: a woman changes her surname on marriage
 * (ADR 0004), so the tree walks `parentId` links only. Dead members stay
 * in the list with a `deathYear` so the chronicle can tell their story.
 */
export class FamilyTree {
  private readonly members: Person[];

  constructor(members: readonly Person[] = []) {
    this.members = [...members];
  }

  /** Plain snapshot for saving; editing the copy never touches the tree. */
  snapshot(): Person[] {
    return this.members.map((person) => ({ ...person }));
  }

  get size(): number {
    return this.members.length;
  }

  add(person: Person): void {
    this.members.push(person);
  }

  /** Files the finished player character into the tree on death. */
  registerCharacter(character: Character, deathYear: number): void {
    this.members.push({
      id: character.id,
      givenName: character.givenName,
      familyName: character.familyName,
      gender: character.gender,
      birthYear: character.birthYear,
      deathYear,
    });
    for (const child of character.family.children) {
      this.members.push({ ...child });
    }
  }

  /** Whether a person is still alive in the given year. */
  private aliveAt(person: Person, year: number): boolean {
    return person.birthYear <= year && (person.deathYear === undefined || person.deathYear > year);
  }

  /**
   * Blood descendants of a root person who are alive in `year`,
   * at any depth. Walks parent links, never names.
   */
  descendantsOf(rootId: string, year: number): Person[] {
    const byParent = new Map<string, Person[]>();
    for (const person of this.members) {
      if (person.parentId === undefined) {
        continue;
      }
      const siblings = byParent.get(person.parentId);
      if (siblings) {
        siblings.push(person);
      } else {
        byParent.set(person.parentId, [person]);
      }
    }

    const found: Person[] = [];
    const queue = [rootId];
    const seen = new Set<string>([rootId]);
    while (queue.length > 0) {
      const currentId = queue.shift() ?? "";
      for (const child of byParent.get(currentId) ?? []) {
        if (seen.has(child.id)) {
          continue;
        }
        seen.add(child.id);
        if (this.aliveAt(child, year)) {
          found.push(child);
        }
        // Dead descendants still lead to living great-grandchildren.
        queue.push(child.id);
      }
    }
    return found;
  }

  /** One living descendant at random, or null when the line has died out. */
  pickHeir(rootId: string, year: number, rng: SeededRng): Person | null {
    const heirs = this.descendantsOf(rootId, year);
    if (heirs.length === 0) {
      return null;
    }
    return rng.pick(heirs) ?? null;
  }
}
