"use client";

import * as React from "react";
import cn from "classnames";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";

// Root Component
type NavigationMenuRootElement = React.ElementRef<typeof NavigationMenuPrimitive.Root>;
type NavigationMenuRootProps = React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>;

const NavigationMenuRoot = React.forwardRef<NavigationMenuRootElement, NavigationMenuRootProps>(
  (props, forwardedRef) => {
    const { className, ...rootProps } = props;

    return (
      <NavigationMenuPrimitive.Root
        {...rootProps}
        ref={forwardedRef}
        className={cn("kb-navigation-menu-root", className)}
      />
    );
  }
);

NavigationMenuRoot.displayName = "NavigationMenu.Root";

// List Component
type NavigationMenuListElement = React.ElementRef<typeof NavigationMenuPrimitive.List>;
type NavigationMenuListProps = React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>;

const NavigationMenuList = React.forwardRef<NavigationMenuListElement, NavigationMenuListProps>(
  (props, forwardedRef) => {
    const { className, ...listProps } = props;

    return (
      <NavigationMenuPrimitive.List
        {...listProps}
        ref={forwardedRef}
        className={cn("kb-navigation-menu-list", className)}
      />
    );
  }
);

NavigationMenuList.displayName = "NavigationMenu.List";

// Item Component
type NavigationMenuItemElement = React.ElementRef<typeof NavigationMenuPrimitive.Item>;
type NavigationMenuItemProps = React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item>;

const NavigationMenuItem = React.forwardRef<NavigationMenuItemElement, NavigationMenuItemProps>(
  (props, forwardedRef) => {
    const { className, ...itemProps } = props;

    return (
      <NavigationMenuPrimitive.Item
        {...itemProps}
        ref={forwardedRef}
        className={cn("kb-navigation-menu-item", className)}
      />
    );
  }
);

NavigationMenuItem.displayName = "NavigationMenu.Item";

// Trigger Component
type NavigationMenuTriggerElement = React.ElementRef<typeof NavigationMenuPrimitive.Trigger>;
type NavigationMenuTriggerProps = React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>;

const NavigationMenuTrigger = React.forwardRef<NavigationMenuTriggerElement, NavigationMenuTriggerProps>(
  (props, forwardedRef) => {
    const { className, children, ...triggerProps } = props;

    return (
      <NavigationMenuPrimitive.Trigger
        {...triggerProps}
        ref={forwardedRef}
        className={cn("kb-navigation-menu-trigger kb-reset", className)}
      >
        {children}
        <svg
          className="kb-navigation-menu-chevron"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </NavigationMenuPrimitive.Trigger>
    );
  }
);

NavigationMenuTrigger.displayName = "NavigationMenu.Trigger";

// Content Component
type NavigationMenuContentElement = React.ElementRef<typeof NavigationMenuPrimitive.Content>;
type NavigationMenuContentProps = React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>;

const NavigationMenuContent = React.forwardRef<NavigationMenuContentElement, NavigationMenuContentProps>(
  (props, forwardedRef) => {
    const { className, ...contentProps } = props;

    return (
      <NavigationMenuPrimitive.Content
        {...contentProps}
        ref={forwardedRef}
        className={cn("kb-navigation-menu-content", className)}
      />
    );
  }
);

NavigationMenuContent.displayName = "NavigationMenu.Content";

// Link Component
type NavigationMenuLinkElement = React.ElementRef<typeof NavigationMenuPrimitive.Link>;
type NavigationMenuLinkProps = React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link>;

const NavigationMenuLink = React.forwardRef<NavigationMenuLinkElement, NavigationMenuLinkProps>(
  (props, forwardedRef) => {
    const { className, ...linkProps } = props;

    return (
      <NavigationMenuPrimitive.Link
        {...linkProps}
        ref={forwardedRef}
        className={cn("kb-navigation-menu-link kb-reset", className)}
      />
    );
  }
);

NavigationMenuLink.displayName = "NavigationMenu.Link";

// Indicator Component
type NavigationMenuIndicatorElement = React.ElementRef<typeof NavigationMenuPrimitive.Indicator>;
type NavigationMenuIndicatorProps = React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>;

const NavigationMenuIndicator = React.forwardRef<NavigationMenuIndicatorElement, NavigationMenuIndicatorProps>(
  (props, forwardedRef) => {
    const { className, children, ...indicatorProps } = props;

    return (
      <NavigationMenuPrimitive.Indicator
        {...indicatorProps}
        ref={forwardedRef}
        className={cn("kb-navigation-menu-indicator", className)}
      >
        {children}
      </NavigationMenuPrimitive.Indicator>
    );
  }
);

NavigationMenuIndicator.displayName = "NavigationMenu.Indicator";

// Viewport Component
type NavigationMenuViewportElement = React.ElementRef<typeof NavigationMenuPrimitive.Viewport>;
type NavigationMenuViewportProps = React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>;

const NavigationMenuViewport = React.forwardRef<NavigationMenuViewportElement, NavigationMenuViewportProps>(
  (props, forwardedRef) => {
    const { className, ...viewportProps } = props;

    return (
      <div className="kb-navigation-menu-viewport-position">
        <NavigationMenuPrimitive.Viewport
          {...viewportProps}
          ref={forwardedRef}
          className={cn("kb-navigation-menu-viewport", className)}
        />
      </div>
    );
  }
);

NavigationMenuViewport.displayName = "NavigationMenu.Viewport";

// Export all components with both full names and short aliases
export {
  NavigationMenuRoot,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  NavigationMenuRoot as Root,
  NavigationMenuList as List,
  NavigationMenuItem as Item,
  NavigationMenuTrigger as Trigger,
  NavigationMenuContent as Content,
  NavigationMenuLink as Link,
  NavigationMenuIndicator as Indicator,
  NavigationMenuViewport as Viewport,
};
