"use client"

import * as React from "react";
import cn from "classnames";
import * as TextField from "../text-field/text-field";
import { Command } from "cmdk";
import { Button } from "../button/button";
import { createContext } from "@radix-ui/react-context";
import {
  SearchIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  NoResultsIcon,
} from "./command-search-icons";

const COMMAND_SEARCH_NAME = "CommandSearch";

type CommandSearchRootElement = React.ElementRef<"div">;
type CommandSearchTriggerElement = React.ElementRef<"input">;
type CommandSearchContentElement = React.ElementRef<typeof Command.Dialog>;
type CommandSearchInputElement = React.ElementRef<typeof Command.Input>;
type CommandSearchListElement = React.ElementRef<typeof Command.List>;
type CommandSearchGroupElement = React.ElementRef<typeof Command.Group>;
type CommandSearchEmptyElement = React.ElementRef<typeof Command.Empty>;
type CommandSearchItemElement = React.ElementRef<typeof Command.Item>;
type CommandSearchSeparatorElement = React.ElementRef<typeof Command.Separator>;
type CommandSearchFooterElement = React.ElementRef<"div">;

interface CommandSearchRootProps extends React.ComponentPropsWithoutRef<"div"> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface CommandSearchTriggerProps
  extends React.ComponentPropsWithoutRef<"input"> {
  placeholder?: string;
}

interface CommandSearchContentProps
  extends React.ComponentPropsWithoutRef<typeof Command.Dialog> {}

interface CommandSearchInputProps
  extends React.ComponentPropsWithoutRef<typeof Command.Input> {
  placeholder?: string;
}

interface CommandSearchListProps
  extends React.ComponentPropsWithoutRef<typeof Command.List> {}

interface CommandSearchGroupProps
  extends React.ComponentPropsWithoutRef<typeof Command.Group> {}

interface CommandSearchEmptyProps
  extends React.ComponentPropsWithoutRef<typeof Command.Empty> {}

interface CommandSearchItemProps
  extends React.ComponentPropsWithoutRef<typeof Command.Item> {}

interface CommandSearchSeparatorProps
  extends React.ComponentPropsWithoutRef<typeof Command.Separator> {}

interface CommandSearchFooterProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const [CommandSearchProvider, useCommandSearchContext] = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>(COMMAND_SEARCH_NAME);

const CommandSearchRoot: React.FC<CommandSearchRootProps> = (props) => {
  const { open: openProp, onOpenChange, children, ...divProps } = props;
  const [open, setOpen] = React.useState(openProp ?? false);

  React.useEffect(() => {
    if (openProp !== undefined) {
      setOpen(openProp);
    }
  }, [openProp]);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange]
  );

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, handleOpenChange]);

  return (
    <CommandSearchProvider open={open} setOpen={handleOpenChange}>
      <div {...divProps}>{children}</div>
    </CommandSearchProvider>
  );
};

CommandSearchRoot.displayName = "CommandSearch.Root";

const CommandSearchTrigger = React.forwardRef<
  CommandSearchTriggerElement,
  CommandSearchTriggerProps
>((props, forwardedRef) => {
  const { placeholder = "Search", className, size, ...inputProps } = props;
  const { setOpen } = useCommandSearchContext("CommandSearch.Trigger");

  return (
    <TextField.Root
      {...inputProps}
      ref={forwardedRef}
      readOnly
      placeholder={placeholder}
      onClick={() => setOpen(true)}
      className={cn("kb-command-search", className)}
    >
      <TextField.Slot side="left" onClick={() => setOpen(true)}>
        <SearchIcon />
      </TextField.Slot>

      <TextField.Slot
        side="right"
        className="kb-command-search-slot-right"
        onClick={() => setOpen(true)}
      >
        <span>⌘</span>
        <span>k</span>
      </TextField.Slot>
    </TextField.Root>
  );
});

CommandSearchTrigger.displayName = "CommandSearch.Trigger";

const CommandSearchContent = React.forwardRef<
  CommandSearchContentElement,
  CommandSearchContentProps
>((props, forwardedRef) => {
  const { className, children, ...dialogProps } = props;
  const { open, setOpen } = useCommandSearchContext("CommandSearch.Content");

  if (!open) return null;

  return (
    <>
      <div
        className="kb-command-search-dialog-overlay"
        onClick={() => setOpen(false)}
      />
      <Command.Dialog
        {...dialogProps}
        ref={forwardedRef}
        open={open}
        onOpenChange={setOpen}
        label="Global Command Menu"
        className={cn("kb-command-search-dialog", className)}
      >
        {children}
      </Command.Dialog>
    </>
  );
});

CommandSearchContent.displayName = "CommandSearch.Content";

const CommandSearchInput = React.forwardRef<
  CommandSearchInputElement,
  CommandSearchInputProps
>((props, forwardedRef) => {
  const { placeholder = "Search...", className, ...inputProps } = props;

  return (
    <div className="kb-command-search-dialog-input-wrapper">
      <SearchIcon />
      <Command.Input
        {...inputProps}
        ref={forwardedRef}
        className={cn("kb-command-search-dialog-input", className)}
        placeholder={placeholder}
      />
      <Button size="xs" variant="secondary">
        ⌘K
      </Button>
    </div>
  );
});

CommandSearchInput.displayName = "CommandSearch.Input";

const CommandSearchList = React.forwardRef<
  CommandSearchListElement,
  CommandSearchListProps
>((props, forwardedRef) => {
  const { className, children, ...listProps } = props;

  return (
    <div className="kb-command-search-dialog-content">
      <Command.List
        {...listProps}
        ref={forwardedRef}
        className={cn("kb-command-search-dialog-list", className)}
      >
        {children}
      </Command.List>
    </div>
  );
});

CommandSearchList.displayName = "CommandSearch.List";

const CommandSearchGroup = React.forwardRef<
  CommandSearchGroupElement,
  CommandSearchGroupProps
>((props, forwardedRef) => {
  const { className, ...groupProps } = props;

  return (
    <Command.Group
      {...groupProps}
      ref={forwardedRef}
      className={cn("kb-command-search-dialog-group", className)}
    />
  );
});

CommandSearchGroup.displayName = "CommandSearch.Group";

const CommandSearchEmpty = React.forwardRef<
  CommandSearchEmptyElement,
  CommandSearchEmptyProps
>((props, forwardedRef) => {
  const { className, children, ...emptyProps } = props;

  return (
    <Command.Empty
      {...emptyProps}
      ref={forwardedRef}
      className={cn("kb-command-search-dialog-empty", className)}
    >
      <NoResultsIcon />
      {children}
    </Command.Empty>
  );
});

CommandSearchEmpty.displayName = "CommandSearch.Empty";

const CommandSearchItem = React.forwardRef<
  CommandSearchItemElement,
  CommandSearchItemProps
>((props, forwardedRef) => {
  const { className, ...itemProps } = props;

  return (
    <Command.Item
      {...itemProps}
      ref={forwardedRef}
      className={cn("kb-command-search-dialog-item", className)}
    />
  );
});

CommandSearchItem.displayName = "CommandSearch.Item";

const CommandSearchSeparator = React.forwardRef<
  CommandSearchSeparatorElement,
  CommandSearchSeparatorProps
>((props, forwardedRef) => {
  const { className, ...separatorProps } = props;

  return (
    <Command.Separator
      {...separatorProps}
      ref={forwardedRef}
      className={cn("kb-command-search-dialog-separator", className)}
    />
  );
});

CommandSearchSeparator.displayName = "CommandSearch.Separator";

const CommandSearchFooter = React.forwardRef<
  CommandSearchFooterElement,
  CommandSearchFooterProps
>((props, forwardedRef) => {
  const { className, children, ...footerProps } = props;
  const { setOpen } = useCommandSearchContext("CommandSearch.Footer");

  return (
    <div
      {...footerProps}
      ref={forwardedRef}
      className={cn("kb-command-search-dialog-footer", className)}
    >
      <div className="kb-command-search-dialog-footer-left">
        <span>Use</span>
        <Button size="xs" variant="secondary">
          <ArrowUpIcon />
        </Button>
        <Button size="xs" variant="secondary">
          <ArrowDownIcon />
        </Button>
        <span>to navigate</span>
      </div>
      <div className="kb-command-search-dialog-footer-right">
        <Button size="xs" variant="tertiary" onClick={() => setOpen(false)}>
          Close
        </Button>
        <Button size="xs" variant="secondary">
          esc
        </Button>
      </div>
    </div>
  );
});

CommandSearchFooter.displayName = "CommandSearch.Footer";

export {
  CommandSearchRoot,
  CommandSearchTrigger,
  CommandSearchContent,
  CommandSearchInput,
  CommandSearchList,
  CommandSearchGroup,
  CommandSearchEmpty,
  CommandSearchItem,
  CommandSearchSeparator,
  CommandSearchFooter,
  CommandSearchRoot as Root,
  CommandSearchTrigger as Trigger,
  CommandSearchContent as Content,
  CommandSearchInput as Input,
  CommandSearchList as List,
  CommandSearchGroup as Group,
  CommandSearchEmpty as Empty,
  CommandSearchItem as Item,
  CommandSearchSeparator as Separator,
  CommandSearchFooter as Footer,
};
