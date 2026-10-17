import { html, type TemplateResult } from "lit";
import type { Character } from "../core/model/Character";
import { STAT_KEYS } from "../core/model/StatBlock";
import { DEATH_CAUSE_LABELS } from "../content/deathCauses";
import { WORLD } from "../content/world";
import { icon, STAT_ICONS } from "./icons";
import { STAT_LABELS } from "./stats";
import { formatUsd } from "./format";

/**
 * End of a single life: the biography shown once the character dies.
 * Task 3.2 will add the family chronicle and rebirth screen next to it.
 */
export class LifeSummaryView {
  constructor(
    private readonly character: Character,
    private readonly deathYear: number,
    private readonly rateUsd: number,
  ) {}

  render(): TemplateResult {
    const character = this.character;
    const age = character.ageAt(this.deathYear);
    const stats = STAT_KEYS.map(
      (key) => html`
        <li class="final-stat">
          ${icon(STAT_ICONS[key], 14)}<span>${STAT_LABELS[key]}</span
          ><span class="stat-value">${character.stats.get(key)}</span>
        </li>
      `,
    );
    const btc = character.money.toFixed(8);
    const fiat = formatUsd(character.money * this.rateUsd);

    return html`
      <section class="panel summary">
        <h2>${icon("Skull", 18)}ชีวประวัติของ ${character.name}</h2>
        <ul>
          <li>เกิดปี ${character.birthYear} ถึงแก่กรรมปี ${this.deathYear} (อายุ ${age} ปี)</li>
          <li>สาเหตุการเสียชีวิต: ${DEATH_CAUSE_LABELS[character.deathCause ?? "oldAge"]}</li>
          <li>มรดกที่ทิ้งไว้: ${fiat} (${btc} ${WORLD.currency})</li>
        </ul>
        <ul class="final-stats">${stats}</ul>
        <button type="button" class="advance" data-do="restart">
          ${icon("RefreshCw", 18)}เริ่มตระกูลใหม่
        </button>
      </section>
    `;
  }
}
