import createClient from "openapi-fetch";
import type { paths } from "./schema.d.ts";

interface HttpClientConfig {
  baseURL: string;
  apiKey: string;
}

/**
 * A fetch wrapper that decomposes Request objects into (url, init) format.
 *
 * openapi-fetch passes a Request object directly to fetch(). Some environments
 * (notably Next.js server components) patch globalThis.fetch in ways that break
 * when a Request object carries a body stream. Converting to the two-argument
 * form with a text body avoids the "expected non-null body source" error.
 */
async function safeFetch(input: Request | string | URL, init?: RequestInit): Promise<Response> {
  if (input instanceof Request) {
    const req = input;
    const body = req.body ? await req.text() : undefined;
    return globalThis.fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body,
      redirect: req.redirect,
      signal: req.signal,
      ...init,
    });
  }
  return globalThis.fetch(input, init);
}

export function createHttpClient(config: HttpClientConfig) {
  return createClient<paths>({
    baseUrl: config.baseURL,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    fetch: safeFetch,
  });
}
