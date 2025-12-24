import { Text } from "@kibamail/owly";
import type { ReactNode } from "react";

export interface BentoFeature {
  title: string;
  description: string;
  icon: ReactNode;
  className?: string;
}

interface BentoGridProps {
  features: BentoFeature[];
  className?: string;
}

export function BentoGrid({ features, className }: BentoGridProps) {
  const gridPositions = [
    "col-span-1 row-span-1 md:col-span-2 md:row-span-2",
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
    "col-span-1 row-span-1 md:col-span-3",
    "col-span-1 row-span-1",
  ];

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-4 gap-4 py-12 ${
        className ?? ""
      }`}
    >
      {features.slice(0, 7).map((feature, idx) => (
        <div
          key={feature.title}
          className={`
            group relative overflow-hidden rounded-xl
            border border-kb-border-tertiary
            bg-kb-bg-secondary/50 hover:bg-kb-bg-secondary
            transition-all duration-300
            p-6 flex flex-col
            ${gridPositions[idx] ?? "col-span-1"}
            ${feature.className ?? ""}
          `}
        >
          <div className="w-10 h-10 rounded-lg bg-kb-bg-tertiary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            {feature.icon}
          </div>

          <Text size="lg" className="font-semibold! mb-2">
            {feature.title}
          </Text>

          <Text variant="secondary" className="flex-1">
            {feature.description}
          </Text>

          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-kb-content-brand/5 rounded-full blur-3xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
