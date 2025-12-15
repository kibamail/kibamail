"use client";

import { useState } from "react";
import { Button } from "@kibamail/owly/button";
import { Xmark, Settings } from "iconoir-react";
import { BroadcastEmailEditor } from "./broadcast-email-editor";

interface BroadcastEditorClientProps {
  broadcastId: string;
}

export function BroadcastEditorClient({
  broadcastId,
}: BroadcastEditorClientProps) {
  const [stylesOpen, setStylesOpen] = useState(false);

  return (
    <div className="w-full h-screen flex box-border flex-col px-2 pb-2 bg-kb-bg-layout">
      <div className="h-[60px] w-full flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="tertiary" asChild>
            <a href="/w/broadcasts">
              <Xmark className="w-6! h-6!" />
            </a>
          </Button>

          <h1 className="text-lg font-semibold text-kb-content-primary">
            Broadcast Editor
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={() => setStylesOpen((current) => !current)}
          >
            <Settings className="w-4 h-4" />
            Styles
          </Button>
          <Button variant="secondary">Save Draft</Button>
          <Button>Send Broadcast</Button>
        </div>
      </div>

      <div className="grow rounded-lg overflow-hidden">
        <BroadcastEmailEditor
          stylesOpen={stylesOpen}
          onStylesOpenChange={setStylesOpen}
        />
      </div>
    </div>
  );
}
