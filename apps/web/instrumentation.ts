import { env } from "./env/schema";

export async function register() {
  // Skip instrumentation in development
  if (env.NODE_ENV === "development") {
    return;
  }

  // Only run on server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { OTLPMetricExporter } = await import(
      "@opentelemetry/exporter-metrics-otlp-http"
    );
    const { OTLPLogExporter } = await import(
      "@opentelemetry/exporter-logs-otlp-http"
    );
    const { PeriodicExportingMetricReader } = await import(
      "@opentelemetry/sdk-metrics"
    );
    const { BatchLogRecordProcessor } = await import(
      "@opentelemetry/sdk-logs"
    );
    const { resourceFromAttributes } = await import("@opentelemetry/resources");
    const { ATTR_SERVICE_NAME } = await import(
      "@opentelemetry/semantic-conventions"
    );
    const { logs } = await import("@opentelemetry/api-logs");
    const { LoggerProvider } = await import("@opentelemetry/sdk-logs");

    // Get OTLP endpoint from environment (set by Kubernetes)
    const otlpEndpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

    // Get service name from environment
    const serviceName =
      process.env.OTEL_SERVICE_NAME || "kibamail-control-plane";

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
    const sdk = new NodeSDK({
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
          // Configure HTTP instrumentation
          "@opentelemetry/instrumentation-http": {
            ignoreIncomingRequestHook: (req) => {
              // Ignore health check endpoints
              return req.url === "/healthz" || req.url === "/api/health";
            },
          },
        }),
      ],
    });

    // Start the SDK
    sdk.start();

    // Graceful shutdown
    process.on("SIGTERM", () => {
      sdk
        .shutdown()
        .then(() => console.log("OpenTelemetry SDK shut down successfully"))
        .catch((error) => console.error("Error shutting down OpenTelemetry SDK", error))
        .finally(() => process.exit(0));
    });

    console.log(`[OpenTelemetry] SDK initialized for ${serviceName}`);
    console.log(`[OpenTelemetry] Exporting to ${otlpEndpoint}`);
  }
}
