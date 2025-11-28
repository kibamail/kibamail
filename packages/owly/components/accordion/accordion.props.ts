import * as AccordionPrimitive from "@radix-ui/react-accordion";
import type { ComponentPropsWithoutRef } from "react";
import type { ResponsiveProp } from "../utils/props.js";

export type AccordionRootElement = React.ElementRef<typeof AccordionPrimitive.Root>;
export type AccordionItemElement = React.ElementRef<typeof AccordionPrimitive.Item>;
export type AccordionTriggerElement = React.ElementRef<typeof AccordionPrimitive.Trigger>;
export type AccordionContentElement = React.ElementRef<typeof AccordionPrimitive.Content>;

export const variants = ["default", "bordered"] as const;
export const sizes = ["sm", "md", "lg"] as const;

type AccordionPrimitiveProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>;

export type AccordionRootProps = AccordionPrimitiveProps & {
  variant?: (typeof variants)[number];
  size?: ResponsiveProp<(typeof sizes)[number]>;
};

export interface AccordionItemProps
  extends ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {}

export interface AccordionTriggerProps
  extends ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {}

export interface AccordionContentProps
  extends ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {}
