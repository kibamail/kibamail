"use client";

import { useToast } from "@kibamail/owly/toast";

interface CopyableIdProps {
  id: string;
}

export function CopyableId({ id }: CopyableIdProps) {
  const { success: toast } = useToast();

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(id);
      toast("ID copied to clipboard");
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }

  return (
    <button
      onClick={onCopy}
      className="text-sm text-kb-content-primary font-mono hover:text-kb-content-secondary transition-colors cursor-pointer text-left"
      title="Click to copy"
      type="button"
    >
      {id}
    </button>
  );
}
