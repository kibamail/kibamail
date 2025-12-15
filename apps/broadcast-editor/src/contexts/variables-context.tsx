import { createContext, useContext, useMemo } from "react";

export type VariablesContextValue = {
  /**
   * All available variables
   */
  variables: string[];
  /**
   * Variables that end with _url (for link popovers)
   */
  linkVariables: string[];
};

const defaultValue: VariablesContextValue = {
  variables: [],
  linkVariables: [],
};

export const VariablesContext =
  createContext<VariablesContextValue>(defaultValue);

export interface VariablesProviderProps {
  variables: string[];
  children: React.ReactNode;
}

export function VariablesProvider({
  variables,
  children,
}: VariablesProviderProps) {
  const value = useMemo(() => {
    const linkVariables = variables.filter((v) => v.endsWith("_url"));
    return {
      variables,
      linkVariables,
    };
  }, [variables]);

  return (
    <VariablesContext.Provider value={value}>
      {children}
    </VariablesContext.Provider>
  );
}

export function useVariables(): VariablesContextValue {
  return useContext(VariablesContext);
}
