/**
 * Tests for centralized Redis key generation
 *
 * A regression in key formatting would cause cache misses across all
 * workspaces (silent perf regression) or — worse — cross-workspace cache
 * collisions if the workspaceId stops being interpolated correctly.
 */

import { describe, expect, test } from "vitest";
import { getSegmentContactsKey } from "@/lib/storage/redis-keys";

describe("getSegmentContactsKey", () => {
  test("interpolates the workspace id into the canonical key shape", () => {
    expect(getSegmentContactsKey("ws_123")).toBe("segments:ws_123:contacts");
  });

  test("preserves the workspaceId verbatim (no escaping/lowercasing)", () => {
    expect(getSegmentContactsKey("WS_AbCdEf")).toBe(
      "segments:WS_AbCdEf:contacts",
    );
  });

  test("produces distinct keys for distinct workspaces (no collisions)", () => {
    expect(getSegmentContactsKey("a")).not.toBe(getSegmentContactsKey("b"));
  });
});
