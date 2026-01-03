/**
 * Test API Client
 *
 * Fluent API client for making HTTP requests in tests.
 * Provides a clean, chainable interface for testing API endpoints.
 */

import { NextRequest } from "next/server";

interface RequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

/**
 * Fluent API request builder for tests
 */
export class TestApiRequest {
  private path: string;
  private options: RequestOptions;

  constructor(path: string) {
    this.path = path;
    this.options = {
      method: "GET",
      headers: {},
    };
  }

  /**
   * Set HTTP method
   */
  method(method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"): this {
    this.options.method = method;
    return this;
  }

  /**
   * Set Authorization header with Bearer token
   */
  auth(token: string): this {
    this.options.headers.Authorization = `Bearer ${token}`;
    return this;
  }

  /**
   * Set request body (automatically sets Content-Type to application/json)
   */
  body(data: unknown): this {
    this.options.body = data;
    this.options.headers["Content-Type"] = "application/json";
    return this;
  }

  /**
   * Add custom header
   */
  header(key: string, value: string): this {
    this.options.headers[key] = value;
    return this;
  }

  /**
   * Build NextRequest object for testing
   */
  build(): NextRequest {
    const url = `http://localhost:3000/api/v1${this.path}`;
    const headers = new Headers(this.options.headers);

    const init = {
      method: this.options.method,
      headers,
      ...(this.options.body ? { body: JSON.stringify(this.options.body) } : {}),
    };

    return new NextRequest(url, init);
  }
}

/**
 * Create a new API request builder
 *
 * @param path - API path (e.g., '/contacts', '/contacts/123')
 * @returns Fluent request builder
 *
 * @example
 * ```ts
 * const request = apiRequest('/contacts')
 *   .method('POST')
 *   .auth(apiKey)
 *   .body({ email: 'test@example.com' })
 *   .build();
 *
 * const response = await POST(request);
 * ```
 */
export function apiRequest(path: string): TestApiRequest {
  return new TestApiRequest(path);
}

/**
 * Quick helper for GET requests
 */
export function get(path: string, apiKey?: string): NextRequest {
  const builder = apiRequest(path).method("GET");
  if (apiKey) builder.auth(apiKey);
  return builder.build();
}

/**
 * Quick helper for POST requests
 */
export function post(
  path: string,
  body: unknown,
  apiKey?: string,
): NextRequest {
  const builder = apiRequest(path).method("POST").body(body);
  if (apiKey) builder.auth(apiKey);
  return builder.build();
}

/**
 * Quick helper for PUT requests
 */
export function put(path: string, body: unknown, apiKey?: string): NextRequest {
  const builder = apiRequest(path).method("PUT").body(body);
  if (apiKey) builder.auth(apiKey);
  return builder.build();
}

/**
 * Quick helper for DELETE requests
 */
export function del(path: string, apiKey?: string): NextRequest {
  const builder = apiRequest(path).method("DELETE");
  if (apiKey) builder.auth(apiKey);
  return builder.build();
}
