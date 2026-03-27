"use client";

import { useState } from "react";
import type { BaseComponentProps } from "@json-render/react";
import { useBoundProp } from "@json-render/react";

interface RatingProps {
  name: string;
  label?: string | null;
  maxRating?: number | null;
  description?: string | null;
}

export function Rating({ props, bindings, emit }: BaseComponentProps<RatingProps>) {
  const maxRating = props.maxRating ?? 5;
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [value, setValue] = useBoundProp<number>(
    undefined,
    bindings?.value,
  );

  const currentValue = value ?? 0;

  return (
    <div className="space-y-2">
      {props.label && (
        <label className="text-sm font-medium leading-none">
          {props.label}
        </label>
      )}
      {props.description && (
        <p className="text-sm text-muted-foreground">{props.description}</p>
      )}
      <div className="flex gap-1">
        {Array.from({ length: maxRating }, (_, i) => {
          const starValue = i + 1;
          const filled = starValue <= (hoveredStar ?? currentValue);

          return (
            <button
              key={starValue}
              type="button"
              className={`h-8 w-8 transition-colors ${filled ? "text-yellow-400" : "text-muted-foreground/30"}`}
              onMouseEnter={() => setHoveredStar(starValue)}
              onMouseLeave={() => setHoveredStar(null)}
              onClick={() => {
                setValue(starValue);
                emit("change");
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
      </div>
      <input type="hidden" name={props.name} value={currentValue} />
    </div>
  );
}
