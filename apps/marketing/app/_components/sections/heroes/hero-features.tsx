import { Text } from "@kibamail/owly";
import * as Tooltip from "@kibamail/owly/tooltip";
import { CheckCircle, HelpCircle } from "iconoir-react";
import type { ReactNode } from "react";

export interface HeroFeature {
  title: string;
  description?: ReactNode;
}

const unlimitedSet = [
  "Unlimited contacts & automations",
  "Unlimited forms & landing pages",
  "Unlimited team members",
  "Unlimited domains",
  "Unlimited email templates",
];

export const defaultHeroFeatures: HeroFeature[] = [
  { title: "No monthly subscriptions" },
  { title: "10,000 free emails . No credit card required." },
  {
    title: "Unlimited features",
    description: (
      <div className="flex flex-col p-1">
        <div className="flex flex-col gap-2">
          <Text>
            We only charge you for one thing: a successful email delivery.
          </Text>

          <Text>In addition, you get:</Text>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          {unlimitedSet.map((item) => (
            <div className="flex items-center gap-2" key={item}>
              <CheckCircle className="text-kb-content-positive w-4 h-4 shrink-0" />
              <Text className="font-semibold">{item}</Text>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Best in class deliverability",
  },
];

interface HeroFeaturesProps {
  features?: HeroFeature[];
  className?: string;
}

export function HeroFeatures({
  features = defaultHeroFeatures,
  className,
}: HeroFeaturesProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-4 max-w-4xl ${className ?? ""}`}
    >
      {features.map((feature) => (
        <div className="flex items-center gap-1" key={feature.title}>
          <CheckCircle className="text-kb-content-positive w-4 h-4 shrink-0" />
          <Text>{feature.title}</Text>
          {feature.description && (
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer"
                  >
                    <HelpCircle className="text-kb-content-tertiary w-4 h-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content>{feature.description}</Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          )}
        </div>
      ))}
    </div>
  );
}
