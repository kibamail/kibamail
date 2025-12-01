import type { PropsWithChildren } from "react";
import cn from "classnames";

export function SectionCard({
  children,
  spacing = "regular",
  className,
}: PropsWithChildren<{ className?: string; spacing?: "small" | "regular" }>) {
  return (
    <div
      className={cn(
        "w-full bg-kb-bg-primary rounded-3xl  border border-kb-border-tertiary",
        {
          "p-6 md:p-12": spacing === "regular",
          "p-4 sm:p-6 md:p-8": spacing === "small",
        },
        className
      )}
    >
      {children}
    </div>
  );
}
