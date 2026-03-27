/**
 * Automation Event Type System
 *
 * Fully independent from webhook topics. Defines the events that can trigger
 * automations and their typed payloads.
 */

/**
 * Automation-specific event types.
 */
export type AutomationEventType =
  | "contact.subscribed"
  | "contact.property_updated"
  | "form.submitted"
  | "email.engagement"
  | "segment.entered"
  | "segment.exited"
  | "custom_event"
  | "api_trigger";

/**
 * Typed payloads for each automation event.
 */
export interface AutomationEventPayloads {
  "contact.subscribed": {
    contactId: string;
    topicId?: string;
  };
  "contact.property_updated": {
    contactId: string;
    changedFields: string[];
    previousValues: Record<string, unknown>;
  };
  "form.submitted": {
    contactId: string;
    formId: string;
    submissionId: string;
  };
  "email.engagement": {
    contactId: string;
    engagementType: "open" | "click" | "bounce" | "spam";
    sendingId: string;
    broadcastId: string | null;
  };
  "segment.entered": {
    contactId: string;
    segmentId: string;
  };
  "segment.exited": {
    contactId: string;
    segmentId: string;
  };
  "custom_event": {
    contactId: string;
    eventName: string;
    properties?: Record<string, unknown>;
  };
  "api_trigger": {
    contactId: string;
    automationId: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * A typed automation event (discriminated union).
 */
export type AutomationEvent = {
  [K in AutomationEventType]: {
    type: K;
    payload: AutomationEventPayloads[K];
  };
}[AutomationEventType];

/**
 * Maps AutomationEventType to Prisma AutomationTrigger enum values.
 */
export const EVENT_TO_TRIGGER_MAP: Record<AutomationEventType, string> = {
  "contact.subscribed": "CONTACT_SUBSCRIBED",
  "contact.property_updated": "PROPERTY_UPDATED",
  "form.submitted": "FORM_SUBMITTED",
  "email.engagement": "EMAIL_ENGAGEMENT",
  "segment.entered": "SEGMENT_ENTRY",
  "segment.exited": "SEGMENT_EXIT",
  "custom_event": "EVENT",
  "api_trigger": "API",
};

/**
 * Extracts the contactId from any automation event payload.
 */
export function getContactIdFromEvent(event: AutomationEvent): string {
  return event.payload.contactId;
}
