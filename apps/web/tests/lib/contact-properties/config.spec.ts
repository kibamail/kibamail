import { describe, expect, test } from "vitest";
import { getMaxSlots, getSlotPrefix } from "@/lib/contact-properties/config";

describe("getMaxSlots", () => {
  test("returns 35 slots for DATE", () => {
    expect(getMaxSlots("DATE")).toBe(35);
  });

  test("returns 35 slots for NUMBER", () => {
    expect(getMaxSlots("NUMBER")).toBe(35);
  });

  test("returns 50 slots for STRING", () => {
    expect(getMaxSlots("STRING")).toBe(50);
  });

  test("DATE and NUMBER share the same float-backed slot count", () => {
    expect(getMaxSlots("DATE")).toBe(getMaxSlots("NUMBER"));
  });

  test("STRING limit is strictly larger than the float-backed limit", () => {
    expect(getMaxSlots("STRING")).toBeGreaterThan(getMaxSlots("NUMBER"));
  });
});

describe("getSlotPrefix", () => {
  test("returns propertyFloat prefix for DATE", () => {
    expect(getSlotPrefix("DATE")).toBe("propertyFloat");
  });

  test("returns propertyFloat prefix for NUMBER", () => {
    expect(getSlotPrefix("NUMBER")).toBe("propertyFloat");
  });

  test("returns propertyString prefix for STRING", () => {
    expect(getSlotPrefix("STRING")).toBe("propertyString");
  });

  test("DATE and NUMBER use the identical underlying column prefix", () => {
    expect(getSlotPrefix("DATE")).toBe(getSlotPrefix("NUMBER"));
  });
});
