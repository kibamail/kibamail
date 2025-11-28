"use client";
import React from "react";
import cn from "classnames";
import * as ToastPrimitive from "@radix-ui/react-toast";
import {
  getVariableClassNamesForProp,
  type SlottableComponentProp,
} from "../utils/props.js";
import { Text } from "../text/text.js";

type ToastRootElement = React.ElementRef<typeof ToastPrimitive.Root>;

export const variants = [
  "error",
  "warning",
  "success",
  "info",
  "feature",
  "loading",
  "default",
] as const;

export interface ToastRootProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: (typeof variants)[number];
}

const ToastProvider: typeof ToastPrimitive.Provider = ToastPrimitive.Provider;

const Toast = React.forwardRef<ToastRootElement, ToastRootProps>(
  (props, forwardedRef) => {
    const { variant, className, ...rootProps } = props;

    const { className: variantClassName } = getVariableClassNamesForProp<
      ToastRootProps["variant"]
    >("variant", variant);

    return (
      <ToastPrimitive.Root
        {...rootProps}
        className={cn("kb-toast kb-reset", className, variantClassName)}
        ref={forwardedRef}
      />
    );
  }
);

Toast.displayName = "Toast.Root";

const ToastTitle: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title> & React.RefAttributes<React.ElementRef<typeof ToastPrimitive.Title>>
> = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>((props, forwardedRef) => {
  const { className, children, ...titleProps } = props;

  return (
    <ToastPrimitive.Title
      {...titleProps}
      className={cn("kb-toast-title", className)}
      ref={forwardedRef}
      asChild
    >
      <Text as="p">{children}</Text>
    </ToastPrimitive.Title>
  );
});

ToastTitle.displayName = "Toast.Title";

const ToastDescription: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description> & React.RefAttributes<React.ElementRef<typeof ToastPrimitive.Description>>
> = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>((props, forwardedRef) => {
  const { className, children, ...descriptionProps } = props;

  return (
    <ToastPrimitive.Description
      {...descriptionProps}
      className={cn("kb-toast-description", className)}
      ref={forwardedRef}
      asChild
    >
      <Text as="p">{children}</Text>
    </ToastPrimitive.Description>
  );
});

ToastDescription.displayName = "Toast.Description";

const ToastAction: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action> & React.RefAttributes<React.ElementRef<typeof ToastPrimitive.Action>>
> = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>((props, forwardedRef) => {
  const { className, ...actionProps } = props;

  return (
    <ToastPrimitive.Action
      {...actionProps}
      className={cn("kb-toast-action", className)}
      ref={forwardedRef}
    />
  );
});

ToastAction.displayName = "Toast.Action";

const ToastClose: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close> & React.RefAttributes<React.ElementRef<typeof ToastPrimitive.Close>>
> = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>((props, forwardedRef) => {
  const { className, ...closeProps } = props;

  return (
    <ToastPrimitive.Close
      {...closeProps}
      className={cn("kb-toast-close", className)}
      ref={forwardedRef}
    />
  );
});

ToastClose.displayName = "Toast.Close";

const ToastIcon = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>((props, forwardedRef) => {
  const { className, ...iconProps } = props;

  return (
    <div
      {...iconProps}
      className={cn("kb-toast-icon", className)}
      ref={forwardedRef}
    />
  );
});

ToastIcon.displayName = "Toast.Icon";

const ToastViewport: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport> & React.RefAttributes<React.ElementRef<typeof ToastPrimitive.Viewport>>
> = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>((props, forwardedRef) => {
  const { className, ...viewportProps } = props;

  return (
    <ToastPrimitive.Viewport
      {...viewportProps}
      className={cn("kb-toast-viewport", className)}
      ref={forwardedRef}
    />
  );
});

ToastViewport.displayName = "Toast.Viewport";

export {
  ToastProvider as Provider,
  Toast as Root,
  ToastTitle as Title,
  ToastDescription as Description,
  ToastAction as Action,
  ToastClose as Close,
  ToastIcon as Icon,
  ToastViewport as Viewport,
};
