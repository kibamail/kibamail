import type { PropsWithChildren } from "react";

export function SectionCard({ children }: PropsWithChildren) {
  return (
    <div className="w-full bg-kb-bg-primary rounded-3xl p-12 border border-kb-border-tertiary">
      {children}
    </div>
  );
}
