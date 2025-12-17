"use client";

import { useCallback } from "react";
import type { Editor } from "@tiptap/react";

// --- Icons ---
import {
  Code as CodeBlockIcon,
  MediaImage as ImageIcon,
  List as ListIcon,
  NumberedListLeft as ListOrderedIcon,
  Quote as BlockquoteIcon,
  Minus as MinusIcon,
  Text as TextIcon,
  Emoji as SmilePlusIcon,
  CursorPointer as ButtonIcon,
  FrameAlt as PanelIcon,
} from "iconoir-react";
import { HeadingOneIcon } from "@/components/tiptap-icons/heading-one-icon";
import { HeadingTwoIcon } from "@/components/tiptap-icons/heading-two-icon";
import { HeadingThreeIcon } from "@/components/tiptap-icons/heading-three-icon";
import { FooterIcon } from "@/components/tiptap-icons/footer-icon";

// --- Lib ---
import { isExtensionAvailable, isNodeInSchema } from "@/lib/tiptap-utils";

// --- Contexts ---
import {
  useEditorConfig,
  type SimpleStyleKey,
} from "@/contexts/editor-config-context";
import type { HeadingLevel } from "@/types/editor-config";

// --- Tiptap UI ---
import type { SuggestionItem } from "@/components/tiptap-ui-utils/suggestion-menu";
import { addEmojiTrigger } from "@/components/tiptap-ui/emoji-trigger-button";

/**
 * Style getter functions passed to item implementations
 */
interface StyleGetters {
  getStyles: (type: SimpleStyleKey) => React.CSSProperties | undefined;
  getHeadingStyles: (level: HeadingLevel) => React.CSSProperties | undefined;
}

export interface SlashMenuConfig {
  enabledItems?: SlashMenuItemType[];
  customItems?: SuggestionItem[];
  itemGroups?: {
    [key in SlashMenuItemType]?: string;
  };
  showGroups?: boolean;
}

const texts = {
  // Style
  text: {
    title: "Text",
    subtext: "Regular text paragraph",
    keywords: ["p", "paragraph", "text"],
    badge: TextIcon,
    group: "Style",
  },
  heading_1: {
    title: "Heading 1",
    subtext: "Top-level heading",
    keywords: ["h", "heading1", "h1"],
    badge: HeadingOneIcon,
    group: "Style",
  },
  heading_2: {
    title: "Heading 2",
    subtext: "Key section heading",
    keywords: ["h2", "heading2", "subheading"],
    badge: HeadingTwoIcon,
    group: "Style",
  },
  heading_3: {
    title: "Heading 3",
    subtext: "Subsection and group heading",
    keywords: ["h3", "heading3", "subheading"],
    badge: HeadingThreeIcon,
    group: "Style",
  },
  bullet_list: {
    title: "Bullet List",
    subtext: "List with unordered items",
    keywords: ["ul", "li", "list", "bulletlist", "bullet list"],
    badge: ListIcon,
    group: "Style",
  },
  ordered_list: {
    title: "Numbered List",
    subtext: "List with ordered items",
    keywords: ["ol", "li", "list", "numberedlist", "numbered list"],
    badge: ListOrderedIcon,
    group: "Style",
  },

  quote: {
    title: "Blockquote",
    subtext: "Blockquote block",
    keywords: ["quote", "blockquote"],
    badge: BlockquoteIcon,
    group: "Style",
  },
  code_block: {
    title: "Code Block",
    subtext: "Code block with syntax highlighting",
    keywords: ["code", "pre"],
    badge: CodeBlockIcon,
    group: "Style",
  },

  emoji: {
    title: "Emoji",
    subtext: "Insert an emoji",
    keywords: ["emoji", "emoticon", "smiley"],
    badge: SmilePlusIcon,
    group: "Insert",
  },

  divider: {
    title: "Separator",
    subtext: "Horizontal line to separate content",
    keywords: ["hr", "horizontalRule", "line", "separator"],
    badge: MinusIcon,
    group: "Insert",
  },

  // Upload
  image: {
    title: "Image",
    subtext: "Resizable image with caption",
    keywords: [
      "image",
      "imageUpload",
      "upload",
      "img",
      "picture",
      "media",
      "url",
    ],
    badge: ImageIcon,
    group: "Upload",
  },

  button: {
    title: "Button",
    subtext: "Button link",
    keywords: ["anchor", "button"],
    badge: ButtonIcon,
    group: "Insert",
  },

  panel: {
    title: "Panel",
    subtext: "Container for organizing content",
    keywords: ["panel", "container", "box", "section"],
    badge: PanelIcon,
    group: "Insert",
  },

  footer: {
    title: "Email Footer",
    subtext: "Email footer with unsubscribe and address",
    keywords: ["footer", "unsubscribe", "address", "compliance", "can-spam"],
    badge: FooterIcon,
    group: "Insert",
  },
};

export type SlashMenuItemType = keyof typeof texts;

/**
 * Action context passed to item implementations
 */
interface ActionContext {
  editor: Editor;
  styleGetters: StyleGetters;
}

const getItemImplementations = (_styleGetters: StyleGetters) => {
  return {
    // Style
    text: {
      check: (editor: Editor) => isNodeInSchema("paragraph", editor),
      action: ({ editor, styleGetters }: ActionContext) => {
        const paragraphStyles = styleGetters.getStyles("paragraph") || {};
        editor
          .chain()
          .focus()
          .insertContent({
            type: "paragraph",
            attrs: { customStyle: paragraphStyles },
          })
          .run();
      },
    },
    heading_1: {
      check: (editor: Editor) => isNodeInSchema("heading", editor),
      action: ({ editor, styleGetters }: ActionContext) => {
        const headingStyles = styleGetters.getHeadingStyles(1) || {};
        editor
          .chain()
          .focus()
          .insertContent({
            type: "heading",
            attrs: { level: 1, customStyle: headingStyles },
          })
          .run();
      },
    },
    heading_2: {
      check: (editor: Editor) => isNodeInSchema("heading", editor),
      action: ({ editor, styleGetters }: ActionContext) => {
        const headingStyles = styleGetters.getHeadingStyles(2) || {};
        editor
          .chain()
          .focus()
          .insertContent({
            type: "heading",
            attrs: { level: 2, customStyle: headingStyles },
          })
          .run();
      },
    },
    heading_3: {
      check: (editor: Editor) => isNodeInSchema("heading", editor),
      action: ({ editor, styleGetters }: ActionContext) => {
        const headingStyles = styleGetters.getHeadingStyles(3) || {};
        editor
          .chain()
          .focus()
          .insertContent({
            type: "heading",
            attrs: { level: 3, customStyle: headingStyles },
          })
          .run();
      },
    },
    bullet_list: {
      check: (editor: Editor) => isNodeInSchema("bulletList", editor),
      action: ({ editor }: ActionContext) => {
        editor.chain().focus().toggleBulletList().run();
      },
    },
    ordered_list: {
      check: (editor: Editor) => isNodeInSchema("orderedList", editor),
      action: ({ editor }: ActionContext) => {
        editor.chain().focus().toggleOrderedList().run();
      },
    },
    quote: {
      check: (editor: Editor) => isNodeInSchema("blockquote", editor),
      action: ({ editor }: ActionContext) => {
        editor.chain().focus().toggleBlockquote().run();
      },
    },
    code_block: {
      check: (editor: Editor) => isNodeInSchema("codeBlock", editor),
      action: ({ editor }: ActionContext) => {
        editor.chain().focus().toggleNode("codeBlock", "paragraph").run();
      },
    },

    emoji: {
      check: (editor: Editor) =>
        isExtensionAvailable(editor, ["emoji", "emojiPicker"]),
      action: ({ editor }: ActionContext) => addEmojiTrigger(editor),
    },
    divider: {
      check: (editor: Editor) => isNodeInSchema("horizontalRule", editor),
      action: ({ editor }: ActionContext) => {
        editor.chain().focus().setHorizontalRule().run();
      },
    },
    // Upload
    image: {
      check: (editor: Editor) => isNodeInSchema("image", editor),
      action: ({ editor }: ActionContext) => {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "imageUpload",
          })
          .run();
      },
    },

    // Button insert
    button: {
      check: (editor: Editor) => isNodeInSchema("button", editor),
      action: ({ editor, styleGetters }: ActionContext) => {
        const buttonStyles = styleGetters.getStyles("button") || {};
        console.log("[SlashMenu] Inserting button with styles:", buttonStyles);
        editor
          .chain()
          .focus()
          .insertContent({
            type: "button",
            attrs: {
              align: "left",
              href: null,
              fullWidth: false,
              customStyle: buttonStyles,
            },
            content: [{ type: "text", text: "Button" }],
          })
          .run();
      },
    },

    // Panel insert
    panel: {
      check: (editor: Editor) => isNodeInSchema("panel", editor),
      action: ({ editor, styleGetters }: ActionContext) => {
        const panelStyles = styleGetters.getStyles("panel") || {};
        editor
          .chain()
          .focus()
          .insertContent({
            type: "panel",
            attrs: { customStyle: panelStyles },
            content: [{ type: "paragraph" }],
          })
          .run();
      },
    },

    // Footer insert
    footer: {
      check: (editor: Editor) =>
        isNodeInSchema("paragraph", editor) &&
        isNodeInSchema("horizontalRule", editor),
      action: ({ editor, styleGetters }: ActionContext) => {
        // Footer uses a fixed smaller font size, merged with global paragraph styles
        const paragraphStyles = styleGetters.getStyles("paragraph") || {};
        const footerStyle = { ...paragraphStyles, fontSize: "14px" };

        editor
          .chain()
          .focus()
          .insertContent([
            // Horizontal divider at top
            { type: "horizontalRule" },
            // Opt-in message
            {
              type: "paragraph",
              attrs: { textAlign: "center", customStyle: footerStyle },
              content: [
                {
                  type: "text",
                  text: "You are receiving this email because you opted in via our site.",
                },
              ],
            },
            // Change preferences question
            {
              type: "paragraph",
              attrs: { textAlign: "center", customStyle: footerStyle },
              content: [
                {
                  type: "text",
                  text: "Want to change how you receive these emails?",
                },
              ],
            },
            // Unsubscribe and preferences links
            {
              type: "paragraph",
              attrs: { textAlign: "center", customStyle: footerStyle },
              content: [
                { type: "text", text: "You can " },
                {
                  type: "text",
                  text: "unsubscribe from this list",
                  marks: [
                    {
                      type: "link",
                      attrs: { href: "{{unsubscribe_url}}" },
                    },
                  ],
                },
                { type: "text", text: " or manage your " },
                {
                  type: "text",
                  text: "email preferences",
                  marks: [
                    {
                      type: "link",
                      attrs: { href: "{{preferences_url}}" },
                    },
                  ],
                },
                { type: "text", text: "." },
              ],
            },
            // Empty line for spacing
            { type: "paragraph", attrs: { customStyle: footerStyle } },
            // Company name
            {
              type: "paragraph",
              attrs: { textAlign: "center", customStyle: footerStyle },
              content: [{ type: "text", text: "Your Company Name" }],
            },
            // Street address
            {
              type: "paragraph",
              attrs: { textAlign: "center", customStyle: footerStyle },
              content: [{ type: "text", text: "123 Street Address" }],
            },
            // City, State, Zip
            {
              type: "paragraph",
              attrs: { textAlign: "center", customStyle: footerStyle },
              content: [{ type: "text", text: "City, State 12345" }],
            },
          ])
          .run();
      },
    },
  };
};

function organizeItemsByGroups(
  items: SuggestionItem[],
  showGroups: boolean
): SuggestionItem[] {
  if (!showGroups) {
    return items.map((item) => ({ ...item, group: "" }));
  }

  const groups: { [groupLabel: string]: SuggestionItem[] } = {};

  // Group items
  items.forEach((item) => {
    const groupLabel = item.group || "";
    if (!groups[groupLabel]) {
      groups[groupLabel] = [];
    }
    groups[groupLabel].push(item);
  });

  // Flatten groups in order (this maintains the visual order for keyboard navigation)
  const organizedItems: SuggestionItem[] = [];
  Object.entries(groups).forEach(([, groupItems]) => {
    organizedItems.push(...groupItems);
  });

  return organizedItems;
}

/**
 * Custom hook for slash dropdown menu functionality
 */
export function useSlashDropdownMenu(config?: SlashMenuConfig) {
  const { getStyles, getHeadingStyles } = useEditorConfig();

  const styleGetters: StyleGetters = {
    getStyles,
    getHeadingStyles,
  };

  const getSlashMenuItems = useCallback(
    (editor: Editor) => {
      const items: SuggestionItem[] = [];

      const enabledItems =
        config?.enabledItems || (Object.keys(texts) as SlashMenuItemType[]);
      const showGroups = config?.showGroups !== false;

      const itemImplementations = getItemImplementations(styleGetters);

      enabledItems.forEach((itemType) => {
        const itemImpl = itemImplementations[itemType];
        const itemText = texts[itemType];

        if (itemImpl && itemText && itemImpl.check(editor)) {
          const item: SuggestionItem = {
            onSelect: ({ editor }) =>
              itemImpl.action({ editor, styleGetters }),
            ...itemText,
          };

          if (config?.itemGroups?.[itemType]) {
            item.group = config.itemGroups[itemType];
          } else if (!showGroups) {
            item.group = "";
          }

          items.push(item);
        }
      });

      if (config?.customItems) {
        items.push(...config.customItems);
      }

      // Reorganize items by groups to ensure keyboard navigation works correctly
      return organizeItemsByGroups(items, showGroups);
    },
    [config, styleGetters]
  );

  return {
    getSlashMenuItems,
    config,
  };
}
