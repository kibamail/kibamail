import { describe, expect, test } from "vitest";
import {
  EVENT_TO_TRIGGER_MAP,
  getContactIdFromEvent,
  type AutomationEvent,
  type AutomationEventType,
} from "@/lib/automations/events";

describe("EVENT_TO_TRIGGER_MAP", () => {
  test("maps every AutomationEventType to a valid trigger type", () => {
    const allEventTypes: AutomationEventType[] = [
      "contact.subscribed",
      "contact.property_updated",
      "form.submitted",
      "email.engagement",
      "segment.entered",
      "segment.exited",
      "custom_event",
      "api_trigger",
    ];

    for (const eventType of allEventTypes) {
      expect(EVENT_TO_TRIGGER_MAP[eventType]).toBeDefined();
      expect(typeof EVENT_TO_TRIGGER_MAP[eventType]).toBe("string");
    }
  });

  test("maps to correct Prisma enum values", () => {
    expect(EVENT_TO_TRIGGER_MAP["contact.subscribed"]).toBe("CONTACT_SUBSCRIBED");
    expect(EVENT_TO_TRIGGER_MAP["contact.property_updated"]).toBe("PROPERTY_UPDATED");
    expect(EVENT_TO_TRIGGER_MAP["form.submitted"]).toBe("FORM_SUBMITTED");
    expect(EVENT_TO_TRIGGER_MAP["email.engagement"]).toBe("EMAIL_ENGAGEMENT");
    expect(EVENT_TO_TRIGGER_MAP["segment.entered"]).toBe("SEGMENT_ENTRY");
    expect(EVENT_TO_TRIGGER_MAP["segment.exited"]).toBe("SEGMENT_EXIT");
    expect(EVENT_TO_TRIGGER_MAP["custom_event"]).toBe("EVENT");
    expect(EVENT_TO_TRIGGER_MAP["api_trigger"]).toBe("API");
  });

  test("covers all 8 event types", () => {
    expect(Object.keys(EVENT_TO_TRIGGER_MAP)).toHaveLength(8);
  });
});

describe("getContactIdFromEvent", () => {
  test("extracts contactId from contact.subscribed event", () => {
    const event: AutomationEvent = {
      type: "contact.subscribed",
      payload: { contactId: "c_123" },
    };
    expect(getContactIdFromEvent(event)).toBe("c_123");
  });

  test("extracts contactId from form.submitted event", () => {
    const event: AutomationEvent = {
      type: "form.submitted",
      payload: { contactId: "c_456", formId: "f_1", submissionId: "s_1" },
    };
    expect(getContactIdFromEvent(event)).toBe("c_456");
  });

  test("extracts contactId from email.engagement event", () => {
    const event: AutomationEvent = {
      type: "email.engagement",
      payload: {
        contactId: "c_789",
        engagementType: "open",
        sendingId: "s_1",
        broadcastId: null,
      },
    };
    expect(getContactIdFromEvent(event)).toBe("c_789");
  });

  test("extracts contactId from custom_event", () => {
    const event: AutomationEvent = {
      type: "custom_event",
      payload: {
        contactId: "c_abc",
        eventName: "purchase",
        properties: { amount: 99 },
      },
    };
    expect(getContactIdFromEvent(event)).toBe("c_abc");
  });
});
