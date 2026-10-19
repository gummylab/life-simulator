import { html, type TemplateResult } from "lit";
import type { PlayerAction } from "../core/model/PlayerAction";
import { STAT_KEYS } from "../core/model/StatBlock";
import { formatBtc, formatUsd } from "./money";
import { STAT_LABELS } from "./stats";
import { icon } from "./icons";

/**
 * The two chip rows every action and job card shows. Costs come first so
 * the player can see what a tap spends, then the stat deltas, because a
 * life sim is only a game of decisions when the consequences are visible
 * before the tap (ADR 0016).
 */

/** Stat deltas the action promises, e.g. "+3 ปัญญา". Empty when it has none. */
export function statDeltaChips(action: PlayerAction): TemplateResult[] {
  const stats = action.effects.stats ?? {};
  const chips: TemplateResult[] = [];
  for (const key of STAT_KEYS) {
    const delta = stats[key];
    if (delta === undefined || delta === 0) {
      continue;
    }
    const tone = delta > 0 ? "chip-gain" : "chip-cost";
    chips.push(
      html`<span class="chip ${tone}" data-stat=${key}
        >${delta > 0 ? "+" : "−"}${Math.abs(delta)} ${STAT_LABELS[key]}</span
      >`,
    );
  }
  return chips;
}

/** Time, energy and money an action spends or earns, in that order. */
export function costChips(action: PlayerAction, rateUsd: number): TemplateResult[] {
  const chips: TemplateResult[] = [
    html`<span class="chip">${icon("Clock", 12)}${action.timeCost}</span>`,
  ];
  if (action.energyCost !== undefined && action.energyCost > 0) {
    chips.push(
      html`<span class="chip chip-cost">${icon("Zap", 12)}−${action.energyCost}</span>`,
    );
  }
  if (action.energyRestore !== undefined && action.energyRestore > 0) {
    chips.push(
      html`<span class="chip chip-gain">${icon("Zap", 12)}+${action.energyRestore}</span>`,
    );
  }
  const money = action.effects.money ?? 0;
  if (money !== 0) {
    chips.push(moneyChip(money, rateUsd));
  }
  return chips;
}

/**
 * One money amount: the USD check figure leads, the BTC amount trails in
 * muted text. Both directions of the trade use the same component so the
 * eye never has to relearn the order.
 */
export function moneyChip(amountBtc: number, rateUsd: number): TemplateResult {
  const tone = amountBtc > 0 ? "chip-gain" : "chip-cost";
  const sign = amountBtc > 0 ? "+" : "−";
  const usd = formatUsd(Math.abs(amountBtc) * rateUsd);
  return html`<span class="chip ${tone}"
    >${sign}${usd}
    <span class="muted">${formatBtc(Math.abs(amountBtc))} BTC</span></span
  >`;
}
