"use client";

import { useState } from "react";
import { Computer, SmartphoneDevice, Laptop, Refresh } from "iconoir-react";
import { useFormBuilder } from "./form-builder-context";
import { cn } from "@/lib/utils";

type DeviceMode = "desktop" | "tablet" | "mobile";

const DEVICE_SIZES: Record<DeviceMode, { width: string }> = {
  desktop: { width: "100%" },
  tablet: { width: "768px" },
  mobile: { width: "375px" },
};

export function FormLivePreview() {
  const { formId } = useFormBuilder();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [refreshKey, setRefreshKey] = useState(Date.now());

  return (
    <div className="h-full w-full bg-kb-bg-layout flex flex-col">
      {/* Toolbar */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-kb-border-tertiary bg-kb-surface-secondary shrink-0">
        <span className="text-sm font-medium text-kb-content-primary">
          Preview
        </span>

        <div className="flex items-center gap-2">
          {/* Device mode toggles */}
          <div className="flex items-center gap-1 bg-kb-surface-primary border border-kb-border-tertiary rounded-lg p-1">
            <button
              type="button"
              onClick={() => setDeviceMode("desktop")}
              className={cn(
                "p-2 rounded-md transition-colors",
                deviceMode === "desktop"
                  ? "bg-kb-primary text-white"
                  : "text-kb-content-tertiary hover:text-kb-content-primary hover:bg-kb-surface-tertiary"
              )}
              title="Desktop"
            >
              <Computer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("tablet")}
              className={cn(
                "p-2 rounded-md transition-colors",
                deviceMode === "tablet"
                  ? "bg-kb-primary text-white"
                  : "text-kb-content-tertiary hover:text-kb-content-primary hover:bg-kb-surface-tertiary"
              )}
              title="Tablet"
            >
              <Laptop className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("mobile")}
              className={cn(
                "p-2 rounded-md transition-colors",
                deviceMode === "mobile"
                  ? "bg-kb-primary text-white"
                  : "text-kb-content-tertiary hover:text-kb-content-primary hover:bg-kb-surface-tertiary"
              )}
              title="Mobile"
            >
              <SmartphoneDevice className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey(Date.now())}
            className="p-2 rounded-md text-kb-content-tertiary hover:text-kb-content-primary hover:bg-kb-surface-tertiary transition-colors"
            title="Refresh"
          >
            <Refresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
        <div
          className={cn(
            "bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300",
            deviceMode !== "desktop" && "border border-kb-border-secondary"
          )}
          style={{
            width: DEVICE_SIZES[deviceMode].width,
            maxWidth: "100%",
            height: deviceMode === "desktop" ? "100%" : "600px",
          }}
        >
          <iframe
            key={refreshKey}
            src={`/p/forms/${formId}?t=${refreshKey}`}
            className="w-full h-full border-0"
            title="Form Preview"
          />
        </div>
      </div>
    </div>
  );
}
