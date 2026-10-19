import { html, nothing, type TemplateResult } from "lit";
import type { Character } from "../core/model/Character";
import { STAT_KEYS } from "../core/model/StatBlock";
import { ENERGY_MAX } from "../core/config";
import { WORLD } from "../content/world";
import { icon, STAT_ICONS } from "./icons";
import { STAT_LABELS } from "./stats";
import { formatUsd } from "./format";

/** Bar color by value: red below 30, amber below 60, calm green above. */
function statTone(value: number): string {
  if (value < 30) return "low";
  if (value < 60) return "mid";
  return "";
}

/**
 * Status navbar (Phase 6): one slim row with the four numbers that gate
 * every decision (age, money, time, energy). One tap on the row expands
 * the full detail: identity, stage, meters and stat bars. Collapsed is
 * the default so the first action card stays above the fold on a
 * 375x667 screen. The BTC rate note lives on the more tab: it never
 * changes a decision, so it never spends navbar space.
 */
export class HudView {
  constructor(
    private readonly character: Character,
    private readonly year: number,
    private readonly age: number,
    private readonly timeLeft: number,
    private readonly timeBudget: number,
    private readonly rateUsd: number,
    /** Thai school-stage line, e.g. "ชั้นมัธยมปีที่ 3"; empty when not studying. */
    private readonly stageLabel = "",
    /** Whether the navbar is expanded into the full detail block. */
    private readonly expanded = false,
  ) {}

  render(): TemplateResult {
    const character = this.character;
    const btc = character.money.toFixed(4);
    // Dollars lead because even four decimals of BTC read poorly at a
    // glance; the full eight decimals live in the life summary.
    const fiat = formatUsd(character.money * this.rateUsd);

    return html`
      <header class="hud">
        ${this.bar(fiat, btc)}
        ${this.expanded ? this.detail() : nothing}
      </header>
    `;
  }

  /**
   * The always-visible row. It is one button, so a single tap anywhere
   * toggles the whole navbar.
   */
  private bar(fiat: string, btc: string): TemplateResult {
    return html`
      <button
        type="button"
        class="hud-bar"
        data-do="toggle-hud"
        aria-expanded=${String(this.expanded)}
      >
        <span class="chip">${icon("Cake", 13)}${this.age} ปี</span>
        <span class="chip"
          >${icon("Coins", 13)}${fiat} <span class="muted">(${btc} ${WORLD.currency})</span></span
        >
        <span class="chip">${icon("Clock", 13)}${this.timeLeft}/${this.timeBudget}</span>
        <span class="chip">${icon("Zap", 13)}${this.character.energy}/${ENERGY_MAX}</span>
        ${icon(this.expanded ? "ChevronUp" : "ChevronDown", 14)}
      </button>
    `;
  }

  /** Full detail, only while expanded: identity, vitals and stat bars. */
  private detail(): TemplateResult {
    const character = this.character;
    // Guards against a zero budget so the bars never divide by zero.
    const timePct = Math.max(
      0,
      Math.round((this.timeLeft / Math.max(1, this.timeBudget)) * 100),
    );
    const energyPct = Math.max(0, Math.round((character.energy / ENERGY_MAX) * 100));

    const bars = STAT_KEYS.map((key) => {
      const value = character.stats.get(key);
      return html`
        <div class="stat">
          <span class="stat-label">${icon(STAT_ICONS[key], 13)}${STAT_LABELS[key]}</span>
          <span class="stat-bar"
            ><span class="stat-fill ${statTone(value)}" style="width: ${value}%"></span
          ></span>
          <span class="stat-value">${value}</span>
        </div>
      `;
    });

    return html`
      <div class="hud-detail">
        <div class="hud-line">
          <strong class="hud-name">${character.name}</strong>
          <span class="chip">${icon("CalendarDays", 13)}ปี ${this.year}</span>
          ${this.stageLabel
            ? html`<span class="chip">${icon("GraduationCap", 13)}${this.stageLabel}</span>`
            : nothing}
        </div>

        <div class="hud-vitals">
          <div class="meter">
            ${icon("Clock", 14)}
            <span class="meter-label">เวลา</span>
            <span class="meter-bar"
              ><span class="meter-fill meter-time" style="width: ${timePct}%"></span
            ></span>
            <span class="meter-value">${this.timeLeft}/${this.timeBudget}</span>
          </div>
          <div class="meter">
            ${icon("Zap", 14)}
            <span class="meter-label">พลัง</span>
            <span class="meter-bar"
              ><span class="meter-fill meter-energy" style="width: ${energyPct}%"></span
            ></span>
            <span class="meter-value">${character.energy}/${ENERGY_MAX}</span>
          </div>
        </div>

        <div class="stats">${bars}</div>
      </div>
    `;
  }
}
