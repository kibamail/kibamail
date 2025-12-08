"use client";

import * as Tooltip from "@kibamail/owly/tooltip";
import { AlignVerticalCenters } from "iconoir-react";
import { useFlowStore } from "@/app/(dashboard)/(flows)/flows/[id]/state/flow-store";

export function FlowToolbar() {
  const autoLayout = useFlowStore((state) => state.autoLayout);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-kb-border-tertiary bg-kb-bg-primary"
        style={{
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={() => autoLayout("TB")}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-kb-content-secondary hover:bg-kb-bg-hover hover:text-kb-content-primary transition-colors cursor-pointer"
              >
                <AlignVerticalCenters className="w-4 h-4" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side="top" sideOffset={8}>
              Auto-arrange layout
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
  );
}
