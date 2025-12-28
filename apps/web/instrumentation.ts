import { env } from "./env/schema";

export async function register() {
  if (env.NODE_ENV === "development") {
    return;
  }

  const { init } = await import("@hyperdx/node-opentelemetry");

  init({
    apiKey: env.OTEL_INGESTION_API_KEY,
    service: "control-plane.kibamail.com",
    additionalInstrumentations: [],
  });
}
