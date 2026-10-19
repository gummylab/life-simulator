import { html, type TemplateResult } from "lit";
import { icon, type IconName } from "./icons";

/** One destination on the more tab: a row that opens a full sub-screen. */
interface MenuRow {
  readonly command: string;
  readonly iconName: IconName;
  readonly label: string;
  readonly note: string;
}

/** Base rows are data so save rows append without reshaping the list. */
const ROWS: readonly MenuRow[] = [
  {
    command: "open-help",
    iconName: "CircleHelp",
    label: "วิธีการเล่น",
    note: "อธิบายระบบเวลา พลังงาน และการบันทึกอัตโนมัติ",
  },
  {
    command: "open-restart",
    iconName: "RefreshCw",
    label: "เริ่มใหม่",
    note: "ดูสรุปชีวิตตอนนี้ แล้วค่อยเริ่มตระกูลใหม่",
  },
];

/** Save management rows (Task 3.5): file round-trip. Wiping the save
 *  lives only behind "เริ่มใหม่", which shows the life summary first. */
const SAVE_ROWS: readonly MenuRow[] = [
  {
    command: "export-save",
    iconName: "Download",
    label: "สำรองบันทึก",
    note: "ดาวน์โหลดไฟล์บันทึกเป็น JSON เก็บไว้นอกเครื่อง",
  },
  {
    command: "import-save",
    iconName: "Upload",
    label: "นำเข้าบันทึก",
    note: "เลือกไฟล์บันทึกที่เคยสำรองไว้เพื่อเล่นต่อ",
  },
];

/**
 * The more tab: a plain menu list in the style of the action cards.
 * Each row opens a full sub-screen instead of expanding inline, so the
 * player always lands on one clear page per choice. The chronicle row
 * only appears once a succession has written something.
 */
export class MoreMenuView {
  constructor(private readonly chronicleLines: number) {}

  render(): TemplateResult {
    const rows: MenuRow[] = [...ROWS];
    if (this.chronicleLines > 0) {
      rows.push({
        command: "open-chronicle",
        iconName: "ScrollText",
        label: "บันทึกตระกูล",
        note: `เรื่องราวข้ามรุ่นที่บันทึกไว้ ${this.chronicleLines} บรรทัด`,
      });
    }
    rows.push(...SAVE_ROWS);

    const rendered = rows.map(
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

    // Hidden file picker for import: App catches the change on the screen.
    return html`
      <section class="panel">
        <h2>${icon("Menu", 18)}อื่นๆ</h2>
        <div class="menu">${rendered}</div>
        <input type="file" id="save-file-input" accept="application/json,.json" hidden />
      </section>
    `;
  }
}
