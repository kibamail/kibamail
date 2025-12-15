"use client";

import { useRef } from "react";
import type { JSONContent } from "@tiptap/react";
import { EmailEditor, type EmailEditorRef } from "@repo/broadcast-editor";
import "@repo/broadcast-editor/styles";

interface BroadcastEmailEditorProps {
  stylesOpen: boolean;
  onStylesOpenChange: (open: boolean) => void;
}

export function BroadcastEmailEditor({
  stylesOpen,
  onStylesOpenChange,
}: BroadcastEmailEditorProps) {
  const emailEditorRef = useRef<EmailEditorRef>(null);

  const handleChange = (content: JSONContent) => {
    console.log("Content changed:", content);
  };

  const handleUpload = async (
    _file: File,
    _onProgress?: (event: { progress: number }) => void,
    _abortSignal?: AbortSignal
  ): Promise<string> => {
    // TODO: Implement actual file upload
    return "/placeholder-image.jpg";
  };

  return (
    <div className="h-full">
      <EmailEditor
        placeholder="Start writing your broadcast..."
        ref={emailEditorRef}
        canvasConfiguration={{
          open: stylesOpen,
          styles: {
            body: {
              backgroundColor: "#ffffff",
            },
            container: {
              backgroundColor: "#ffffff",
            },
            button: {
              backgroundColor: "#000",
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
          },
          onOpenChange: onStylesOpenChange,
        }}
        onChange={handleChange}
        variables={[
          "contact.email",
          "contact.first_name",
          "contact.last_name",
          "unsubscribe_url",
          "preferences_url",
          "view_in_browser_url",
        ]}
        onUpload={handleUpload}
      />
    </div>
  );
}
