"use client";

import { Button } from "@kibamail/owly/button";
import { Text } from "@kibamail/owly";
import { Copy, Check } from "iconoir-react";
import { useState, useRef, useCallback } from "react";

type ViewMode = "preview" | "html" | "text";

interface EmailContentViewerProps {
  htmlContent: string | null;
  textContent: string | null;
  highlightedHtml: string | null;
  highlightedText: string | null;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-2 rounded-md flex items-center h-7 cursor-pointer transition ease-linear ${
        active
          ? "border-kb-border-tertiary bg-kb-bg-hover"
          : "border-transparent hover:border-kb-border-tertiary hover:bg-kb-bg-hover"
      }`}
    >
      <Text variant={active ? "primary" : "tertiary"}>{children}</Text>
    </button>
  );
}

export function EmailContentViewer({
  htmlContent,
  textContent,
  highlightedHtml,
  highlightedText,
}: EmailContentViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleCopy = useCallback(async () => {
    let contentToCopy = "";

    if (viewMode === "preview" || viewMode === "html") {
      contentToCopy = htmlContent || "";
    } else {
      contentToCopy = textContent || "";
    }

    if (contentToCopy) {
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [viewMode, htmlContent, textContent]);

  const renderContent = () => {
    if (!htmlContent && !textContent) {
      return (
        <div className="flex items-center justify-center h-64">
          <Text variant="tertiary">No email content available</Text>
        </div>
      );
    }

    if (viewMode === "preview") {
      if (!htmlContent) {
        return (
          <div className="flex items-center justify-center h-64">
            <Text variant="tertiary">No HTML content available</Text>
          </div>
        );
      }

      return (
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          sandbox="allow-same-origin"
          className="w-full h-[600px] border-0 bg-white rounded-b-lg"
          title="Email preview"
        />
      );
    }

    if (viewMode === "html") {
      if (!htmlContent) {
        return (
          <div className="flex items-center justify-center h-64">
            <Text variant="tertiary">No HTML content available</Text>
          </div>
        );
      }

      if (!highlightedHtml) {
        return (
          <div className="flex items-center justify-center h-64">
            <Text variant="tertiary">Loading...</Text>
          </div>
        );
      }

      return (
        <div
          className="overflow-auto max-h-[600px] text-sm [&_pre]:p-4 [&_pre]:m-0 [&_pre]:rounded-b-lg"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      );
    }

    if (viewMode === "text") {
      if (!textContent) {
        return (
          <div className="flex items-center justify-center h-64">
            <Text variant="tertiary">No plain text content available</Text>
          </div>
        );
      }

      if (!highlightedText) {
        return (
          <div className="flex items-center justify-center h-64">
            <Text variant="tertiary">Loading...</Text>
          </div>
        );
      }

      return (
        <div
          className="overflow-auto max-h-[600px] text-sm [&_pre]:p-4 [&_pre]:m-0 [&_pre]:rounded-b-lg"
          dangerouslySetInnerHTML={{ __html: highlightedText }}
        />
      );
    }

    return null;
  };

  return (
    <div className="w-full rounded-lg border border-kb-border-tertiary">
      <div className="h-12 w-full border-b border-kb-border-tertiary flex items-center justify-between px-4">
        <div className="flex items-center gap-2 grow">
          <TabButton
            active={viewMode === "preview"}
            onClick={() => setViewMode("preview")}
          >
            Preview
          </TabButton>
          <TabButton
            active={viewMode === "html"}
            onClick={() => setViewMode("html")}
          >
            HTML
          </TabButton>
          <TabButton
            active={viewMode === "text"}
            onClick={() => setViewMode("text")}
          >
            Plain text
          </TabButton>
        </div>
        <Button variant="tertiary" onClick={handleCopy}>
          {copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="w-full bg-kb-bg-primary rounded-b-lg">
        {renderContent()}
      </div>
    </div>
  );
}
