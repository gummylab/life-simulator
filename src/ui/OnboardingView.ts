import { html, type TemplateResult } from "lit";
import { icon } from "./icons";

/**
 * How-to panel. Shown full-screen from the more tab ("help") or, on the
 * very first visit with no save, as the welcome screen before birth
 * setup ("welcome"). The same tips serve both; only the title and the
 * button differ.
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
        <ul>
          <li>
            ทุกปีมีเวลาจำกัด ทุกกิจกรรมกินเวลาตามที่เขียนใต้ปุ่ม พอเวลาหมดปีจะจบเองและอายุเพิ่มขึ้น
            1 ปี
          </li>
          <li>
            กิจกรรมที่ต้องใช้แรงกินพลังงาน พลังงานต่ำกว่า 30
            จะกดไม่ได้ ต้องนอนหรือพักก่อน และทุกต้นปีพลังงานจะค่อยๆ ฟื้น
          </li>
          <li>นอนพักไม่เสียเงินแต่คืนช้า ส่วนกิจกรรมผ่อนคลายแบบเสียเงินคืนเร็วกว่าและได้ความสุขเพิ่ม</li>
          <li>เกมบันทึกให้เองทุกครั้งที่กด ปิดหน้าเว็บแล้วเปิดใหม่กลับมาเล่นต่อได้ทันที</li>
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
