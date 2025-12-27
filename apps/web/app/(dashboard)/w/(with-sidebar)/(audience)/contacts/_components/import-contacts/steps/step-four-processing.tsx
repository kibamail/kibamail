"use client";

import { Button } from "@kibamail/owly/button";
import { Heading } from "@kibamail/owly/heading";
import { Text } from "@kibamail/owly/text";

interface StepFourProcessingProps {
  onClose: () => void;
}

export function StepFourProcessing({ onClose }: StepFourProcessingProps) {
  return (
    <div className="pt-10 lg:pt-24 flex flex-col gap-y-2">
      <Heading className="text-left">We're processing your import.</Heading>

      <Text as="p" className="text-kb-content-secondary">
        It usually takes 1 to 10 minutes, depending on the size of your list.
        We'll shoot you an email as soon as it's done.
      </Text>

      <div className="mt-6 flex items-center justify-between">
        <Button onClick={onClose}>Finish</Button>
      </div>
    </div>
  );
}
