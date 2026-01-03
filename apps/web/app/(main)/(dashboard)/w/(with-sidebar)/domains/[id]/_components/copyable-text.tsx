"use client";

import { useToast } from "@kibamail/owly/toast";

interface CopyableTextProps {
  text: string;
  className?: string;
}

export function CopyableText({ text, className }: CopyableTextProps) {
  const { success: toast } = useToast();

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied to clipboard");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }

  return (
    <button
      onClick={onCopy}
      className={`text-sm text-kb-content-primary font-mono hover:text-kb-content-secondary transition-colors cursor-pointer text-left ${className || ""}`}
      title="Click to copy"
      type="button"
    >
      {text}
    </button>
  );
}
