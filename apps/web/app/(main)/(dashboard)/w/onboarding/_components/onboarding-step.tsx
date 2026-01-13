import type { PropsWithChildren } from "react";
import { HeadingMarkerIcon } from "./icons/heading-marker-icon";
import { Heading } from "@kibamail/owly/heading";
import { Text } from "@kibamail/owly/text";
import { CheckCircleIcon } from "./icons/check-circle-icon";
import { cn } from "@/lib/utils";

interface OnboardingStepProps {
  title: string;
  description: string;
  completed?: boolean;
  current?: boolean;
}

export function OnboardingStep({
  children,
  title,
  description,
  completed,
}: PropsWithChildren<OnboardingStepProps>) {
  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex items-center gap-4">
        <div className="w-fit h-auto py-2 relative z-10 bg-kb-bg-primary">
          <HeadingMarkerIcon
            className={cn("h-10 w-4", {
              "text-kb-border-tertiary": !completed,
              "text-kb-content-info": completed,
            })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Heading
            className="text-foreground font-medium! flex items-center gap-2"
            size="xs"
          >
            {title}{" "}
            {completed ? (
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
            ) : null}
          </Heading>

          <Text className="text-kb-content-secondary">{description}</Text>
        </div>
      </div>

      <div className="flex w-full flex-col mt-4 pl-8">{children}</div>
    </div>
  );
}
