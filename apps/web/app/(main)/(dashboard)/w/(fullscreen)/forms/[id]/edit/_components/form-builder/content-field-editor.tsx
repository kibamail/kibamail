"use client";

import {
  EmailEditor,
  type EmailEditorRef,
  type EditorStylesConfig,
  FORM_BUILDER_PRESET,
  mergeFeatureConfig,
} from "@repo/broadcast-editor";
import type { JSONContent } from "@tiptap/react";
import { useCallback, useMemo, useRef } from "react";
import { internalApi } from "@/lib/api/client";
import { useFormBuilder } from "./form-builder-context";
import type { FormTheme } from "./types";
import "@repo/broadcast-editor/styles";

interface ContentFieldEditorProps {
  content?: Record<string, unknown>;
  onChange?: (content: JSONContent) => void;
  placeholder?: string;
  readOnly?: boolean;
}

/**
 * Maps the form theme to editor styles config
 */
function mapThemeToEditorStyles(theme: FormTheme): EditorStylesConfig {
  const { colors, font } = theme;

  return {
    typography: {
      fontFamily: `"${font.family}", sans-serif`,
      color: colors.foreground,
    },
    paragraph: {
      fontFamily: `"${font.family}", sans-serif`,
      color: colors.foreground,
      lineHeight: 1.6,
    },
    heading: {
      h1: {
        fontFamily: `"${font.family}", sans-serif`,
        color: colors.foreground,
        fontWeight: 700,
        fontSize: 32,
      },
      h2: {
        fontFamily: `"${font.family}", sans-serif`,
        color: colors.foreground,
        fontWeight: 600,
        fontSize: 28,
      },
      h3: {
        fontFamily: `"${font.family}", sans-serif`,
        color: colors.foreground,
        fontWeight: 600,
        fontSize: 24,
      },
      h4: {
        fontFamily: `"${font.family}", sans-serif`,
        color: colors.foreground,
        fontWeight: 500,
        fontSize: 20,
      },
    },
    link: {
      color: colors.primary,
    },
    button: {
      backgroundColor: colors.primary,
      color: colors.primaryForeground,
      borderRadius: theme.radius,
    },
  };
}

/**
 * Content editor features - extends FORM_BUILDER_PRESET with:
 * - Button support for CTAs
 * - Node style editing for direct element customization
 * - Right panel for style editing
 */
const CONTENT_EDITOR_FEATURES = mergeFeatureConfig(FORM_BUILDER_PRESET, {
  media: {
    button: true,
  },
  ui: {
    nodeStyleEditing: true,
    rightPanel: true,
  },
});

export function ContentFieldEditor({
  content,
  onChange,
  placeholder = "Add your content here...",
  readOnly,
}: ContentFieldEditorProps) {
  const editorRef = useRef<EmailEditorRef>(null);
  const { formId, schema } = useFormBuilder();
  const theme = schema.settings.theme;

  const onChangeInternal = onChange ?? (() => {});

  const handleUpload = useCallback(
    async (file: File): Promise<string> => {
      const result = await internalApi.forms().uploadContentImage(formId, file);
      return result.url;
    },
    [formId]
  );

  const editorStyles = useMemo(() => mapThemeToEditorStyles(theme), [theme]);

  return (
    <div className="content-field-editor">
      <EmailEditor
        ref={editorRef}
        features={CONTENT_EDITOR_FEATURES}
        placeholder={placeholder}
        initialContent={content as JSONContent | undefined}
        onChange={onChangeInternal}
        onUpload={handleUpload}
        editable={!readOnly}
        styles={editorStyles}
      />
    </div>
  );
}
