"use client";

import { useState, useRef, useEffect } from "react";
import type { CodeSamplesMap } from "@/app/_lib/code-samples";
import { Button } from "@kibamail/owly";
import { ArrowUpRight, Copy } from "iconoir-react";
import { useToast } from "@kibamail/owly/toast";
import { LanguagesGrid, gridItems } from "./languages-grid";

interface CodeShowcaseProps {
  codeSamples: CodeSamplesMap;
}

export function CodeShowcase({ codeSamples }: CodeShowcaseProps) {
  const [selectedId, setSelectedId] = useState("nodejs");
  const [height, setHeight] = useState<number | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);

  const toast = useToast();

  const selectedItem = gridItems.find((item) => item.id === selectedId);
  const selectedCode = selectedItem
    ? codeSamples[selectedItem.codeId]
    : codeSamples.nodejs;

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [selectedCode]);

  async function onCopy() {
    if (selectedCode?.code) {
      await navigator.clipboard.writeText(selectedCode.code);
      toast.success("Code copied to clipboard", {
        duration: 2000,
      });
    }
  }

  return (
    <div className="w-full">
      <LanguagesGrid selectedId={selectedId} onSelect={setSelectedId} />

      {/* Code display */}
      <div
        className="w-full overflow-hidden relative transition-[height] duration-300 ease-in-out"
        style={{ height: height ? `${height}px` : "auto" }}
      >
        <Button
          className="absolute top-4 right-4 w-8! h-8!"
          size="sm"
          variant="secondary"
          onClick={onCopy}
        >
          <Copy />
        </Button>
        <div ref={contentRef} className="w-full">
          <div
            className="p-6 dark:hidden overflow-x-auto bg-kb-bg-layout [&_pre]:!bg-transparent font-mono"
            dangerouslySetInnerHTML={{
              __html: selectedCode?.html.light ?? "",
            }}
          />
          <div
            className="p-6 hidden overflow-x-auto dark:block bg-kb-bg-layout [&_pre]:!bg-transparent font-mono"
            dangerouslySetInnerHTML={{
              __html: selectedCode?.html.dark ?? "",
            }}
          />
        </div>
      </div>

      <div className="mt-6">
        <Button variant="secondary" className="w-full! md:w-fit!">
          See 26+ other ways to integrate
          <ArrowUpRight />
        </Button>
      </div>
    </div>
  );
}
