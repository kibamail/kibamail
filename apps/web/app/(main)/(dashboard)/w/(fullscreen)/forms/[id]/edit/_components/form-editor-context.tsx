"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";

type SaveStatus = "idle" | "saving" | "success" | "error";

interface FormEditorContextValue {
  formId: string;
  schema: object;
  theme: object;
  setSchema: (schema: object) => void;
  setTheme: (theme: object) => void;
  saveStatus: SaveStatus;
  save: () => void;
  hasUnsavedChanges: boolean;
}

const FormEditorContext = createContext<FormEditorContextValue | null>(null);

interface FormEditorProviderProps {
  formId: string;
  initialFields: object | null;
  initialSettings: object | null;
  children: ReactNode;
}

export function FormEditorProvider({
  formId,
  initialFields,
  initialSettings,
  children,
}: FormEditorProviderProps) {
  const [schema, setSchemaState] = useState<object>(initialFields || {});
  const [theme, setThemeState] = useState<object>(initialSettings || {});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use refs to always have latest values in callbacks
  const schemaRef = useRef(schema);
  const themeRef = useRef(theme);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const { mutate: updateForm } = useMutation({
    mutationFn: async (data: { fields?: object; settings?: object }) => {
      return await internalApi.forms().update(formId, data);
    },
    onSuccess: () => {
      setSaveStatus("success");
      setHasUnsavedChanges(false);

      // Clear any existing success timer
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }

      // Reset to idle after 2 seconds
      successTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    },
    onError: () => {
      setSaveStatus("error");

      // Reset to idle after 3 seconds on error
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    },
  });

  const save = useCallback(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setSaveStatus("saving");
    updateForm({ fields: schemaRef.current, settings: themeRef.current });
  }, [updateForm]);

  const triggerAutoSave = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer (2 seconds)
    debounceTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      updateForm({ fields: schemaRef.current, settings: themeRef.current });
    }, 2000);
  }, [updateForm]);

  const setSchema = useCallback(
    (newSchema: object) => {
      setSchemaState(newSchema);
      setHasUnsavedChanges(true);
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  const setTheme = useCallback(
    (newTheme: object) => {
      setThemeState(newTheme);
      setHasUnsavedChanges(true);
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  return (
    <FormEditorContext.Provider
      value={{
        formId,
        schema,
        theme,
        setSchema,
        setTheme,
        saveStatus,
        save,
        hasUnsavedChanges,
      }}
    >
      {children}
    </FormEditorContext.Provider>
  );
}

export function useFormEditor() {
  const context = useContext(FormEditorContext);

  if (!context) {
    throw new Error("useFormEditor must be used within a FormEditorProvider");
  }

  return context;
}
