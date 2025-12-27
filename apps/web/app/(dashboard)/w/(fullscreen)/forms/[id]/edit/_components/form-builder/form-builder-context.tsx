"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { FormSchema, FormPage, FormSection, FormField, FieldType } from "./types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createDefaultField(type: FieldType): FormField {
  const labels: Record<FieldType, string> = {
    text: "Text Field",
    email: "Email",
    number: "Number",
    phone: "Phone",
    textarea: "Long Text",
    select: "Dropdown",
    radio: "Radio Group",
    checkbox: "Checkbox",
    date: "Date",
    url: "URL",
    hidden: "Hidden Field",
  };

  return {
    id: generateId(),
    type,
    label: labels[type],
    required: false,
    ...(type === "select" || type === "radio" || type === "checkbox"
      ? { options: [{ label: "Option 1", value: "option_1" }] }
      : {}),
  };
}

function createDefaultSection(): FormSection {
  return {
    id: generateId(),
    fields: [],
  };
}

function createDefaultPage(): FormPage {
  return {
    id: generateId(),
    sections: [createDefaultSection()],
  };
}

interface FormBuilderContextValue {
  formId: string;
  formName: string;
  schema: FormSchema;
  selectedPageIndex: number;
  selectedSectionId: string | null;
  selectedFieldId: string | null;

  // Page operations
  addPage: () => void;
  removePage: (pageIndex: number) => void;
  selectPage: (pageIndex: number) => void;
  updatePage: (pageIndex: number, updates: Partial<FormPage>) => void;

  // Section operations
  addSection: (pageIndex: number) => void;
  removeSection: (pageIndex: number, sectionId: string) => void;
  selectSection: (sectionId: string | null) => void;
  updateSection: (pageIndex: number, sectionId: string, updates: Partial<FormSection>) => void;

  // Field operations
  addField: (pageIndex: number, sectionId: string, fieldType: FieldType) => void;
  removeField: (pageIndex: number, sectionId: string, fieldId: string) => void;
  selectField: (fieldId: string | null) => void;
  updateField: (pageIndex: number, sectionId: string, fieldId: string, updates: Partial<FormField>) => void;
  moveField: (
    fromPageIndex: number,
    fromSectionId: string,
    fromFieldIndex: number,
    toPageIndex: number,
    toSectionId: string,
    toFieldIndex: number
  ) => void;
}

const FormBuilderContext = createContext<FormBuilderContextValue | null>(null);

interface FormBuilderProviderProps {
  formId: string;
  formName: string;
  initialSchema: FormSchema | null;
  children: ReactNode;
}

export function FormBuilderProvider({
  formId,
  formName,
  initialSchema,
  children,
}: FormBuilderProviderProps) {
  const [schema, setSchema] = useState<FormSchema>(() => {
    if (initialSchema && initialSchema.pages.length > 0) {
      return initialSchema;
    }
    return { pages: [createDefaultPage()] };
  });

  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Page operations
  const addPage = useCallback(() => {
    setSchema((prev) => ({
      ...prev,
      pages: [...prev.pages, createDefaultPage()],
    }));
  }, []);

  const removePage = useCallback((pageIndex: number) => {
    setSchema((prev) => {
      if (prev.pages.length <= 1) return prev;
      const newPages = prev.pages.filter((_, i) => i !== pageIndex);
      return { ...prev, pages: newPages };
    });
    setSelectedPageIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const selectPage = useCallback((pageIndex: number) => {
    setSelectedPageIndex(pageIndex);
    setSelectedSectionId(null);
    setSelectedFieldId(null);
  }, []);

  const updatePage = useCallback((pageIndex: number, updates: Partial<FormPage>) => {
    setSchema((prev) => ({
      ...prev,
      pages: prev.pages.map((page, i) =>
        i === pageIndex ? { ...page, ...updates } : page
      ),
    }));
  }, []);

  // Section operations
  const addSection = useCallback((pageIndex: number) => {
    setSchema((prev) => ({
      ...prev,
      pages: prev.pages.map((page, i) =>
        i === pageIndex
          ? { ...page, sections: [...page.sections, createDefaultSection()] }
          : page
      ),
    }));
  }, []);

  const removeSection = useCallback((pageIndex: number, sectionId: string) => {
    setSchema((prev) => ({
      ...prev,
      pages: prev.pages.map((page, i) =>
        i === pageIndex
          ? {
              ...page,
              sections: page.sections.filter((s) => s.id !== sectionId),
            }
          : page
      ),
    }));
    setSelectedSectionId(null);
  }, []);

  const selectSection = useCallback((sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    setSelectedFieldId(null);
  }, []);

  const updateSection = useCallback(
    (pageIndex: number, sectionId: string, updates: Partial<FormSection>) => {
      setSchema((prev) => ({
        ...prev,
        pages: prev.pages.map((page, i) =>
          i === pageIndex
            ? {
                ...page,
                sections: page.sections.map((s) =>
                  s.id === sectionId ? { ...s, ...updates } : s
                ),
              }
            : page
        ),
      }));
    },
    []
  );

  // Field operations
  const addField = useCallback(
    (pageIndex: number, sectionId: string, fieldType: FieldType) => {
      const newField = createDefaultField(fieldType);
      setSchema((prev) => ({
        ...prev,
        pages: prev.pages.map((page, i) =>
          i === pageIndex
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId
                    ? { ...section, fields: [...section.fields, newField] }
                    : section
                ),
              }
            : page
        ),
      }));
      setSelectedFieldId(newField.id);
    },
    []
  );

  const removeField = useCallback(
    (pageIndex: number, sectionId: string, fieldId: string) => {
      setSchema((prev) => ({
        ...prev,
        pages: prev.pages.map((page, i) =>
          i === pageIndex
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        fields: section.fields.filter((f) => f.id !== fieldId),
                      }
                    : section
                ),
              }
            : page
        ),
      }));
      setSelectedFieldId(null);
    },
    []
  );

  const selectField = useCallback((fieldId: string | null) => {
    setSelectedFieldId(fieldId);
  }, []);

  const updateField = useCallback(
    (
      pageIndex: number,
      sectionId: string,
      fieldId: string,
      updates: Partial<FormField>
    ) => {
      setSchema((prev) => ({
        ...prev,
        pages: prev.pages.map((page, i) =>
          i === pageIndex
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId
                    ? {
                        ...section,
                        fields: section.fields.map((field) =>
                          field.id === fieldId ? { ...field, ...updates } : field
                        ),
                      }
                    : section
                ),
              }
            : page
        ),
      }));
    },
    []
  );

  const moveField = useCallback(
    (
      fromPageIndex: number,
      fromSectionId: string,
      fromFieldIndex: number,
      toPageIndex: number,
      toSectionId: string,
      toFieldIndex: number
    ) => {
      setSchema((prev) => {
        const newPages = [...prev.pages];

        // Get the field to move
        const fromPage = newPages[fromPageIndex];
        const fromSection = fromPage.sections.find((s) => s.id === fromSectionId);
        if (!fromSection) return prev;

        const [movedField] = fromSection.fields.splice(fromFieldIndex, 1);

        // Insert the field at the new position
        const toPage = newPages[toPageIndex];
        const toSection = toPage.sections.find((s) => s.id === toSectionId);
        if (!toSection) return prev;

        toSection.fields.splice(toFieldIndex, 0, movedField);

        return { ...prev, pages: newPages };
      });
    },
    []
  );

  return (
    <FormBuilderContext.Provider
      value={{
        formId,
        formName,
        schema,
        selectedPageIndex,
        selectedSectionId,
        selectedFieldId,
        addPage,
        removePage,
        selectPage,
        updatePage,
        addSection,
        removeSection,
        selectSection,
        updateSection,
        addField,
        removeField,
        selectField,
        updateField,
        moveField,
      }}
    >
      {children}
    </FormBuilderContext.Provider>
  );
}

export function useFormBuilder() {
  const context = useContext(FormBuilderContext);

  if (!context) {
    throw new Error("useFormBuilder must be used within a FormBuilderProvider");
  }

  return context;
}
