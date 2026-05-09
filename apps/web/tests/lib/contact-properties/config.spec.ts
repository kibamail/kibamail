/**
 * Tests for contact-properties/config
 *
 * Pinning down the slot/limit configuration: the rest of the system relies on
 * (a) NUMBER and DATE sharing the float pool of 35 slots, and (b) STRING using
 * its own pool of 50 slots. A regression here cascades into validation, slot
 * allocation, and database column selection.
 */

import { describe, expect, test } from "vitest";
import { getMaxSlots, getSlotPrefix } from "@/lib/contact-properties/config";

describe("getMaxSlots", () => {
  test("NUMBER and DATE share the float pool with 35 slots", () => {
    expect(getMaxSlots("NUMBER")).toBe(35);
    expect(getMaxSlots("DATE")).toBe(35);
    expect(getMaxSlots("NUMBER")).toBe(getMaxSlots("DATE"));
  });

  test("STRING has its own pool of 50 slots", () => {
    expect(getMaxSlots("STRING")).toBe(50);
  });

  test("STRING and NUMBER pools are different sizes (regression: don't merge)", () => {
    expect(getMaxSlots("STRING")).not.toBe(getMaxSlots("NUMBER"));
  });
});

describe("getSlotPrefix", () => {
  test("NUMBER and DATE both use propertyFloat", () => {
    expect(getSlotPrefix("NUMBER")).toBe("propertyFloat");
    expect(getSlotPrefix("DATE")).toBe("propertyFloat");
  });

  test("STRING uses propertyString", () => {
    expect(getSlotPrefix("STRING")).toBe("propertyString");
  });

  test("prefixes for the float pool match the database column convention", () => {
    // Other code (e.g. buildContactProperties) reads slots like
    // `propertyFloat0`, `propertyString5`. If the prefix shifts, those reads
    // silently return undefined.
    expect(`${getSlotPrefix("NUMBER")}0`).toBe("propertyFloat0");
    expect(`${getSlotPrefix("STRING")}9`).toBe("propertyString9");
  });
});
