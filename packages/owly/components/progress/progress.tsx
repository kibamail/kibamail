"use client"

import React from "react";
import cn from "classnames";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { getVariableClassNamesForProp } from "../utils/props.js";

export const variants = ["success", "error", "info", "warning"] as const;

export const size = ["sm", "md", "lg"] as const;

type ProgressElement = React.ElementRef<typeof ProgressPrimitive.Root>;

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  size?: (typeof size)[number];
  variant?: (typeof variants)[number];
}

const Progress = React.forwardRef<ProgressElement, ProgressProps>(
  (props, forwardedRef) => {
    const { size, variant, value, ...progressProps } = props;

    const { className: variantClassName } = getVariableClassNamesForProp<
      ProgressProps["variant"]
    >("variant", variant, "info");

    const { className: sizeClassName } = getVariableClassNamesForProp<
      ProgressProps["size"]
    >("size", size, "md");

    return (
      <ProgressPrimitive.Root
        {...progressProps}
        className={cn("kb-progress", sizeClassName, variantClassName)}
        value={value}
        ref={forwardedRef}
        asChild={false}
      >
        <ProgressPrimitive.Indicator
          style={
            {
              "--kb-progress-value": value,
            } as React.CSSProperties
          }
          className="kb-progress-indicator"
        />
      </ProgressPrimitive.Root>
    );
  },
);

export { Progress };
