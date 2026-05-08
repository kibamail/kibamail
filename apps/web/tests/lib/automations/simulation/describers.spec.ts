/**
 * Tests for the pure describers used by the automation simulator.
 *
 * describeTrigger / describeCondition / describeActionType produce the
 * human-readable strings shown in the simulator output, the audit trail,
 * and (in some flows) tooltips. They are pure functions over the trigger
 * type and node data, so a regression silently corrupts every UI
 * surface that consumes simulator output.
 *
 * describeAction is not covered here because the topic-resolution branches
 * hit the database — those paths are integration-tested separately.
 */

import type { Automation } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { AUTOMATION_ACTIONS } from "@/lib/automations/config";
import type { FlowNode } from "@/lib/automations/graph";
import {
  describeActionType,
  describeCondition,
  describeTrigger,
} from "@/lib/automations/simulation/describers";

function makeNode(type: string, data: Record<string, unknown> = {}): FlowNode {
  return { id: "n_1", type, position: { x: 0, y: 0 }, data };
}

function makeAutomation(
  triggerType: Automation["triggerType"],
  triggerConfig: Record<string, unknown> | null = null,
): Automation {
  return {
    triggerType,
    triggerConfig,
  } as unknown as Automation;
}

describe("describeTrigger", () => {
  test("CONTACT_SUBSCRIBED returns a static string", () => {
    expect(
      describeTrigger(makeAutomation("CONTACT_SUBSCRIBED"), makeNode("any")),
    ).toBe("Triggered when contact subscribes");
  });

  test("PROPERTY_UPDATED uses the configured property name", () => {
    const result = describeTrigger(
      makeAutomation("PROPERTY_UPDATED", { propertyName: "tier" }),
      makeNode("any"),
    );
    expect(result).toBe("Triggered when property 'tier' changes");
  });

  test("PROPERTY_UPDATED falls back to 'unknown' when config is null", () => {
    const result = describeTrigger(
      makeAutomation("PROPERTY_UPDATED", null),
      makeNode("any"),
    );
    expect(result).toBe("Triggered when property 'unknown' changes");
  });

  test("FORM_SUBMITTED uses the configured form id", () => {
    expect(
      describeTrigger(
        makeAutomation("FORM_SUBMITTED", { formId: "form_123" }),
        makeNode("any"),
      ),
    ).toBe("Triggered when form 'form_123' is submitted");
  });

  test("API trigger returns a static string", () => {
    expect(describeTrigger(makeAutomation("API"), makeNode("any"))).toBe(
      "Triggered via API call",
    );
  });

  test("EVENT prefers config.eventName over node.data.eventName", () => {
    const result = describeTrigger(
      makeAutomation("EVENT", { eventName: "purchase" }),
      makeNode("event", { eventName: "fallback" }),
    );
    expect(result).toBe("Triggered by event 'purchase'");
  });

  test("EVENT falls back to node.data.eventName when config is missing it", () => {
    const result = describeTrigger(
      makeAutomation("EVENT", null),
      makeNode("event", { eventName: "checkout" }),
    );
    expect(result).toBe("Triggered by event 'checkout'");
  });

  test("EVENT falls back to 'unknown' when neither source has eventName", () => {
    expect(
      describeTrigger(makeAutomation("EVENT", null), makeNode("event")),
    ).toBe("Triggered by event 'unknown'");
  });

  test("SEGMENT_ENTRY and SEGMENT_EXIT use distinct phrasing", () => {
    const entry = describeTrigger(
      makeAutomation("SEGMENT_ENTRY", { segmentId: "seg_a" }),
      makeNode("any"),
    );
    const exit = describeTrigger(
      makeAutomation("SEGMENT_EXIT", { segmentId: "seg_a" }),
      makeNode("any"),
    );
    expect(entry).toBe("Triggered when contact enters segment 'seg_a'");
    expect(exit).toBe("Triggered when contact exits segment 'seg_a'");
  });

  test("EMAIL_ENGAGEMENT uses the engagement type when present", () => {
    expect(
      describeTrigger(
        makeAutomation("EMAIL_ENGAGEMENT", { emailEngagementType: "open" }),
        makeNode("any"),
      ),
    ).toBe("Triggered on email open");
  });

  test("EMAIL_ENGAGEMENT defaults to 'engagement' when unspecified", () => {
    expect(
      describeTrigger(
        makeAutomation("EMAIL_ENGAGEMENT", null),
        makeNode("any"),
      ),
    ).toBe("Triggered on email engagement");
  });

  test("unknown trigger type falls through to the default", () => {
    const result = describeTrigger(
      makeAutomation("UNKNOWN_TYPE" as unknown as Automation["triggerType"]),
      makeNode("any"),
    );
    expect(result).toBe("Triggered");
  });
});

describe("describeCondition", () => {
  test("returns the no-conditions message when none are defined", () => {
    expect(describeCondition(makeNode("if-else"), "true")).toBe(
      "No conditions defined → true",
    );
  });

  test("formats a simple field/operator/value condition", () => {
    const node = makeNode("if-else", {
      conditions: { field: "tier", operator: "eq", value: "pro" },
    });
    expect(describeCondition(node, "true")).toBe(
      'Condition: tier eq "pro" → true',
    );
  });

  test("JSON-stringifies non-primitive condition values", () => {
    const node = makeNode("if-else", {
      conditions: { field: "tags", operator: "in", value: ["a", "b"] },
    });
    expect(describeCondition(node, "false")).toBe(
      'Condition: tags in ["a","b"] → false',
    );
  });

  test("falls back to a generic phrase when conditions exist but are not the simple shape", () => {
    const node = makeNode("if-else", {
      conditions: { groups: [{ field: "x", op: "=" }] },
    });
    expect(describeCondition(node, "true")).toBe("Condition evaluated → true");
  });
});

describe("describeActionType", () => {
  test("maps every known action id to its simulator label", () => {
    expect(describeActionType(AUTOMATION_ACTIONS.SEND_EMAIL.id)).toBe(
      "would_send_email",
    );
    expect(describeActionType(AUTOMATION_ACTIONS.SEND_WEBHOOK.id)).toBe(
      "would_send_webhook",
    );
    expect(describeActionType(AUTOMATION_ACTIONS.UPDATE_CONTACT.id)).toBe(
      "would_update_contact",
    );
    expect(describeActionType(AUTOMATION_ACTIONS.UNSUBSCRIBE_CONTACT.id)).toBe(
      "would_unsubscribe",
    );
    expect(describeActionType(AUTOMATION_ACTIONS.ADD_TO_TOPIC.id)).toBe(
      "would_add_to_topic",
    );
    expect(describeActionType(AUTOMATION_ACTIONS.REMOVE_FROM_TOPIC.id)).toBe(
      "would_remove_from_topic",
    );
  });

  test("falls back to 'would_execute' for unknown node types", () => {
    expect(describeActionType("unknown")).toBe("would_execute");
    expect(describeActionType("")).toBe("would_execute");
  });
});
