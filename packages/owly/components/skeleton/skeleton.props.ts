import type { ComponentPropsWithoutRef } from "react";
import type { ResponsiveProp } from "../utils/props.js";

export type SkeletonElement = React.ElementRef<"span">;

export const variants = ["default", "circle"] as const;
export const speeds = ["slow", "normal", "fast"] as const;

export interface SkeletonProps extends ComponentPropsWithoutRef<"span"> {
  /**
   * Controls whether the skeleton is shown or the actual content
   * @default true
   */
  loading?: boolean;
  /**
   * Width of the skeleton
   */
  width?: string | number;
  /**
   * Height of the skeleton
   */
  height?: string | number;
  /**
   * Variant of the skeleton
   * @default "default"
   */
  variant?: (typeof variants)[number];
  /**
   * Animation speed
   * @default "normal"
   */
  speed?: (typeof speeds)[number];
}
