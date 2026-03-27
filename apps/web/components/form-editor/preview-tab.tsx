"use client";

import { Button } from "@kibamail/owly/button";
import { Text } from "@kibamail/owly/text";
import { OpenNewWindow } from "iconoir-react";
import { useState } from "react";
import type { FormContent } from "./types";

type DeviceSize = "desktop" | "tablet" | "mobile";

const DEVICE_SIZES: Record<DeviceSize, { width: string; height: string }> = {
  desktop: { width: "100%", height: "100%" },
  tablet: { width: "820px", height: "1180px" },
  mobile: { width: "412px", height: "915px" },
};

interface PreviewTabProps {
  formId: string;
  content: FormContent | null;
  isActive: boolean;
}

export function PreviewTab({ formId, content, isActive }: PreviewTabProps) {
  const [device, setDevice] = useState<DeviceSize>("desktop");
  const previewUrl = `/p/forms/${formId}/preview`;

  if (!content) {
    return (
      <div className="h-full w-full bg-kb-bg-primary flex items-center justify-center">
        <Text variant="tertiary">
          No content deployed yet. Upload your form files first.
        </Text>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-kb-bg-primary">
      <div className="h-full w-full flex justify-center overflow-auto">
        <div
          className="shrink-0 transition-[width,height] duration-300 ease-in-out"
          style={{ width: DEVICE_SIZES[device].width, height: DEVICE_SIZES[device].height }}
        >
          {isActive && (
            <iframe
              src={previewUrl}
              className="h-full w-full border-0"
              title="Form Preview"
            />
          )}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-kb-border-tertiary bg-kb-bg-primary p-1 shadow-lg">
        <Button
          size="sm"
          className="rounded-full!"
          variant={device === "desktop" ? "secondary" : "tertiary"}
          onClick={() => setDevice("desktop")}
        >
          Desktop
        </Button>
        <Button
          size="sm"
          className="rounded-full!"
          variant={device === "tablet" ? "secondary" : "tertiary"}
          onClick={() => setDevice("tablet")}
        >
          Tablet
        </Button>
        <Button
          size="sm"
          className="rounded-full!"
          variant={device === "mobile" ? "secondary" : "tertiary"}
          onClick={() => setDevice("mobile")}
        >
          Mobile
        </Button>

        <div className="w-px h-5 bg-kb-border-tertiary" />

        <Button
          size="sm"
          className="rounded-full!"
          variant="tertiary"
          onClick={() => window.open(previewUrl, "_blank")}
        >
          <OpenNewWindow className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
