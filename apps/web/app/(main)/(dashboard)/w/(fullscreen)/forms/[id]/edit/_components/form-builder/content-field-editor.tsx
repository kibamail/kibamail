"use client";

import {
  EmailEditor,
  type EmailEditorRef,
  FORM_BUILDER_PRESET,
} from "@repo/broadcast-editor";
import type { JSONContent } from "@tiptap/react";
import { useRef } from "react";
import "@repo/broadcast-editor/styles";

interface ContentFieldEditorProps {
  content?: Record<string, unknown>;
  onChange: (content: JSONContent) => void;
  placeholder?: string;
}

async function placeholderUpload(): Promise<string> {
  return `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop`;
}

export function ContentFieldEditor({
  content,
  onChange,
  placeholder = "Add your content here...",
}: ContentFieldEditorProps) {
  const editorRef = useRef<EmailEditorRef>(null);

  return (
    <div className="content-field-editor">
      <EmailEditor
        ref={editorRef}
        features={FORM_BUILDER_PRESET}
        placeholder={placeholder}
        initialContent={content as JSONContent | undefined}
        onChange={onChange}
        onUpload={placeholderUpload}
      />
    </div>
  );
}
