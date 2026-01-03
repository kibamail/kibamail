"use client";

import {
  type EditorStylesConfig,
  EmailEditor,
  type EmailEditorRef,
} from "@repo/broadcast-editor";
import type { JSONContent } from "@tiptap/react";
import { forwardRef, useImperativeHandle, useRef } from "react";
import "@repo/broadcast-editor/styles";

export interface DoubleOptInEmailEditorRef {
  getContent: () => JSONContent | null;
  getStyles: () => EditorStylesConfig | null;
}

interface DoubleOptInEmailEditorProps {
  emailId: string;
  stylesOpen: boolean;
  onStylesOpenChange: (open: boolean) => void;
  initialContent?: Record<string, unknown>;
  initialStyles?: Record<string, unknown>;
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

const defaultContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Please confirm your subscription" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Thank you for signing up! Please click the button below to confirm your email address and complete your subscription.",
        },
      ],
    },
    {
      type: "button",
      attrs: {
        text: "Confirm Subscription",
        href: "{{confirmation_url}}",
      },
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "If you did not sign up for this list, you can safely ignore this email.",
        },
      ],
    },
  ],
};

export const DoubleOptInEmailEditor = forwardRef<
  DoubleOptInEmailEditorRef,
  DoubleOptInEmailEditorProps
>(function DoubleOptInEmailEditor(
  { emailId, stylesOpen, onStylesOpenChange, initialContent, initialStyles },
  ref,
) {
  const emailEditorRef = useRef<EmailEditorRef>(null);
  const stylesRef = useRef<EditorStylesConfig>(
    (initialStyles as EditorStylesConfig) ?? defaultStyles,
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

  return (
    <div className="h-full">
      <EmailEditor
        placeholder="Start writing your confirmation email..."
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
          "confirmation_url",
        ]}
        initialContent={initialContent ?? defaultContent}
        editable={true}
      />
    </div>
  );
});
