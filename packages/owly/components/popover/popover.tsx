"use client";

import cn from "classnames";
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

// Root
type PopoverRootElement = React.ComponentRef<typeof PopoverPrimitive.Root>;

interface PopoverRootProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root> {}

const PopoverRoot = React.forwardRef<PopoverRootElement, PopoverRootProps>(
  (props, forwardedRef) => (
    <PopoverPrimitive.Root {...props} />
  )
);

PopoverRoot.displayName = "Popover.Root";

// Trigger
type PopoverTriggerElement = React.ElementRef<typeof PopoverPrimitive.Trigger>;

interface PopoverTriggerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {}

const PopoverTrigger = React.forwardRef<PopoverTriggerElement, PopoverTriggerProps>(
  (props, forwardedRef) => {
    const { children, ...triggerProps } = props;

    return (
      <PopoverPrimitive.Trigger {...triggerProps} ref={forwardedRef} asChild>
        {children}
      </PopoverPrimitive.Trigger>
    );
  }
);

PopoverTrigger.displayName = "Popover.Trigger";

// Content
type PopoverContentElement = React.ElementRef<typeof PopoverPrimitive.Content>;

interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {}

const PopoverContent = React.forwardRef<PopoverContentElement, PopoverContentProps>(
  (props, forwardedRef) => {
    const { className, children, sideOffset = 4, ...contentProps } = props;

    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          {...contentProps}
          ref={forwardedRef}
          sideOffset={sideOffset}
          className={cn("kb-popover-content", className)}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    );
  }
);

PopoverContent.displayName = "Popover.Content";

// Close
const PopoverClose = PopoverPrimitive.Close;

PopoverClose.displayName = "Popover.Close";

// Arrow
type PopoverArrowElement = React.ElementRef<typeof PopoverPrimitive.Arrow>;

interface PopoverArrowProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Arrow> {}

const PopoverArrow = React.forwardRef<PopoverArrowElement, PopoverArrowProps>(
  (props, forwardedRef) => {
    const { className, ...arrowProps } = props;

    return (
      <PopoverPrimitive.Arrow
        {...arrowProps}
        ref={forwardedRef}
        className={cn("kb-popover-arrow", className)}
      />
    );
  }
);

PopoverArrow.displayName = "Popover.Arrow";

export {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  PopoverArrow,
  PopoverRoot as Root,
  PopoverTrigger as Trigger,
  PopoverContent as Content,
  PopoverClose as Close,
  PopoverArrow as Arrow,
};
