# ชั้น UI ใช้ Lit และ Lucide แทน string HTML

ตอนมีแค่ HUD กับเมนู การ render ชั้น `ui` ด้วย string HTML ต่อด้วยมือแบบ ADR 0001 ยังไปได้ แต่ตอนนี้เกมขึ้นเว็บสาธารณะแล้วและเฟสต่อไปจะมีป๊อปอัปเหตุการณ์ ฟอร์มสมัครงาน และหน้าครอบครัว การ build string HTML ยาวๆ เริ่มเป็นจุดเสี่ยง ทั้งต้อง escape เองทุกจุด และ `innerHTML` ทุกคลิกสร้าง DOM ใหม่ทั้งหมด เช่น โฟกัสในฟอร์มหลุดทุกครั้งที่มี render

เราจึงเปลี่ยนชั้น `ui` ไปใช้ lit-html ทุก view คืน `TemplateResult` แทน string และใช้ไอคอนจาก lucide ผ่าน helper ที่ `src/ui/icons.ts` ชั้น `core` และ `content` ไม่เปลี่ยนและไม่ import อะไรจาก lit เลย ADR 0001 ยังมีผลเต็มที่สำหรับส่วนแยกแกนเกมออกและข้อห้ามไม่ให้ `core` แตะ DOM ส่วนข้อห้าม UI framework ถูกแทนที่ด้วย ADR นี้

**Considered Options:** อีกทางเลือกคือ Preact พร้อม signals ถูกตัดออกเพราะต้องย้ายชั้น UI ทั้งหมดพร้อมกันและใหญ่กว่าที่เกมข้อความต้องใช้ ส่วนการคง vanilla string HTML ไว้ถูกตัดออกเพราะ Phase 2-3 จะมี dialog และฟอร์มที่เขียน string ด้วยมือเสี่ยงผิดและแก้ยากขึ้นเรื่อยๆ

**Consequences:** view ทุกตัวคืน `TemplateResult` และ lit escape ค่าอัตโนมัติจึงลบ `escapeHtml` ทิ้งได้จริง ไอคอนทุกอันต้องอยู่ใน `ICON_SET` และมี `tests/Icons.test.ts` คุมว่าทุกกิจกรรมมีไอคอน การ render จริงถูกคุมด้วย DOM smoke test บน happy-dom (`tests/App.test.ts` พร้อม preload ใน `bunfig.toml`) เพราะย้าย UI ทั้งชั้นโดยไม่มี test runtime เท่ากับเสี่ยง crash หน้างานจริง กติกาเดิมที่ยังใช้คือห้าม `core` แตะ DOM หรือ localStorage และปุ่มทุกปุ่มส่ง command ผ่าน `data-do` ให้ App เป็นจุดเดียวเพื่อให้ view ไม่ต้อง wire event เองหลัง render
