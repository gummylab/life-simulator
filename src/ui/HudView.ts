import type { Character } from "../core/model/Character";
import { STAT_KEYS, type StatKey } from "../core/model/StatBlock";
import { ENERGY_MAX } from "../core/config";
import { WORLD } from "../content/world";
import { escapeHtml, formatUsd } from "./format";

const STAT_LABELS: Record<StatKey, string> = {
  health: "สุขภาพ",
  happiness: "ความสุข",
  smarts: "ปัญญา",
  looks: "รูปลักษณ์",
};

/** Sticky top bar: identity, money in BTC and the four life stats. */
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

  render(): string {
    const stats = STAT_KEYS.map((key) => {
      const value = this.character.stats.get(key);
      return `
        <div class="stat">
          <span class="stat-label">${STAT_LABELS[key]}</span>
          <span class="stat-bar"><span class="stat-fill" style="width: ${value}%"></span></span>
          <span class="stat-value">${value}</span>
        </div>`;
    }).join("");

    const btc = this.character.money.toFixed(8);
    const fiat = formatUsd(this.character.money * this.rateUsd);
    const rate = formatUsd(this.rateUsd);

    return `
      <header class="hud">
        <div class="hud-title">life simulator by onlygummy</div>
        <div class="hud-line">
          <strong>${escapeHtml(this.character.name)}</strong>
          <span>อายุ ${this.age} ปี</span>
          <span>ปี ${this.year}</span>
        </div>
        <div class="hud-line hud-money">
          <span>เงิน ${btc} ${WORLD.currency} (≈ ${fiat})</span>
          <span class="muted">1 ${WORLD.currency} ≈ ${rate} · ${escapeHtml(this.rateNote)}</span>
        </div>
        <div class="hud-line hud-vitals">
          <span>เวลาว่าง ${this.timeLeft}/${this.timeBudget}</span>
          <span>พลังงาน ${this.character.energy}/${ENERGY_MAX}</span>
        </div>
        <div class="stats">${stats}</div>
      </header>`;
  }
}
