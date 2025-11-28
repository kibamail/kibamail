"use client";

import cn from "classnames";
import * as React from "react";

type EmptyCardRootElement = React.ElementRef<"div">;
type EmptyCardTitleElement = React.ElementRef<"h3">;
type EmptyCardDescriptionElement = React.ElementRef<"p">;
type EmptyCardActionElement = React.ElementRef<"div">;

interface EmptyCardRootProps extends React.ComponentPropsWithoutRef<"div"> {}
interface EmptyCardTitleProps extends React.ComponentPropsWithoutRef<"h3"> {}
interface EmptyCardDescriptionProps extends React.ComponentPropsWithoutRef<"p"> {}
interface EmptyCardActionProps extends React.ComponentPropsWithoutRef<"div"> {}

const EmptyCardRoot = React.forwardRef<EmptyCardRootElement, EmptyCardRootProps>(
  (props, forwardedRef) => {
    const { className, children, ...rootProps } = props;

    return (
      <div
        {...rootProps}
        ref={forwardedRef}
        className={cn("kb-empty-card-root", className)}
      >
        {children}
      </div>
    );
  }
);

EmptyCardRoot.displayName = "EmptyCard.Root";

const EmptyCardTitle = React.forwardRef<EmptyCardTitleElement, EmptyCardTitleProps>(
  (props, forwardedRef) => {
    const { className, children, ...titleProps } = props;

    return (
      <h3
        {...titleProps}
        ref={forwardedRef}
        className={cn("kb-empty-card-title", className)}
      >
        {children}
      </h3>
    );
  }
);

EmptyCardTitle.displayName = "EmptyCard.Title";

const EmptyCardDescription = React.forwardRef<EmptyCardDescriptionElement, EmptyCardDescriptionProps>(
  (props, forwardedRef) => {
    const { className, children, ...descriptionProps } = props;

    return (
      <p
        {...descriptionProps}
        ref={forwardedRef}
        className={cn("kb-empty-card-description", className)}
      >
        {children}
      </p>
    );
  }
);

EmptyCardDescription.displayName = "EmptyCard.Description";

const EmptyCardAction = React.forwardRef<EmptyCardActionElement, EmptyCardActionProps>(
  (props, forwardedRef) => {
    const { className, children, ...actionProps } = props;

    return (
      <div
        {...actionProps}
        ref={forwardedRef}
        className={cn("kb-empty-card-action", className)}
      >
        {children}
      </div>
    );
  }
);

EmptyCardAction.displayName = "EmptyCard.Action";

export {
  EmptyCardRoot,
  EmptyCardTitle,
  EmptyCardDescription,
  EmptyCardAction,
  // Aliases
  EmptyCardRoot as Root,
  EmptyCardTitle as Title,
  EmptyCardDescription as Description,
  EmptyCardAction as Action,
};

export type {
  EmptyCardRootProps,
  EmptyCardTitleProps,
  EmptyCardDescriptionProps,
  EmptyCardActionProps,
};
