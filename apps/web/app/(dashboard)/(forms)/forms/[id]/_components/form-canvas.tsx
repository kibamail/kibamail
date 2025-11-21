"use client";

import { ITheme, SurveyModel } from "survey-core";
import { Survey } from "survey-react-ui";
import Editor from "@monaco-editor/react";
import { useState } from "react";
import { defaultForm, defaultTheme } from "./default-form";

import "survey-core/survey-core.css";
import { Button } from "@kibamail/owly";
import { Refresh } from "iconoir-react";

// Monaco Editor options for customization
const editorOptions = {
  // Remove guide lines
  renderIndentGuides: false,
  renderLineHighlight: "none" as const,
  guides: {
    bracketPairs: false,
    bracketPairsHorizontal: false,
    highlightActiveBracketPair: false,
    indentation: false,
  },

  // Remove minimap
  minimap: {
    enabled: false,
  },

  // Zoom into editor (increase font size)
  fontSize: 14,

  // Increase space between lines
  lineHeight: 28,

  // Change cursor to phasing (blinking)
  cursorBlinking: "phase" as const,

  // Font family with fallbacks
  fontFamily:
    '"Dank Mono", "Operator Mono", "Fira Code", "IBM Plex Mono", "SF Mono", Monaco, Inconsolata, "Roboto Mono", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',

  // Additional customizations for better experience
  wordWrap: "on" as const,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorSmoothCaretAnimation: "on" as const,
};

export function FormCanvas() {
  const [model, setModel] = useState(() => {
    const model = new SurveyModel(defaultForm);

    model.applyTheme(defaultTheme as ITheme);

    return model;
  });
  const [theme, setTheme] = useState<object>(defaultTheme);
  const [schema, setSchema] = useState<object>(defaultForm);

  function onThemeChange(value: string | undefined) {
    if (!value) {
      return;
    }

    const parsedTheme = JSON.parse(value);

    setTheme(parsedTheme);

    model.applyTheme(parsedTheme as ITheme);
  }

  function onSchemaChange(value: string | undefined) {
    if (!value) {
      return;
    }

    const parsedSchema = JSON.parse(value);

    setSchema(parsedSchema);

    const model = new SurveyModel(parsedSchema);

    model.applyTheme(theme);

    setModel(model);
  }

  function onRefresh() {
    const model = new SurveyModel(schema);

    model.applyTheme(theme);

    setModel(model);
  }

  return (
    <div className="w-full h-[calc(100vh-67px)] bg-kb-bg-secondary rounded-lg overflow-y-auto flex items-center">
      <div className="w-[40%] h-[calc(100vh-67px)] flex flex-col">
        <div className="h-[50%]">
          <Editor
            height="100%"
            theme="vs-dark"
            defaultLanguage="json"
            defaultValue={JSON.stringify(defaultForm, null, 3)}
            options={editorOptions}
            onChange={onSchemaChange}
          />
        </div>

        <div className="w-full h-5 border-t border-b border-kb-border-tertiary">
          <p className="text-xs text-center uppercase text-kb-content-tertiary">
            Theme
          </p>
        </div>

        <div className="h-[50%]">
          <Editor
            height="100%"
            theme="vs-dark"
            defaultLanguage="json"
            options={editorOptions}
            defaultValue={JSON.stringify(defaultTheme, null, 3)}
            onChange={onThemeChange}
          />
        </div>
      </div>
      <div className="w-[60%] h-[calc(100vh-67px)] overflow-y-auto relative">
        <div className="absolute top-6 right-6 z-10">
          <Button
            size="sm"
            className="rounded-full! cursor-pointer"
            variant="secondary"
            onClick={onRefresh}
          >
            <Refresh />
            Refresh
          </Button>
        </div>
        <Survey model={model} />
      </div>
    </div>
  );
}
