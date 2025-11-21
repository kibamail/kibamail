"use client";

import { Button } from "@kibamail/owly/button";
import * as Popover from "@kibamail/owly/popover";
import { HelpCircle, OpenNewWindow, Play } from "iconoir-react";
import { useState } from "react";

const FORM_HELP_SEEN_KEY = "kibamail_form_help_seen";

export function FormHelpPopover() {
  const [open, setOpen] = useState(() => {
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
                How Forms Work
              </h3>
              <p className="text-sm text-kb-content-secondary leading-relaxed">
                We use the SurveyJS JSON standard for forms, which gives you
                powerful flexibility to create complex forms with conditional
                logic, validation, and rich question types.
              </p>
            </div>

            <div className="border-t border-kb-stroke-tertiary pt-4">
              <h4 className="text-sm font-medium text-kb-content-primary mb-2">
                Drag & Drop Editor Coming Soon
              </h4>
              <p className="text-sm text-kb-content-secondary mb-3">
                We're bringing a visual drag-and-drop form builder very soon. In
                the meantime, you can use SurveyJS's free editor to design your
                forms visually, then copy the JSON into our editor.
              </p>
              <Button variant="secondary" size="sm" asChild className="w-full">
                <a
                  href="https://surveyjs.io/create-free-survey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <OpenNewWindow className="w-4 h-4" />
                  Use SurveyJS Free Editor
                </a>
              </Button>
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
                      Watch 37-second guide
                    </p>
                    <p className="text-xs text-kb-content-tertiary">
                      Get started quickly
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
