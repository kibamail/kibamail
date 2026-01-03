// Re-export only the types/values actually used by internal form-builder components
export {
  type ButtonPosition,
  type ButtonSize,
  type ButtonVariant,
  type ContactPropertyMapping,
  // Factory functions
  createEmptyField,
  DEFAULT_FIELD_APPEARANCE,
  DEFAULT_FORM_SETTINGS,
  DEFAULT_FORM_STYLING,
  DEFAULT_LIGHT_THEME,
  FIELD_TYPE_CONFIGS,
  type FieldOption,
  // Types
  type FieldType,
  type FieldTypeConfig,
  type FieldWidth,
  type FormBuilderSchema,
  type FormField,
  type FormPage,
  type FormSection,
  type FormSettings,
  type FormStyling,
  type FormSuccessAction,
  type FormTheme,
  type LabelPosition,
  // Constants
  STANDARD_CONTACT_PROPERTIES,
} from "@/lib/form-builder/schema";

// =============================================================================
// FIELD DEFINITIONS FOR UI (used in the sidebar palette)
// =============================================================================

export interface FieldDefinition {
  type: import("@/lib/form-builder/schema").FieldType;
  label: string;
  icon: string;
  description: string;
  category: "input" | "selection" | "advanced" | "presentation";
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Input fields
  {
    type: "text",
    label: "Short Text",
    icon: "Type",
    description: "Single line text input",
    category: "input",
  },
  {
    type: "email",
    label: "Email",
    icon: "AtSign",
    description: "Email address input",
    category: "input",
  },
  {
    type: "number",
    label: "Number",
    icon: "Hash",
    description: "Numeric input",
    category: "input",
  },
  {
    type: "phone",
    label: "Phone",
    icon: "Phone",
    description: "Phone number input",
    category: "input",
  },
  {
    type: "url",
    label: "URL",
    icon: "Link",
    description: "Website URL input",
    category: "input",
  },
  {
    type: "textarea",
    label: "Long Text",
    icon: "AlignLeft",
    description: "Multi-line text input",
    category: "input",
  },
  {
    type: "date",
    label: "Date",
    icon: "Calendar",
    description: "Date picker",
    category: "input",
  },
  {
    type: "time",
    label: "Time",
    icon: "Clock",
    description: "Time picker",
    category: "input",
  },
  {
    type: "datetime",
    label: "Date & Time",
    icon: "CalendarClock",
    description: "Date and time picker",
    category: "input",
  },

  // Selection fields
  {
    type: "select",
    label: "Dropdown",
    icon: "ChevronDown",
    description: "Single select dropdown",
    category: "selection",
  },
  {
    type: "multi_select",
    label: "Multi-Select",
    icon: "ListChecks",
    description: "Multiple selection",
    category: "selection",
  },
  {
    type: "radio",
    label: "Radio Group",
    icon: "CircleDot",
    description: "Radio button options",
    category: "selection",
  },
  {
    type: "choice_card",
    label: "Choice Cards",
    icon: "LayoutGrid",
    description: "Card-style options",
    category: "selection",
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: "CheckSquare",
    description: "Single checkbox",
    category: "selection",
  },
  {
    type: "checkbox_group",
    label: "Checkbox Group",
    icon: "CheckSquare2",
    description: "Multiple checkboxes",
    category: "selection",
  },

  // Advanced fields
  {
    type: "rating",
    label: "Rating",
    icon: "Star",
    description: "Star rating",
    category: "advanced",
  },
  {
    type: "slider",
    label: "Slider",
    icon: "SlidersHorizontal",
    description: "Numeric slider",
    category: "advanced",
  },
  {
    type: "file",
    label: "File Upload",
    icon: "Upload",
    description: "File attachment",
    category: "advanced",
  },
  {
    type: "hidden",
    label: "Hidden Field",
    icon: "EyeOff",
    description: "Hidden form field",
    category: "advanced",
  },

  // Presentation fields (non-input)
  {
    type: "content",
    label: "Content Block",
    icon: "FileText",
    description: "Rich text content with images",
    category: "presentation",
  },
];

export const FIELD_CATEGORIES = {
  input: { label: "Input Fields", icon: "Type" },
  selection: { label: "Selection Fields", icon: "List" },
  advanced: { label: "Advanced Fields", icon: "Puzzle" },
  presentation: { label: "Presentation", icon: "LayoutList" },
} as const;
