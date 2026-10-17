import { html, type TemplateResult } from "lit";
import { icon } from "./icons";

/**
 * Full-screen how-to, opened from the more tab's menu list.
 * The action tab no longer shows it inline; the menu is its only home.
 */
export class OnboardingView {
  render(): TemplateResult {
    return html`
      <section class="panel onboarding">
        <h2>${icon("CircleHelp", 18)}วิธีเล่น</h2>
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
          <button type="button" class="ghost" data-do="back">
            ${icon("ChevronLeft", 16)}กลับ
          </button>
        </div>
      </section>
    `;
  }
}
