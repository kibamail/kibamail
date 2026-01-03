import { logs } from "@opentelemetry/api-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

// Get OTLP endpoint from environment (set by Kubernetes)
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

// Get service name from environment
const serviceName = process.env.OTEL_SERVICE_NAME || "kibamail-workers";

// Parse resource attributes from environment
const resourceAttributesStr = process.env.OTEL_RESOURCE_ATTRIBUTES || "";
const parsedAttributes: Record<string, string> = {};
if (resourceAttributesStr) {
  resourceAttributesStr.split(",").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key && value) {
      parsedAttributes[key] = value;
    }
  });
}

// Create resource with service name and parsed attributes
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
  ...parsedAttributes,
});

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`,
});

// Configure metric exporter
const metricExporter = new OTLPMetricExporter({
  url: `${otlpEndpoint}/v1/metrics`,
});

// Configure log exporter
const logExporter = new OTLPLogExporter({
  url: `${otlpEndpoint}/v1/logs`,
});

// Set up logger provider
const loggerProvider = new LoggerProvider({ resource });
loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
logs.setGlobalLoggerProvider(loggerProvider);

// Initialize the OpenTelemetry SDK
const otelSdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 30000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation to reduce noise
      "@opentelemetry/instrumentation-fs": { enabled: false },
      // Enable BullMQ instrumentation
      "@opentelemetry/instrumentation-ioredis": { enabled: true },
    }),
  ],
});

// Start the SDK
otelSdk.start();

console.log(`[OpenTelemetry] Worker SDK initialized for ${serviceName}`);
console.log(`[OpenTelemetry] Exporting to ${otlpEndpoint}`);

// Graceful shutdown handler
export function shutdownOtel(): Promise<void> {
  return otelSdk
    .shutdown()
    .then(() => console.log("OpenTelemetry SDK shut down successfully"))
    .catch((error) =>
      console.error("Error shutting down OpenTelemetry SDK", error),
    );
}
