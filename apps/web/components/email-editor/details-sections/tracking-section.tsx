"use client";

import { useId } from "react";
import * as Alert from "@kibamail/owly/alert";
import { Checkbox } from "@kibamail/owly/checkbox";
import { Text } from "@kibamail/owly/text";
import { WarningTriangle } from "iconoir-react";
import { SectionHeader } from "./shared";
import type { EmailDetails } from "../types";

interface TrackingSectionProps {
  trackClicks?: boolean;
  trackOpens?: boolean;
  onChange: (updates: Partial<EmailDetails>) => void;
  readonly?: boolean;
}

export function TrackingSection({
  trackClicks,
  trackOpens,
  onChange,
  readonly = false,
}: TrackingSectionProps) {
  const clickTrackingId = useId();
  const openTrackingId = useId();

  return (
    <section>
      <SectionHeader
        title="Tracking"
        description="Choose what engagement metrics to track for this email."
      />

      <div className="flex flex-col gap-4">
        <label
          htmlFor={clickTrackingId}
          className={`flex items-start justify-between gap-3 border border-kb-border-tertiary p-3 rounded-lg transition-colors ${readonly ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-kb-border-secondary"}`}
        >
          <div className="flex flex-col gap-1">
            <Text className="text-kb-content-primary font-medium">
              Click tracking
            </Text>
            <Text size="sm" className="text-kb-content-tertiary">
              Track when recipients click links in your email
            </Text>
          </div>
          <Checkbox
            id={clickTrackingId}
            checked={trackClicks ?? false}
            onCheckedChange={(checked) =>
              onChange({ trackClicks: checked === true })
            }
            variant="circle"
            disabled={readonly}
          />
        </label>

        <label
          htmlFor={openTrackingId}
          className={`flex items-start justify-between gap-3 border border-kb-border-tertiary p-3 rounded-lg transition-colors ${readonly ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-kb-border-secondary"}`}
        >
          <div className="flex flex-col gap-1">
            <Text className="text-kb-content-primary font-medium">
              Open tracking
            </Text>
            <Text size="sm" className="text-kb-content-tertiary">
              Track when recipients open your email
            </Text>
          </div>
          <Checkbox
            id={openTrackingId}
            checked={trackOpens ?? false}
            onCheckedChange={(checked) =>
              onChange({ trackOpens: checked === true })
            }
            variant="circle"
            disabled={readonly}
          />
        </label>

        <Alert.Root variant="warning" className="gap-4!">
          <Alert.Icon>
            <WarningTriangle />
          </Alert.Icon>
          <Alert.Title>
            Open tracking uses a tracking pixel which may affect deliverability
            with some email providers.
          </Alert.Title>
        </Alert.Root>
      </div>
    </section>
  );
}
