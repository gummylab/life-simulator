import { html, type TemplateResult } from "lit";
import { icon, type IconName } from "./icons";

/** One destination on the more tab: a row that opens a full sub-screen. */
interface MenuRow {
  readonly command: string;
  readonly iconName: IconName;
  readonly label: string;
  readonly note: string;
}

/** Rows are data so future destinations (save export/import) append here. */
const ROWS: readonly MenuRow[] = [
  {
    command: "open-help",
    iconName: "CircleHelp",
    label: "วิธีการเล่น",
    note: "อธิบายระบบเวลา พลังงาน และการบันทึกอัตโนมัติ",
  },
  {
    command: "open-restart",
    iconName: "Hourglass",
    label: "เริ่มใหม่",
    note: "ดูสรุปชีวิตตอนนี้ แล้วค่อยเริ่มตระกูลใหม่",
  },
];

/**
 * The more tab: a plain menu list in the style of the action cards.
 * Each row opens a full sub-screen instead of expanding inline, so the
 * player always lands on one clear page per choice.
 */
export class MoreMenuView {
  render(): TemplateResult {
    const rows = ROWS.map(
      (row) => html`
        <button type="button" class="menu-row" data-do=${row.command}>
          <span class="menu-row-icon">${icon(row.iconName, 20)}</span>
          <span class="menu-row-text">
            <span>${row.label}</span>
            <span class="menu-row-note">${row.note}</span>
          </span>
          <span class="menu-row-chevron">${icon("ChevronRight", 18)}</span>
        </button>
      `,
    );

    return html`
      <section class="panel">
        <h2>${icon("Menu", 18)}อื่นๆ</h2>
        <div class="menu">${rows}</div>
      </section>
    `;
  }
}
