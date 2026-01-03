"use client";

import {
  type EditorStylesConfig,
  EmailEditor,
  type EmailEditorRef,
} from "@repo/broadcast-editor";
import type { JSONContent } from "@tiptap/react";
import { forwardRef, useImperativeHandle, useRef } from "react";
import "@repo/broadcast-editor/styles";
import type { EmailEditorMode } from "./types";

export interface ContentEditorRef {
  getContent: () => JSONContent | null;
  getStyles: () => EditorStylesConfig | null;
}

interface ContentEditorProps {
  entityId: string;
  stylesOpen: boolean;
  onStylesOpenChange: (open: boolean) => void;
  initialContent?: Record<string, unknown>;
  initialStyles?: EditorStylesConfig;
  readonly?: boolean;
  onUpload?: (file: File) => Promise<string>;
  mode: EmailEditorMode;
}

const defaultStyles: EditorStylesConfig = {
  body: {
    backgroundColor: "#f4f5f7",
    paddingTop: "24px",
    paddingBottom: "24px",
  },
  container: {
    backgroundColor: "#ffffff",
    borderWidth: "1px",
    borderColor: "#f4f5f7",
  },
  button: {
    backgroundColor: "#49260b",
    color: "#fff",
    paddingLeft: "16px",
    paddingRight: "16px",
    paddingTop: "12px",
    paddingBottom: "12px",
    textAlign: "center",
    borderRadius: "4px",
  },
  horizontalRule: {
    marginTop: "16px",
    marginBottom: "16px",
    backgroundColor: "#e5e5e5",
  },
  paragraph: {
    fontSize: "16px",
    lineHeight: "1.6",
    color: "#333",
    margin: "0px",
  },
  heading: {
    h1: {
      fontSize: "32px",
      fontWeight: "bold",
      margin: "0px",
      color: "#111",
    },
    h2: {
      fontSize: "24px",
      fontWeight: "bold",
      margin: "0px",
      color: "#111",
    },
    h3: {
      fontSize: "20px",
      fontWeight: 600,
      margin: "0px",
      color: "#111",
    },
    h4: {
      fontSize: "18px",
      fontWeight: 600,
      margin: "0px",
      color: "#111",
    },
  },
};

function getPlaceholderForMode(mode: EmailEditorMode): string {
  switch (mode) {
    case "broadcast":
      return "Start writing your broadcast...";
    case "template":
      return "Start writing your email template...";
    case "email":
      return "Start writing your email...";
  }
}

function getVariablesForMode(mode: EmailEditorMode): string[] {
  const baseVariables = [
    "contact.email",
    "contact.first_name",
    "contact.last_name",
  ];

  switch (mode) {
    case "broadcast":
      return [
        ...baseVariables,
        "unsubscribe_url",
        "preferences_url",
        "view_in_browser_url",
      ];
    case "template":
      return [...baseVariables, "unsubscribe_url"];
    case "email":
      return [...baseVariables, "unsubscribe_url", "preferences_url"];
  }
}

export const ContentEditor = forwardRef<ContentEditorRef, ContentEditorProps>(
  function ContentEditor(
    {
      entityId,
      stylesOpen,
      onStylesOpenChange,
      initialContent,
      initialStyles,
      readonly = false,
      onUpload,
      mode,
    },
    ref,
  ) {
    const emailEditorRef = useRef<EmailEditorRef>(null);
    const stylesRef = useRef<EditorStylesConfig>(
      initialStyles ?? defaultStyles,
    );

    function onStylesChange(styles: EditorStylesConfig) {
      stylesRef.current = styles;
    }

    useImperativeHandle(
      ref,
      () => ({
        getContent: () => {
          if (emailEditorRef.current?.editor) {
            return emailEditorRef.current.editor.getJSON();
          }
          return null;
        },
        getStyles: () => stylesRef.current,
      }),
      [],
    );

    function onChange(_content: JSONContent) {}

    async function upload(
      file: File,
      onProgress?: (event: { progress: number }) => void,
      _abortSignal?: AbortSignal,
    ): Promise<string> {
      if (!onUpload) {
        throw new Error("File upload not configured");
      }

      onProgress?.({ progress: 10 });
      const url = await onUpload(file);
      onProgress?.({ progress: 100 });

      return url;
    }

    return (
      <div className="h-full">
        <EmailEditor
          placeholder={getPlaceholderForMode(mode)}
          ref={emailEditorRef}
          canvasConfiguration={{
            open: stylesOpen,
            styles: stylesRef.current,
            onOpenChange: onStylesOpenChange,
          }}
          onChange={onChange}
          onStylesChange={onStylesChange}
          variables={getVariablesForMode(mode)}
          onUpload={onUpload ? upload : undefined}
          initialContent={initialContent}
          editable={!readonly}
        />
      </div>
    );
  },
);
