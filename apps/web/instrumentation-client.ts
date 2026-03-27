import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY as string;

if (posthogKey) {
  posthog.init(posthogKey, {
    defaults: "2025-11-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
