import type { SeededRng } from "../rng/SeededRng";
import type { GameContent } from "../model/GameContent";
import type { GameState } from "../model/GameState";
import type { Gender } from "../model/Character";
import { changeBond, isAlive, type Person } from "../model/Person";
import { BOND_DECAY, BOND_DEFAULT, BOND_GAIN } from "../config";
import { yearlyDeathChance } from "./DeathSystem";

/** Why a family action cannot run right now. */
export type FamilyBlockReason = "partner" | "alone" | "orphan";

/**
 * Family ties: parents from birth, then dating, marriage, divorce and
 * children. Surname rules follow reality (ADR 0004): a child takes the
 * father's surname and a woman changes to her husband's on marriage.
 *
 * Phase 9 adds the part that keeps a family alive after the wedding: every
 * relative carries a bond that family actions raise and time wears down,
 * and relatives grow old and pass away like the player does (ADR 0019).
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
      bond: BOND_DEFAULT,
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
      // Ids stay unique per family line so the tree can link by id.
      id: `child-${character.id}-${character.family.children.length + 1}`,
      givenName: given,
      familyName: fatherName,
      gender,
      birthYear: state.year,
      // Blood links run through the player, never through a surname.
      parentId: character.id,
      bond: BOND_DEFAULT,
    };
    character.family.children.push(child);
    state.record(`ต้อนรับบุตรคนที่ ${character.family.children.length}: ${child.givenName} ${child.familyName}`);
    return child;
  }

  /* --------------------------------------------------- Phase 9: bond */

  /** Every relative the player can still spend time with. */
  livingRelatives(state: GameState): Person[] {
    const family = state.character.family;
    return [
      ...family.parents,
      ...(family.partner === null ? [] : [family.partner]),
      ...family.children,
    ].filter(isAlive);
  }

  /** Why a family action is blocked, or null when it can run. */
  blockReason(special: "family-time" | "gift-partner" | "help-parents", state: GameState): FamilyBlockReason | null {
    const family = state.character.family;
    if (special === "gift-partner") {
      return family.partner !== null && isAlive(family.partner) ? null : "partner";
    }
    if (special === "help-parents") {
      return family.parents.some(isAlive) ? null : "orphan";
    }
    return this.livingRelatives(state).length > 0 ? null : "alone";
  }

  /**
   * Runs one family action: everyone it applies to gains the bond it is
   * worth, and the strongest gain names the line so the log reads like a
   * story instead of a status update.
   */
  runFamilyAction(
    special: "family-time" | "gift-partner" | "help-parents",
    state: GameState,
  ): void {
    const family = state.character.family;
    const gain = BOND_GAIN[special];
    if (special === "gift-partner") {
      const partner = family.partner;
      if (partner === null || !isAlive(partner)) return;
      changeBond(partner, gain);
      state.record(`ซื้อของขวัญให้${partner.givenName} รู้สึกดีต่อกันมากขึ้น`);
      return;
    }
    if (special === "help-parents") {
      const parents = family.parents.filter(isAlive);
      for (const parent of parents) {
        changeBond(parent, gain);
      }
      state.record(
        parents.length === 1
          ? `แวะไปดูแล${parents[0]?.givenName ?? "พ่อแม่"}ที่บ้าน`
          : "แวะไปดูแลพ่อและแม่ที่บ้าน",
      );
      return;
    }

    const together = this.livingRelatives(state);
    for (const person of together) {
      changeBond(person, gain);
    }
    const partner = family.partner;
    const youngest = family.children.filter(isAlive).at(-1);
    if (youngest !== undefined) {
      state.record(`ใช้เวลาทั้งวันกับ${youngest.givenName}และคนในบ้าน`);
    } else if (partner !== null && isAlive(partner)) {
      state.record(`ใช้เวลาทั้งวันกับ${partner.givenName}`);
    } else if (together.length > 0) {
      state.record("ใช้เวลาทั้งวันกับคนในบ้าน");
    }
  }

  /**
   * Closeness wears down every year nobody spends time together. Applies to
   * the living only, so the record of a relative who passed away stays as
   * it was when they were last around.
   */
  applyBondDecay(state: GameState): void {
    for (const person of this.livingRelatives(state)) {
      changeBond(person, -BOND_DECAY);
    }
  }

  /**
   * Rolls a year of ageing for the relatives: anyone past the risk curve
   * can pass away, which sets their death year and logs one line. A partner
   * who dies leaves the character unmarried but keeps their record, so the
   * family screen and the marriage gates stay truthful.
   */
  rollFamilyDeaths(state: GameState, rng: SeededRng): void {
    const character = state.character;
    const family = character.family;
    const candidates: Person[] = [
      ...family.parents,
      ...(family.partner === null ? [] : [family.partner]),
    ].filter(isAlive);

    for (const person of candidates) {
      const age = Math.max(0, state.year - person.birthYear);
      if (!rng.chance(yearlyDeathChance(age))) {
        continue;
      }
      person.deathYear = state.year;
      state.record(`${this.relationLabel(person, state)}เสียชีวิตเมื่ออายุ ${age} ปี`);
      if (person === family.partner) {
        family.married = false;
      }
    }
  }

  /** How the log refers to a relative, e.g. "พ่อของ" or "คู่ครอง". */
  private relationLabel(person: Person, state: GameState): string {
    const family = state.character.family;
    if (person === family.partner) return "คู่ครอง";
    if (person.gender === "male") return "พ่อ";
    return "แม่";
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
      bond: BOND_DEFAULT,
    };
  }
}
