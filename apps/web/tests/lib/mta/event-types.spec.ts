/**
 * Tests for MTA event-type mapping.
 *
 * mapEventType is the single source of truth that turns wire-format event
 * strings from KumoMTA into the Prisma EventType enum values we persist. A
 * regression here silently misclassifies email events (e.g. bounces recorded
 * as deliveries), so every branch is asserted explicitly.
 */

import { describe, expect, test } from "vitest";
import {
  type EmailEventType,
  mapEventType,
} from "@/lib/mta/event-types";

describe("mapEventType", () => {
  const cases: Array<[EmailEventType, string]> = [
    ["Delivery", "Delivery"],
    ["Bounce", "Bounce"],
    ["TransientFailure", "TransientFailure"],
    ["Feedback", "Feedback"],
    ["Reception", "Reception"],
    ["Expiration", "Expiration"],
    ["AdminBounce", "AdminBounce"],
    ["OOB", "OOB"],
    ["Rejection", "Rejection"],
  ];

  test.each(cases)("maps %s to %s", (input, expected) => {
    expect(mapEventType(input)).toBe(expected);
  });

  test("falls back to 'Any' for unknown event types", () => {
    expect(mapEventType("Unknown" as EmailEventType)).toBe("Any");
    expect(mapEventType("" as EmailEventType)).toBe("Any");
  });

  test("returns 'Any' when given undefined or null at runtime", () => {
    // Defensive: while the type system rejects this, callers parsing
    // upstream JSON may pass through anything.
    expect(mapEventType(undefined as unknown as EmailEventType)).toBe("Any");
    expect(mapEventType(null as unknown as EmailEventType)).toBe("Any");
  });

  test("is case-sensitive (lowercase variants fall back to 'Any')", () => {
    expect(mapEventType("delivery" as EmailEventType)).toBe("Any");
    expect(mapEventType("bounce" as EmailEventType)).toBe("Any");
  });
});
