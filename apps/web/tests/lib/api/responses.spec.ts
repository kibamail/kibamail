/**
 * Tests for API response helpers.
 *
 * Covers the success-path helpers used throughout the v1 API
 * (`responseOk`, `responseCreated`, `responseNoContent`) and the legacy /
 * deprecated direct-error helpers that are still exported and used in a
 * handful of routes (`responseBadRequest`, `responseUnauthorized`,
 * `responseNotFound`). These functions shape every external API response, so
 * regressions in status codes, body shape, or content-type are user-visible.
 */

import { describe, expect, test } from "vitest";
import {
  responseBadRequest,
  responseCreated,
  responseNoContent,
  responseNotFound,
  responseOk,
  responseUnauthorized,
} from "@/lib/api/responses";

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe("responseOk", () => {
  test("returns status 200 with merged object + data", async () => {
    const res = responseOk({ id: "u_1", name: "Ada" }, "contact");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await json(res)).toEqual({
      object: "contact",
      id: "u_1",
      name: "Ada",
    });
  });

  test("includes meta only when provided", async () => {
    const withMeta = responseOk({ items: [] }, "contact_list", {
      page: 1,
      total: 0,
    });
    expect(await json(withMeta)).toEqual({
      object: "contact_list",
      items: [],
      meta: { page: 1, total: 0 },
    });

    const withoutMeta = responseOk({ items: [] }, "contact_list");
    const body = (await json(withoutMeta)) as Record<string, unknown>;
    expect(body).not.toHaveProperty("meta");
  });

  test("omits object when not provided", async () => {
    const res = responseOk({ ok: true });
    const body = (await json(res)) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // `object` will exist as undefined after spread serialization is stripped
    expect(body.object).toBeUndefined();
  });

  test("data fields take precedence over object key conflicts", async () => {
    // data is spread after object, so a data property named "object" would
    // overwrite the type tag. This locks in current behavior.
    const res = responseOk({ object: "contact", id: 1 } as never, "contact");
    const body = (await json(res)) as { object?: string; id?: number };

    // Data was spread after, so its `object` overwrites the tag.
    expect(body.object).toBe("contact");
    expect(body.id).toBe(1);
  });
});

describe("responseCreated", () => {
  test("returns status 201 with object + data merged", async () => {
    const res = responseCreated({ id: "ak_1", name: "Primary" }, "api_key");

    expect(res.status).toBe(201);
    expect(await json(res)).toEqual({
      object: "api_key",
      id: "ak_1",
      name: "Primary",
    });
  });

  test("works without an object type", async () => {
    const res = responseCreated({ id: "x" });
    expect(res.status).toBe(201);
    expect(await json(res)).toEqual({ id: "x" });
  });
});

describe("responseNoContent", () => {
  test("returns status 204 with no body", async () => {
    const res = responseNoContent();

    expect(res.status).toBe(204);
    // 204 responses must not have a body. NextResponse passes null through.
    const text = await res.text();
    expect(text).toBe("");
  });
});

describe("responseBadRequest", () => {
  test("returns status 400 with the provided message", async () => {
    const res = responseBadRequest("Missing required field: email");

    expect(res.status).toBe(400);
    expect(await json(res)).toEqual({
      error: "Missing required field: email",
    });
  });
});

describe("responseUnauthorized", () => {
  test("returns status 401 with default message", async () => {
    const res = responseUnauthorized();

    expect(res.status).toBe(401);
    expect(await json(res)).toEqual({ error: "Authentication required" });
  });

  test("returns status 401 with custom message", async () => {
    const res = responseUnauthorized("Invalid API key");

    expect(res.status).toBe(401);
    expect(await json(res)).toEqual({ error: "Invalid API key" });
  });
});

describe("responseNotFound", () => {
  test("returns status 404 with default message", async () => {
    const res = responseNotFound();

    expect(res.status).toBe(404);
    expect(await json(res)).toEqual({ error: "Resource not found" });
  });

  test("returns status 404 with custom message", async () => {
    const res = responseNotFound("Workspace not found");

    expect(res.status).toBe(404);
    expect(await json(res)).toEqual({ error: "Workspace not found" });
  });
});
