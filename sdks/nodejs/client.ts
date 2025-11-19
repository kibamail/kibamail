import createClient from "openapi-fetch";
import type { paths } from "./schema.d.ts";

interface HttpClientConfig {
  baseURL: string;
  apiKey: string;
}

export function createHttpClient(config: HttpClientConfig) {
  return createClient<paths>({
    baseUrl: config.baseURL,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });
}
