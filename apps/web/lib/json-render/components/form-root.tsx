"use client";

import type { BaseComponentProps } from "@json-render/react";

interface FormRootProps {
  submitLabel?: string | null;
  loadingLabel?: string | null;
}

export function FormRoot({ props, children, emit }: BaseComponentProps<FormRootProps>) {
  const submitLabel = props.submitLabel ?? "Submit";
  const loadingLabel = props.loadingLabel ?? "Submitting...";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        emit("press");
      }}
      className="space-y-6"
    >
      {children}
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  );
}
