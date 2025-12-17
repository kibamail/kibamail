import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import type { EditorConfig, EditorStylesConfig, HeadingLevel } from "@/types/editor-config";

/**
 * Non-heading style keys (excludes 'heading' which has a nested structure)
 */
export type SimpleStyleKey = Exclude<keyof EditorStylesConfig, "heading">;

/**
 * Context value for editor configuration
 */
export interface EditorConfigContextValue {
  /**
   * Global styles configuration
   */
  styles: EditorStylesConfig;

  /**
   * Get styles for a specific element type (excludes heading, use getHeadingStyles for headings)
   */
  getStyles: (type: SimpleStyleKey) => React.CSSProperties | undefined;

  /**
   * Get styles for a specific heading level (h1-h4)
   */
  getHeadingStyles: (level: HeadingLevel) => React.CSSProperties | undefined;

  /**
   * Update a specific style property for a given element type
   */
  updateStyleProperty: (
    type: keyof EditorStylesConfig,
    property: string,
    value: string | number
  ) => void;

  /**
   * Update a specific heading style property
   */
  updateHeadingStyleProperty: (
    level: HeadingLevel,
    property: string,
    value: string | number
  ) => void;

  /**
   * Remove a specific style property from a given element type
   */
  removeStyleProperty: (
    type: keyof EditorStylesConfig,
    property: string
  ) => void;
}

/**
 * Default empty configuration
 */
const defaultConfig: EditorConfig = {
  styles: {},
};

/**
 * Editor configuration context
 */
export const EditorConfigContext = createContext<EditorConfigContextValue>({
  styles: {},
  getStyles: () => undefined,
  getHeadingStyles: () => undefined,
  updateStyleProperty: () => {},
  updateHeadingStyleProperty: () => {},
  removeStyleProperty: () => {},
});

/**
 * Props for EditorConfigProvider
 */
export interface EditorConfigProviderProps {
  /**
   * Editor configuration
   */
  config?: Partial<EditorConfig>;

  /**
   * Callback when styles change
   */
  onStylesChange?: (styles: EditorStylesConfig) => void;

  /**
   * Children components
   */
  children: React.ReactNode;
}

/**
 * Provider component for editor configuration
 *
 * @example
 * ```tsx
 * <EditorConfigProvider config={{ styles: { body: { fontSize: '16px' } } }}>
 *   <EmailEditor />
 * </EditorConfigProvider>
 * ```
 */
export function EditorConfigProvider({
  config,
  onStylesChange,
  children,
}: EditorConfigProviderProps) {
  // Initialize with merged config
  const initialStyles = useMemo(
    () => ({
      ...defaultConfig.styles,
      ...config?.styles,
    }),
    [config]
  );

  const [styles, setStyles] = useState<EditorStylesConfig>(initialStyles);

  // Notify parent when styles change
  useEffect(() => {
    onStylesChange?.(styles);
  }, [styles, onStylesChange]);

  // Update a specific style property
  const updateStyleProperty = useCallback(
    (type: keyof EditorStylesConfig, property: string, value: string | number) => {
      setStyles((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          [property]: value,
        },
      }));
    },
    []
  );

  // Update a specific heading style property
  const updateHeadingStyleProperty = useCallback(
    (level: HeadingLevel, property: string, value: string | number) => {
      const headingKey = `h${level}` as keyof NonNullable<EditorStylesConfig["heading"]>;
      setStyles((prev) => ({
        ...prev,
        heading: {
          ...prev.heading,
          [headingKey]: {
            ...prev.heading?.[headingKey],
            [property]: value,
          },
        },
      }));
    },
    []
  );

  // Remove a specific style property
  const removeStyleProperty = useCallback(
    (type: keyof EditorStylesConfig, property: string) => {
      setStyles((prev) => {
        const typeStyles = { ...prev[type] };
        delete typeStyles[property as keyof typeof typeStyles];
        return {
          ...prev,
          [type]: typeStyles,
        };
      });
    },
    []
  );

  // Get heading styles by level
  const getHeadingStyles = useCallback(
    (level: HeadingLevel): React.CSSProperties | undefined => {
      const headingKey = `h${level}` as keyof NonNullable<EditorStylesConfig["heading"]>;
      return styles.heading?.[headingKey];
    },
    [styles.heading]
  );

  const contextValue = useMemo<EditorConfigContextValue>(
    () => ({
      styles,
      getStyles: (type: SimpleStyleKey) => styles[type],
      getHeadingStyles,
      updateStyleProperty,
      updateHeadingStyleProperty,
      removeStyleProperty,
    }),
    [styles, getHeadingStyles, updateStyleProperty, updateHeadingStyleProperty, removeStyleProperty]
  );

  return (
    <EditorConfigContext.Provider value={contextValue}>
      {children}
    </EditorConfigContext.Provider>
  );
}

/**
 * Hook to access editor configuration
 *
 * @returns Editor configuration context value
 *
 * @example
 * ```tsx
 * function MyCustomNode() {
 *   const { getStyles } = useEditorConfig();
 *   const buttonStyles = getStyles('button');
 *
 *   return <button style={buttonStyles}>Click me</button>;
 * }
 * ```
 */
export function useEditorConfig(): EditorConfigContextValue {
  const context = useContext(EditorConfigContext);

  if (!context) {
    throw new Error(
      "useEditorConfig must be used within an EditorConfigProvider"
    );
  }

  return context;
}
