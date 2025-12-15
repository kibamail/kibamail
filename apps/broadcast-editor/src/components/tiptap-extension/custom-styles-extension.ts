import { Extension } from "@tiptap/core";
import type React from "react";

/**
 * Converts a camelCase CSS property name to kebab-case
 * e.g., backgroundColor -> background-color
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Converts a React CSS properties object to an inline style string
 * e.g., { backgroundColor: 'red', borderRadius: '4px' } -> "background-color: red; border-radius: 4px"
 */
function cssPropertiesToString(
  styles: React.CSSProperties | null | undefined
): string {
  if (!styles || typeof styles !== "object") {
    return "";
  }

  return Object.entries(styles)
    .map(([key, value]) => {
      const kebabKey = camelToKebab(key);
      return `${kebabKey}: ${value}`;
    })
    .join("; ");
}

/**
 * Parses an inline style string to a React CSS properties object
 * e.g., "background-color: red; border-radius: 4px" -> { backgroundColor: 'red', borderRadius: '4px' }
 */
function stringToCssProperties(styleString: string): React.CSSProperties {
  if (!styleString || typeof styleString !== "string") {
    return {};
  }

  const styles: React.CSSProperties = {};

  styleString.split(";").forEach((declaration) => {
    const [property, value] = declaration.split(":").map((s) => s.trim());

    if (property && value) {
      // Convert kebab-case to camelCase
      const camelProperty = property.replace(/-([a-z])/g, (g) =>
        g[1].toUpperCase()
      );
      styles[camelProperty as keyof React.CSSProperties] = value as any;
    }
  });

  return styles;
}

export interface CustomStylesOptions {
  /**
   * The types of nodes to add custom styles to.
   * @default []
   */
  types: string[];
}

export const CustomStyles = Extension.create<CustomStylesOptions>({
  name: "customStyles",

  priority: 9999,

  addOptions() {
    return {
      types: [],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          customStyle: {
            default: {},
            keepOnSplit: false,
            parseHTML: (element) => {
              const styleAttr = element.getAttribute("style");
              if (!styleAttr) {
                return {};
              }
              return stringToCssProperties(styleAttr);
            },
            renderHTML: (attributes) => {
              if (!attributes.customStyle) {
                return {};
              }

              const styleString = cssPropertiesToString(attributes.customStyle);

              if (!styleString) {
                return {};
              }

              return {
                style: styleString,
              };
            },
          },
        },
      },
    ];
  },
});
