import * as React from "react";
import cn from "classnames";

type SettingsCardRootElement = React.ElementRef<"div">;
type SettingsCardHeaderElement = React.ElementRef<"div">;
type SettingsCardContentElement = React.ElementRef<"div">;
type SettingsCardFooterElement = React.ElementRef<"div">;
type SettingsCardActionsElement = React.ElementRef<"div">;

interface SettingsCardRootProps extends React.ComponentPropsWithoutRef<"div"> {}
interface SettingsCardHeaderProps
  extends React.ComponentPropsWithoutRef<"div"> {}
interface SettingsCardContentProps
  extends React.ComponentPropsWithoutRef<"div"> {}
interface SettingsCardFooterProps
  extends React.ComponentPropsWithoutRef<"div"> {}
interface SettingsCardActionsProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const SettingsCardRoot = React.forwardRef<
  SettingsCardRootElement,
  SettingsCardRootProps
>((props, forwardedRef) => {
  const { className, children, ...divProps } = props;

  return (
    <div
      {...divProps}
      ref={forwardedRef}
      className={cn("kb-settings-card", className)}
    >
      {children}
    </div>
  );
});

SettingsCardRoot.displayName = "SettingsCard.Root";

const SettingsCardHeader = React.forwardRef<
  SettingsCardHeaderElement,
  SettingsCardHeaderProps
>((props, forwardedRef) => {
  const { className, children, ...divProps } = props;

  return (
    <div
      {...divProps}
      ref={forwardedRef}
      className={cn("kb-settings-card-header", className)}
    >
      {children}
    </div>
  );
});

SettingsCardHeader.displayName = "SettingsCard.Header";

const SettingsCardContent = React.forwardRef<
  SettingsCardContentElement,
  SettingsCardContentProps
>((props, forwardedRef) => {
  const { className, children, ...divProps } = props;

  return (
    <div
      {...divProps}
      ref={forwardedRef}
      className={cn("kb-settings-card-content", className)}
    >
      {children}
    </div>
  );
});

SettingsCardContent.displayName = "SettingsCard.Content";

const SettingsCardFooter = React.forwardRef<
  SettingsCardFooterElement,
  SettingsCardFooterProps
>((props, forwardedRef) => {
  const { className, children, ...divProps } = props;

  return (
    <div
      {...divProps}
      ref={forwardedRef}
      className={cn("kb-settings-card-footer", className)}
    >
      {children}
    </div>
  );
});

SettingsCardFooter.displayName = "SettingsCard.Footer";

const SettingsCardActions = React.forwardRef<
  SettingsCardActionsElement,
  SettingsCardActionsProps
>((props, forwardedRef) => {
  const { className, children, ...divProps } = props;

  return (
    <div
      {...divProps}
      ref={forwardedRef}
      className={cn("kb-settings-card-actions", className)}
    >
      {children}
    </div>
  );
});

SettingsCardActions.displayName = "SettingsCard.Actions";

export {
  SettingsCardRoot,
  SettingsCardHeader,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardActions,
  SettingsCardRoot as Root,
  SettingsCardHeader as Header,
  SettingsCardContent as Content,
  SettingsCardFooter as Footer,
  SettingsCardActions as Actions,
};
