# life simulator by onlygummy

เกมจำลองชีวิตแบบข้อความภาษาไทย เล่นบนเบราว์เซอร์ทั้งมือถือและคอม เริ่มจากเกิดใหม่ เรียนหนังสือ ทำงาน แต่งงาน มีลูก ตาย แล้วสืบทอดตระกูลไปรุ่นถัดไป ปีหนึ่งเท่ากับหนึ่งปี กดปุ่ม "อายุ +1 ปี" เพื่อเดินเวลา

เล่นได้ที่ https://onlygummy-spark.github.io/life-simulator/

## รันโปรเจกต์

ต้องติดตั้ง [Bun](https://bun.sh) ก่อน แล้วรัน:

```sh
bun install      # ติดตั้ง dependencies
bun run dev      # เปิด dev server ที่ http://localhost:5173
```

## ทดสอบและ build

```sh
bun run typecheck   # ตรวจ types ด้วย tsc
bun test            # รัน unit test และ DOM test ทั้งหมด
bun run build       # typecheck แล้ว build ลง dist/
bun run preview     # เปิดดู dist/ ที่ build แล้ว
```

test ทุกตัวรันบน happy-dom (จำลองเบราว์เซอร์ใน Node) และ network ถูกปิดในระหว่าง test เพื่อให้ test นิ่งเสมอ ไม่มี test ตัวไหนแตะ CoinGecko จริง

## Deploy ขึ้น GitHub Pages

push ขึ้น branch `main` แล้ว GitHub Actions (`.github/workflows/deploy.yml`) จะ test, build และ deploy ให้อัตโนมัติ ต้องตั้งค่าครั้งเดียวใน Settings > Pages > Source = GitHub Actions

ราคา BTC ดึงจาก CoinGecko ตอนโหลดเกมครั้งแรก ถ้าอินเทอร์เน็ตขาดหรือ API ล่ม เกมใช้ค่าประมาณ $100,000 ต่อ BTC แทน และไม่บล็อกการเล่นแต่อย่างใด

## โครงสร้างโค้ด

แกนเกมอยู่ใน `src/core/` ซึ่งห้าม import จาก `src/content/` หรือ `src/ui/` (ดู ADR 0001, 0010) เนื้อหาทั้งหมด (ชื่อคน โรงเรียน งาน เหตุการณ์) อยู่ใน `src/content/` และถูกส่งเข้า core ผ่าน `GameContent` ส่วน UI ใช้ lit-html + lucide (ADR 0009) ทุกปุ่มส่ง command ผ่าน `data-do` ให้ `App` เป็นจุดเดียว

ตัวเลข balance ทั้งหมด (เงินเดือน ค่าเทอม รายจ่าย แถบเวลา พลังงาน) อยู่ใน `src/core/config.ts` ไฟล์เดียว

## เพิ่มเหตุการณ์เอง

เหตุการณ์สุ่มรายปีเป็นข้อมูลล้วนใน `src/content/events.ts` ตอนนี้มี 48 ข้อ 6 หมวด (สุขภาพ เงิน ความสัมพันธ์ การงาน การศึกษา อุบัติเหตุ) ข้อหนึ่งมีโครงดังนี้:

```ts
{
  id: "health-cold",                       // ห้ามซ้ำกับข้ออื่น
  category: "health",                      // health | money | relationship | career | education | accident
  text: "เป็นหวัดหนักอยู่เป็นสัปดาห์ ต้องนอนพักหลายวัน",
  weight: 4,                               // ยิ่งมากยิ่งถูกสุ่มบ่อย
  condition: { minAge: 3 },                // เงื่อนไขทั้งหมด optional ดูตัวอย่างใน events.ts
  effects: { stats: { health: -4, happiness: -2 } },   // ค่าสถานะ 0-100 และ/หรือ money (BTC)
}
```

ข้อความรองรับโทเคน `{school}` `{place}` `{currency}` `{name}` ซึ่งถูกแทนค่าตอนเหตุการณ์เกิดขึ้นทุกครั้ง พิมพ์ผิด (เช่น `{School}`) จะมี test จับได้ว่ามีโทเคนหลุดถึงผู้เล่น

หลังเพิ่มข้อความแล้วรัน `bun test` — test ชุด `Events` จะตรวจว่า id ไม่ซ้ำ, category ถูกต้อง, เงื่อนไขไม่มี typo และโทเคนครบทุกข้อ

## อ่านต่อ

- `PLAN.md` — แผนทั้งสี่ phase และบันทึกการตัดสินใจรายรอบ
- `GLOSSARY.md` — คำศัพท์เกมและข้อกำหนดในโค้ด
- `docs/adr/` — Architecture Decision Records ทั้ง 11 ฉบับ
