"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { CopyIcon } from "./icons/copy-icon";
import type { PropsWithChildren, ReactNode } from "react";
import { Text } from "@kibamail/owly/text";
import type { HighlightedSdk } from "../_lib/get-highlighted-sdks";

interface SdkCodeSnippetsProps {
  sdks: HighlightedSdk[];
  footer?: ReactNode;
}

export function SdkCodeSnippets({
  sdks,
  footer,
  children,
}: PropsWithChildren<SdkCodeSnippetsProps>) {
  return (
    <Tabs.Root defaultValue={sdks[0]?.name}>
      <div className="w-full flex flex-col rounded-2xl border border-kb-border-tertiary">
        <div className="min-h-13 py-3 flex items-center justify-between rounded-t-2xl bg-muted border-b border-kb-border-tertiary px-3">
          <Tabs.List className="flex items-center gap-2">
            {sdks.map((sdk) => (
              <Tabs.TabsTrigger
                value={sdk.name}
                key={sdk.name}
                className="cursor-pointer text-kb-content-secondary font-medium border-transparent data-[state=active]:border data-[state=active]:border-solid data-[state=active]:border-kb-border-tertiary data-[state=active]:text-foreground rounded-lg px-2 py-1"
              >
                <Text>{sdk.name}</Text>
              </Tabs.TabsTrigger>
            ))}
          </Tabs.List>

          <CopyIcon className="text-kb-content-secondary w-6 h-6 cursor-pointer hover:text-foreground transition-colors" />
        </div>

        <div className="w-full overflow-x-auto bg-[#212121]">
          {sdks.map(({ name, code }) => (
            <Tabs.TabsContent value={name} key={name}>
              <div
                className="shiki-container [&_pre]:!bg-transparent [&_pre]:p-4 [&_pre]:text-sm [&_code]:text-sm"
                dangerouslySetInnerHTML={{ __html: code }}
              />
            </Tabs.TabsContent>
          ))}
        </div>

        <div className="min-h-13 py-3 flex items-center rounded-b-2xl justify-between bg-muted border-t border-kb-border-tertiary px-3">
          {footer}
        </div>
      </div>
    </Tabs.Root>
  );
}
