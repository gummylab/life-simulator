import { html, type TemplateResult } from "lit";
import { WORLD } from "../content/world";
import { icon, type IconName } from "./icons";
import { formatUsd } from "./money";

/** One destination on the more tab: a row that opens a full sub-screen. */
interface MenuRow {
  readonly command: string;
  readonly iconName: IconName;
  readonly label: string;
  readonly note: string;
  /** Destructive rows wear the warning colour. */
  readonly danger?: boolean;
}

/** A titled block of rows, so reading and managing never mix. */
interface MenuSection {
  readonly title: string;
  readonly iconName: IconName;
  readonly rows: readonly MenuRow[];
}

/** Save management rows: file round-trip. Wiping the save lives only
 *  behind "เริ่มใหม่", which shows the life summary first. */
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
 * The more tab (ADR 0014): the same card rows as before, now split into
 * titled sections so looking something up, moving a save file and wiping
 * the run never sit in one undifferentiated list.
 */
export class MoreMenuView {
  constructor(
    private readonly chronicleLines: number,
    /** BTC rate plus its source note; it never changes a decision. */
    private readonly rateUsd = 0,
    private readonly rateNote = "",
  ) {}

  render(): TemplateResult {
    return html`
      <section class="panel">
        <h2>${icon("Menu", 18)}อื่นๆ</h2>
        ${this.sections().map((section) => this.section(section))}
        <input type="file" id="save-file-input" accept="application/json,.json" hidden />
        <p class="muted menu-rate">
          1 ${WORLD.currency} ≈ ${formatUsd(this.rateUsd)} · ${this.rateNote}
        </p>
      </section>
    `;
  }

  /** Sections in reading order, with the chronicle row added when it exists. */
  private sections(): MenuSection[] {
    const life: MenuRow[] = [
      {
        command: "open-help",
        iconName: "CircleHelp",
        label: "วิธีการเล่น",
        note: "อธิบายระบบเวลา พลังงาน และการบันทึกอัตโนมัติ",
      },
      {
        command: "open-lifelog",
        iconName: "ScrollText",
        label: "บันทึกชีวิต",
        note: "ประวัติทุกบรรทัดตั้งแต่เกิด เรียงใหม่สุดบนสุด",
      },
    ];
    if (this.chronicleLines > 0) {
      life.push({
        command: "open-chronicle",
        iconName: "TreePine",
        label: "บันทึกตระกูล",
        note: `เรื่องราวข้ามรุ่นที่บันทึกไว้ ${this.chronicleLines} บรรทัด`,
      });
    }

    return [
      { title: "ข้อมูลชีวิต", iconName: "Info", rows: life },
      { title: "บันทึกเกม", iconName: "Save", rows: SAVE_ROWS },
      {
        title: "เริ่มต้นใหม่",
        iconName: "RefreshCw",
        rows: [
          {
            command: "open-restart",
            iconName: "RefreshCw",
            label: "เริ่มใหม่",
            note: "ดูสรุปชีวิตตอนนี้ แล้วค่อยเริ่มตระกูลใหม่",
            danger: true,
          },
        ],
      },
    ];
  }

  private section(section: MenuSection): TemplateResult {
    return html`
      <h3 class="group-title">${icon(section.iconName, 15)}<span>${section.title}</span></h3>
      <div class="menu">
        ${section.rows.map(
          (row) => html`
            <button
              type="button"
              class="menu-row ${row.danger ? "menu-row-danger" : ""}"
              data-do=${row.command}
            >
              <span class="menu-row-icon">${icon(row.iconName, 20)}</span>
              <span class="menu-row-text">
                <span>${row.label}</span>
                <span class="menu-row-note">${row.note}</span>
              </span>
              <span class="menu-row-chevron">${icon("ChevronRight", 18)}</span>
            </button>
          `,
        )}
      </div>
    `;
  }
}
