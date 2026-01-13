/**
 * Webhook Test Utilities
 *
 * Provides mock utilities for testing webhook dispatch calls.
 * Uses vitest mocking to intercept and verify dispatchWebhook calls.
 */

import { vi } from "vitest";
import type { dispatchWebhook as DispatchWebhookFn, dispatchWebhookBulk as DispatchWebhookBulkFn } from "@/webhooks";
import type { WebhookTopicName } from "@/webhooks/payloads";

/**
 * Create hoisted mock functions for webhooks.
 * Must be called at the top of the test file before any imports.
 *
 * @example
 * ```ts
 * const { mockDispatchWebhook, mockDispatchWebhookBulk } = vi.hoisted(() =>
 *   createWebhookMocks()
 * );
 *
 * vi.mock("@/webhooks", async (importOriginal) => {
 *   const actual = await importOriginal<typeof import("@/webhooks")>();
 *   return {
 *     ...actual,
 *     dispatchWebhook: mockDispatchWebhook,
 *     dispatchWebhookBulk: mockDispatchWebhookBulk,
 *   };
 * });
 * ```
 */
export function createWebhookMocks() {
  return {
    mockDispatchWebhook: vi.fn<typeof DispatchWebhookFn>(),
    mockDispatchWebhookBulk: vi.fn<typeof DispatchWebhookBulkFn>(),
  };
}

/**
 * Type for the mock dispatch webhook function
 */
export type MockDispatchWebhook = ReturnType<typeof createWebhookMocks>["mockDispatchWebhook"];
export type MockDispatchWebhookBulk = ReturnType<typeof createWebhookMocks>["mockDispatchWebhookBulk"];

/**
 * Helper to assert that a webhook was dispatched with specific parameters
 */
export function expectWebhookDispatched<T extends WebhookTopicName>(
  mockFn: MockDispatchWebhook,
  workspaceId: string,
  topic: T,
  payloadMatcher?: Record<string, unknown>
) {
  const calls = mockFn.mock.calls;
  const matchingCall = calls.find(
    (call) => call[0] === workspaceId && call[1] === topic
  );

  if (!matchingCall) {
    throw new Error(
      `Expected webhook "${topic}" to be dispatched for workspace ${workspaceId}, but it was not.\n` +
      `Dispatched webhooks: ${calls.map((c) => `${c[1]} (workspace: ${c[0]})`).join(", ") || "none"}`
    );
  }

  if (payloadMatcher) {
    const actualPayload = matchingCall[2] as Record<string, unknown>;
    for (const [key, value] of Object.entries(payloadMatcher)) {
      if (actualPayload[key] !== value) {
        throw new Error(
          `Expected webhook "${topic}" payload.${key} to be ${JSON.stringify(value)}, ` +
          `but got ${JSON.stringify(actualPayload[key])}`
        );
      }
    }
  }
}

/**
 * Helper to assert that a webhook was NOT dispatched
 */
export function expectWebhookNotDispatched<T extends WebhookTopicName>(
  mockFn: MockDispatchWebhook,
  topic: T
) {
  const calls = mockFn.mock.calls;
  const matchingCall = calls.find((call) => call[1] === topic);

  if (matchingCall) {
    throw new Error(
      `Expected webhook "${topic}" NOT to be dispatched, but it was called with:\n` +
      JSON.stringify(matchingCall, null, 2)
    );
  }
}

/**
 * Get all webhook calls for a specific topic
 */
export function getWebhookCalls<T extends WebhookTopicName>(
  mockFn: MockDispatchWebhook,
  topic: T
) {
  return mockFn.mock.calls.filter((call) => call[1] === topic);
}
