"use client";

import * as Slider from "@radix-ui/react-slider";

interface Marker {
  value: number;
  label: string;
}

interface PricingSliderProps {
  value?: number[];
  defaultValue?: number[];
  max?: number;
  min?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  ariaLabel?: string;
  markers?: Marker[];
}

export function PricingSlider({
  value,
  defaultValue = [50],
  max = 100,
  min = 0,
  step = 1,
  onValueChange,
  ariaLabel = "Pricing",
  markers = [],
}: PricingSliderProps) {
  const getMarkerPosition = (markerValue: number) => {
    return ((markerValue - min) / (max - min)) * 100;
  };

  const handleMarkerClick = (markerValue: number) => {
    onValueChange?.([markerValue]);
  };

  return (
    <div className="w-full">
      <Slider.Root
        className="relative flex h-8 w-full touch-none select-none items-center"
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

      {markers.length > 0 && (
        <div className="relative w-full h-6 mt-1">
          {markers.map((marker) => {
            const position = getMarkerPosition(marker.value);
            const isFirst = marker.value === min;
            const isLast = marker.value === max;

            return (
              <button
                key={marker.value}
                type="button"
                onClick={() => handleMarkerClick(marker.value)}
                className={`absolute text-sm cursor-pointer font-semibold text-kb-content-tertiary hover:text-kb-content-primary transition-colors ${
                  isFirst
                    ? "translate-x-0"
                    : isLast
                    ? "-translate-x-full"
                    : "-translate-x-1/2"
                }`}
                style={{ left: `${position}%` }}
                aria-label={`Set value to ${marker.label}`}
              >
                {marker.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
