"use client";

import cn from "classnames";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { XMarkIcon } from "./dialog-icons.js";
import { Heading } from "../heading/heading.js";
import { Text } from "../text/text.js";

interface DialogRootProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>,
    "modal"
  > {}

const DialogRoot: React.FC<DialogRootProps> = (props) => (
  <DialogPrimitive.Root {...props} modal />
);

DialogRoot.displayName = "Dialog.Root";

type DialogTriggerElement = React.ElementRef<typeof DialogPrimitive.Trigger>;

interface DialogTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {}
const DialogTrigger = React.forwardRef<
  DialogTriggerElement,
  DialogTriggerProps
>(({ children, ...props }, forwardedRef) => (
  <DialogPrimitive.Trigger {...props} ref={forwardedRef} asChild>
    {children}
  </DialogPrimitive.Trigger>
));

DialogTrigger.displayName = "Dialog.Trigger";

type DialogContentElement = React.ElementRef<typeof DialogPrimitive.Content>;
interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  container?: React.ComponentPropsWithoutRef<
    typeof DialogPrimitive.Portal
  >["container"];
}

const DialogContent = React.forwardRef<
  DialogContentElement,
  DialogContentProps
>(({ ...props }, forwardedRef) => {
  const { className, forceMount, container, ...contentProps } = props;

  return (
    <DialogPrimitive.Portal container={container} forceMount={forceMount}>
      <DialogPrimitive.Overlay className="kb-dialog-overlay" />
      <DialogPrimitive.Content
        {...contentProps}
        ref={forwardedRef}
        className={cn("kb-dialog-content", className)}
      />
    </DialogPrimitive.Portal>
  );
});
DialogContent.displayName = "Dialog.Content";

type DialogFooterElement = React.ElementRef<"div">;

const DialogFooter = React.forwardRef<
  DialogFooterElement,
  React.ComponentPropsWithoutRef<"div">
>((props, forwardedRef) => {
  const { className, ...footerProps } = props;

  return (
    <div
      {...footerProps}
      ref={forwardedRef}
      className={cn("kb-dialog-footer", className)}
    />
  );
});

DialogFooter.displayName = "Dialog.Footer";

type DialogHeaderElement = React.ElementRef<"div">;

const DialogHeader = React.forwardRef<
  DialogHeaderElement,
  React.ComponentPropsWithoutRef<"div">
>((props, forwardedRef) => {
  const { className, children, ...footerProps } = props;

  return (
    <div
      {...footerProps}
      ref={forwardedRef}
      className={cn("kb-dialog-header", className)}
    >
      {children}

      <DialogPrimitive.Close asChild>
        <button
          className="kb-dialog-close kb-reset"
          type="button"
          aria-label="Close"
        >
          <XMarkIcon />
        </button>
      </DialogPrimitive.Close>
    </div>
  );
});

DialogHeader.displayName = "Dialog.Header";

type DialogTitleElement = React.ElementRef<typeof Heading>;
type DialogTitleProps = React.ComponentPropsWithoutRef<typeof Heading>;

const DialogTitle = React.forwardRef<DialogTitleElement, DialogTitleProps>(
  (props, forwardedRef) => {
    const { children, ...headingProps } = props;
    return (
      <DialogPrimitive.Title className="kb-dialog-title" asChild>
        <Heading
          variant="heading"
          size="xs"
          {...headingProps}
          ref={forwardedRef}
        >
          {children}
        </Heading>
      </DialogPrimitive.Title>
    );
  }
);

DialogTitle.displayName = "Dialog.Title";

type DialogDescriptionElement = React.ElementRef<typeof Text>;
type DialogDescriptionProps = React.ComponentPropsWithoutRef<typeof Text>;

const DialogDescription = React.forwardRef<
  DialogDescriptionElement,
  DialogDescriptionProps
>((props, forwardedRef) => {
  const { children, className, ...textProps } = props;
  return (
    <DialogPrimitive.Title asChild>
      <Text
        className={cn("kb-dialog-description", className)}
        {...textProps}
        ref={forwardedRef}
      >
        {children}
      </Text>
    </DialogPrimitive.Title>
  );
});

DialogDescription.displayName = "Dialog.Description";

const DialogClose = DialogPrimitive.Close;

export {
  DialogRoot as Root,
  DialogTrigger as Trigger,
  DialogContent as Content,
  DialogFooter as Footer,
  DialogHeader as Header,
  DialogTitle as Title,
  DialogClose as Close,
  DialogDescription as Description,
};
