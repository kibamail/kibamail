import type { ComponentProps } from "react";
import type { ResponsiveProp, SlottableComponentProp } from "../utils/props.js";

export const variants = ["success", "error", "info", "warning", "neutral"] as const;

export const sizes = ["sm", "md"] as const;

export const badgePropsDefinition = {
  size: {
    default: "sm",
  },
} satisfies {
  size: {
    default: ResponsiveProp<(typeof sizes)[number]>;
  };
};

export interface BadgeProps
  extends SlottableComponentProp,
  ComponentProps<"span"> {
  variant?: (typeof variants)[number];
  size?: ResponsiveProp<(typeof sizes)[number]>;
}
