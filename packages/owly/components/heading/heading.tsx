import React, { type ComponentPropsWithoutRef } from "react";
import cn from "classnames";
import { Slot } from "@radix-ui/react-slot";
import {
  getResponsiveClassNamesForProp,
  type ResponsiveProp,
  type SlottableComponentProp,
} from "../utils/props.js";

export const sizes = ["xl", "lg", "md", "sm", "xs"] as const;

export const variants = ["display", "heading"] as const;

type HeadingElement = React.ElementRef<"span">;

export interface HeadingProps
  extends SlottableComponentProp,
  ComponentPropsWithoutRef<"h1"> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  size?: ResponsiveProp<(typeof sizes)[number]>;
  variant?: ResponsiveProp<(typeof variants)[number]>;
}

const Heading = React.forwardRef<HeadingElement, HeadingProps>(
  (props, forwardedRef) => {
    const {
      asChild,
      children,
      as = "h1",
      size,
      variant,
      className,
      ...elementProps
    } = props;

    const Element = as;

    const { className: sizeClassName } = getResponsiveClassNamesForProp<
      HeadingProps["size"]
    >("size", size, "md");

    const { className: variantClassName } = getResponsiveClassNamesForProp<
      HeadingProps["variant"]
    >("variant", variant, "heading");

    return (
      <Slot
        {...elementProps}
        ref={forwardedRef}
        className={cn(
          "kb-reset kb-heading",
          sizeClassName,
          variantClassName,
          className,
        )}
      >
        {asChild ? children : <Element>{children}</Element>}
      </Slot>
    );
  },
);

export { Heading };
