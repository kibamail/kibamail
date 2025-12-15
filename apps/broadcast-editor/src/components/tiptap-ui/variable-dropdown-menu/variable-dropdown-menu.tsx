"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Editor, Range } from "@tiptap/react";

// --- Lib ---
import { getElementOverflowPosition } from "@/lib/tiptap-collab-utils";

// --- Tiptap UI ---
import type {
  SuggestionItem,
  SuggestionMenuProps,
  SuggestionMenuRenderProps,
} from "@/components/tiptap-ui-utils/suggestion-menu";
import { SuggestionMenu } from "@/components/tiptap-ui-utils/suggestion-menu";

// --- UI Primitives ---
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button";
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card";

// --- Contexts ---
import { useVariables } from "@/contexts/variables-context";

type VariableDropdownMenuProps = Omit<
  SuggestionMenuProps,
  "items" | "children"
>;

interface VariableItemProps {
  item: SuggestionItem<string>;
  isSelected: boolean;
  onSelect: () => void;
}

export const VariableDropdownMenu = (props: VariableDropdownMenuProps) => {
  const { variables } = useVariables();

  const handleItemSelect = (selectProps: {
    editor: Editor;
    range: Range;
    context?: string;
  }) => {
    if (!selectProps.editor || !selectProps.context) return;

    // The SuggestionMenu's command handler already deleted the trigger text ({{ + query)
    // So we just need to insert the variable node at the current cursor position
    selectProps.editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "variable",
          attrs: {
            name: selectProps.context,
            fallback: null,
          },
        },
        {
          type: "text",
          text: " ",
        },
      ])
      .run();
  };

  const getSuggestionItems = async (queryProps: { query: string }) => {
    const { query } = queryProps;

    // Filter variables based on query
    const filteredVariables = query
      ? variables.filter((variable) =>
          variable.toLowerCase().includes(query.toLowerCase())
        )
      : variables;

    return filteredVariables.map((variable) => ({
      title: variable,
      context: variable,
      onSelect: handleItemSelect,
    }));
  };

  return (
    <SuggestionMenu
      char="{{"
      pluginKey="variableDropdownMenu"
      decorationClass="tiptap-variable-decoration"
      selector="tiptap-variable-dropdown-menu"
      items={getSuggestionItems}
      {...props}
    >
      {(renderProps) => <VariableList {...renderProps} />}
    </SuggestionMenu>
  );
};

const VariableItem = ({ item, isSelected, onSelect }: VariableItemProps) => {
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const menuElement = document.querySelector(
      '[data-selector="tiptap-variable-dropdown-menu"]'
    ) as HTMLElement;
    if (!itemRef.current || !isSelected || !menuElement) return;

    const overflow = getElementOverflowPosition(itemRef.current, menuElement);
    if (overflow === "top") {
      itemRef.current.scrollIntoView(true);
    } else if (overflow === "bottom") {
      itemRef.current.scrollIntoView(false);
    }
  }, [isSelected]);

  return (
    <Button
      ref={itemRef}
      data-style="ghost"
      data-active-state={isSelected ? "on" : "off"}
      onClick={onSelect}
      style={{ justifyContent: "flex-start", textAlign: "left" }}
    >
      <span className="tiptap-button-text">{item.title}</span>
    </Button>
  );
};

const VariableList = ({
  items,
  selectedIndex,
  onSelect,
}: SuggestionMenuRenderProps<string>) => {
  const renderedItems = useMemo(() => {
    return items.map((item, index) => (
      <VariableItem
        key={item.context || item.title}
        item={item}
        isSelected={index === selectedIndex}
        onSelect={() => onSelect(item)}
      />
    ));
  }, [items, selectedIndex, onSelect]);

  if (!renderedItems.length) {
    return null;
  }

  return (
    <Card
      style={{
        maxHeight: "var(--suggestion-menu-max-height)",
      }}
    >
      <CardBody>
        <ButtonGroup>{renderedItems}</ButtonGroup>
      </CardBody>
    </Card>
  );
};
