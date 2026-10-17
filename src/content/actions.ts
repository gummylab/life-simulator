import type { PlayerAction } from "../core/model/PlayerAction";

/**
 * Phase 1 action menu. Every action eats time from the year's budget and
 * drains or restores energy (rules live in core/config.ts). Money amounts
 * are in BTC, the only currency the world uses.
 * Rest activities carry no energy cost, so they stay available when tired.
 * Task 2.8 replaces this starter set with the full content library.
 */
export const ACTIONS: readonly PlayerAction[] = [
  {
    id: "rest",
    label: "พักผ่อนอยู่บ้าน",
    minAge: 0,
    maxAge: 120,
    timeCost: 20,
    energyRestore: 40,
    resultText: "นอนดูซีรีส์อยู่บ้านทั้งวัน ใจดีขึ้นชั่วคราว",
    effects: { stats: { happiness: 4, health: 1 } },
  },
  {
    id: "sleep",
    label: "นอนหลับพักผ่อน",
    minAge: 0,
    maxAge: 120,
    timeCost: 40,
    energyRestore: 100,
    resultText: "นอนอัดแน่นเต็มอิ่ม ตื่นมาสดชื่น",
    effects: { stats: { happiness: 1, health: 1 } },
  },
  {
    id: "cafe-movie",
    label: "ดูหนังที่คาเฟ่",
    minAge: 6,
    maxAge: 120,
    timeCost: 25,
    energyRestore: 65,
    resultText: "นั่งดูหนังจิบเครื่องดื่มในคาเฟ่ คลายเครียดได้ดี",
    effects: { money: -0.0003, stats: { happiness: 6 } },
  },
  {
    id: "massage",
    label: "นวดคลายเส้น",
    minAge: 10,
    maxAge: 120,
    timeCost: 25,
    energyRestore: 70,
    resultText: "ไปนวดคลายเส้น ตัวเบาขึ้นเยอะ",
    effects: { money: -0.0005, stats: { happiness: 5, health: 3 } },
  },
  {
    id: "trip",
    label: "ออกไปเที่ยวพักผ่อน",
    minAge: 4,
    maxAge: 120,
    timeCost: 40,
    energyRestore: 100,
    resultText: "เก็บกระเป๋าออกไปเที่ยวรอบเมือง ได้ชาร์จพลังเต็มที่",
    effects: { money: -0.001, stats: { happiness: 10, health: 2 } },
  },
  {
    id: "study",
    label: "อ่านหนังสือ",
    minAge: 6,
    maxAge: 30,
    timeCost: 30,
    energyCost: 15,
    resultText: "นั่งอ่านหนังสือทั้งวัน ปัญญาเพิ่มขึ้น แต่ก็แอบเบื่อ",
    effects: { stats: { smarts: 3, happiness: -1 } },
  },
  {
    id: "exercise",
    label: "ออกไปออกกำลังกาย",
    minAge: 8,
    maxAge: 95,
    timeCost: 30,
    energyCost: 30,
    resultText: "วิ่งเหยาะๆ ในสวนแถวบ้าน สุขภาพดีขึ้น",
    effects: { stats: { health: 4, happiness: 1 } },
  },
  {
    id: "part-time",
    label: "รับจ๊อบพิเศษ",
    minAge: 14,
    maxAge: 70,
    timeCost: 40,
    energyCost: 35,
    resultText: "รับจ๊อบพิเศษหลังเลิกเรียน ได้เงินมาพอสมควร",
    effects: { money: 0.00012, stats: { happiness: -1, health: -1 } },
  },
  {
    id: "freelance",
    label: "รับงานฟรีแลนซ์",
    minAge: 20,
    maxAge: 75,
    timeCost: 50,
    energyCost: 50,
    resultText: "นั่งทำงานฟรีแลนซ์จนดึก ได้เงินเพิ่มแต่เหนื่อยเอาเรื่อง",
    effects: { money: 0.00035, stats: { happiness: -2, health: -2 } },
  },
];
