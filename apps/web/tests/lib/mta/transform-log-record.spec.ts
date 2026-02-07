/**
 * Unit tests for transformKumoLogRecord
 *
 * Verifies the TS handler correctly extracts metadata from KumoMTA webhook payloads.
 * Tests all extraction paths: meta fields, header fallbacks, priority rules, defaults.
 */

import { describe, expect, test } from "vitest";
import {
  transformKumoLogRecord,
  type KumoLogRecord,
} from "@/app/(main)/api/internal/v1/mta-events/handler";

describe("transformKumoLogRecord", () => {
  const baseRecord: KumoLogRecord = {
    type: "Delivery",
    id: "spool-id-123",
    recipient: "user@example.com",
    response: {
      code: 250,
      content: "OK",
    },
    timestamp: 1700000000,
    nodeid: "node-1",
    queue: "example.com",
    site: "mx.example.com->a]",
    size: 320,
    num_attempts: 1,
    peer_address: { name: "mx.example.com", addr: "93.184.216.34" },
    egress_pool: "marketing",
    egress_source: "source-1",
    delivery_protocol: "ESMTP",
    reception_protocol: "",
  };

  test("should extract workspace_id from meta.x_kibamail_workspace_id", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        x_kibamail_workspace_id: "ws-from-meta",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.tenant_id).toBe("ws-from-meta");
  });

  test("should extract email_send_id from meta.x_kibamail_email_send_id", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        x_kibamail_email_send_id: "send-id-from-meta",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.sending_id).toBe("send-id-from-meta");
  });

  test("should extract workspace_id from headers fallback", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      headers: {
        "X-Kibamail-Workspace-Id": "ws-from-headers",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.tenant_id).toBe("ws-from-headers");
  });

  test("should extract email_send_id from headers fallback", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      headers: {
        "X-Kibamail-Email-Send-Id": "send-id-from-headers",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.sending_id).toBe("send-id-from-headers");
  });

  test("should prioritize headers over meta for workspace_id", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      headers: {
        "X-Kibamail-Workspace-Id": "ws-from-headers",
      },
      meta: {
        x_kibamail_workspace_id: "ws-from-meta",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.tenant_id).toBe("ws-from-headers");
  });

  test("should prioritize headers over meta for email_send_id", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      headers: {
        "X-Kibamail-Email-Send-Id": "send-id-from-headers",
      },
      meta: {
        x_kibamail_email_send_id: "send-id-from-meta",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.sending_id).toBe("send-id-from-headers");
  });

  test("should fall back to empty string for missing workspace_id", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.tenant_id).toBe("");
  });

  test("should fall back to spool id for missing email_send_id", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.sending_id).toBe("spool-id-123");
  });

  test("should extract broadcast_id from meta", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        x_kibamail_broadcast_id: "broadcast-123",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.broadcast_id).toBe("broadcast-123");
  });

  test("should extract contact_id from meta", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        x_kibamail_contact_id: "contact-456",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.contact_id).toBe("contact-456");
  });

  test("should extract broadcast_id from headers", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      headers: {
        "X-Kibamail-Broadcast-Id": "broadcast-from-headers",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.broadcast_id).toBe("broadcast-from-headers");
  });

  test("should extract contact_id from headers", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      headers: {
        "X-Kibamail-Contact-Id": "contact-from-headers",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.contact_id).toBe("contact-from-headers");
  });

  test("should fall back to kibamail_workspace_id (without x_ prefix)", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        kibamail_workspace_id: "ws-no-prefix",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.tenant_id).toBe("ws-no-prefix");
  });

  test("should fall back to kibamail_email_send_id (without x_ prefix)", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        kibamail_email_send_id: "send-no-prefix",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.sending_id).toBe("send-no-prefix");
  });

  test("should fall back to meta.tenant for workspace_id", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        tenant: "ws-from-tenant",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.tenant_id).toBe("ws-from-tenant");
  });

  test("should handle array recipient by using first element", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      recipient: ["first@example.com", "second@example.com"],
    };

    const result = transformKumoLogRecord(record);
    expect(result.recipient).toBe("first@example.com");
  });

  test("should handle string recipient", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.recipient).toBe("user@example.com");
  });

  test("should map event type through", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.type).toBe("Delivery");
  });

  test("should extract response fields", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      response: {
        code: 550,
        content: "User unknown",
        command: "RCPT TO",
        enhanced_code: { class: 5, subject: 1, detail: 1 },
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.response.code).toBe(550);
    expect(result.response.content).toBe("User unknown");
    expect(result.response.command).toBe("RCPT TO");
    expect(result.response.enhanced_code).toEqual({ class: 5, subject: 1, detail: 1 });
  });

  test("should default response fields when missing", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      response: undefined,
    };

    const result = transformKumoLogRecord(record);
    expect(result.response.code).toBe(0);
    expect(result.response.content).toBe("");
    expect(result.response.command).toBeNull();
    expect(result.response.enhanced_code).toBeNull();
  });

  test("should extract bounce_classification", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      type: "Bounce",
      bounce_classification: "InvalidRecipient",
    };

    const result = transformKumoLogRecord(record);
    expect(result.bounce_classification).toBe("InvalidRecipient");
  });

  test("should default bounce_classification to empty string", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.bounce_classification).toBe("");
  });

  test("should use event_time when available", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      event_time: "2024-01-15T10:30:00Z",
    };

    const result = transformKumoLogRecord(record);
    expect(result.timestamp).toBe("2024-01-15T10:30:00Z");
  });

  test("should convert unix timestamp to ISO string when event_time missing", () => {
    const result = transformKumoLogRecord(baseRecord);
    // timestamp: 1700000000 -> 2023-11-14T22:13:20.000Z
    expect(result.timestamp).toBe(new Date(1700000000 * 1000).toISOString());
  });

  test("should extract node_id", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.node_id).toBe("node-1");
  });

  test("should default node_id to empty string when missing", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      nodeid: undefined,
    };

    const result = transformKumoLogRecord(record);
    expect(result.node_id).toBe("");
  });

  test("should handle complete record with all metadata fields", () => {
    const record: KumoLogRecord = {
      type: "Delivery",
      id: "spool-abc",
      recipient: "recipient@test.com",
      meta: {
        x_kibamail_workspace_id: "ws-123",
        x_kibamail_email_send_id: "send-456",
        x_kibamail_broadcast_id: "bc-789",
        x_kibamail_contact_id: "ct-012",
      },
      response: {
        code: 250,
        content: "OK",
        command: "DATA",
        enhanced_code: { class: 2, subject: 0, detail: 0 },
      },
      bounce_classification: "",
      event_time: "2024-06-01T12:00:00Z",
      nodeid: "mta-node-1",
    };

    const result = transformKumoLogRecord(record);
    expect(result.type).toBe("Delivery");
    expect(result.sending_id).toBe("send-456");
    expect(result.recipient).toBe("recipient@test.com");
    expect(result.tenant_id).toBe("ws-123");
    expect(result.broadcast_id).toBe("bc-789");
    expect(result.contact_id).toBe("ct-012");
    expect(result.response.code).toBe(250);
    expect(result.timestamp).toBe("2024-06-01T12:00:00Z");
    expect(result.node_id).toBe("mta-node-1");
  });

  test("should handle OOB event type", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      type: "OOB",
      bounce_classification: "UndeterminedBounce",
      meta: {
        x_kibamail_workspace_id: "ws-oob",
        x_kibamail_email_send_id: "send-oob",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.type).toBe("OOB");
    expect(result.tenant_id).toBe("ws-oob");
    expect(result.sending_id).toBe("send-oob");
    expect(result.bounce_classification).toBe("UndeterminedBounce");
  });

  // ================================================================
  // KumoMTA standard field extraction
  // ================================================================

  test("should extract queue field", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.queue).toBe("example.com");
  });

  test("should extract site_name field", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.site_name).toBe("mx.example.com->a]");
  });

  test("should extract size field", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.size).toBe(320);
  });

  test("should extract num_attempts field", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.num_attempts).toBe(1);
  });

  test("should extract peer_address fields", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.peer_address_name).toBe("mx.example.com");
    expect(result.peer_address_addr).toBe("93.184.216.34");
  });

  test("should extract egress_pool and egress_source", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.egress_pool).toBe("marketing");
    expect(result.egress_source).toBe("source-1");
  });

  test("should extract delivery_protocol and reception_protocol", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.delivery_protocol).toBe("ESMTP");
    expect(result.reception_protocol).toBe("");
  });

  test("should default KumoMTA standard fields when missing", () => {
    const record: KumoLogRecord = {
      type: "Delivery",
      id: "spool-id-123",
      recipient: "user@example.com",
      timestamp: 1700000000,
    };

    const result = transformKumoLogRecord(record);
    expect(result.queue).toBe("");
    expect(result.site_name).toBe("");
    expect(result.size).toBeNull();
    expect(result.num_attempts).toBeNull();
    expect(result.peer_address_name).toBe("");
    expect(result.peer_address_addr).toBe("");
    expect(result.egress_pool).toBe("");
    expect(result.egress_source).toBe("");
    expect(result.delivery_protocol).toBe("");
    expect(result.reception_protocol).toBe("");
  });

  test("should handle size of 0", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      size: 0,
    };

    const result = transformKumoLogRecord(record);
    expect(result.size).toBe(0);
  });

  test("should handle num_attempts of 0", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      num_attempts: 0,
    };

    const result = transformKumoLogRecord(record);
    expect(result.num_attempts).toBe(0);
  });

  // ================================================================
  // Application metadata extraction
  // ================================================================

  test("should extract sending_domain_id from headers", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      headers: {
        "X-Kibamail-Sending-Domain-Id": "sd-from-headers",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.sending_domain_id).toBe("sd-from-headers");
  });

  test("should extract sending_domain_id from meta", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        x_kibamail_sending_domain_id: "sd-from-meta",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.sending_domain_id).toBe("sd-from-meta");
  });

  test("should extract sender_identity_id from headers", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      headers: {
        "X-Kibamail-Sender-Identity-Id": "si-from-headers",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.sender_identity_id).toBe("si-from-headers");
  });

  test("should extract sender_identity_id from meta", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        x_kibamail_sender_identity_id: "si-from-meta",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.sender_identity_id).toBe("si-from-meta");
  });

  test("should parse click_tracking_enabled as true from '1'", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        x_kibamail_click_tracking: "1",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.click_tracking_enabled).toBe(true);
  });

  test("should parse open_tracking_enabled as false from '0'", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      meta: {
        x_kibamail_open_tracking: "0",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.open_tracking_enabled).toBe(false);
  });

  test("should parse tracking from headers as 'true'/'false'", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      headers: {
        "X-Kibamail-Click-Tracking": "true",
        "X-Kibamail-Open-Tracking": "false",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.click_tracking_enabled).toBe(true);
    expect(result.open_tracking_enabled).toBe(false);
  });

  test("should return null for missing tracking metadata", () => {
    const result = transformKumoLogRecord(baseRecord);
    expect(result.click_tracking_enabled).toBeNull();
    expect(result.open_tracking_enabled).toBeNull();
  });

  test("should default sending_domain_id and sender_identity_id to empty string", () => {
    const record: KumoLogRecord = {
      type: "Delivery",
      id: "spool-id-123",
      recipient: "user@example.com",
      timestamp: 1700000000,
    };

    const result = transformKumoLogRecord(record);
    expect(result.sending_domain_id).toBe("");
    expect(result.sender_identity_id).toBe("");
  });

  test("should prioritize headers over meta for sending_domain_id", () => {
    const record: KumoLogRecord = {
      ...baseRecord,
      headers: {
        "X-Kibamail-Sending-Domain-Id": "sd-from-headers",
      },
      meta: {
        x_kibamail_sending_domain_id: "sd-from-meta",
      },
    };

    const result = transformKumoLogRecord(record);
    expect(result.sending_domain_id).toBe("sd-from-headers");
  });

  test("should extract all new fields from a complete record", () => {
    const record: KumoLogRecord = {
      type: "Delivery",
      id: "spool-abc",
      recipient: "recipient@test.com",
      queue: "test.com",
      site: "mx.test.com->a]",
      size: 512,
      num_attempts: 2,
      peer_address: { name: "mx.test.com", addr: "10.0.0.1" },
      egress_pool: "transactional",
      egress_source: "src-2",
      delivery_protocol: "ESMTP",
      reception_protocol: "",
      meta: {
        x_kibamail_workspace_id: "ws-123",
        x_kibamail_email_send_id: "send-456",
        x_kibamail_sending_domain_id: "sd-789",
        x_kibamail_sender_identity_id: "si-012",
        x_kibamail_click_tracking: "1",
        x_kibamail_open_tracking: "0",
      },
      response: {
        code: 250,
        content: "OK",
      },
      event_time: "2024-06-01T12:00:00Z",
      nodeid: "mta-node-1",
    };

    const result = transformKumoLogRecord(record);
    expect(result.queue).toBe("test.com");
    expect(result.site_name).toBe("mx.test.com->a]");
    expect(result.size).toBe(512);
    expect(result.num_attempts).toBe(2);
    expect(result.peer_address_name).toBe("mx.test.com");
    expect(result.peer_address_addr).toBe("10.0.0.1");
    expect(result.egress_pool).toBe("transactional");
    expect(result.egress_source).toBe("src-2");
    expect(result.delivery_protocol).toBe("ESMTP");
    expect(result.reception_protocol).toBe("");
    expect(result.sending_domain_id).toBe("sd-789");
    expect(result.sender_identity_id).toBe("si-012");
    expect(result.click_tracking_enabled).toBe(true);
    expect(result.open_tracking_enabled).toBe(false);
  });
});
