import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type VariableType = "text" | "number";

/**
 * A variable definition with metadata (editable)
 */
export interface VariableDefinition {
  id: string;
  name: string;
  type: VariableType;
}

/**
 * Variables can be passed as strings (system variables, not editable)
 * or as VariableDefinition objects (custom variables, editable)
 */
export type VariableInput = string | VariableDefinition;

/**
 * Normalized variable used internally
 */
export interface NormalizedVariable {
  id: string;
  name: string;
  type: VariableType;
  editable: boolean;
}

export type OnVariableCreateCallback = (variable: VariableDefinition) => void;
export type OnVariableUpdateCallback = (variable: VariableDefinition) => void;
export type OnVariableDeleteCallback = (id: string) => void;

export type VariablesContextValue = {
  /**
   * All available variables (normalized)
   */
  variables: NormalizedVariable[];
  /**
   * Variable names that end with _url (for link popovers)
   */
  linkVariables: string[];
  /**
   * Whether custom variable management (create/edit/delete) is enabled
   */
  allowCustomVariables: boolean;
  /**
   * Add a new variable to the list
   */
  addVariable: (name: string, type: VariableType) => void;
  /**
   * Update an existing variable
   */
  updateVariable: (id: string, name: string, type: VariableType) => void;
  /**
   * Delete a variable
   */
  deleteVariable: (id: string) => void;
};

const defaultValue: VariablesContextValue = {
  variables: [],
  linkVariables: [],
  allowCustomVariables: false,
  addVariable: () => {},
  updateVariable: () => {},
  deleteVariable: () => {},
};

export const VariablesContext =
  createContext<VariablesContextValue>(defaultValue);

export interface VariablesProviderProps {
  variables: VariableInput[];
  children: React.ReactNode;
  /**
   * Whether to allow creating, editing, and deleting custom variables.
   * @default false
   */
  allowCustomVariables?: boolean;
  onVariableCreate?: OnVariableCreateCallback;
  onVariableUpdate?: OnVariableUpdateCallback;
  onVariableDelete?: OnVariableDeleteCallback;
}

function generateId(): string {
  return `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function normalizeVariable(input: VariableInput): NormalizedVariable {
  if (typeof input === "string") {
    return {
      id: `system_${input}`,
      name: input,
      type: "text",
      editable: false,
    };
  }
  return {
    ...input,
    editable: true,
  };
}

export function VariablesProvider({
  variables: initialVariables,
  children,
  allowCustomVariables = false,
  onVariableCreate,
  onVariableUpdate,
  onVariableDelete,
}: VariablesProviderProps) {
  const [createdVariables, setCreatedVariables] = useState<VariableDefinition[]>([]);

  const variables = useMemo(() => {
    const normalized = initialVariables.map(normalizeVariable);
    const created = createdVariables.map((v) => ({ ...v, editable: true }));

    // Combine and deduplicate by name
    const allVariables = [...normalized, ...created];
    const seen = new Set<string>();
    return allVariables.filter((v) => {
      if (seen.has(v.name)) return false;
      seen.add(v.name);
      return true;
    });
  }, [initialVariables, createdVariables]);

  const addVariable = useCallback(
    (name: string, type: VariableType) => {
      const newVariable: VariableDefinition = {
        id: generateId(),
        name,
        type,
      };

      const exists = variables.some((v) => v.name === name);
      if (!exists) {
        setCreatedVariables((prev) => [...prev, newVariable]);
      }

      onVariableCreate?.(newVariable);
    },
    [variables, onVariableCreate]
  );

  const updateVariable = useCallback(
    (id: string, name: string, type: VariableType) => {
      setCreatedVariables((prev) =>
        prev.map((v) => (v.id === id ? { ...v, name, type } : v))
      );

      onVariableUpdate?.({ id, name, type });
    },
    [onVariableUpdate]
  );

  const deleteVariable = useCallback(
    (id: string) => {
      setCreatedVariables((prev) => prev.filter((v) => v.id !== id));
      onVariableDelete?.(id);
    },
    [onVariableDelete]
  );

  const value = useMemo(() => {
    const linkVariables = variables
      .filter((v) => v.name.endsWith("_url"))
      .map((v) => v.name);

    return {
      variables,
      linkVariables,
      allowCustomVariables,
      addVariable,
      updateVariable,
      deleteVariable,
    };
  }, [variables, allowCustomVariables, addVariable, updateVariable, deleteVariable]);

  return (
    <VariablesContext.Provider value={value}>
      {children}
    </VariablesContext.Provider>
  );
}

export function useVariables(): VariablesContextValue {
  return useContext(VariablesContext);
}
