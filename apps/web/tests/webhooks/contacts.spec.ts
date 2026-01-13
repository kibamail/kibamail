/**
 * Webhook Integration Tests - Contact Events
 *
 * Tests that webhook dispatching is correctly triggered for contact operations:
 * - contact.created
 * - contact.updated
 * - contact.deleted
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import type {
  dispatchWebhook as DispatchWebhookFn,
  dispatchWebhookBulk as DispatchWebhookBulkFn,
} from "@/webhooks";

// Hoist the mock functions so they can be used in vi.mock
const { mockDispatchWebhook, mockDispatchWebhookBulk } = vi.hoisted(() => ({
  mockDispatchWebhook: vi.fn<typeof DispatchWebhookFn>(),
  mockDispatchWebhookBulk: vi.fn<typeof DispatchWebhookBulkFn>(),
}));

vi.mock("@/webhooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/webhooks")>();
  return {
    ...actual,
    dispatchWebhook: mockDispatchWebhook,
    dispatchWebhookBulk: mockDispatchWebhookBulk,
  };
});

// Import after mocking
import { POST } from "@/app/(main)/api/v1/contacts/route";
import {
  DELETE as DELETE_BY_ID,
  PUT as PUT_BY_ID,
} from "@/app/(main)/api/v1/contacts/[contactId]/route";
import {
  cleanupWorkspace,
  createFullAccessApiKey,
  createTestWorkspace,
  fakeContact,
  fakeMinimalContact,
  post,
  del,
  put,
  type CreatedApiKey,
  type TestWorkspace,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

beforeEach(() => {
  mockDispatchWebhook.mockClear();
  mockDispatchWebhookBulk.mockClear();
});

describe("Contact Webhooks - contact.created", () => {
  test("should dispatch contact.created webhook when creating a contact via API", async () => {
    const contactData = fakeContact();
    const request = post("/contacts", contactData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "contact.created",
      expect.objectContaining({
        contactId: responseData.id,
        sourceType: "API",
        formId: null,
        importId: null,
      })
    );
  });

  test("should include sourceType API for external API contact creation", async () => {
    const contactData = fakeMinimalContact();
    const request = post("/contacts", contactData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);

    // Check the webhook call
    const webhookCall = mockDispatchWebhook.mock.calls.find(
      (call) => call[1] === "contact.created"
    );

    expect(webhookCall).toBeDefined();
    expect(webhookCall![2]).toMatchObject({
      contactId: responseData.id,
      sourceType: "API",
    });
  });
});

describe("Contact Webhooks - contact.updated", () => {
  test("should dispatch contact.updated webhook when updating a contact", async () => {
    // First create a contact
    const contactData = fakeContact();
    const createRequest = post("/contacts", contactData, fullAccessApiKey.key);
    const createResponse = await POST(createRequest);
    const { id: contactId } = await createResponse.json();

    mockDispatchWebhook.mockClear();

    // Now update the contact
    const updateData = { firstName: "UpdatedName" };
    const updateRequest = put(
      `/contacts/${contactId}`,
      updateData,
      fullAccessApiKey.key
    );

    const params = { contactId };
    const updateResponse = await PUT_BY_ID(updateRequest, {
      params: Promise.resolve(params),
    });

    expect(updateResponse.status).toBe(200);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "contact.updated",
      expect.objectContaining({
        contactId,
        changedFields: expect.arrayContaining(["firstName"]),
      })
    );
  });

  test("should include previousValues in contact.updated webhook", async () => {
    // Create a contact with a known firstName
    const contactData = { ...fakeMinimalContact(), firstName: "OriginalName" };
    const createRequest = post("/contacts", contactData, fullAccessApiKey.key);
    const createResponse = await POST(createRequest);
    const { id: contactId } = await createResponse.json();

    mockDispatchWebhook.mockClear();

    // Update the firstName
    const updateData = { firstName: "NewName" };
    const updateRequest = put(
      `/contacts/${contactId}`,
      updateData,
      fullAccessApiKey.key
    );

    const params = { contactId };
    await PUT_BY_ID(updateRequest, { params: Promise.resolve(params) });

    // Check webhook payload
    const webhookCall = mockDispatchWebhook.mock.calls.find(
      (call) => call[1] === "contact.updated"
    );

    expect(webhookCall).toBeDefined();
    expect((webhookCall![2] as { previousValues: Record<string, unknown> }).previousValues).toHaveProperty(
      "firstName",
      "OriginalName"
    );
  });

  test("should not dispatch contact.updated webhook if no fields changed", async () => {
    // Create a contact
    const contactData = fakeContact();
    const createRequest = post("/contacts", contactData, fullAccessApiKey.key);
    const createResponse = await POST(createRequest);
    const { id: contactId } = await createResponse.json();

    mockDispatchWebhook.mockClear();

    // Update with empty data (no changes)
    const updateRequest = put(
      `/contacts/${contactId}`,
      {},
      fullAccessApiKey.key
    );

    const params = { contactId };
    await PUT_BY_ID(updateRequest, { params: Promise.resolve(params) });

    // Verify no webhook was dispatched for contact.updated
    const updatedCalls = mockDispatchWebhook.mock.calls.filter(
      (call) => call[1] === "contact.updated"
    );
    expect(updatedCalls.length).toBe(0);
  });
});

describe("Contact Webhooks - contact.deleted", () => {
  test("should dispatch contact.deleted webhook when deleting a contact", async () => {
    // First create a contact
    const contactData = fakeContact();
    const createRequest = post("/contacts", contactData, fullAccessApiKey.key);
    const createResponse = await POST(createRequest);
    const { id: contactId } = await createResponse.json();

    mockDispatchWebhook.mockClear();

    // Now delete the contact
    const deleteRequest = del(`/contacts/${contactId}`, fullAccessApiKey.key);

    const params = { contactId };
    const deleteResponse = await DELETE_BY_ID(deleteRequest, {
      params: Promise.resolve(params),
    });

    expect(deleteResponse.status).toBe(200);

    // Verify webhook was dispatched
    expect(mockDispatchWebhook).toHaveBeenCalledWith(
      testWorkspace.id,
      "contact.deleted",
      expect.objectContaining({
        contactId,
      })
    );
  });
});
