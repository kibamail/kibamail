/* -------------------------------------------------------------------------------------------------
 * The content of this file is completely copied from radix ui, and we just added the TabsIndicator
 * component. Radix ui does not export the context, so we're copying the code and manually adding
 * the indicator until we can find a better smoother way to access the state without duplicating
 * state.
 * -----------------------------------------------------------------------------------------------*/

import * as React from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { createContextScope } from "@radix-ui/react-context";
import { createRovingFocusGroupScope } from "@radix-ui/react-roving-focus";
import { Presence } from "@radix-ui/react-presence";
import { Primitive } from "@radix-ui/react-primitive";
import * as RovingFocusGroup from "@radix-ui/react-roving-focus";
import { useDirection } from "@radix-ui/react-direction";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { useId } from "@radix-ui/react-id";

import type { Scope } from "@radix-ui/react-context";

/* -------------------------------------------------------------------------------------------------
 * Tabs
 * -----------------------------------------------------------------------------------------------*/

const TABS_NAME = "Tabs";

type ScopedProps<P> = P & { __scopeTabs?: Scope };
const [createTabsContext, createTabsScope] = createContextScope(TABS_NAME, [
  createRovingFocusGroupScope,
]);
const useRovingFocusGroupScope = createRovingFocusGroupScope();

type TabsContextValue = {
  baseId: string;
  value?: string;
  onValueChange: (value: string) => void;
  orientation?: TabsProps["orientation"];
  dir?: TabsProps["dir"];
  activationMode?: TabsProps["activationMode"];
};

const [TabsProvider, useTabsContext] =
  createTabsContext<TabsContextValue>(TABS_NAME);

type TabsElement = React.ElementRef<typeof Primitive.div>;
type RovingFocusGroupProps = React.ComponentPropsWithoutRef<
  typeof RovingFocusGroup.Root
>;
type PrimitiveDivProps = React.ComponentPropsWithoutRef<typeof Primitive.div>;
interface TabsProps extends PrimitiveDivProps {
  /** The value for the selected tab, if controlled */
  value?: string;
  /** The value of the tab to select by default, if uncontrolled */
  defaultValue?: string;
  /** A function called when a new tab is selected */
  onValueChange?: (value: string) => void;
  /**
   * The orientation the tabs are layed out.
   * Mainly so arrow navigation is done accordingly (left & right vs. up & down)
   * @defaultValue horizontal
   */
  orientation?: RovingFocusGroupProps["orientation"];
  /**
   * The direction of navigation between toolbar items.
   */
  dir?: RovingFocusGroupProps["dir"];
  /**
   * Whether a tab is activated automatically or manually.
   * @defaultValue automatic
   * */
  activationMode?: "automatic" | "manual";
}

const Tabs = React.forwardRef<TabsElement, TabsProps>(
  (props: ScopedProps<TabsProps>, forwardedRef) => {
    const {
      __scopeTabs,
      value: valueProp,
      onValueChange,
      defaultValue,
      orientation = "horizontal",
      dir,
      activationMode = "automatic",
      ...tabsProps
    } = props;
    const direction = useDirection(dir);
    const [value, setValue] = useControllableState<string>({
      prop: valueProp,
      onChange: onValueChange,
      defaultProp: defaultValue ?? "",
    });

    return (
      <TabsProvider
        scope={__scopeTabs}
        baseId={useId()}
        value={value}
        onValueChange={setValue}
        orientation={orientation}
        dir={direction}
        activationMode={activationMode}
      >
        <Primitive.div
          dir={direction}
          data-orientation={orientation}
          {...tabsProps}
          ref={forwardedRef}
        />
      </TabsProvider>
    );
  },
);

Tabs.displayName = TABS_NAME;

/* -------------------------------------------------------------------------------------------------
 * TabsList
 * -----------------------------------------------------------------------------------------------*/

const TAB_LIST_NAME = "TabsList";

type TabsListElement = React.ElementRef<typeof Primitive.div>;
interface TabsListProps extends PrimitiveDivProps {
  loop?: RovingFocusGroupProps["loop"];
}

const TabsList = React.forwardRef<TabsListElement, TabsListProps>(
  (props: ScopedProps<TabsListProps>, forwardedRef) => {
    const { __scopeTabs, loop = true, style, ...listProps } = props;
    const context = useTabsContext(TAB_LIST_NAME, __scopeTabs);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);

    return (
      <RovingFocusGroup.Root
        asChild
        {...rovingFocusGroupScope}
        orientation={context.orientation}
        dir={context.dir}
        loop={loop}
      >
        <Primitive.div
          role="tablist"
          style={{ position: "relative", ...style }}
          aria-orientation={context.orientation}
          {...listProps}
          ref={forwardedRef}
        />
      </RovingFocusGroup.Root>
    );
  },
);

TabsList.displayName = TAB_LIST_NAME;

/* -------------------------------------------------------------------------------------------------
 * TabsTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = "TabsTrigger";

type TabsTriggerElement = React.ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = React.ComponentPropsWithoutRef<
  typeof Primitive.button
>;
interface TabsTriggerProps extends PrimitiveButtonProps {
  value: string;
}

const TabsTrigger = React.forwardRef<TabsTriggerElement, TabsTriggerProps>(
  (props: ScopedProps<TabsTriggerProps>, forwardedRef) => {
    const { __scopeTabs, value, disabled = false, ...triggerProps } = props;
    const context = useTabsContext(TRIGGER_NAME, __scopeTabs);
    const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeTabs);
    const triggerId = makeTriggerId(context.baseId, value);
    const contentId = makeContentId(context.baseId, value);
    const isSelected = value === context.value;
    return (
      <RovingFocusGroup.Item
        asChild
        {...rovingFocusGroupScope}
        focusable={!disabled}
        active={isSelected}
      >
        <Primitive.button
          type="button"
          role="tab"
          aria-selected={isSelected}
          aria-controls={contentId}
          data-state={isSelected ? "active" : "inactive"}
          data-disabled={disabled ? "" : undefined}
          disabled={disabled}
          id={triggerId}
          {...triggerProps}
          ref={forwardedRef}
          onMouseDown={composeEventHandlers(props.onMouseDown, (event) => {
            // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
            // but not when the control key is pressed (avoiding MacOS right click)
            if (!disabled && event.button === 0 && event.ctrlKey === false) {
              context.onValueChange(value);
            } else {
              // prevent focus to avoid accidental activation
              event.preventDefault();
            }
          })}
          onKeyDown={composeEventHandlers(props.onKeyDown, (event) => {
            if ([" ", "Enter"].includes(event.key))
              context.onValueChange(value);
          })}
          onFocus={composeEventHandlers(props.onFocus, () => {
            // handle "automatic" activation if necessary
            // ie. activate tab following focus
            const isAutomaticActivation = context.activationMode !== "manual";
            if (!isSelected && !disabled && isAutomaticActivation) {
              context.onValueChange(value);
            }
          })}
        />
      </RovingFocusGroup.Item>
    );
  },
);

TabsTrigger.displayName = TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * TabsIndicator
 * -----------------------------------------------------------------------------------------------*/

const INDICATOR_NAME = "TabsIndicator";

type TabsIndicatorElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveIndicatorProps = React.ComponentPropsWithoutRef<
  typeof Primitive.div
>;

interface TabsIndicatorProps extends PrimitiveIndicatorProps {}

const TabsIndicator = React.forwardRef<
  TabsIndicatorElement,
  TabsIndicatorProps
>((props: ScopedProps<TabsIndicatorProps>, forwardedRef) => {
  const { __scopeTabs, style, ...indicatorProps } = props;

  const context = useTabsContext(INDICATOR_NAME, __scopeTabs);
  const [position, setPosition] = React.useState<{
    size: number;
    offset: number;
  } | null>(null);

  const isHorizontal = context.orientation === "horizontal";

  function updateIndicatorPosition(value: string | undefined) {
    if (!value) {
      return;
    }

    const activeTriggerId = makeTriggerId(context.baseId, value);
    const activeTrigger = document.getElementById(activeTriggerId);

    if (!activeTrigger) {
      return;
    }

    setPosition({
      size: isHorizontal
        ? activeTrigger.offsetWidth
        : activeTrigger.offsetHeight,
      offset: isHorizontal ? activeTrigger.offsetLeft : activeTrigger.offsetTop,
    });
  }

  React.useEffect(
    function () {
      updateIndicatorPosition(context.value);
    },
    [context.value],
  );

  return (
    <Primitive.div
      aria-hidden
      ref={forwardedRef}
      style={
        isHorizontal
          ? ({
              position: "absolute",
              left: 0,
              transform: `translateX(${position?.offset || 0}px)`,
              "--tabs-indicator-active-position-size": position?.size,
              ...style,
            } as React.CSSProperties)
          : ({
              position: "absolute",
              top: 0,
              transform: `translateY(${position?.offset || 0}px)`,
              "--tabs-indicator-active-position-size": position?.size,
              ...style,
            } as React.CSSProperties)
      }
      {...indicatorProps}
    />
  );
});

/* -------------------------------------------------------------------------------------------------
 * TabsContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = "TabsContent";

type TabsContentElement = React.ElementRef<typeof Primitive.div>;
interface TabsContentProps extends PrimitiveDivProps {
  value: string;

  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: true;
}

const TabsContent = React.forwardRef<TabsContentElement, TabsContentProps>(
  (props: ScopedProps<TabsContentProps>, forwardedRef) => {
    const { __scopeTabs, value, forceMount, children, ...contentProps } = props;
    const context = useTabsContext(CONTENT_NAME, __scopeTabs);
    const triggerId = makeTriggerId(context.baseId, value);
    const contentId = makeContentId(context.baseId, value);
    const isSelected = value === context.value;
    const isMountAnimationPreventedRef = React.useRef(isSelected);

    React.useEffect(() => {
      const rAF = requestAnimationFrame(
        () => (isMountAnimationPreventedRef.current = false),
      );
      return () => cancelAnimationFrame(rAF);
    }, []);

    return (
      <Presence present={forceMount || isSelected}>
        {({ present }) => (
          <Primitive.div
            data-state={isSelected ? "active" : "inactive"}
            data-orientation={context.orientation}
            role="tabpanel"
            aria-labelledby={triggerId}
            hidden={!present}
            id={contentId}
            tabIndex={0}
            {...contentProps}
            ref={forwardedRef}
            style={{
              ...props.style,
              animationDuration: isMountAnimationPreventedRef.current
                ? "0s"
                : undefined,
            }}
          >
            {present && children}
          </Primitive.div>
        )}
      </Presence>
    );
  },
);

TabsContent.displayName = CONTENT_NAME;

/* ---------------------------------------------------------------------------------------------- */

function makeTriggerId(baseId: string, value: string) {
  return `${baseId}-trigger-${value}`;
}

function makeContentId(baseId: string, value: string) {
  return `${baseId}-content-${value}`;
}

const Root = Tabs;
const List = TabsList;
const Trigger = TabsTrigger;
const Content = TabsContent;
const Indicator = TabsIndicator;

export {
  createTabsScope,
  //
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsIndicator,
  //
  Root,
  List,
  Trigger,
  Content,
  Indicator,
};
export type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
  TabsIndicatorProps,
};
