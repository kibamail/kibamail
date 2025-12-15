"use client";

import { useContext, useEffect, forwardRef, useImperativeHandle } from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/react";
import { createPortal } from "react-dom";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Mention } from "@tiptap/extension-mention";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder, Selection } from "@tiptap/extensions";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Mathematics } from "@tiptap/extension-mathematics";
import { Emoji, gitHubEmojis } from "@tiptap/extension-emoji";

// --- Hooks ---
import { useUiEditorState } from "@/hooks/use-ui-editor-state";
import { useScrollToHash } from "@/components/tiptap-ui/copy-anchor-link-button/use-scroll-to-hash";

// --- Custom Extensions ---
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { Paragraph } from "@/components/tiptap-node/paragraph-node/paragraph-node-extension";
import { Heading } from "@/components/tiptap-node/heading-node/heading-node-extension";
import { UiState } from "@/components/tiptap-extension/ui-state-extension";
import { Image } from "@/components/tiptap-node/image-node/image-node-extension";
import { NodeBackground } from "@/components/tiptap-extension/node-background-extension";
import { NodeAlignment } from "@/components/tiptap-extension/node-alignment-extension";

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";

import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { EmojiDropdownMenu } from "@/components/tiptap-ui/emoji-dropdown-menu";
import { MentionDropdownMenu } from "@/components/tiptap-ui/mention-dropdown-menu";
import { VariableDropdownMenu } from "@/components/tiptap-ui/variable-dropdown-menu/variable-dropdown-menu";
import { SlashDropdownMenu } from "@/components/tiptap-ui/slash-dropdown-menu";
import { DragContextMenu } from "@/components/tiptap-ui/drag-context-menu";

// --- Contexts ---
import { AppProvider } from "@/contexts/app-context";
import {
  ActiveNodeProvider,
  useActiveNode,
} from "@/contexts/active-node-context";
import { VariablesProvider } from "@/contexts/variables-context";

// --- Lib ---
import { MAX_FILE_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-templates/email-editor/email-editor.scss";
import "@/components/tiptap-ui/variable-dropdown-menu/variable-dropdown-menu.scss";

// --- Content ---
import { MobileToolbar } from "@/components/tiptap-templates/email-editor/email-editor-mobile-toolbar";
import { EmailToolbarFloating } from "@/components/tiptap-templates/email-editor/email-editor-toolbar-floating";
import { EmailEditorLeftPanel } from "@/components/tiptap-templates/email-editor/email-editor-left-panel";
import { EmailEditorRightPanel } from "@/components/tiptap-templates/email-editor/email-editor-right-panel";
import { ButtonNodeExtension } from "@/components/tiptap-node/button-node/button-node-extension";
import { ButtonCursorFloating } from "@/components/tiptap-node/button-node/button-cursor-floating";
import { PanelNodeExtension } from "@/components/tiptap-node/panel-node/panel-node-extension";
import { VariableNodeExtension } from "@/components/tiptap-node/variable-node/variable-node-extension";
import { VariableFallbackFloating } from "@/components/tiptap-node/variable-node/variable-fallback-floating";
import { CustomStyles } from "@/components/tiptap-extension/custom-styles-extension";

// --- Editor Config ---
import type { EditorStylesConfig } from "@/types/editor-config";
import {
  EditorConfigProvider,
  useEditorConfig,
} from "@/contexts/editor-config-context";

export interface EmailEditorRef {
  /**
   * The TipTap editor instance
   */
  editor: Editor | null;
}

export interface CanvasConfiguration {
  /**
   * Default styles for the canvas/editor configuration
   */
  styles?: EditorStylesConfig;

  /**
   * Whether the canvas configuration panel is open
   */
  open: boolean;

  /**
   * Callback when the open state should change
   */
  onOpenChange: (open: boolean) => void;
}

export interface EmailEditorProps {
  /**
   * Placeholder text shown when editor is empty
   */
  placeholder?: string;

  /**
   * Global styles configuration for the editor
   * Allows customizing styles for body, container, panel, button, typography, link, image, and codeblock
   */
  styles?: EditorStylesConfig;

  /**
   * Custom upload handler for image files
   * Takes a file and optional callbacks, returns a promise with the uploaded URL
   * Required for image upload functionality
   */
  onUpload: (
    file: File,
    onProgress?: (event: { progress: number }) => void,
    abortSignal?: AbortSignal
  ) => Promise<string>;

  /**
   * Canvas configuration for the left panel
   * Controls the visibility and behavior of the editor configuration panel
   */
  canvasConfiguration?: CanvasConfiguration;

  /**
   * Available template variables (e.g., ["contact.email", "unsubscribe_url"])
   * Variables ending in _url will be available in link popovers
   */
  variables?: string[];

  /**
   * Callback when the editor content changes
   * Called with the JSON representation of the editor content
   */
  onChange?: (content: JSONContent) => void;
}

export interface EditorProviderProps {
  placeholder?: string;
  onUpload: (
    file: File,
    onProgress?: (event: { progress: number }) => void,
    abortSignal?: AbortSignal
  ) => Promise<string>;
  canvasConfiguration?: CanvasConfiguration;
  editorRef?: React.RefObject<EmailEditorRef>;
  onChange?: (content: JSONContent) => void;
}

/**
 * Loading spinner component shown while connecting to the notion server
 */
export function LoadingSpinner({ text = "Connecting..." }: { text?: string }) {
  return (
    <div className="spinner-container">
      <div className="spinner-content">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div className="spinner-loading-text">{text}</div>
      </div>
    </div>
  );
}

/**
 * EditorContent component that renders the actual editor
 */
export function EditorContentArea({
  canvasConfiguration,
}: {
  canvasConfiguration?: CanvasConfiguration;
}) {
  const { editor } = useContext(EditorContext)!;
  const { isDragging } = useUiEditorState(editor);
  const { getStyles } = useEditorConfig();

  useScrollToHash();

  if (!editor) {
    return null;
  }

  // Get body styles from config and merge with dynamic styles
  const bodyStyles = getStyles("body");

  const { isStylingMode, exitStylingMode } = useActiveNode();
  const isCanvasOpen = canvasConfiguration?.open ?? false;

  return (
    <div className="email-editor-wrapper">
      <EmailEditorLeftPanel canvasConfiguration={canvasConfiguration} />

      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <EditorContent
          editor={editor}
          role="presentation"
          className="email-editor-content"
          style={{
            cursor: isDragging ? "grabbing" : "auto",
            ...bodyStyles,
          }}
        >
          <DragContextMenu />
          <EmojiDropdownMenu />
          <MentionDropdownMenu />
          <VariableDropdownMenu />
          <SlashDropdownMenu />
          <EmailToolbarFloating />
          <ButtonCursorFloating />
          <VariableFallbackFloating />

          {createPortal(<MobileToolbar />, document.body)}
        </EditorContent>

        {isCanvasOpen && (
          <div
            className="email-editor-styling-overlay email-editor-styling-overlay-left"
            onClick={() => canvasConfiguration?.onOpenChange(false)}
          />
        )}

        {isStylingMode && (
          <div
            className="email-editor-styling-overlay email-editor-styling-overlay-right"
            onClick={exitStylingMode}
          />
        )}
      </div>

      <EmailEditorRightPanel />
    </div>
  );
}

/**
 * Component that creates and provides the editor instance
 */
export function EditorProvider(props: EditorProviderProps) {
  const {
    placeholder = "Start writing...",
    onUpload,
    canvasConfiguration,
    editorRef,
    onChange,
  } = props;
  const { getStyles } = useEditorConfig();
  const { isStylingMode } = useActiveNode();
  const isCanvasOpen = canvasConfiguration?.open ?? false;

  // Wrap onUpload with validation logic
  const wrappedUpload = async (
    file: File,
    onProgress?: (event: { progress: number }) => void,
    abortSignal?: AbortSignal
  ): Promise<string> => {
    // Validate file
    if (!file) {
      throw new Error("No file provided");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`
      );
    }

    // Call the user-provided upload handler
    return onUpload(file, onProgress, abortSignal);
  };

  // Get container styles and convert to inline style string
  const containerStyles = getStyles("container");
  const containerStyleString = containerStyles
    ? Object.entries(containerStyles)
        .map(([key, value]) => {
          // Convert camelCase to kebab-case
          const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
          return `${kebabKey}: ${value}`;
        })
        .join("; ")
    : "";

  const editor = useEditor({
    immediatelyRender: false,
    editable: !isStylingMode && !isCanvasOpen,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "email-editor",
        ...(containerStyleString ? { style: containerStyleString } : {}),
      },
    },
    extensions: [
      StarterKit.configure({
        // undoRedo: false,
        horizontalRule: false,
        paragraph: false,
        heading: false,
        dropcursor: {
          width: 2,
        },
        link: { openOnClick: false },
      }),
      HorizontalRule,
      Paragraph,
      Heading,
      CustomStyles.configure({
        types: [
          "button",
          "panel",
          "paragraph",
          "heading",
          "image",
          "bulletList",
          "orderedList",
          "horizontalRule",
        ],
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),

      Placeholder.configure({
        placeholder,
        emptyNodeClass: "is-empty with-slash",
      }),
      Mention,
      VariableNodeExtension,
      ButtonNodeExtension,
      PanelNodeExtension,
      Emoji.configure({
        emojis: gitHubEmojis.filter(
          (emoji) => !emoji.name.includes("regional")
        ),
        forceFallbackImages: true,
      }),
      NodeBackground,
      NodeAlignment,
      TextStyle,
      Mathematics,
      Superscript,
      Subscript,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Selection,
      Image,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: wrappedUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
      Typography,
      UiState,
    ],
  });

  // Update editor editable state when styling mode or canvas panel changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isStylingMode && !isCanvasOpen);
    }
  }, [editor, isStylingMode, isCanvasOpen]);

  // Expose editor instance through ref
  useImperativeHandle(
    editorRef,
    () => ({
      editor: editor,
    }),
    [editor]
  );

  if (!editor) {
    return <LoadingSpinner />;
  }

  return (
    <EditorContext.Provider value={{ editor }}>
      <EditorContentArea canvasConfiguration={canvasConfiguration} />
    </EditorContext.Provider>
  );
}

/**
 * Full editor with all necessary providers, ready to use with just a room ID
 */
export const EmailEditor = forwardRef<EmailEditorRef, EmailEditorProps>(
  (
    {
      placeholder = "Start writing...",
      styles,
      onUpload,
      canvasConfiguration,
      variables = [],
      onChange,
    },
    ref
  ) => {
    // Merge canvasConfiguration.styles with the main styles prop
    // canvasConfiguration.styles takes priority
    const mergedStyles = {
      ...styles,
      ...canvasConfiguration?.styles,
    };

    return (
      <div className="email-editor-root">
        <EditorConfigProvider config={{ styles: mergedStyles }}>
          <VariablesProvider variables={variables}>
            <AppProvider>
              <ActiveNodeProvider>
                <EmailEditorContent
                  placeholder={placeholder}
                  onUpload={onUpload}
                  canvasConfiguration={canvasConfiguration}
                  editorRef={ref as React.RefObject<EmailEditorRef>}
                  onChange={onChange}
                />
              </ActiveNodeProvider>
            </AppProvider>
          </VariablesProvider>
        </EditorConfigProvider>
      </div>
    );
  }
);

EmailEditor.displayName = "EmailEditor";

/**
 * Internal component that handles the editor loading state
 */
export function EmailEditorContent({
  placeholder,
  onUpload,
  canvasConfiguration,
  editorRef,
  onChange,
}: {
  placeholder?: string;
  onUpload: (
    file: File,
    onProgress?: (event: { progress: number }) => void,
    abortSignal?: AbortSignal
  ) => Promise<string>;
  canvasConfiguration?: CanvasConfiguration;
  editorRef?: React.RefObject<EmailEditorRef>;
  onChange?: (content: JSONContent) => void;
}) {
  return (
    <EditorProvider
      placeholder={placeholder}
      onUpload={onUpload}
      canvasConfiguration={canvasConfiguration}
      editorRef={editorRef}
      onChange={onChange}
    />
  );
}
