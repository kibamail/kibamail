"use client";

import type { Form } from "@prisma/client";
import type { ReactNode } from "react";
import { FormEditorProvider } from "./form-editor-context";
import { defaultForm, defaultTheme } from "./default-form";

interface FormEditorWrapperProps {
  form: Form;
  children: ReactNode;
}

export function FormEditorWrapper({ form, children }: FormEditorWrapperProps) {
  // Use saved form data if available, otherwise use defaults
  const initialFields = form.fields && Object.keys(form.fields).length > 0
    ? form.fields as object
    : defaultForm;

  const initialSettings = form.settings && Object.keys(form.settings).length > 0
    ? form.settings as object
    : defaultTheme;

  return (
    <FormEditorProvider
      formId={form.id}
      initialFields={initialFields}
      initialSettings={initialSettings}
    >
      {children}
    </FormEditorProvider>
  );
}
