import type { Character } from "../core/model/Character";
import { STAT_KEYS, type StatKey } from "../core/model/StatBlock";
import { DEATH_CAUSE_LABELS } from "../content/deathCauses";
import { WORLD } from "../content/world";
import { escapeHtml, formatUsd } from "./format";

const STAT_LABELS: Record<StatKey, string> = {
  health: "สุขภาพ",
  happiness: "ความสุข",
  smarts: "ปัญญา",
  looks: "รูปลักษณ์",
};

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

  render(): string {
    const character = this.character;
    const age = character.ageAt(this.deathYear);
    const stats = STAT_KEYS.map(
      (key) => `<li>${STAT_LABELS[key]} ${character.stats.get(key)}</li>`,
    ).join("");
    const btc = character.money.toFixed(8);
    const fiat = formatUsd(character.money * this.rateUsd);

    return `
      <section class="panel summary">
        <h2>ชีวประวัติของ ${escapeHtml(character.name)}</h2>
        <ul>
          <li>เกิดปี ${character.birthYear} ถึงแก่กรรมปี ${this.deathYear} (อายุ ${age} ปี)</li>
          <li>สาเหตุการเสียชีวิต: ${DEATH_CAUSE_LABELS[character.deathCause ?? "oldAge"]}</li>
          <li>มรดกที่ทิ้งไว้: ${btc} ${WORLD.currency} (≈ ${fiat})</li>
        </ul>
        <ul class="final-stats">${stats}</ul>
        <button type="button" class="advance" data-do="restart">เริ่มตระกูลใหม่</button>
      </section>`;
  }
}
