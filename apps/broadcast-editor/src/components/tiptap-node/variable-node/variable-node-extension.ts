import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { VariableNodeView } from "./variable-node-view";

export interface VariableNodeOptions {
  /**
   * HTML attributes to add to the variable element
   */
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    variable: {
      /**
       * Insert a variable node
       */
      insertVariable: (options: { name: string; fallback?: string }) => ReturnType;
      /**
       * Update the fallback value of a variable
       */
      setVariableFallback: (fallback: string) => ReturnType;
    };
  }
}

export const VariableNodeExtension = Node.create<VariableNodeOptions>({
  name: "variable",

  // Inline node that sits within text
  group: "inline",
  inline: true,

  // Atomic - cannot place cursor inside
  atom: true,

  // Selectable as a unit
  selectable: true,

  // Can be dragged
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-name"),
        renderHTML: (attributes) => ({
          "data-name": attributes.name,
        }),
      },
      fallback: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-fallback"),
        renderHTML: (attributes) => {
          if (!attributes.fallback) return {};
          return {
            "data-fallback": attributes.fallback,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { name, fallback } = node.attrs;

    // Display format: {{name}} or {{name | fallback}}
    const displayText = fallback ? `{{${name} | ${fallback}}}` : `{{${name}}}`;

    return [
      "span",
      mergeAttributes(
        { "data-type": this.name },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      displayText,
    ];
  },

  addCommands() {
    return {
      insertVariable:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              name: options.name,
              fallback: options.fallback || null,
            },
          });
        },
      setVariableFallback:
        (fallback) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { fallback });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableNodeView);
  },
});
