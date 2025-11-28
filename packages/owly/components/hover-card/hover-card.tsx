"use client";

import cn from "classnames";
import * as React from "react";
import * as RadixHoverCard from "@radix-ui/react-hover-card";

type HoverCardTriggerElement = React.ElementRef<typeof RadixHoverCard.Trigger>;
type HoverCardContentElement = React.ElementRef<typeof RadixHoverCard.Content>;
type HoverCardArrowElement = React.ElementRef<typeof RadixHoverCard.Arrow>;

interface HoverCardRootProps extends React.ComponentPropsWithoutRef<typeof RadixHoverCard.Root> {}
interface HoverCardTriggerProps extends React.ComponentPropsWithoutRef<typeof RadixHoverCard.Trigger> {}
interface HoverCardPortalProps extends React.ComponentPropsWithoutRef<typeof RadixHoverCard.Portal> {}
interface HoverCardContentProps extends React.ComponentPropsWithoutRef<typeof RadixHoverCard.Content> {}
interface HoverCardArrowProps extends React.ComponentPropsWithoutRef<typeof RadixHoverCard.Arrow> {}

const HoverCardRoot = (props: HoverCardRootProps) => {
  const { openDelay = 0, closeDelay = 0, ...rootProps } = props;

  return <RadixHoverCard.Root openDelay={openDelay} closeDelay={closeDelay} {...rootProps} />;
};

HoverCardRoot.displayName = "HoverCard.Root";

const HoverCardTrigger = React.forwardRef<HoverCardTriggerElement, HoverCardTriggerProps>(
  (props, forwardedRef) => {
    const { className, children, ...triggerProps } = props;

    return (
      <RadixHoverCard.Trigger
        {...triggerProps}
        ref={forwardedRef}
        className={cn("kb-hover-card-trigger", className)}
        asChild
      >
        {children}
      </RadixHoverCard.Trigger>
    );
  }
);

HoverCardTrigger.displayName = "HoverCard.Trigger";

const HoverCardPortal = (props: HoverCardPortalProps) => {
  return <RadixHoverCard.Portal {...props} />;
};

HoverCardPortal.displayName = "HoverCard.Portal";

const HoverCardContent = React.forwardRef<HoverCardContentElement, HoverCardContentProps>(
  (props, forwardedRef) => {
    const { className, sideOffset = 5, ...contentProps } = props;

    return (
      <RadixHoverCard.Content
        {...contentProps}
        ref={forwardedRef}
        sideOffset={sideOffset}
        className={cn("kb-hover-card-content", className)}
      />
    );
  }
);

HoverCardContent.displayName = "HoverCard.Content";

const HoverCardArrow = React.forwardRef<HoverCardArrowElement, HoverCardArrowProps>(
  (props, forwardedRef) => {
    const { className, ...arrowProps } = props;

    return (
      <RadixHoverCard.Arrow
        {...arrowProps}
        ref={forwardedRef}
        className={cn("kb-hover-card-arrow", className)}
      />
    );
  }
);

HoverCardArrow.displayName = "HoverCardArrow";

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

export {
  HoverCardRoot,
  HoverCardTrigger,
  HoverCardPortal,
  HoverCardContent,
  HoverCardArrow,
  // Aliases
  HoverCardRoot as Root,
  HoverCardTrigger as Trigger,
  HoverCardPortal as Portal,
  HoverCardContent as Content,
  HoverCardArrow as Arrow,
};

export type {
  HoverCardRootProps,
  HoverCardTriggerProps,
  HoverCardPortalProps,
  HoverCardContentProps,
  HoverCardArrowProps,
};
