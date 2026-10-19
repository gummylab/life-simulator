import { html, nothing, type TemplateResult } from "lit";
import type { Character } from "../core/model/Character";
import { STAT_KEYS } from "../core/model/StatBlock";
import { ENERGY_MAX } from "../core/config";
import { WORLD } from "../content/world";
import { icon, STAT_ICONS } from "./icons";
import { STAT_LABELS, statTone } from "./stats";
import { formatBtc, formatUsd } from "./money";

/**
 * The status bar above the action menu (ADR 0013, ADR 0014).
 *
 * Collapsed it is one button with the four numbers that gate every
 * decision: age, money, time and energy. Tapping it opens the full detail
 * block with identity, stage, meters and the four stat bars, so the first
 * action card still fits above the fold on a 375x667 screen.
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
    /** Whether the bar is expanded into the full detail block. */
    private readonly expanded = false,
    /** Where the character lives, e.g. "บ้านเช่า"; empty before they move out. */
    private readonly homeLabel = "",
  ) {}

  render(): TemplateResult {
    return html`
      <header class="hud">
        ${this.bar()}
        ${this.expanded ? this.detail() : nothing}
      </header>
    `;
  }

  /** The always-visible row: one button, one tap toggles the whole bar. */
  private bar(): TemplateResult {
    // Dollars lead because four decimals of BTC read poorly at a glance;
    // the full eight decimals live in the life summary.
    const usd = formatUsd(this.character.money * this.rateUsd);
    const btc = formatBtc(this.character.money);
    return html`
      <button
        type="button"
        class="hud-bar"
        data-do="toggle-hud"
        aria-expanded=${String(this.expanded)}
        aria-label="รายละเอียดตัวละคร"
      >
        <span class="chip">${icon("Cake", 12)}${this.age} ปี</span>
        <span class="chip"
          >${icon("Wallet", 12)}${usd}
          <span class="muted">${btc} ${WORLD.currency}</span></span
        >
        <span class="chip">${icon("Clock", 12)}${this.timeLeft}/${this.timeBudget}</span>
        <span class="chip">${icon("Zap", 12)}${this.character.energy}/${ENERGY_MAX}</span>
        ${icon(this.expanded ? "ChevronUp" : "ChevronDown", 14)}
      </button>
    `;
  }

  /** Full detail: identity, the two meters and the four stat bars. */
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
        <div class="stat" data-stat=${key}>
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
          <span class="chip">${icon("CalendarDays", 12)}ปี ${this.year}</span>
          ${this.stageLabel
            ? html`<span class="chip"
                >${icon("GraduationCap", 12)}${this.stageLabel}</span
              >`
            : nothing}
          ${this.homeLabel
            ? html`<span class="chip">${icon("House", 12)}${this.homeLabel}</span>`
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
