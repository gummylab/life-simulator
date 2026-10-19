import { html, nothing, type TemplateResult } from "lit";
import type { GameState } from "../core/model/GameState";
import { STAT_KEYS } from "../core/model/StatBlock";
import { DEATH_CAUSE_LABELS } from "../content/deathCauses";
import { GAME_CONTENT } from "../content/gameContent";
import { WORLD } from "../content/world";
import { icon, STAT_ICONS } from "./icons";
import { STAT_LABELS, statTone } from "./stats";
import { formatBtc, formatUsd } from "./money";
import { timelineList } from "./TimelineView";

/**
 * The end-of-life screen, doubling as the restart farewell (ADR 0014):
 * - a dead character gets the full biography (birth, education, last
 *   career, inheritance, cause of death), the life log folded underneath,
 *   and a copy button,
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
    /** Whether the life log under the facts is expanded. */
    private readonly showFullLog = false,
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
    if (education.universitySchool !== null) {
      facts.push(`การศึกษา: จบมหาวิทยาลัย (${education.universitySchool})`);
    } else if (education.secondarySchool !== null) {
      facts.push(`การศึกษา: จบชั้นมัธยม (${education.secondarySchool})`);
    } else if (education.primarySchool !== null) {
      facts.push(`การศึกษา: จบชั้นประถม (${education.primarySchool})`);
    } else {
      facts.push("การศึกษา: ไม่ได้เรียน");
    }
    if (education.enrolledUniversity && education.universitySchool === null) {
      facts.push("วางแผนเรียนต่อมหาวิทยาลัย");
    }

    const job = character.job;
    const spec = GAME_CONTENT.jobs.find((candidate) => candidate.id === job.id);
    if (spec) {
      facts.push(`อาชีพสุดท้าย: ${spec.label} (ระดับ ${job.level} อายุงาน ${job.years} ปี)`);
    } else {
      facts.push("อาชีพสุดท้าย: ไม่ได้ทำงาน");
    }

    const family = character.family;
    facts.push(
      family.children.length > 0
        ? `บุตร: ${family.children.map((child) => child.givenName).join(", ")}`
        : "บุตร: ไม่มี",
    );

    const btc = formatBtc(character.money, 8);
    const fiat = formatUsd(character.money * this.rateUsd);
    facts.push(
      alive
        ? `เงินที่ถืออยู่ตอนนี้: ${fiat} (${btc} ${WORLD.currency})`
        : `มรดกที่ทิ้งไว้: ${fiat} (${btc} ${WORLD.currency})`,
    );

    const home = GAME_CONTENT.homes.find((candidate) => candidate.id === character.home);
    facts.push(`ที่อยู่สุดท้าย: ${home?.label ?? "อยู่กับครอบครัว"}`);
    return facts;
  }

  render(): TemplateResult {
    const character = this.state.character;
    const alive = character.alive;
    const age = character.ageAt(this.state.year);

    return html`
      <section class="panel summary">
        <h2>
          ${icon(alive ? "Hourglass" : "Skull", 18)}${alive
            ? `สรุปชีวิตของ ${character.name}`
            : `ชีวประวัติของ ${character.name}`}
        </h2>

        <p class="hero-years">
          ${character.birthYear} – ${alive ? "ปัจจุบัน" : this.state.year}
          <span class="muted">· อายุ ${age} ปี</span>
        </p>

        <ul class="fact-list">
          ${this.facts().map((fact) => html`<li>${fact}</li>`)}
        </ul>

        <div class="stats">
          ${STAT_KEYS.map((key) => {
            const value = character.stats.get(key);
            return html`
              <div class="stat" data-stat=${key}>
                <span class="stat-label">${icon(STAT_ICONS[key], 13)}${STAT_LABELS[key]}</span>
                <span class="stat-bar"
                  ><span
                    class="stat-fill ${statTone(value)}"
                    style="width: ${value}%"
                  ></span
                ></span>
                <span class="stat-value">${value}</span>
              </div>
            `;
          })}
        </div>

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

        ${this.logSection()}
      </section>
    `;
  }

  /**
   * The life log folded under the facts. A biography that is five bullets
   * long undersells a whole life, but the full log is long, so it waits
   * behind one tap instead of pushing the buttons off screen.
   */
  private logSection(): TemplateResult {
    const history = this.state.history;
    if (history.length === 0) {
      return html``;
    }
    return html`
      <h3 class="group-title">${icon("ScrollText", 15)}<span>บันทึกชีวิตตลอดทั้งชีวิต</span></h3>
      ${this.showFullLog
        ? timelineList(history)
        : html`<p class="muted summary-note">
            ทั้งหมด ${history.length} บรรทัด เปิดดูได้เมื่อพร้อม
          </p>`}
      <button type="button" class="ghost" data-do="toggle-summary-log">
        ${this.showFullLog ? "ซ่อนบันทึกชีวิต" : `ดูบันทึกชีวิต (${history.length})`}
      </button>
    `;
  }
}
