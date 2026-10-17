import { html, type TemplateResult } from "lit";
import type { Character } from "../core/model/Character";
import { STAT_KEYS } from "../core/model/StatBlock";
import { ENERGY_MAX } from "../core/config";
import { WORLD } from "../content/world";
import { icon, STAT_ICONS } from "./icons";
import { STAT_LABELS } from "./stats";
import { formatUsd } from "./format";

/** Top card of the game screen: identity, money, vitals and life stats. */
export class HudView {
  constructor(
    private readonly character: Character,
    private readonly year: number,
    private readonly age: number,
    private readonly timeLeft: number,
    private readonly timeBudget: number,
    private readonly rateUsd: number,
    private readonly rateNote: string,
  ) {}

  render(): TemplateResult {
    const character = this.character;
    // Guards against a zero budget so the bars never divide by zero.
    const timePct = Math.max(
      0,
      Math.round((this.timeLeft / Math.max(1, this.timeBudget)) * 100),
    );
    const energyPct = Math.max(0, Math.round((character.energy / ENERGY_MAX) * 100));

    const stats = STAT_KEYS.map(
      (key) => html`
        <div class="stat">
          <span class="stat-label">${icon(STAT_ICONS[key], 13)}${STAT_LABELS[key]}</span>
          <span class="stat-bar"
            ><span class="stat-fill" style="width: ${character.stats.get(key)}%"></span
          ></span>
          <span class="stat-value">${character.stats.get(key)}</span>
        </div>
      `,
    );

    const btc = character.money.toFixed(8);
    // Dollars lead because eight decimal places of BTC read poorly at a glance.
    const fiat = formatUsd(character.money * this.rateUsd);
    const rate = formatUsd(this.rateUsd);

    return html`
      <header class="hud">
        <div class="hud-top">
          <span class="hud-title">life simulator <span class="hud-by">by onlygummy</span></span>
          <span class="chip">${icon("CalendarDays", 13)}ปี ${this.year}</span>
        </div>

        <div class="hud-line">
          <strong class="hud-name">${character.name}</strong>
          <span class="chip">${icon("Cake", 13)}อายุ ${this.age} ปี</span>
        </div>

        <div class="hud-money">
          ${icon("Coins", 16)}
          <strong>${fiat}</strong>
          <span class="muted">(${btc} ${WORLD.currency})</span>
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

        <div class="stats">${stats}</div>

        <div class="hud-rate muted">1 ${WORLD.currency} ≈ ${rate} · ${this.rateNote}</div>
      </header>
    `;
  }
}
