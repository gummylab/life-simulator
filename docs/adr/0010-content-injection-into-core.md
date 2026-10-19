# ส่งเนื้อหาเข้า core ด้วย constructor injection แทนการ import ตรง

Phase 2 เพิ่มระบบการศึกษา อาชีพ ความสัมพันธ์ และเหตุการณ์สุ่ม ซึ่งล้วนต้องรู้ชื่อโรงเรียน ชื่อเมือง ชื่องาน และข้อความภาษาไทย แต่กฎของ ADR 0001 คือ core ห้าม import จาก `src/content` และ `src/ui` ทางออกคือให้ UI เป็นคนประกอบเนื้อหาทั้งกอง (`GameContent`) แล้วยัดเข้า `Game` ทาง constructor ครั้งเดียว

## กลไก

`Game` และ `createLife` รับพารามิเตอร์ `content?: GameContent` ฝั่ง optional ระบบทั้งสี่ (`EducationSystem`, `CareerSystem`, `RelationshipSystem`, `EventEngine`) รับ content เป็น argument ของ methods ตัวเอง ไม่เก็บ reference ถาวร เกมที่ไม่ส่ง content จะข้ามทุกระบบไปเลย ทำงานเหมือน Round 15 ทุกประการ ซึ่งทำให้ test เก่า 82 ตัวไม่ต้องแก้แม้แต่บรรทัดเดียว

`GameContent` เป็น schema ล้วนใน `src/core/model/` ประกอบด้วย school pools, places, workplaces, ชื่อคน, อาชีพ (`JobSpec[]`), และเหตุการณ์ (`LifeEvent[]`) ส่วน `src/content/gameContent.ts` เป็นที่เดียวที่ประกอบของจริงจาก `world.ts`, `jobs.ts`, `events.ts` เป็น bundle เดียวที่ `App` ส่งเข้าไป

เหตุการณ์ใช้ `condition` เป็นข้อมูล (minAge, married, employed, student, minSmarts ฯลฯ) ไม่ใช่ function เพื่อให้ test สแกนทุกข้อหา typo ได้ และ engine นิ่งกับ seed เดิม ข้อความรองรับโทเคน `{school}` `{place}` `{currency}` `{name}` ซึ่งถูกแทนค่าตอน render เสมอ มี test ยืนยันว่าไม่มีวงเล็บปิดหลุดถึงผู้เล่น

## ผลต่อ save

`SaveManager` เพิ่ม `education`/`job`/`family` เป็น field optional ใน payload และคง `SAVE_VERSION = 1` ไฟล์เก่าที่ deploy อยู่บน Pages โหลดต่อได้ด้วยค่า default ว่าง ผู้เล่นที่กำลังเล่นอยู่จึงไม่เสียชีวิตเมื่ออัปเดต

**Considered Options:** อีกทางเลือกคือให้ core import content ตรงแล้วยอม duplicate ข้อมูลตอน test ถูกตัดออกเพราะขัด layering ของ ADR 0001 และจะทำให้ test ต้องพึ่ง content จริงทุกตัว ส่วนการ bump SAVE_VERSION ทุกครั้งที่เพิ่ม field ก็ถูกตัดออกเพราะบังคับให้ผู้เล่นทุกคนเสียชีวิตกลางคัน

**Consequences:** เนื้อหาใหม่ทุกชิ้นเพิ่มใน `src/content/` เท่านั้น core ไม่ต้องแก้ ยกเว้นเพิ่ม field ใหม่ลง `GameContent` ตัวเงิน balance ทั้งหมด (ค่าเทอม เงินเดือน รายจ่าย ค่าเลื่อนขั้น โอกาสเกิดเหตุการณ์) อยู่ใน `src/core/config.ts` ไฟล์เดียวตามข้อตกลงเดิม ส่วน test ของระบบที่ต้องใช้ content ใช้ `makeContentGame` จาก `tests/helpers.ts` ซึ่งประกอบ `GAME_CONTENT` ของจริงให้พร้อม
