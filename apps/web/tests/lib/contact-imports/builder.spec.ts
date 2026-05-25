import { describe, expect, test } from "vitest";
import { ContactDataBuilder } from "@/lib/contact-imports/builder";

describe("ContactDataBuilder", () => {
  const builder = new ContactDataBuilder();

  test("builds minimal contact payload with required fields", () => {
    const result = builder.build({}, {}, "ws_1", "alice@example.com", false, "src_1");

    expect(result).toMatchObject({
      workspaceId: "ws_1",
      email: "alice@example.com",
      sourceType: "IMPORT",
      sourceId: "src_1",
      status: "UNCONFIRMED",
    });
    expect(result.subscribedAt).toBeUndefined();
  });

  test("sets SUBSCRIBED status and subscribedAt when autoSubscribe is true", () => {
    const before = Date.now();
    const result = builder.build({}, {}, "ws_1", "x@y.com", true, "src");
    const after = Date.now();

    expect(result.status).toBe("SUBSCRIBED");
    expect(result.subscribedAt).toBeInstanceOf(Date);
    const ts = (result.subscribedAt as Date).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  test("merges standard fields into the payload", () => {
    const result = builder.build(
      {
        firstName: "Ada",
        lastName: "Lovelace",
        country: "GB",
        phone: "+447700900123",
      },
      {},
      "ws",
      "ada@example.com",
      false,
      "src",
    );

    expect(result).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      country: "GB",
      phone: "+447700900123",
    });
  });

  test("skips standard fields with empty string values", () => {
    const result = builder.build(
      { firstName: "Ada", lastName: "" },
      {},
      "ws",
      "ada@example.com",
      false,
      "src",
    );

    expect(result.firstName).toBe("Ada");
    expect(result).not.toHaveProperty("lastName");
  });

  test("truncates propertyString slots to 255 characters", () => {
    const long = "a".repeat(400);
    const result = builder.build(
      {},
      { propertyString1: long },
      "ws",
      "e@x.com",
      false,
      "src",
    );

    expect((result as Record<string, unknown>).propertyString1).toBe(
      "a".repeat(255),
    );
  });

  test("parses numeric values for propertyFloat slots", () => {
    const result = builder.build(
      {},
      { propertyFloat1: "42.5", propertyFloat2: "0" },
      "ws",
      "e@x.com",
      false,
      "src",
    );

    expect((result as Record<string, unknown>).propertyFloat1).toBe(42.5);
    expect((result as Record<string, unknown>).propertyFloat2).toBe(0);
  });

  test("drops propertyFloat slots whose value is not numeric", () => {
    const result = builder.build(
      {},
      { propertyFloat1: "not-a-number" },
      "ws",
      "e@x.com",
      false,
      "src",
    );

    expect(result).not.toHaveProperty("propertyFloat1");
  });

  test("ignores slot names that do not start with a known prefix", () => {
    const result = builder.build(
      {},
      { unknownSlot: "value" },
      "ws",
      "e@x.com",
      false,
      "src",
    );

    expect(result).not.toHaveProperty("unknownSlot");
  });

  test("does not assign a key to undefined when standard field is missing", () => {
    const result = builder.build({}, {}, "ws", "e@x.com", false, "src");

    expect(result).not.toHaveProperty("firstName");
    expect(result).not.toHaveProperty("country");
  });
});
