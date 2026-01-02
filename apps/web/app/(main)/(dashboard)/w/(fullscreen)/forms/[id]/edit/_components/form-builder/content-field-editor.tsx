"use client";

import { useCallback, useRef } from "react";
import type { JSONContent } from "@tiptap/react";
import {
  EmailEditor,
  FORM_BUILDER_PRESET,
  type EmailEditorRef,
} from "@repo/broadcast-editor";
import "@repo/broadcast-editor/styles";

interface ContentFieldEditorProps {
  content?: Record<string, unknown>;
  onChange: (content: JSONContent) => void;
  placeholder?: string;
}

// Placeholder upload function that returns a sample Unsplash image
async function placeholderUpload(): Promise<string> {
  return `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop`;
}

export function ContentFieldEditor({
  content,
  onChange,
  placeholder = "Add your content here...",
}: ContentFieldEditorProps) {
  const editorRef = useRef<EmailEditorRef>(null);

  const handleChange = useCallback(
    (newContent: JSONContent) => {
      onChange(newContent);
    },
    [onChange]
  );

  return (
    <div className="content-field-editor">
      <EmailEditor
        ref={editorRef}
        features={FORM_BUILDER_PRESET}
        placeholder={placeholder}
        initialContent={content as JSONContent | undefined}
        onChange={handleChange}
        onUpload={placeholderUpload}
      />
    </div>
  );
}
