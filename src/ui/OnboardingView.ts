import { html, type TemplateResult } from "lit";
import { icon, type IconName } from "./icons";

/** One teaching card: what the player is about to rely on. */
interface Tip {
  readonly iconName: IconName;
  readonly title: string;
  readonly body: string;
}

const TIPS: readonly Tip[] = [
  {
    iconName: "Clock",
    title: "หนึ่งปีมีเวลาจำกัด",
    body: "ทุกกิจกรรมกินเวลาตามที่เขียนใต้ชื่อ พอเวลาหมดปีจะจบเองและอายุเพิ่มขึ้นหนึ่งปี",
  },
  {
    iconName: "Zap",
    title: "พลังงานคือความเหนื่อย",
    body: "กิจกรรมที่ใช้แรงกินพลังงาน พอต่ำกว่า 30 จะกดไม่ได้จนกว่าจะได้พัก และทุกต้นปีพลังงานจะฟื้นกลับมาบ้าง",
  },
  {
    iconName: "Moon",
    title: "พักฟรี หรือจ่ายเพื่อฟื้นเร็ว",
    body: "นอนไม่เสียเงินแต่คืนช้า ส่วนกิจกรรมผ่อนคลายแบบเสียเงินคืนเร็วกว่าและได้ความสุขเพิ่ม",
  },
  {
    iconName: "Save",
    title: "เกมบันทึกให้เอง",
    body: "ทุกครั้งที่กด เกมจะบันทึกให้อัตโนมัติ ปิดหน้าเว็บแล้วเปิดใหม่กลับมาเล่นต่อได้ทันที",
  },
];

/**
 * How-to screen. Shown full-screen from the more tab ("help") or, on the
 * very first visit with no save, as the welcome screen before birth setup
 * ("welcome"). The same tips serve both; only the title and the button
 * differ.
 */
export class OnboardingView {
  constructor(private readonly mode: "help" | "welcome" = "help") {}

  render(): TemplateResult {
    const isWelcome = this.mode === "welcome";
    return html`
      <section class="panel onboarding">
        <h2>
          ${icon(isWelcome ? "Baby" : "CircleHelp", 18)}
          ${isWelcome ? "ยินดีต้อนรับสู่ life simulator" : "วิธีเล่น"}
        </h2>
        <p class="muted summary-note">
          ${isWelcome
            ? "เกมจำลองชีวิตของตระกูลหนึ่ง เล่นข้ามรุ่นไปเรื่อย ๆ สามเรื่องนี้คือทั้งหมดที่ต้องรู้ก่อนเริ่ม"
            : "กติกาหลักสามข้อที่ใช้อธิบายลูปของเกม"}
        </p>
        <ul class="tip-list">
          ${TIPS.map(
            (tip) => html`
              <li class="tip">
                <span class="tip-icon">${icon(tip.iconName, 18)}</span>
                <span class="tip-body">
                  <span class="tip-title">${tip.title}</span>
                  <span class="muted">${tip.body}</span>
                </span>
              </li>
            `,
          )}
        </ul>
        <div class="summary-actions">
          <button type="button" class="advance" data-do=${isWelcome ? "welcome-done" : "back"}>
            ${icon(isWelcome ? "Baby" : "ChevronLeft", 16)}
            ${isWelcome ? "เริ่มชีวิตแรก" : "กลับ"}
          </button>
        </div>
      </section>
    `;
  }
}
