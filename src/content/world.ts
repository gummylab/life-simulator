import type { SeededRng } from "../core/rng/SeededRng";
import type { Gender } from "../core/model/Character";

/**
 * Our own fictional world.
 *
 * Names imitate an English-speaking town but are written in Thai script as
 * transliterations, which is the voice the game settled on. Every school,
 * university and town here is invented; none refers to a real place.
 */
export interface WorldPack {
  readonly currency: string;
  readonly givenNames: {
    readonly female: readonly string[];
    readonly male: readonly string[];
  };
  readonly familyNames: readonly string[];
  readonly schools: {
    readonly primary: readonly string[];
    readonly secondary: readonly string[];
    readonly university: readonly string[];
  };
  readonly places: readonly string[];
}

export const WORLD: WorldPack = {
  currency: "BTC",
  givenNames: {
    female: ["เอมม่า", "โอลิเวีย", "อวา", "โซเฟีย", "มิอา", "ฮาร์เปอร์", "อีฟลิน", "ลูน่า"],
    male: ["ลีแอม", "โนอา", "อีธาน", "เมสัน", "โลแกน", "ลูคัส", "เฮนรี่", "โอเว่น"],
  },
  familyNames: [
    "มิลเลอร์",
    "คลาร์ก",
    "เฮย์ส",
    "เบนเน็ตต์",
    "ฟอสเตอร์",
    "รีด",
    "ซัลลิแวน",
    "พาร์คเกอร์",
    "วอร์เรน",
    "กริฟฟิน",
  ],
  schools: {
    primary: ["ซันนี่เดล เอเลเมนทารี", "เมโดว์ฮิลล์ เอเลเมนทารี", "บรู๊คไซด์ เอเลเมนทารี", "โอ๊ควัลเลย์ เอเลเมนทารี"],
    secondary: ["กรีนฟิลด์ ไฮ", "ริเวอร์ไซด์ ไฮ", "นอร์ธฮิลล์ ไฮ", "เวสต์เกต ไฮ"],
    university: ["เลคไซด์ ยูนิเวอร์ซิตี้", "แอชฟอร์ด ยูนิเวอร์ซิตี้", "คราวน์ ยูนิเวอร์ซิตี้", "บลูสโตน ยูนิเวอร์ซิตี้"],
  },
  places: ["กรีนฟิลด์", "แอชฟอร์ด", "บรู๊คฮาเวน", "เบลล์วิลล์", "เรดวู้ด", "ซิลเวอร์เลก"],
};

export interface RandomName {
  readonly givenName: string;
  readonly familyName: string;
}

/** Rolls a name that fits the gender the player picked. */
export function randomNameFor(rng: SeededRng, gender: Gender): RandomName {
  return {
    givenName: rng.pick(WORLD.givenNames[gender]),
    familyName: rng.pick(WORLD.familyNames),
  };
}
