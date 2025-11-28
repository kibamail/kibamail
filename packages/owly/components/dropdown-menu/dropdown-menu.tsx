"use client";

import cn from "classnames";
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

type DropdownMenuRootElement = React.ComponentRef<typeof DropdownMenuPrimitive.Root>;
type DropdownMenuTriggerElement = React.ElementRef<typeof DropdownMenuPrimitive.Trigger>;
type DropdownMenuContentElement = React.ElementRef<typeof DropdownMenuPrimitive.Content>;
type DropdownMenuItemElement = React.ElementRef<typeof DropdownMenuPrimitive.Item>;
type DropdownMenuLabelElement = React.ElementRef<typeof DropdownMenuPrimitive.Label>;
type DropdownMenuSeparatorElement = React.ElementRef<typeof DropdownMenuPrimitive.Separator>;
type DropdownMenuCheckboxItemElement = React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>;
type DropdownMenuRadioGroupElement = React.ElementRef<typeof DropdownMenuPrimitive.RadioGroup>;
type DropdownMenuRadioItemElement = React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>;
type DropdownMenuItemIndicatorElement = React.ElementRef<typeof DropdownMenuPrimitive.ItemIndicator>;

interface DropdownMenuRootProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root> {}
interface DropdownMenuTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> {}
interface DropdownMenuContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {}
interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {}
interface DropdownMenuLabelProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {}
interface DropdownMenuSeparatorProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator> {}
interface DropdownMenuCheckboxItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> {}
interface DropdownMenuRadioGroupProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioGroup> {}
interface DropdownMenuRadioItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> {}
interface DropdownMenuItemIndicatorProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.ItemIndicator> {}

const DropdownMenuRoot = React.forwardRef<DropdownMenuRootElement, DropdownMenuRootProps>(
  (props, forwardedRef) => {
    return <DropdownMenuPrimitive.Root {...props} />;
  }
);

DropdownMenuRoot.displayName = "DropdownMenu.Root";

const DropdownMenuTrigger = React.forwardRef<DropdownMenuTriggerElement, DropdownMenuTriggerProps>(
  (props, forwardedRef) => {
    const { children, ...triggerProps } = props;

    return (
      <DropdownMenuPrimitive.Trigger
        {...triggerProps}
        ref={forwardedRef}
        asChild
      >
        {children}
      </DropdownMenuPrimitive.Trigger>
    );
  }
);

DropdownMenuTrigger.displayName = "DropdownMenu.Trigger";

const DropdownMenuContent = React.forwardRef<DropdownMenuContentElement, DropdownMenuContentProps>(
  (props, forwardedRef) => {
    const { className, children, sideOffset = 4, ...contentProps } = props;

    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          {...contentProps}
          ref={forwardedRef}
          sideOffset={sideOffset}
          className={cn("kb-dropdown-menu-content", className)}
        >
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    );
  }
);

DropdownMenuContent.displayName = "DropdownMenu.Content";

const DropdownMenuItem = React.forwardRef<DropdownMenuItemElement, DropdownMenuItemProps>(
  (props, forwardedRef) => {
    const { className, children, ...itemProps } = props;

    return (
      <DropdownMenuPrimitive.Item
        {...itemProps}
        ref={forwardedRef}
        className={cn("kb-dropdown-menu-item", className)}
      >
        {children}
      </DropdownMenuPrimitive.Item>
    );
  }
);

DropdownMenuItem.displayName = "DropdownMenu.Item";

const DropdownMenuLabel = React.forwardRef<DropdownMenuLabelElement, DropdownMenuLabelProps>(
  (props, forwardedRef) => {
    const { className, children, ...labelProps } = props;

    return (
      <DropdownMenuPrimitive.Label
        {...labelProps}
        ref={forwardedRef}
        className={cn("kb-dropdown-menu-label", className)}
      >
        {children}
      </DropdownMenuPrimitive.Label>
    );
  }
);

DropdownMenuLabel.displayName = "DropdownMenu.Label";

const DropdownMenuSeparator = React.forwardRef<DropdownMenuSeparatorElement, DropdownMenuSeparatorProps>(
  (props, forwardedRef) => {
    const { className, ...separatorProps } = props;

    return (
      <DropdownMenuPrimitive.Separator
        {...separatorProps}
        ref={forwardedRef}
        className={cn("kb-dropdown-menu-separator", className)}
      />
    );
  }
);

DropdownMenuSeparator.displayName = "DropdownMenu.Separator";

const DropdownMenuCheckboxItem = React.forwardRef<DropdownMenuCheckboxItemElement, DropdownMenuCheckboxItemProps>(
  (props, forwardedRef) => {
    const { className, children, ...checkboxItemProps } = props;

    return (
      <DropdownMenuPrimitive.CheckboxItem
        {...checkboxItemProps}
        ref={forwardedRef}
        className={cn("kb-dropdown-menu-item", "kb-dropdown-menu-checkbox-item", className)}
      >
        {children}
      </DropdownMenuPrimitive.CheckboxItem>
    );
  }
);

DropdownMenuCheckboxItem.displayName = "DropdownMenu.CheckboxItem";

const DropdownMenuRadioGroup = React.forwardRef<DropdownMenuRadioGroupElement, DropdownMenuRadioGroupProps>(
  (props, forwardedRef) => {
    return <DropdownMenuPrimitive.RadioGroup {...props} ref={forwardedRef} />;
  }
);

DropdownMenuRadioGroup.displayName = "DropdownMenu.RadioGroup";

const DropdownMenuRadioItem = React.forwardRef<DropdownMenuRadioItemElement, DropdownMenuRadioItemProps>(
  (props, forwardedRef) => {
    const { className, children, ...radioItemProps } = props;

    return (
      <DropdownMenuPrimitive.RadioItem
        {...radioItemProps}
        ref={forwardedRef}
        className={cn("kb-dropdown-menu-item", "kb-dropdown-menu-radio-item", className)}
      >
        {children}
      </DropdownMenuPrimitive.RadioItem>
    );
  }
);

DropdownMenuRadioItem.displayName = "DropdownMenu.RadioItem";

const DropdownMenuItemIndicator = React.forwardRef<DropdownMenuItemIndicatorElement, DropdownMenuItemIndicatorProps>(
  (props, forwardedRef) => {
    const { className, children, ...indicatorProps } = props;

    return (
      <DropdownMenuPrimitive.ItemIndicator
        {...indicatorProps}
        ref={forwardedRef}
        className={cn("kb-dropdown-menu-item-indicator", className)}
      >
        {children || (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="10"
            viewBox="0 0 13 10"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.183061 5.18306C0.427139 4.93898 0.822867 4.93898 1.06694 5.18306L3.95834 8.07445L11.8497 0.183057C12.0938 -0.0610201 12.4895 -0.0610204 12.7336 0.183057C12.9777 0.427135 12.9777 0.822863 12.7336 1.06694L4.40028 9.40028C4.1562 9.64435 3.76047 9.64435 3.51639 9.40028L0.183061 6.06694C-0.0610166 5.82286 -0.0610166 5.42714 0.183061 5.18306Z"
              fill="currentColor"
            />
          </svg>
        )}
      </DropdownMenuPrimitive.ItemIndicator>
    );
  }
);

DropdownMenuItemIndicator.displayName = "DropdownMenu.ItemIndicator";

export {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItemIndicator,
  DropdownMenuRoot as Root,
  DropdownMenuTrigger as Trigger,
  DropdownMenuContent as Content,
  DropdownMenuItem as Item,
  DropdownMenuLabel as Label,
  DropdownMenuSeparator as Separator,
  DropdownMenuCheckboxItem as CheckboxItem,
  DropdownMenuRadioGroup as RadioGroup,
  DropdownMenuRadioItem as RadioItem,
  DropdownMenuItemIndicator as ItemIndicator,
};
