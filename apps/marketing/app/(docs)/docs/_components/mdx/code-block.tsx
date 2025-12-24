"use client";

import { useState } from "react";
import clsx from "clsx";
import { Copy, Check } from "iconoir-react";

interface CodeBlockProps {
  children: React.ReactNode;
  title?: string;
}

interface CodeElementProps {
  children?: string;
  className?: string;
}

export function CodeBlock({ children, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Extract text content from children
    const codeElement = children as React.ReactElement<CodeElementProps>;
    const codeContent =
      typeof codeElement?.props?.children === "string"
        ? codeElement.props.children
        : "";

    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy code");
    }
  };

  // Extract language from className (e.g., "language-typescript")
  const codeElement = children as React.ReactElement<CodeElementProps>;
  const className = codeElement?.props?.className || "";
  const language = className.replace("language-", "");

  return (
    <div className="group relative my-6 rounded-lg bg-gray-900 overflow-hidden">
      {/* Header */}
      {(title || language) && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-xs font-medium text-gray-400">
            {title || language}
          </span>
        </div>
      )}

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className={clsx(
          "absolute right-3 p-1.5 rounded-md transition-all",
          "opacity-0 group-hover:opacity-100",
          "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white",
          title || language ? "top-12" : "top-3"
        )}
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="size-4 text-green-400" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>

      {/* Code content */}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-gray-100">
          {codeElement?.props?.children}
        </code>
      </pre>
    </div>
  );
}
