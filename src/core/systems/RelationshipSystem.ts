import type { SeededRng } from "../rng/SeededRng";
import type { GameContent } from "../model/GameContent";
import type { GameState } from "../model/GameState";
import type { Gender } from "../model/Character";
import type { Person } from "../model/Person";

/**
 * Family ties: parents from birth, then dating, marriage, divorce and
 * children. Surname rules follow reality (ADR 0004): a child takes the
 * father's surname and a woman changes to her husband's on marriage.
 */
export class RelationshipSystem {
  /** Creates the two parents a character is born to. */
  birthFamily(state: GameState, content: GameContent, rng: SeededRng): void {
    const character = state.character;
    // The child carries the father's surname, so the father must share it.
    const father: Person = {
      id: `npc-male-${character.birthYear}-${rng.int(1000, 9999)}`,
      givenName: this.rollName(content, rng, "male"),
      familyName: character.familyName,
      gender: "male",
      birthYear: character.birthYear - rng.between(22, 40),
    };
    const mother = this.rollPerson(content, rng, "female", character.birthYear - rng.between(20, 38));
    character.family.parents.push(father, mother);
  }

  /** Finds a partner of the opposite sex; dating never fails in this build. */
  date(state: GameState, content: GameContent, rng: SeededRng): void {
    const character = state.character;
    const gender: Gender = character.gender === "female" ? "male" : "female";
    const partner = this.rollPerson(content, rng, gender, character.birthYear - rng.between(0, 5));
    character.family.partner = partner;
    state.record(`เริ่มออกเดทกับ${partner.givenName}`);
  }

  /** Marries the partner. A woman takes her husband's surname. */
  marry(state: GameState): void {
    const character = state.character;
    const partner = character.family.partner;
    if (partner === null) return;
    character.family.married = true;
    if (character.gender === "female") {
      character.familyName = partner.familyName;
    } else {
      partner.familyName = character.familyName;
    }
    state.record(`แต่งงานกับ${partner.givenName}`);
  }

  /** Divorces and removes the partner; children stay with the character. */
  divorce(state: GameState): void {
    const character = state.character;
    const partner = character.family.partner;
    if (partner === null) return;
    character.family.married = false;
    character.family.partner = null;
    state.record(`หย่ากับ${partner.givenName}`);
  }

  /** Has a child with the spouse; the child takes the father's surname. */
  haveChild(state: GameState, content: GameContent, rng: SeededRng): Person | null {
    const character = state.character;
    if (!character.family.married || character.family.partner === null) return null;
    const gender: Gender = rng.chance(0.5) ? "male" : "female";
    const fatherName = character.gender === "male" ? character.familyName : character.family.partner.familyName;
    const given = this.rollName(content, rng, gender);
    const child: Person = {
      id: `child-${character.family.children.length + 1}`,
      givenName: given,
      familyName: fatherName,
      gender,
      birthYear: state.year,
    };
    character.family.children.push(child);
    state.record(`ต้อนรับบุตรคนที่ ${character.family.children.length}: ${child.givenName} ${child.familyName}`);
    return child;
  }

  private rollName(content: GameContent, rng: SeededRng, gender: Gender): string {
    const pool = content.givenNames[gender];
    return pool.length > 0 ? (rng.pick(pool) ?? "") : "";
  }

  private rollPerson(content: GameContent, rng: SeededRng, gender: Gender, birthYear: number): Person {
    const familyPool = content.familyNames;
    return {
      id: `npc-${gender}-${birthYear}-${rng.int(1000, 9999)}`,
      givenName: this.rollName(content, rng, gender),
      familyName: familyPool.length > 0 ? (rng.pick(familyPool) ?? "") : "",
      gender,
      birthYear,
    };
  }
}
