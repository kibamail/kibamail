import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "@/app/(main)/api/v1/events/route";
import { prisma } from "@/lib/db";
import { queue } from "@/lib/queue";
import {
  type CreatedApiKey,
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  createTestContacts,
  post,
  type TestWorkspace,
} from "@/tests/utils";

const { mockQueuePush } = vi.hoisted(() => ({
  mockQueuePush: vi.fn().mockResolvedValue("mock-job-id"),
}));

vi.mock("@/lib/automations/dispatch", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    dispatchAutomationEvent: mockQueuePush,
  };
});

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(async () => {
  mockQueuePush.mockClear();
  await prisma.contact.deleteMany({ where: { workspaceId: testWorkspace.id } });
});

describe("POST /api/v1/events", () => {
  test("accepts valid event and returns 202", { timeout: 10000 }, async () => {
    await createTestContacts(testWorkspace.id, [{ email: "event@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const request = post("/events", {
      eventName: "purchase_completed",
      contactId,
    }, fullAccessApiKey.key);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.object).toBe("event");
    expect(data.eventName).toBe("purchase_completed");
    expect(data.contactId).toBe(contactId);
  });

  test("dispatches automation event with custom_event type", { timeout: 10000 }, async () => {
    await createTestContacts(testWorkspace.id, [{ email: "dispatch@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const request = post("/events", {
      eventName: "signup_complete",
      contactId,
      properties: { plan: "pro" },
    }, fullAccessApiKey.key);

    await POST(request);

    expect(mockQueuePush).toHaveBeenCalledWith(
      testWorkspace.id,
      "custom_event",
      expect.objectContaining({
        contactId,
        eventName: "signup_complete",
        properties: { plan: "pro" },
      }),
    );
  });

  test("validates eventName is required", { timeout: 10000 }, async () => {
    await createTestContacts(testWorkspace.id, [{ email: "no-event@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const request = post("/events", {
      contactId,
    }, fullAccessApiKey.key);

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  test("validates contactId is required", { timeout: 10000 }, async () => {
    const request = post("/events", {
      eventName: "test_event",
    }, fullAccessApiKey.key);

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  test("validates contactId exists in workspace", { timeout: 10000 }, async () => {
    const request = post("/events", {
      eventName: "test_event",
      contactId: "nonexistent-contact-id",
    }, fullAccessApiKey.key);

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test("validates eventName format", { timeout: 10000 }, async () => {
    await createTestContacts(testWorkspace.id, [{ email: "format@test.com", status: "SUBSCRIBED" }]);
    const contact = await prisma.contact.findFirst({ where: { workspaceId: testWorkspace.id } });
    const contactId = contact?.id as string;

    const request = post("/events", {
      eventName: "invalid event name with spaces",
      contactId,
    }, fullAccessApiKey.key);

    const response = await POST(request);
    expect(response.status).toBe(422);
  });

  test("returns 401 without authentication", { timeout: 10000 }, async () => {
    const request = post("/events", {
      eventName: "test",
      contactId: "some-id",
    }, "invalid-key");

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
