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

// --- Lib ---
import { isExtensionAvailable, isNodeInSchema } from "@/lib/tiptap-utils";

// --- Tiptap UI ---
import type { SuggestionItem } from "@/components/tiptap-ui-utils/suggestion-menu";
import { addEmojiTrigger } from "@/components/tiptap-ui/emoji-trigger-button";

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
};

export type SlashMenuItemType = keyof typeof texts;

const getItemImplementations = () => {
  return {
    // Style
    text: {
      check: (editor: Editor) => isNodeInSchema("paragraph", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor.chain().focus().setParagraph().run();
      },
    },
    heading_1: {
      check: (editor: Editor) => isNodeInSchema("heading", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
      },
    },
    heading_2: {
      check: (editor: Editor) => isNodeInSchema("heading", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
      },
    },
    heading_3: {
      check: (editor: Editor) => isNodeInSchema("heading", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
      },
    },
    bullet_list: {
      check: (editor: Editor) => isNodeInSchema("bulletList", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor.chain().focus().toggleBulletList().run();
      },
    },
    ordered_list: {
      check: (editor: Editor) => isNodeInSchema("orderedList", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor.chain().focus().toggleOrderedList().run();
      },
    },
    quote: {
      check: (editor: Editor) => isNodeInSchema("blockquote", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor.chain().focus().toggleBlockquote().run();
      },
    },
    code_block: {
      check: (editor: Editor) => isNodeInSchema("codeBlock", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor.chain().focus().toggleNode("codeBlock", "paragraph").run();
      },
    },

    emoji: {
      check: (editor: Editor) =>
        isExtensionAvailable(editor, ["emoji", "emojiPicker"]),
      action: ({ editor }: { editor: Editor }) => addEmojiTrigger(editor),
    },
    divider: {
      check: (editor: Editor) => isNodeInSchema("horizontalRule", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor.chain().focus().setHorizontalRule().run();
      },
    },
    // Upload
    image: {
      check: (editor: Editor) => isNodeInSchema("image", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "imageUpload",
          })
          .run();
      },
    },

    // Button inserș
    button: {
      check: (editor: Editor) => isNodeInSchema("button", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor
          .chain()
          .focus()
          .insertButton({
            align: "left",
          })
          .run();
      },
    },

    // Panel inserș
    panel: {
      check: (editor: Editor) => isNodeInSchema("panel", editor),
      action: ({ editor }: { editor: Editor }) => {
        editor.chain().focus().insertPanel().run();
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
  const getSlashMenuItems = useCallback(
    (editor: Editor) => {
      const items: SuggestionItem[] = [];

      const enabledItems =
        config?.enabledItems || (Object.keys(texts) as SlashMenuItemType[]);
      const showGroups = config?.showGroups !== false;

      const itemImplementations = getItemImplementations();

      enabledItems.forEach((itemType) => {
        const itemImpl = itemImplementations[itemType];
        const itemText = texts[itemType];

        if (itemImpl && itemText && itemImpl.check(editor)) {
          const item: SuggestionItem = {
            onSelect: ({ editor }) => itemImpl.action({ editor }),
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
    [config]
  );

  return {
    getSlashMenuItems,
    config,
  };
}
