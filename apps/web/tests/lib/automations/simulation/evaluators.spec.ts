/**
 * Tests for automation simulator pure helpers (pickSplit, createSeededRandom).
 *
 * These functions decide which branch of a PERCENTAGE_SPLIT a contact lands on
 * during simulation. A regression here would break A/B simulation reproducibility
 * (different runs of the same automation could pick different splits with the
 * same seed) and weight distribution (higher-percentage branches must win
 * proportionally more often). evaluateCondition is intentionally not covered
 * here — it touches the database and is exercised by integration tests.
 */

import { describe, expect, test } from "vitest";
import {
  createSeededRandom,
  pickSplit,
} from "@/lib/automations/simulation/evaluators";

describe("createSeededRandom", () => {
  test("is deterministic for the same seed", () => {
    const rngA = createSeededRandom(42);
    const rngB = createSeededRandom(42);
    for (let i = 0; i < 50; i++) {
      expect(rngA()).toBe(rngB());
    }
  });

  test("produces different sequences for different seeds", () => {
    const rngA = createSeededRandom(1);
    const rngB = createSeededRandom(2);
    const a = Array.from({ length: 10 }, () => rngA());
    const b = Array.from({ length: 10 }, () => rngB());
    expect(a).not.toEqual(b);
  });

  test("returns values in [0, 1)", () => {
    const rng = createSeededRandom(7);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("pickSplit", () => {
  test("100% to single split always picks that split", () => {
    const splits = [{ id: "only", percentage: 100 }];
    const rng = createSeededRandom(1);
    for (let i = 0; i < 20; i++) {
      expect(pickSplit(splits, rng)).toBe("only");
    }
  });

  test("0% on first split always picks the second", () => {
    const splits = [
      { id: "a", percentage: 0 },
      { id: "b", percentage: 100 },
    ];
    const rng = createSeededRandom(123);
    for (let i = 0; i < 20; i++) {
      expect(pickSplit(splits, rng)).toBe("b");
    }
  });

  test("falls back to the last split id when cumulative percentages do not reach 100", () => {
    // random in [0, 100), cumulative reaches only 30 — fallback returns last id.
    const splits = [
      { id: "a", percentage: 10 },
      { id: "b", percentage: 20 },
    ];
    const rng = () => 0.99; // random * 100 = 99, no cumulative covers it
    expect(pickSplit(splits, rng)).toBe("b");
  });

  test("uses Math.random when seededRandom is null", () => {
    const splits = [{ id: "only", percentage: 100 }];
    expect(pickSplit(splits, null)).toBe("only");
  });

  test("distributes proportionally across many trials with a seeded RNG", () => {
    const splits = [
      { id: "a", percentage: 70 },
      { id: "b", percentage: 30 },
    ];
    const rng = createSeededRandom(2026);
    const counts: Record<string, number> = { a: 0, b: 0 };
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      counts[pickSplit(splits, rng)]++;
    }
    // Both branches must be hit, and the dominant one must clearly dominate.
    expect(counts.a).toBeGreaterThan(0);
    expect(counts.b).toBeGreaterThan(0);
    expect(counts.a).toBeGreaterThan(counts.b);
    // Allow generous tolerance — this is a smoke check, not a chi-squared test.
    expect(counts.a / trials).toBeGreaterThan(0.6);
    expect(counts.a / trials).toBeLessThan(0.8);
  });

  test("picks the correct split given a deterministic random value", () => {
    const splits = [
      { id: "a", percentage: 25 },
      { id: "b", percentage: 25 },
      { id: "c", percentage: 50 },
    ];
    // random value < 25 → "a"
    expect(pickSplit(splits, () => 0.1)).toBe("a"); // 0.1 * 100 = 10
    // 25 <= random < 50 → "b"
    expect(pickSplit(splits, () => 0.3)).toBe("b"); // 30
    // 50 <= random < 100 → "c"
    expect(pickSplit(splits, () => 0.7)).toBe("c"); // 70
  });
});
