import { Text } from "@kibamail/owly";
import classNames from "classnames";
import type { PropsWithChildren } from "react";

interface PageSectionProps {
  label?: string;
  title: string;
  description: string;
  className?: string;
  variant?: "primary" | "secondary";
}

export function PageSection({
  label,
  title,
  className,
  description,
  children,
  variant = "primary",
}: PropsWithChildren<PageSectionProps>) {
  return (
    <div
      className={classNames(
        "w-full py-16 px-6 xl:px-0",
        {
          "bg-kb-bg-layout": variant === "primary",
          "bg-kb-bg-primary dark:bg-kb-bg-secondary": variant === "secondary",
        },
        className
      )}
    >
      <section className="w-full max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center max-w-2xl mx-auto gap-2">
          <Text className="uppercase text-kb-content-disabled!" size="xs">
            {label}
          </Text>

          <Text
            variant="primary"
            className="text-center text-3xl! font-bold!"
            asChild
          >
            <h2>{title}</h2>
          </Text>

          <div className="max-w-lg mx-auto flex justify-center">
            <Text variant="tertiary" className="text-center">
              {description}
            </Text>
          </div>
        </div>

        <div className="mt-10">{children}</div>
      </section>
    </div>
  );
}
