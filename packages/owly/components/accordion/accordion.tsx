"use client";

import * as React from "react";
import cn from "classnames";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { createContext } from "@radix-ui/react-context";
import {
  getResponsiveClassNamesForProp,
  getVariableClassNamesForProp,
} from "../utils/props.js";
import type {
  AccordionRootProps,
  AccordionItemProps,
  AccordionTriggerProps,
  AccordionContentProps,
  AccordionRootElement,
  AccordionItemElement,
  AccordionTriggerElement,
  AccordionContentElement,
} from "./accordion.props.js";

const [AccordionProvider] = createContext<
  Pick<AccordionRootProps, "variant" | "size">
>("Accordion");

const AccordionRoot = React.forwardRef<AccordionRootElement, AccordionRootProps>(
  (props, forwardedRef) => {
    const { variant, size, className, ...accordionProps } = props;

    const { className: variantClassName } = getVariableClassNamesForProp<
      AccordionRootProps["variant"]
    >("variant", variant, "bordered");

    const { className: sizeClassName } = getResponsiveClassNamesForProp<
      AccordionRootProps["size"]
    >("size", size, "md");

    return (
      <AccordionProvider variant={variant} size={size}>
        <AccordionPrimitive.Root
          {...accordionProps}
          ref={forwardedRef}
          className={cn(
            "kb-accordion-root",
            variantClassName,
            sizeClassName,
            className,
          )}
        />
      </AccordionProvider>
    );
  },
);

AccordionRoot.displayName = "Accordion.Root";

const AccordionItem = React.forwardRef<AccordionItemElement, AccordionItemProps>(
  (props, forwardedRef) => {
    const { className, ...itemProps } = props;

    return (
      <AccordionPrimitive.Item
        {...itemProps}
        ref={forwardedRef}
        className={cn("kb-accordion-item", className)}
      />
    );
  },
);

AccordionItem.displayName = "Accordion.Item";

const AccordionTrigger = React.forwardRef<
  AccordionTriggerElement,
  AccordionTriggerProps
>((props, forwardedRef) => {
  const { className, children, ...triggerProps } = props;

  return (
    <AccordionPrimitive.Header className="kb-accordion-header">
      <AccordionPrimitive.Trigger
        {...triggerProps}
        ref={forwardedRef}
        className={cn("kb-accordion-trigger kb-reset", className)}
      >
        {children}
        <svg
          className="kb-accordion-chevron"
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
});

AccordionTrigger.displayName = "Accordion.Trigger";

const AccordionContent = React.forwardRef<
  AccordionContentElement,
  AccordionContentProps
>((props, forwardedRef) => {
  const { className, children, ...contentProps } = props;

  return (
    <AccordionPrimitive.Content
      {...contentProps}
      ref={forwardedRef}
      className={cn("kb-accordion-content", className)}
    >
      <div className="kb-accordion-content-text">{children}</div>
    </AccordionPrimitive.Content>
  );
});

AccordionContent.displayName = "Accordion.Content";

export {
  AccordionRoot,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AccordionRoot as Root,
  AccordionItem as Item,
  AccordionTrigger as Trigger,
  AccordionContent as Content,
};
