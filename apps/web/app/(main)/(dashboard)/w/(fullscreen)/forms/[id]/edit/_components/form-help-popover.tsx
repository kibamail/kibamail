"use client";

import { Button } from "@kibamail/owly/button";
import * as Popover from "@kibamail/owly/popover";
import { HelpCircle, Play } from "iconoir-react";
import { useState } from "react";

const FORM_HELP_SEEN_KEY = "kibamail_form_help_seen";

export function FormHelpPopover() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const hasSeenHelp = localStorage.getItem(FORM_HELP_SEEN_KEY);
    return !hasSeenHelp;
  });

  function onDismiss() {
    setOpen(false);
    localStorage.setItem(FORM_HELP_SEEN_KEY, "true");
  }

  function onOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      localStorage.setItem(FORM_HELP_SEEN_KEY, "true");
    }
  }

  return (
    <>
      {open && (
        <button
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={onDismiss}
          type="button"
        />
      )}

      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger asChild>
          <Button variant="tertiary" size="sm">
            <HelpCircle className="w-4 h-4" />
          </Button>
        </Popover.Trigger>
        <Popover.Content
          align="center"
          className="w-96 max-w-[90vw] bg-kb-surface-primary border border-kb-stroke-secondary rounded-lg shadow-xl p-6 z-50 relative p-6!"
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-kb-content-primary mb-2">
                Form Builder
              </h3>
              <p className="text-sm text-kb-content-secondary leading-relaxed">
                Create beautiful forms with our visual drag-and-drop builder.
                Add fields, customize styling, and set up validation - all
                without writing code.
              </p>
            </div>

            <div className="border-t border-kb-stroke-tertiary pt-4">
              <h4 className="text-sm font-medium text-kb-content-primary mb-2">
                Getting Started
              </h4>
              <ul className="text-sm text-kb-content-secondary space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-kb-content-brand font-medium">1.</span>
                  Drag fields from the sidebar onto your form canvas
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-kb-content-brand font-medium">2.</span>
                  Click any field to customize its properties
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-kb-content-brand font-medium">3.</span>
                  Preview your form and publish when ready
                </li>
              </ul>
            </div>

            <div className="border-t border-kb-stroke-tertiary pt-4">
              <h4 className="text-sm font-medium text-kb-content-primary mb-3">
                Quick Start Guide
              </h4>
              <div className="relative">
                <div className="aspect-video bg-kb-surface-secondary rounded-lg flex items-center justify-center border border-kb-stroke-tertiary cursor-pointer hover:bg-kb-surface-tertiary transition-colors">
                  <div className="text-center">
                    <Play className="w-8 h-8 text-kb-content-secondary mx-auto mb-2" />
                    <p className="text-sm font-medium text-kb-content-primary">
                      Watch quick guide
                    </p>
                    <p className="text-xs text-kb-content-tertiary">
                      Get started in minutes
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={onDismiss}>
                Got it
              </Button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    </>
  );
}
