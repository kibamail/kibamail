import { Text } from "@kibamail/owly";
import type { PropsWithChildren } from "react";

interface PageSectionProps {
  label?: string;
  title: string;
  description: string;
}

export function PageSection({
  label,
  title,
  description,
  children,
}: PropsWithChildren<PageSectionProps>) {
  return (
    <section className="w-full max-w-7xl mx-auto py-16">
      <div className="flex flex-col items-center gap-2">
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

        <Text variant="tertiary">{description}</Text>
      </div>

      <div className="mt-10">{children}</div>
    </section>
  );
}
