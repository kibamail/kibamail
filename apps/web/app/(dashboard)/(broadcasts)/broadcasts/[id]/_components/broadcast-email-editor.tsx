"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";
import type { JSONContent } from "@tiptap/react";
import { EmailEditor, type EmailEditorRef, type EditorStylesConfig } from "@repo/broadcast-editor";
import "@repo/broadcast-editor/styles";
import { internalApi } from "@/lib/api/client";

export interface BroadcastEmailEditorRef {
  getContent: () => JSONContent | null;
  getStyles: () => EditorStylesConfig | null;
}

interface BroadcastEmailEditorProps {
  broadcastId: string;
  stylesOpen: boolean;
  onStylesOpenChange: (open: boolean) => void;
  initialContent?: Record<string, unknown>;
  initialStyles?: EditorStylesConfig;
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

export const BroadcastEmailEditor = forwardRef<
  BroadcastEmailEditorRef,
  BroadcastEmailEditorProps
>(function BroadcastEmailEditor(
  { broadcastId, stylesOpen, onStylesOpenChange, initialContent, initialStyles },
  ref
) {
  const emailEditorRef = useRef<EmailEditorRef>(null);
  const stylesRef = useRef<EditorStylesConfig>(initialStyles ?? defaultStyles);

  function onStylesChange(styles: EditorStylesConfig) {
    stylesRef.current = styles;
  }

  useImperativeHandle(ref, () => ({
    getContent: () => {
      if (emailEditorRef.current?.editor) {
        return emailEditorRef.current.editor.getJSON();
      }
      return null;
    },
    getStyles: () => stylesRef.current,
  }), []);

  function onChange(_content: JSONContent) {
  }

  async function onUpload(
    file: File,
    onProgress?: (event: { progress: number }) => void,
    _abortSignal?: AbortSignal
  ): Promise<string> {
    onProgress?.({ progress: 10 });

    const result = await internalApi
      .broadcasts()
      .uploadFiles(broadcastId, [file]);

    onProgress?.({ progress: 100 });

    if (result.files.length > 0) {
      return result.files[0].url;
    }

    throw new Error("Upload failed - no file URL returned");
  }

  return (
    <div className="h-full">
      <EmailEditor
        placeholder="Start writing your broadcast..."
        ref={emailEditorRef}
        canvasConfiguration={{
          open: stylesOpen,
          styles: stylesRef.current,
          onOpenChange: onStylesOpenChange,
        }}
        onChange={onChange}
        onStylesChange={onStylesChange}
        variables={[
          "contact.email",
          "contact.first_name",
          "contact.last_name",
          "unsubscribe_url",
          "preferences_url",
          "view_in_browser_url",
        ]}
        onUpload={onUpload}
        initialContent={initialContent}
      />
    </div>
  );
});
