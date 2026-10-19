import { html, type TemplateResult } from "lit";
import type { GameState } from "../core/model/GameState";
import type { Person } from "../core/model/Person";
import { icon } from "./icons";

/**
 * The family screen: who the character is related to right now.
 *
 * It reads parents, partner and children straight from the character and
 * shows each one with age, so a player who just had a child can see the
 * name. The rules live in the core; this view only reads them.
 */
export class FamilyView {
  constructor(private readonly state: GameState) {}

  render(): TemplateResult {
    return html`${this.familyPanel()} ${this.dynastyPanel()}`;
  }

  /** Parents, the partner and the children, each with age or death note. */
  private familyPanel(): TemplateResult {
    const character = this.state.character;
    const family = character.family;
    const father = family.parents.find((person) => person.gender === "male");
    const mother = family.parents.find((person) => person.gender === "female");

    return html`
      <section class="panel">
        <h2>${icon("Users", 18)}คนในครอบครัว</h2>
        <div class="rows">
          ${father
            ? this.personRow("พ่อ", father)
            : html`<p class="muted">ไม่มีข้อมูลพ่อในบันทึก</p>`}
          ${mother
            ? this.personRow("แม่", mother)
            : html`<p class="muted">ไม่มีข้อมูลแม่ในบันทึก</p>`}
          ${family.partner
            ? this.personRow(family.married ? "คู่สมรส" : "คนรัก", family.partner)
            : html`<p class="muted">
                ยังไม่มีคู่รัก — ไปเดทได้ตั้งแต่อายุ 16 ปี
              </p>`}
        </div>
        <h3 class="group-title">${icon("Baby", 15)}<span>บุตร</span></h3>
        ${family.children.length > 0
          ? html`<div class="rows">
              ${family.children.map((child, index) => this.personRow(`บุตรคนที่ ${index + 1}`, child))}
            </div>`
          : html`<p class="muted">ยังไม่มีบุตร — ต้องแต่งงานก่อนจึงจะมีลูกได้</p>`}
      </section>
    `;
  }

  /** How the line is doing: generation, size, and the way to the record. */
  private dynastyPanel(): TemplateResult {
    const dynasty = this.state.dynasty;
    const records = dynasty.chronicle.length;
    return html`
      <section class="panel">
        <h2>${icon("TreePine", 18)}ตระกูล</h2>
        <ul class="final-stats">
          <li class="final-stat">
            ${icon("Users", 14)}<span>รุ่นที่</span>
            <span class="stat-value">${dynasty.generation}</span>
          </li>
          <li class="final-stat">
            ${icon("UserRound", 14)}<span>สมาชิกที่บันทึกไว้</span>
            <span class="stat-value">${dynasty.tree.length}</span>
          </li>
        </ul>
        <p class="muted summary-note">
          ชื่อตระกูลตั้งต้น: ${this.state.founderFamilyName}
        </p>
        ${records > 0
          ? html`<button type="button" class="ghost" data-do="open-chronicle">
              ${icon("ScrollText", 16)}ดูบันทึกตระกูล (${records})
            </button>`
          : html`<p class="muted summary-note">
              ยังไม่มีเรื่องราวข้ามรุ่น บันทึกตระกูลจะเริ่มเมื่อรุ่นแรกจากไป
            </p>`}
      </section>
    `;
  }

  /** One relative: role, name, and either their age or how they died. */
  private personRow(role: string, person: Person): TemplateResult {
    const age = Math.max(0, this.state.year - person.birthYear);
    const dead = person.deathYear !== undefined;
    return html`
      <div class="person" data-gender=${person.gender}>
        <span class="person-icon">${icon("UserRound", 16)}</span>
        <span class="person-body">
          <span class="person-name">${person.givenName} ${person.familyName}</span>
          <span class="person-meta">
            ${role} · ${dead ? `เสียชีวิตเมื่ออายุ ${age} ปี` : `อายุ ${age} ปี`}
          </span>
        </span>
      </div>
    `;
  }
}
