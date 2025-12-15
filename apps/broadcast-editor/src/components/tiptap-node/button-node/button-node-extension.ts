import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { ButtonNode } from "./button-node.js";

export interface ButtonNodeExtensionOptions {
  align?: "left" | "right" | "center";

  href?: string;

  fullWidth?: boolean;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    button: {
      setButtonAlign: (
        options?: ButtonNodeExtensionOptions["align"]
      ) => ReturnType;
      setButtonHref: (
        options?: ButtonNodeExtensionOptions["href"]
      ) => ReturnType;
      setButtonFullWidth: (
        options?: ButtonNodeExtensionOptions["fullWidth"]
      ) => ReturnType;
      insertButton: (options?: ButtonNodeExtensionOptions) => ReturnType;
    };
  }
}

export const ButtonNodeExtension = Node.create<ButtonNodeExtensionOptions>({
  name: "button",

  group: "block",

  content: "inline*",

  addAttributes() {
    return {
      align: {
        default: "left",
        parseHTML: (element) => element.getAttribute("data-align") || "left",
        renderHTML: (attributes) => {
          return {
            "data-align": attributes.align,
          };
        },
      },
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-href") || null,
        renderHTML: (attributes) => {
          if (!attributes.href) return {};
          return {
            "data-href": attributes.href,
          };
        },
      },
      fullWidth: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-full-width") === "true",
        renderHTML: (attributes) => {
          if (!attributes.fullWidth) return {};
          return {
            "data-full-width": "true",
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "tiptap-button",
        getAttrs: (node) => ({
          align: node.getAttribute("data-align") || "left",
          href: node.getAttribute("data-href") || null,
        }),
      },
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => {
        return this.editor
          .chain()
          .insertContentAt(this.editor.state.selection.head, {
            type: this.type.name,
          })
          .focus()
          .run();
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const { align, href } = node.attrs;

    const attrs = mergeAttributes(HTMLAttributes, {
      "data-align": align,
    });

    if (href) {
      attrs["data-href"] = href;
    }

    return ["tiptap-button", attrs, 0];
  },

  addCommands() {
    return {
      setButtonAlign:
        (align) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;

          // Find the button node in the ancestry
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === this.name) {
              const pos = depth === 0 ? 0 : $from.before(depth);
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, align });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
      setButtonHref:
        (href) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;

          // Find the button node in the ancestry
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === this.name) {
              const pos = depth === 0 ? 0 : $from.before(depth);
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, href });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
      setButtonFullWidth:
        (fullWidth) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;

          // Find the button node in the ancestry
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === this.name) {
              const pos = depth === 0 ? 0 : $from.before(depth);
              if (dispatch) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, fullWidth });
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
      insertButton:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              align: "left",
              href: null,
              fullWidth: false,
              ...attributes,
            },
            content: [{ type: "text", text: "Button" }],
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonNode);
  },
});
