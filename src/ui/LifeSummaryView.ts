import { html, nothing, type TemplateResult } from "lit";
import type { GameState } from "../core/model/GameState";
import { STAT_KEYS } from "../core/model/StatBlock";
import { DEATH_CAUSE_LABELS } from "../content/deathCauses";
import { GAME_CONTENT } from "../content/gameContent";
import { WORLD } from "../content/world";
import { icon, STAT_ICONS } from "./icons";
import { STAT_LABELS } from "./stats";
import { formatUsd } from "./format";

/**
 * The end-of-life screen, doubling as the restart farewell:
 * - a dead character gets the full biography (birth, education, last
 *   career, inheritance, cause of death) with a copy button,
 * - a living one gets "so far" wording with a way back to the game.
 * The restart button wipes the save only on the second tap within
 * three seconds (confirmPending comes from App).
 */
export class LifeSummaryView {
  constructor(
    private readonly state: GameState,
    private readonly rateUsd: number,
    private readonly confirmPending = false,
    /**
     * What the dead character leaves behind: "heir" opens the succession,
     * "extinct" opens the dynasty's final stats. Null while still alive.
     */
    private readonly endState: "heir" | "extinct" | null = null,
  ) {}

  /** Biography as plain text, one fact per line, for the clipboard. */
  biographyText(): string {
    return this.facts().map((fact) => `- ${fact}`).join("\n");
  }

  /** Every fact shown on the card, in display order. Shared with the copy. */
  private facts(): string[] {
    const character = this.state.character;
    const alive = character.alive;
    const age = character.ageAt(this.state.year);
    const facts: string[] = [];

    facts.push(
      alive
        ? `เกิดปี ${character.birthYear} ปัจจุบันอายุ ${age} ปี ที่ปี ${this.state.year}`
        : `เกิดปี ${character.birthYear} ถึงแก่กรรมปี ${this.state.year} (อายุ ${age} ปี)`,
    );
    if (!alive) {
      facts.push(`สาเหตุการเสียชีวิต: ${DEATH_CAUSE_LABELS[character.deathCause ?? "oldAge"]}`);
    }

    const education = character.education;
    const school = education.universitySchool ?? education.secondarySchool ?? education.primarySchool;
    if (education.universitySchool !== null) {
      facts.push(`การศึกษา: จบมหาวิทยาลัย (${education.universitySchool})`);
    } else if (education.secondarySchool !== null) {
      facts.push(`การศึกษา: จบชั้นมัธยม (${education.secondarySchool})`);
    } else if (education.primarySchool !== null) {
      facts.push(`การศึกษา: จบชั้นประถม (${education.primarySchool})`);
    } else {
      facts.push("การศึกษา: ไม่ได้เรียน");
    }
    if (school && education.enrolledUniversity && education.universitySchool === null) {
      facts.push("วางแผนเรียนต่อมหาวิทยาลัย");
    }

    const job = character.job;
    const spec = GAME_CONTENT.jobs.find((candidate) => candidate.id === job.id);
    if (spec) {
      facts.push(`อาชีพสุดท้าย: ${spec.label} (ระดับ ${job.level} อายุงาน ${job.years} ปี)`);
    } else {
      facts.push("อาชีพสุดท้าย: ไม่ได้ทำงาน");
    }

    const btc = character.money.toFixed(8);
    const fiat = formatUsd(character.money * this.rateUsd);
    facts.push(
      alive
        ? `เงินที่ถืออยู่ตอนนี้: ${fiat} (${btc} ${WORLD.currency})`
        : `มรดกที่ทิ้งไว้: ${fiat} (${btc} ${WORLD.currency})`,
    );
    return facts;
  }

  render(): TemplateResult {
    const character = this.state.character;
    const alive = character.alive;
    const stats = STAT_KEYS.map(
      (key) => html`
        <li class="final-stat">
          ${icon(STAT_ICONS[key], 14)}<span>${STAT_LABELS[key]}</span
          ><span class="stat-value">${character.stats.get(key)}</span>
        </li>
      `,
    );

    return html`
      <section class="panel summary">
        <h2>
          ${icon(alive ? "Hourglass" : "Skull", 18)}${alive
            ? `สรุปชีวิตของ ${character.name}`
            : `ชีวประวัติของ ${character.name}`}
        </h2>
        <ul>
          ${this.facts().map((fact) => html`<li>${fact}</li>`)}
        </ul>
        <ul class="final-stats">${stats}</ul>
        <div class="summary-actions">
          ${this.endState === "heir"
            ? html`<button type="button" class="advance" data-do="open-succession">
                ${icon("Baby", 18)}<span>สืบตระกูล</span>
              </button>`
            : nothing}
          ${this.endState === "extinct"
            ? html`<button type="button" class="advance" data-do="open-gameover">
                ${icon("Skull", 18)}<span>ดูสถิติตระกูล</span>
              </button>`
            : nothing}
          <button
            type="button"
            class="advance ${this.confirmPending ? "confirm" : ""}"
            data-do="restart"
          >
            ${icon("RefreshCw", 18)}
            <span>${this.confirmPending ? "แตะอีกครั้งเพื่อยืนยัน" : "เริ่มตระกูลใหม่"}</span>
          </button>
          ${alive
            ? html`<button type="button" class="ghost" data-do="back">
                ${icon("ChevronLeft", 16)}กลับไปเล่นต่อ
              </button>`
            : html`<button type="button" class="ghost" data-do="copy-bio">
                ${icon("Copy", 16)}คัดลอกชีวประวัติ
              </button>`}
        </div>
      </section>
    `;
  }
}
