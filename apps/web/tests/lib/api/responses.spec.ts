import { describe, expect, test } from "vitest";
import {
  responseBadRequest,
  responseCreated,
  responseNoContent,
  responseNotFound,
  responseOk,
  responseUnauthorized,
} from "@/lib/api/responses";

describe("responseOk", () => {
  test("returns status 200", () => {
    const res = responseOk({ id: "1" });
    expect(res.status).toBe(200);
  });

  test("spreads data properties at the top level of the body", async () => {
    const res = responseOk({ id: "1", name: "foo" });
    const body = await res.json();
    expect(body.id).toBe("1");
    expect(body.name).toBe("foo");
  });

  test("includes object discriminator when provided", async () => {
    const res = responseOk({ id: "1" }, "contact");
    const body = await res.json();
    expect(body.object).toBe("contact");
  });

  test("omits meta when meta is not provided", async () => {
    const res = responseOk({ id: "1" }, "contact");
    const body = await res.json();
    expect(body.meta).toBeUndefined();
  });

  test("includes meta when provided", async () => {
    const meta = { page: 1, total: 100 };
    const res = responseOk({ id: "1" }, "contact_list", meta);
    const body = await res.json();
    expect(body.meta).toEqual(meta);
  });

  test("handles undefined data without crashing", async () => {
    const res = responseOk(undefined, "contact");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.object).toBe("contact");
  });
});

describe("responseCreated", () => {
  test("returns status 201", () => {
    const res = responseCreated({ id: "1" });
    expect(res.status).toBe(201);
  });

  test("spreads data properties at the top level", async () => {
    const res = responseCreated({ id: "abc", name: "Acme" }, "api_key");
    const body = await res.json();
    expect(body.id).toBe("abc");
    expect(body.name).toBe("Acme");
    expect(body.object).toBe("api_key");
  });
});

describe("responseNoContent", () => {
  test("returns status 204 with empty body", async () => {
    const res = responseNoContent();
    expect(res.status).toBe(204);
    const text = await res.text();
    expect(text).toBe("");
  });
});

describe("responseBadRequest", () => {
  test("returns status 400 with error message", async () => {
    const res = responseBadRequest("Missing field: email");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing field: email");
  });
});

describe("responseUnauthorized", () => {
  test("returns status 401 with default message", async () => {
    const res = responseUnauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Authentication required");
  });

  test("returns status 401 with custom message", async () => {
    const res = responseUnauthorized("Invalid API key");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid API key");
  });
});

describe("responseNotFound", () => {
  test("returns status 404 with default message", async () => {
    const res = responseNotFound();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Resource not found");
  });

  test("returns status 404 with custom message", async () => {
    const res = responseNotFound("Workspace not found");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Workspace not found");
  });
});

describe("Content-Type headers", () => {
  test("JSON responses include application/json content-type", () => {
    const res = responseOk({ id: "1" });
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });
});
