import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { PanelNode } from "./panel-node.js";

export interface PanelNodeExtensionOptions {
  // No options for now, but interface is required for type safety
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    panel: {
      insertPanel: (options?: PanelNodeExtensionOptions) => ReturnType;
    };
  }
}

export const PanelNodeExtension = Node.create<PanelNodeExtensionOptions>({
  name: "panel",

  group: "block",

  content: "block+",

  defining: true,

  parseHTML() {
    return [
      {
        tag: "tiptap-panel",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["tiptap-panel", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      insertPanel:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
            content: [
              {
                type: "paragraph",
              },
            ],
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(PanelNode);
  },
});
