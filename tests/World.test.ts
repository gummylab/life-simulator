import { describe, expect, test } from "bun:test";
import { SeededRng } from "../src/core/rng/SeededRng";
import { WORLD, randomNameFor } from "../src/content/world";

describe("world", () => {
  test("uses BTC as its only currency", () => {
    expect(WORLD.currency).toBe("BTC");
  });

  test("every content pool has entries", () => {
    expect(WORLD.givenNames.female.length).toBeGreaterThanOrEqual(5);
    expect(WORLD.givenNames.male.length).toBeGreaterThanOrEqual(5);
    expect(WORLD.familyNames.length).toBeGreaterThanOrEqual(5);
    expect(WORLD.places.length).toBeGreaterThanOrEqual(4);
    expect(WORLD.schools.primary.length).toBeGreaterThanOrEqual(4);
    expect(WORLD.schools.secondary.length).toBeGreaterThanOrEqual(4);
    expect(WORLD.schools.university.length).toBeGreaterThanOrEqual(4);
  });

  test("rolled names come from the world pools and the picked gender", () => {
    const rng = new SeededRng(31);
    for (let i = 0; i < 100; i += 1) {
      const female = randomNameFor(rng, "female");
      const male = randomNameFor(rng, "male");
      expect(WORLD.givenNames.female).toContain(female.givenName);
      expect(WORLD.familyNames).toContain(female.familyName);
      expect(WORLD.givenNames.male).toContain(male.givenName);
      expect(WORLD.familyNames).toContain(male.familyName);
    }
  });

  test("a rolled name is written in Thai script", () => {
    const rng = new SeededRng(5);
    const name = randomNameFor(rng, "female");
    expect(name.givenName).toMatch(/[ก-๙]/);
    expect(name.familyName).toMatch(/[ก-๙]/);
  });
});
