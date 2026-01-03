"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type {
  FieldOption,
  FieldType,
  FormBuilderSchema,
  FormField,
  FormPage,
  FormSection,
  FormSettings,
  FormStyling,
  FormTheme,
} from "./types";
import {
  DEFAULT_FIELD_APPEARANCE,
  DEFAULT_FORM_SETTINGS,
  DEFAULT_FORM_STYLING,
  FIELD_TYPE_CONFIGS,
} from "./types";

export const SUBMIT_BUTTON_ID = "__submit_button__";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createNewField(type: FieldType): FormField {
  const id = generateId();
  const config = FIELD_TYPE_CONFIGS[type];

  const baseField: FormField = {
    id,
    type,
    name: `field_${id}`,
    label: config.label,
    placeholder: config.supportsPlaceholder ? "" : undefined,
    appearance: { ...DEFAULT_FIELD_APPEARANCE },
  };

  if (config.supportsOptions) {
    baseField.options = [
      { id: generateId(), label: "Option 1", value: "option_1" },
    ];
  }

  return baseField;
}

function createNewSection(): FormSection {
  return {
    id: generateId(),
    fields: [],
    collapsible: false,
    defaultCollapsed: false,
  } as FormSection;
}

function createNewPage(): FormPage {
  return {
    id: generateId(),
    sections: [createNewSection()],
  } as FormPage;
}

interface FormBuilderContextValue {
  // Form data
  formId: string;
  formName: string;
  schema: FormBuilderSchema;
  doubleOptInEmailId: string | null;
  setDoubleOptInEmailId: (id: string | null) => void;

  // Selection state
  selectedPageIndex: number;
  selectedSectionId: string | null;
  selectedFieldId: string | null;

  // Computed values
  currentPage: FormPage;
  selectedField: FormField | null;
  selectedSection: FormSection | null;

  // Page operations
  addPage: () => void;
  removePage: (pageIndex: number) => void;
  selectPage: (pageIndex: number) => void;
  updatePage: (pageIndex: number, updates: Partial<FormPage>) => void;
  movePage: (fromIndex: number, toIndex: number) => void;
  duplicatePage: (pageIndex: number) => void;

  // Section operations
  addSection: (pageIndex: number) => void;
  removeSection: (pageIndex: number, sectionId: string) => void;
  selectSection: (sectionId: string | null) => void;
  updateSection: (
    pageIndex: number,
    sectionId: string,
    updates: Partial<FormSection>,
  ) => void;
  moveSection: (pageIndex: number, fromIndex: number, toIndex: number) => void;
  duplicateSection: (pageIndex: number, sectionId: string) => void;

  // Field operations
  addField: (
    pageIndex: number,
    sectionId: string,
    fieldType: FieldType,
  ) => void;
  removeField: (pageIndex: number, sectionId: string, fieldId: string) => void;
  selectField: (fieldId: string | null) => void;
  updateField: (
    pageIndex: number,
    sectionId: string,
    fieldId: string,
    updates: Partial<FormField>,
  ) => void;
  moveField: (
    fromPageIndex: number,
    fromSectionId: string,
    fromFieldIndex: number,
    toPageIndex: number,
    toSectionId: string,
    toFieldIndex: number,
  ) => void;
  duplicateField: (
    pageIndex: number,
    sectionId: string,
    fieldId: string,
  ) => void;

  // Field option operations
  addFieldOption: (
    pageIndex: number,
    sectionId: string,
    fieldId: string,
  ) => void;
  removeFieldOption: (
    pageIndex: number,
    sectionId: string,
    fieldId: string,
    optionId: string,
  ) => void;
  updateFieldOption: (
    pageIndex: number,
    sectionId: string,
    fieldId: string,
    optionId: string,
    updates: Partial<FieldOption>,
  ) => void;

  // Settings operations
  updateSettings: (updates: Partial<FormSettings>) => void;
  updateStyling: (updates: Partial<FormStyling>) => void;
  updateTheme: (updates: Partial<FormTheme>) => void;

  // Submit button operations
  updateSubmitButton: (
    updates: Partial<import("./types").FormSubmitButton>,
  ) => void;

  // Form metadata operations
  updateFormMeta: (updates: { title?: string; description?: string }) => void;

  // Utility
  clearSelection: () => void;
  getFieldLocation: (
    fieldId: string,
  ) => { pageIndex: number; sectionId: string } | null;
}

const FormBuilderContext = createContext<FormBuilderContextValue | null>(null);

interface FormBuilderProviderProps {
  formId: string;
  formName: string;
  initialSchema: FormBuilderSchema | null;
  initialDoubleOptInEmailId: string | null;
  children: ReactNode;
}

export function FormBuilderProvider({
  formId,
  formName: initialFormName,
  initialSchema,
  initialDoubleOptInEmailId,
  children,
}: FormBuilderProviderProps) {
  const [doubleOptInEmailId, setDoubleOptInEmailId] = useState<string | null>(
    initialDoubleOptInEmailId,
  );
  const [schema, setSchema] = useState<FormBuilderSchema>(() => {
    if (initialSchema && initialSchema.pages?.length > 0) {
      // Ensure settings and styling exist
      return {
        ...initialSchema,
        settings: initialSchema.settings ?? DEFAULT_FORM_SETTINGS,
        styling: initialSchema.styling ?? DEFAULT_FORM_STYLING,
      };
    }
    // Create a new empty form
    return {
      id: formId,
      version: 1,
      title: initialFormName,
      pages: [createNewPage()],
      settings: DEFAULT_FORM_SETTINGS,
      styling: DEFAULT_FORM_STYLING,
    };
  });

  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Computed values
  const currentPage = schema.pages[selectedPageIndex] ?? schema.pages[0];

  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null;
    for (const page of schema.pages) {
      for (const section of page.sections) {
        const field = section.fields.find((f) => f.id === selectedFieldId);
        if (field) return field;
      }
    }
    return null;
  }, [schema.pages, selectedFieldId]);

  const selectedSection = useMemo(() => {
    if (!selectedSectionId) return null;
    for (const page of schema.pages) {
      const section = page.sections.find((s) => s.id === selectedSectionId);
      if (section) return section;
    }
    return null;
  }, [schema.pages, selectedSectionId]);

  // Page operations
  const addPage = useCallback(() => {
    setSchema((prev) => ({
      ...prev,
      pages: [...prev.pages, createNewPage()],
    }));
  }, []);

  const removePage = useCallback(
    (pageIndex: number) => {
      setSchema((prev) => {
        if (prev.pages.length <= 1) return prev;
        const newPages = prev.pages.filter((_, i) => i !== pageIndex);
        return { ...prev, pages: newPages };
      });
      setSelectedPageIndex((prev) =>
        Math.max(0, Math.min(prev, schema.pages.length - 2)),
      );
      setSelectedSectionId(null);
      setSelectedFieldId(null);
    },
    [schema.pages.length],
  );

  const selectPage = useCallback((pageIndex: number) => {
    setSelectedPageIndex(pageIndex);
    setSelectedSectionId(null);
    setSelectedFieldId(null);
  }, []);

  const updatePage = useCallback(
    (pageIndex: number, updates: Partial<FormPage>) => {
      setSchema((prev) => ({
        ...prev,
        pages: prev.pages.map((page, i) =>
          i === pageIndex ? { ...page, ...updates } : page,
        ),
      }));
    },
    [],
  );

  const movePage = useCallback((fromIndex: number, toIndex: number) => {
    setSchema((prev) => {
      const newPages = [...prev.pages];
      const [movedPage] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, movedPage);
      return { ...prev, pages: newPages };
    });
    setSelectedPageIndex(toIndex);
  }, []);

  const duplicatePage = useCallback((pageIndex: number) => {
    setSchema((prev) => {
      const pageToDuplicate = prev.pages[pageIndex];
      const duplicatedPage: FormPage = JSON.parse(
        JSON.stringify(pageToDuplicate),
      );

      // Generate new IDs for the duplicated page and all its contents
      duplicatedPage.id = generateId();
      duplicatedPage.title = pageToDuplicate.title
        ? `${pageToDuplicate.title} (copy)`
        : `Page ${pageIndex + 1} (copy)`;

      duplicatedPage.sections = duplicatedPage.sections.map((section) => ({
        ...section,
        id: generateId(),
        fields: section.fields.map((field) => ({
          ...field,
          id: generateId(),
          name: `field_${generateId()}`,
          options: field.options?.map((opt) => ({
            ...opt,
            id: generateId(),
          })),
        })),
      }));

      const newPages = [...prev.pages];
      newPages.splice(pageIndex + 1, 0, duplicatedPage);
      return { ...prev, pages: newPages };
    });
  }, []);

  // Section operations
  const addSection = useCallback((pageIndex: number) => {
    setSchema((prev) => ({
      ...prev,
      pages: prev.pages.map((page, i) =>
        i === pageIndex
          ? { ...page, sections: [...page.sections, createNewSection()] }
          : page,
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
          : page,
      ),
    }));
    setSelectedSectionId(null);
    setSelectedFieldId(null);
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
                  s.id === sectionId ? { ...s, ...updates } : s,
                ),
              }
            : page,
        ),
      }));
    },
    [],
  );

  const moveSection = useCallback(
    (pageIndex: number, fromIndex: number, toIndex: number) => {
      setSchema((prev) => ({
        ...prev,
        pages: prev.pages.map((page, i) => {
          if (i !== pageIndex) return page;
          const newSections = [...page.sections];
          const [movedSection] = newSections.splice(fromIndex, 1);
          newSections.splice(toIndex, 0, movedSection);
          return { ...page, sections: newSections };
        }),
      }));
    },
    [],
  );

  const duplicateSection = useCallback(
    (pageIndex: number, sectionId: string) => {
      setSchema((prev) => ({
        ...prev,
        pages: prev.pages.map((page, i) => {
          if (i !== pageIndex) return page;
          const sectionIndex = page.sections.findIndex(
            (s) => s.id === sectionId,
          );
          if (sectionIndex === -1) return page;

          const sectionToDuplicate = page.sections[sectionIndex];
          const duplicatedSection: FormSection = JSON.parse(
            JSON.stringify(sectionToDuplicate),
          );

          duplicatedSection.id = generateId();
          duplicatedSection.title = sectionToDuplicate.title
            ? `${sectionToDuplicate.title} (copy)`
            : undefined;
          duplicatedSection.fields = duplicatedSection.fields.map((field) => ({
            ...field,
            id: generateId(),
            name: `field_${generateId()}`,
            options: field.options?.map((opt) => ({
              ...opt,
              id: generateId(),
            })),
          }));

          const newSections = [...page.sections];
          newSections.splice(sectionIndex + 1, 0, duplicatedSection);
          return { ...page, sections: newSections };
        }),
      }));
    },
    [],
  );

  // Field operations
  const addField = useCallback(
    (pageIndex: number, sectionId: string, fieldType: FieldType) => {
      const newField = createNewField(fieldType);
      setSchema((prev) => ({
        ...prev,
        pages: prev.pages.map((page, i) =>
          i === pageIndex
            ? {
                ...page,
                sections: page.sections.map((section) =>
                  section.id === sectionId
                    ? { ...section, fields: [...section.fields, newField] }
                    : section,
                ),
              }
            : page,
        ),
      }));
      setSelectedFieldId(newField.id);
    },
    [],
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
                    : section,
                ),
              }
            : page,
        ),
      }));
      if (selectedFieldId === fieldId) {
        setSelectedFieldId(null);
      }
    },
    [selectedFieldId],
  );

  const selectField = useCallback((fieldId: string | null) => {
    setSelectedFieldId(fieldId);
  }, []);

  const updateField = useCallback(
    (
      pageIndex: number,
      sectionId: string,
      fieldId: string,
      updates: Partial<FormField>,
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
                          field.id === fieldId
                            ? { ...field, ...updates }
                            : field,
                        ),
                      }
                    : section,
                ),
              }
            : page,
        ),
      }));
    },
    [],
  );

  const moveField = useCallback(
    (
      fromPageIndex: number,
      fromSectionId: string,
      fromFieldIndex: number,
      toPageIndex: number,
      toSectionId: string,
      toFieldIndex: number,
    ) => {
      setSchema((prev) => {
        const newPages = JSON.parse(JSON.stringify(prev.pages));

        // Get the field to move
        const fromPage = newPages[fromPageIndex];
        const fromSection = fromPage.sections.find(
          (s: FormSection) => s.id === fromSectionId,
        );
        if (!fromSection) return prev;

        const [movedField] = fromSection.fields.splice(fromFieldIndex, 1);

        // Insert the field at the new position
        const toPage = newPages[toPageIndex];
        const toSection = toPage.sections.find(
          (s: FormSection) => s.id === toSectionId,
        );
        if (!toSection) return prev;

        toSection.fields.splice(toFieldIndex, 0, movedField);

        return { ...prev, pages: newPages };
      });
    },
    [],
  );

  const duplicateField = useCallback(
    (pageIndex: number, sectionId: string, fieldId: string) => {
      setSchema((prev) => ({
        ...prev,
        pages: prev.pages.map((page, i) => {
          if (i !== pageIndex) return page;
          return {
            ...page,
            sections: page.sections.map((section) => {
              if (section.id !== sectionId) return section;
              const fieldIndex = section.fields.findIndex(
                (f) => f.id === fieldId,
              );
              if (fieldIndex === -1) return section;

              const fieldToDuplicate = section.fields[fieldIndex];
              const duplicatedField: FormField = JSON.parse(
                JSON.stringify(fieldToDuplicate),
              );

              duplicatedField.id = generateId();
              duplicatedField.name = `field_${generateId()}`;
              duplicatedField.label = `${fieldToDuplicate.label} (copy)`;
              duplicatedField.options = duplicatedField.options?.map((opt) => ({
                ...opt,
                id: generateId(),
              }));

              const newFields = [...section.fields];
              newFields.splice(fieldIndex + 1, 0, duplicatedField);
              return { ...section, fields: newFields };
            }),
          };
        }),
      }));
    },
    [],
  );

  // Field option operations
  const addFieldOption = useCallback(
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
                        fields: section.fields.map((field) => {
                          if (field.id !== fieldId) return field;
                          const optionNumber = (field.options?.length ?? 0) + 1;
                          return {
                            ...field,
                            options: [
                              ...(field.options ?? []),
                              {
                                id: generateId(),
                                label: `Option ${optionNumber}`,
                                value: `option_${optionNumber}`,
                              },
                            ],
                          };
                        }),
                      }
                    : section,
                ),
              }
            : page,
        ),
      }));
    },
    [],
  );

  const removeFieldOption = useCallback(
    (
      pageIndex: number,
      sectionId: string,
      fieldId: string,
      optionId: string,
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
                          field.id === fieldId
                            ? {
                                ...field,
                                options: field.options?.filter(
                                  (opt) => opt.id !== optionId,
                                ),
                              }
                            : field,
                        ),
                      }
                    : section,
                ),
              }
            : page,
        ),
      }));
    },
    [],
  );

  const updateFieldOption = useCallback(
    (
      pageIndex: number,
      sectionId: string,
      fieldId: string,
      optionId: string,
      updates: Partial<FieldOption>,
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
                          field.id === fieldId
                            ? {
                                ...field,
                                options: field.options?.map((opt) =>
                                  opt.id === optionId
                                    ? { ...opt, ...updates }
                                    : opt,
                                ),
                              }
                            : field,
                        ),
                      }
                    : section,
                ),
              }
            : page,
        ),
      }));
    },
    [],
  );

  // Settings operations
  const updateSettings = useCallback((updates: Partial<FormSettings>) => {
    setSchema((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  }, []);

  const updateStyling = useCallback((updates: Partial<FormStyling>) => {
    setSchema((prev) => ({
      ...prev,
      styling: { ...prev.styling, ...updates },
    }));
  }, []);

  const updateTheme = useCallback((updates: Partial<FormTheme>) => {
    setSchema((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: { ...prev.settings.theme, ...updates },
      },
    }));
  }, []);

  const updateSubmitButton = useCallback(
    (updates: Partial<import("./types").FormSubmitButton>) => {
      setSchema((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          submitButton: { ...prev.settings.submitButton, ...updates },
        },
      }));
    },
    [],
  );

  // Form metadata operations
  const updateFormMeta = useCallback(
    (updates: { title?: string; description?: string }) => {
      setSchema((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [],
  );

  // Utility functions
  const clearSelection = useCallback(() => {
    setSelectedSectionId(null);
    setSelectedFieldId(null);
  }, []);

  const getFieldLocation = useCallback(
    (fieldId: string): { pageIndex: number; sectionId: string } | null => {
      for (let pageIndex = 0; pageIndex < schema.pages.length; pageIndex++) {
        const page = schema.pages[pageIndex];
        for (const section of page.sections) {
          if (section.fields.some((f) => f.id === fieldId)) {
            return { pageIndex, sectionId: section.id };
          }
        }
      }
      return null;
    },
    [schema.pages],
  );

  return (
    <FormBuilderContext.Provider
      value={{
        formId,
        formName: schema.title,
        schema,
        doubleOptInEmailId,
        setDoubleOptInEmailId,
        selectedPageIndex,
        selectedSectionId,
        selectedFieldId,
        currentPage,
        selectedField,
        selectedSection,
        addPage,
        removePage,
        selectPage,
        updatePage,
        movePage,
        duplicatePage,
        addSection,
        removeSection,
        selectSection,
        updateSection,
        moveSection,
        duplicateSection,
        addField,
        removeField,
        selectField,
        updateField,
        moveField,
        duplicateField,
        addFieldOption,
        removeFieldOption,
        updateFieldOption,
        updateSettings,
        updateStyling,
        updateTheme,
        updateSubmitButton,
        updateFormMeta,
        clearSelection,
        getFieldLocation,
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
