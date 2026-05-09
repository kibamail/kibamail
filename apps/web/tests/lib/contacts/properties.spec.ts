/**
 * Tests for contacts/properties
 *
 * buildContactProperties projects a Contact's slot columns
 * (propertyFloat0..N / propertyString0..N) onto user-defined property names.
 * It runs on every contact serialization, so a regression here can either
 * leak slot data under the wrong property names or silently drop properties
 * that have legitimate values.
 */

import { describe, expect, test } from "vitest";
import { buildContactProperties } from "@/lib/contacts/properties";

describe("buildContactProperties", () => {
  test("maps each property definition to its slot value", () => {
    const contact = {
      propertyFloat0: 25,
      propertyString0: "user@example.com",
      propertyFloat1: 1699564800000,
    };
    const definitions = [
      { name: "Age", slot: "propertyFloat0" },
      { name: "Email", slot: "propertyString0" },
      { name: "Join Date", slot: "propertyFloat1" },
    ];

    expect(buildContactProperties(contact, definitions)).toEqual({
      Age: 25,
      Email: "user@example.com",
      "Join Date": 1699564800000,
    });
  });

  test("returns an empty object when there are no property definitions", () => {
    const contact = { propertyFloat0: 1, propertyString0: "x" };
    expect(buildContactProperties(contact, [])).toEqual({});
  });

  test("omits properties whose slot is null", () => {
    const contact = { propertyFloat0: null, propertyString0: "x" };
    const result = buildContactProperties(contact, [
      { name: "Age", slot: "propertyFloat0" },
      { name: "Email", slot: "propertyString0" },
    ]);

    expect(result).toEqual({ Email: "x" });
    expect("Age" in result).toBe(false);
  });

  test("omits properties whose slot is undefined (missing from the contact)", () => {
    const contact = { propertyString0: "x" };
    const result = buildContactProperties(contact, [
      { name: "Age", slot: "propertyFloat0" },
      { name: "Email", slot: "propertyString0" },
    ]);

    expect(result).toEqual({ Email: "x" });
    expect("Age" in result).toBe(false);
  });

  test("preserves falsy-but-defined values like 0 and empty string", () => {
    // Regression guard: the implementation uses != null, not falsy checks.
    const contact = {
      propertyFloat0: 0,
      propertyString0: "",
      propertyFloat1: false as unknown,
    };
    const result = buildContactProperties(contact, [
      { name: "Score", slot: "propertyFloat0" },
      { name: "Note", slot: "propertyString0" },
      { name: "Flag", slot: "propertyFloat1" },
    ]);

    expect(result).toEqual({ Score: 0, Note: "", Flag: false });
  });

  test("preserves Date values without coercion", () => {
    const date = new Date("2026-01-01T00:00:00Z");
    const contact = { propertyFloat0: date };
    const result = buildContactProperties(contact, [
      { name: "Joined", slot: "propertyFloat0" },
    ]);

    expect(result.Joined).toBeInstanceOf(Date);
    expect((result.Joined as Date).toISOString()).toBe(date.toISOString());
  });

  test("when two definitions share a slot, both names get the same value", () => {
    // Doc'd behavior: definitions are processed in order; duplicate slots map
    // to the same underlying column. This guards against accidentally
    // de-duplicating by slot.
    const contact = { propertyFloat0: 42 };
    const result = buildContactProperties(contact, [
      { name: "AgeA", slot: "propertyFloat0" },
      { name: "AgeB", slot: "propertyFloat0" },
    ]);

    expect(result).toEqual({ AgeA: 42, AgeB: 42 });
  });

  test("definitions referencing unknown slots are silently skipped", () => {
    const contact = { propertyFloat0: 1 };
    const result = buildContactProperties(contact, [
      { name: "Known", slot: "propertyFloat0" },
      { name: "Unknown", slot: "propertyFloat99" },
    ]);

    expect(result).toEqual({ Known: 1 });
  });

  test("does not mutate the input contact object", () => {
    const contact = { propertyFloat0: 1, propertyString0: "x" };
    const snapshot = { ...contact };

    buildContactProperties(contact, [
      { name: "Age", slot: "propertyFloat0" },
    ]);

    expect(contact).toEqual(snapshot);
  });
});
