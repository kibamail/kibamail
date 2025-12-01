"use client";

import * as Slider from "@radix-ui/react-slider";

interface PricingSliderProps {
  value?: number[];
  defaultValue?: number[];
  max?: number;
  min?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  ariaLabel?: string;
}

export function PricingSlider({
  value,
  defaultValue = [50],
  max = 100,
  min = 0,
  step = 1,
  onValueChange,
  ariaLabel = "Pricing",
}: PricingSliderProps) {
  return (
    <Slider.Root
      className="relative flex h-12 w-full touch-none select-none items-center"
      value={value}
      defaultValue={defaultValue}
      max={max}
      min={min}
      step={step}
      onValueChange={onValueChange}
    >
      <Slider.Track className="relative h-2 grow rounded-full bg-kb-border-secondary">
        <Slider.Range className="absolute h-full rounded-full bg-kb-bg-info" />
      </Slider.Track>
      <Slider.Thumb
        className="block size-8 rounded-full bg-white border border-kb-border-secondary shadow-md hover:bg-kb-bg-secondary focus:outline-none transition-colors cursor-grab active:cursor-grabbing"
        aria-label={ariaLabel}
      />
    </Slider.Root>
  );
}
