import { z } from "zod";

// =============================================================================
// FIELD TYPES
// =============================================================================

const _FIELD_TYPES = {
  TEXT: "text",
  EMAIL: "email",
  NUMBER: "number",
  PHONE: "phone",
  URL: "url",
  TEXTAREA: "textarea",
  SELECT: "select",
  MULTI_SELECT: "multi_select",
  RADIO: "radio",
  CHOICE_CARD: "choice_card",
  CHECKBOX: "checkbox",
  CHECKBOX_GROUP: "checkbox_group",
  DATE: "date",
  TIME: "time",
  DATETIME: "datetime",
  FILE: "file",
  RATING: "rating",
  SLIDER: "slider",
  HIDDEN: "hidden",
  // Presentation fields (non-input)
  CONTENT: "content",
} as const;

const fieldTypeSchema = z.enum([
  "text",
  "email",
  "number",
  "phone",
  "url",
  "textarea",
  "select",
  "multi_select",
  "radio",
  "choice_card",
  "checkbox",
  "checkbox_group",
  "date",
  "time",
  "datetime",
  "file",
  "rating",
  "slider",
  "hidden",
  // Presentation fields (non-input)
  "content",
]);

export type FieldType = z.infer<typeof fieldTypeSchema>;

// =============================================================================
// VALIDATION RULES
// =============================================================================

const textValidationSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
});

const numberValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  integer: z.boolean().optional(),
});

const dateValidationSchema = z.object({
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
  disablePastDates: z.boolean().optional(),
  disableFutureDates: z.boolean().optional(),
});

const fileValidationSchema = z.object({
  maxSize: z.number().int().min(1).optional(), // in bytes
  maxFiles: z.number().int().min(1).optional(),
  allowedTypes: z.array(z.string()).optional(), // MIME types
});

const ratingValidationSchema = z.object({
  maxRating: z.number().int().min(2).max(10).optional(),
});

const sliderValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

const validationSchema = z.object({
  required: z.boolean().optional(),
  requiredMessage: z.string().optional(),
  text: textValidationSchema.optional(),
  number: numberValidationSchema.optional(),
  date: dateValidationSchema.optional(),
  file: fileValidationSchema.optional(),
  rating: ratingValidationSchema.optional(),
  slider: sliderValidationSchema.optional(),
});

export type ValidationRules = z.infer<typeof validationSchema>;

// =============================================================================
// FIELD OPTIONS (for select, radio, checkbox_group)
// =============================================================================

const fieldOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(), // Used for choice_card options
});

export type FieldOption = z.infer<typeof fieldOptionSchema>;

// =============================================================================
// CONDITIONAL LOGIC
// =============================================================================

const _COMPARISON_OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "not_equals",
  CONTAINS: "contains",
  NOT_CONTAINS: "not_contains",
  GREATER_THAN: "greater_than",
  LESS_THAN: "less_than",
  GREATER_THAN_OR_EQUALS: "greater_than_or_equals",
  LESS_THAN_OR_EQUALS: "less_than_or_equals",
  IS_EMPTY: "is_empty",
  IS_NOT_EMPTY: "is_not_empty",
  STARTS_WITH: "starts_with",
  ENDS_WITH: "ends_with",
} as const;

const comparisonOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "greater_than",
  "less_than",
  "greater_than_or_equals",
  "less_than_or_equals",
  "is_empty",
  "is_not_empty",
  "starts_with",
  "ends_with",
]);

const _LOGICAL_OPERATORS = {
  AND: "and",
  OR: "or",
} as const;

const logicalOperatorSchema = z.enum(["and", "or"]);

const conditionSchema = z.object({
  fieldId: z.string().min(1),
  operator: comparisonOperatorSchema,
  value: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
    .optional(),
});

const conditionalLogicSchema = z.object({
  enabled: z.boolean(),
  action: z.enum(["show", "hide"]),
  logicalOperator: logicalOperatorSchema,
  conditions: z.array(conditionSchema),
});

export type ConditionalLogic = z.infer<typeof conditionalLogicSchema>;

// =============================================================================
// FIELD APPEARANCE
// =============================================================================

const fieldWidthSchema = z.enum(["full", "half", "third", "quarter"]);
const labelPositionSchema = z.enum(["top", "left", "hidden"]);
const fieldSizeSchema = z.enum(["sm", "default", "lg"]);

const fieldAppearanceSchema = z.object({
  width: fieldWidthSchema,
  labelPosition: labelPositionSchema,
  size: fieldSizeSchema,
});

export type FieldWidth = z.infer<typeof fieldWidthSchema>;
export type LabelPosition = z.infer<typeof labelPositionSchema>;
export type FieldAppearance = z.infer<typeof fieldAppearanceSchema>;

// =============================================================================
// CONTACT PROPERTY MAPPING
// =============================================================================

/**
 * Standard contact properties that are built-in to Kibamail
 */
export const STANDARD_CONTACT_PROPERTIES = [
  "email",
  "firstName",
  "lastName",
  "phone",
  "country",
  "timezone",
  "city",
] as const;

/**
 * Maps a form field to a contact property (either standard or custom)
 */
const contactPropertyMappingSchema = z.object({
  type: z.enum(["standard", "custom"]),
  id: z.string().min(1), // e.g., "email", "firstName", or a custom property ID
  name: z.string().min(1), // Display name for the property
});

export type ContactPropertyMapping = z.infer<
  typeof contactPropertyMappingSchema
>;

// =============================================================================
// FORM FIELD
// =============================================================================

const formFieldSchema = z.object({
  id: z.string().min(1),
  type: fieldTypeSchema,
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
      message:
        "Field name must start with a letter or underscore and contain only alphanumeric characters and underscores",
    }),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  defaultValue: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
    .optional(),
  options: z.array(fieldOptionSchema).optional(),
  validation: validationSchema.optional(),
  conditionalLogic: conditionalLogicSchema.optional(),
  appearance: fieldAppearanceSchema,
  // Rich text content for "content" field type (stored as TipTap JSON)
  richContent: z.record(z.string(), z.unknown()).optional(),
  // Contact property mapping - links this form field to a contact property
  contactProperty: contactPropertyMappingSchema.optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;

// =============================================================================
// FORM SECTION
// =============================================================================

const formSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).min(1),
  conditionalLogic: conditionalLogicSchema.optional(),
  collapsible: z.boolean(),
  defaultCollapsed: z.boolean(),
});

export type FormSection = z.infer<typeof formSectionSchema>;

// =============================================================================
// FORM PAGE (for multi-page forms)
// =============================================================================

const formPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  sections: z.array(formSectionSchema).min(1),
  conditionalLogic: conditionalLogicSchema.optional(),
});

export type FormPage = z.infer<typeof formPageSchema>;

// =============================================================================
// FORM SETTINGS
// =============================================================================

const buttonVariantSchema = z.enum([
  "default",
  "secondary",
  "outline",
  "ghost",
]);
const buttonSizeSchema = z.enum(["sm", "default", "lg"]);
const buttonPositionSchema = z.enum(["left", "center", "right"]);

const formSubmitButtonSchema = z.object({
  text: z.string(),
  loadingText: z.string(),
  variant: buttonVariantSchema,
  size: buttonSizeSchema,
  fullWidth: z.boolean(),
  position: buttonPositionSchema,
});

export type ButtonVariant = z.infer<typeof buttonVariantSchema>;
export type ButtonSize = z.infer<typeof buttonSizeSchema>;
export type ButtonPosition = z.infer<typeof buttonPositionSchema>;
export type FormSubmitButton = z.infer<typeof formSubmitButtonSchema>;

const formSuccessMessageSchema = z.object({
  type: z.literal("message"),
  // Plain text message (deprecated, kept for backwards compatibility)
  message: z.string().optional(),
  // Rich content for success message (TipTap JSON format)
  richContent: z.record(z.string(), z.unknown()).optional(),
});

const formSuccessRedirectSchema = z.object({
  type: z.literal("redirect"),
  url: z.string().url(),
  openInNewTab: z.boolean(),
});

const formSuccessActionSchema = z.discriminatedUnion("type", [
  formSuccessMessageSchema,
  formSuccessRedirectSchema,
]);

export type FormSuccessAction = z.infer<typeof formSuccessActionSchema>;

// Double opt-in configuration
const doubleOptInSchema = z.object({
  enabled: z.boolean(),
});

export type DoubleOptIn = z.infer<typeof doubleOptInSchema>;

const formSettingsSchema = z.object({
  submitButton: formSubmitButtonSchema,
  successAction: formSuccessActionSchema,
  doubleOptIn: doubleOptInSchema,
  showProgressBar: z.boolean(),
  allowSaveAndContinue: z.boolean(),
  preventDuplicateSubmissions: z.boolean(),
  theme: z.lazy(() => formThemeSchema),
});

export type FormSettings = z.infer<typeof formSettingsSchema>;

// =============================================================================
// FORM THEME (shadcn-compatible)
// =============================================================================

const formThemeColorsSchema = z.object({
  background: z.string(),
  foreground: z.string(),
  card: z.string(),
  cardForeground: z.string(),
  popover: z.string(),
  popoverForeground: z.string(),
  primary: z.string(),
  primaryForeground: z.string(),
  secondary: z.string(),
  secondaryForeground: z.string(),
  muted: z.string(),
  mutedForeground: z.string(),
  accent: z.string(),
  accentForeground: z.string(),
  destructive: z.string(),
  border: z.string(),
  input: z.string(),
  ring: z.string(),
});

const formThemeFontSchema = z.object({
  family: z.string(),
  url: z.string().url(),
});

// CSS properties schema - allows any valid CSS property/value pairs
const cssPropertiesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number()]),
);

const formThemeSchema = z.object({
  mode: z.enum(["light", "dark"]),
  radius: z.string(),
  colors: formThemeColorsSchema,
  font: formThemeFontSchema,
  body: cssPropertiesSchema,
  container: cssPropertiesSchema,
});

export type FormTheme = z.infer<typeof formThemeSchema>;

// Default light theme (shadcn zinc)
export const DEFAULT_LIGHT_THEME: FormTheme = {
  mode: "light",
  radius: "0.625rem",
  font: {
    family: "Inter",
    url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  body: {
    width: "100%",
    minHeight: "100vh",
    padding: "1rem",
    boxSizing: "border-box",
    background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)",
  },
  container: {
    width: "100%",
    maxWidth: "32rem",
    backgroundColor: "#ffffff",
    borderRadius: "0.75rem",
    boxShadow:
      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    padding: "2rem",
    boxSizing: "border-box",
  },
  colors: {
    background: "#ffffff",
    foreground: "#09090b",
    card: "#ffffff",
    cardForeground: "#09090b",
    popover: "#ffffff",
    popoverForeground: "#09090b",
    primary: "#18181b",
    primaryForeground: "#fafafa",
    secondary: "#f4f4f5",
    secondaryForeground: "#18181b",
    muted: "#f4f4f5",
    mutedForeground: "#71717b",
    accent: "#f4f4f5",
    accentForeground: "#18181b",
    destructive: "#e7000b",
    border: "#e4e4e7",
    input: "#e4e4e7",
    ring: "#9f9fa9",
  },
};

// Default dark theme (shadcn zinc)
const DEFAULT_DARK_THEME: FormTheme = {
  mode: "dark",
  radius: "0.625rem",
  font: {
    family: "Inter",
    url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  body: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    boxSizing: "border-box",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
  },
  container: {
    width: "100%",
    maxWidth: "32rem",
    backgroundColor: "#1f2937",
    borderRadius: "0.75rem",
    boxShadow:
      "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.2)",
    padding: "2rem",
    boxSizing: "border-box",
  },
  colors: {
    background: "#09090b",
    foreground: "#fafafa",
    card: "#18181b",
    cardForeground: "#fafafa",
    popover: "#18181b",
    popoverForeground: "#fafafa",
    primary: "#e4e4e7",
    primaryForeground: "#18181b",
    secondary: "#27272a",
    secondaryForeground: "#fafafa",
    muted: "#27272a",
    mutedForeground: "#9f9fa9",
    accent: "#27272a",
    accentForeground: "#fafafa",
    destructive: "#ff6467",
    border: "#ffffff1a",
    input: "#ffffff26",
    ring: "#71717b",
  },
};

// Brutalist theme - Raw, bold, high contrast
const BRUTALIST_THEME: FormTheme = {
  mode: "light",
  radius: "0",
  font: {
    family: "Space Mono",
    url: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap",
  },
  body: {
    width: "100%",
    minHeight: "100vh",
    padding: "1rem",
    boxSizing: "border-box",
    background: "#ffffff",
  },
  container: {
    width: "100%",
    maxWidth: "32rem",
    backgroundColor: "#ffffff",
    border: "3px solid #000000",
    padding: "2rem",
    boxSizing: "border-box",
  },
  colors: {
    background: "#ffffff",
    foreground: "#000000",
    card: "#ffffff",
    cardForeground: "#000000",
    popover: "#ffffff",
    popoverForeground: "#000000",
    primary: "#000000",
    primaryForeground: "#ffffff",
    secondary: "#f0f0f0",
    secondaryForeground: "#000000",
    muted: "#e0e0e0",
    mutedForeground: "#666666",
    accent: "#ffff00",
    accentForeground: "#000000",
    destructive: "#ff0000",
    border: "#000000",
    input: "#000000",
    ring: "#000000",
  },
};

// Playful theme - Rounded, colorful, fun
const PLAYFUL_THEME: FormTheme = {
  mode: "light",
  radius: "1.5rem",
  font: {
    family: "Nunito",
    url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap",
  },
  body: {
    width: "100%",
    minHeight: "100vh",
    padding: "1rem",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #fef3c7 0%, #fce7f3 50%, #ddd6fe 100%)",
  },
  container: {
    width: "100%",
    maxWidth: "32rem",
    backgroundColor: "#ffffff",
    borderRadius: "1.5rem",
    boxShadow: "0 20px 40px -12px rgba(147, 51, 234, 0.25)",
    padding: "2.5rem",
    boxSizing: "border-box",
  },
  colors: {
    background: "#ffffff",
    foreground: "#581c87",
    card: "#ffffff",
    cardForeground: "#581c87",
    popover: "#ffffff",
    popoverForeground: "#581c87",
    primary: "#a855f7",
    primaryForeground: "#ffffff",
    secondary: "#f3e8ff",
    secondaryForeground: "#7c3aed",
    muted: "#faf5ff",
    mutedForeground: "#9333ea",
    accent: "#f0abfc",
    accentForeground: "#581c87",
    destructive: "#f43f5e",
    border: "#e9d5ff",
    input: "#e9d5ff",
    ring: "#c084fc",
  },
};

// Elegant theme - Refined, sophisticated, serif
const ELEGANT_THEME: FormTheme = {
  mode: "light",
  radius: "0.25rem",
  font: {
    family: "Cormorant Garamond",
    url: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap",
  },
  body: {
    width: "100%",
    minHeight: "100vh",
    padding: "1rem",
    boxSizing: "border-box",
    background: "#f8f5f2",
  },
  container: {
    width: "100%",
    maxWidth: "32rem",
    backgroundColor: "#fffcf9",
    borderRadius: "0.25rem",
    border: "1px solid #d4c4b5",
    boxShadow: "0 4px 20px -4px rgba(120, 100, 80, 0.15)",
    padding: "2.5rem",
    boxSizing: "border-box",
  },
  colors: {
    background: "#fffcf9",
    foreground: "#3d3329",
    card: "#fffcf9",
    cardForeground: "#3d3329",
    popover: "#fffcf9",
    popoverForeground: "#3d3329",
    primary: "#8b7355",
    primaryForeground: "#fffcf9",
    secondary: "#f3ebe3",
    secondaryForeground: "#5c4d3c",
    muted: "#efe8e0",
    mutedForeground: "#7a6b5a",
    accent: "#c9b99a",
    accentForeground: "#3d3329",
    destructive: "#b54a32",
    border: "#d4c4b5",
    input: "#d4c4b5",
    ring: "#a69076",
  },
};

// Export all themes for easy access
const _FORM_THEMES = {
  light: DEFAULT_LIGHT_THEME,
  dark: DEFAULT_DARK_THEME,
  brutalist: BRUTALIST_THEME,
  playful: PLAYFUL_THEME,
  elegant: ELEGANT_THEME,
} as const;

// =============================================================================
// FORM STYLING
// =============================================================================

const formLayoutSchema = z.enum(["stacked", "inline"]);
const labelStyleSchema = z.enum(["default", "floating"]);
const borderRadiusSchema = z.enum(["none", "sm", "md", "lg", "full"]);
const spacingSchema = z.enum(["compact", "default", "relaxed"]);

const formStylingSchema = z.object({
  layout: formLayoutSchema,
  labelStyle: labelStyleSchema,
  borderRadius: borderRadiusSchema,
  spacing: spacingSchema,
});

export type FormStyling = z.infer<typeof formStylingSchema>;

// =============================================================================
// FORM BUILDER SCHEMA (Complete Form Definition)
// =============================================================================

export const formBuilderSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  pages: z.array(formPageSchema).min(1),
  settings: formSettingsSchema,
  styling: formStylingSchema,
});

export type FormBuilderSchema = z.infer<typeof formBuilderSchema>;

// =============================================================================
// FORM SUBMISSION DATA
// =============================================================================

const formSubmissionDataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
);

export type FormSubmissionData = z.infer<typeof formSubmissionDataSchema>;

// =============================================================================
// HELPER TYPES
// =============================================================================

export type FieldTypeConfig = {
  type: FieldType;
  label: string;
  icon: string;
  supportsOptions: boolean;
  supportsPlaceholder: boolean;
  defaultValidation?: Partial<ValidationRules>;
};

export const FIELD_TYPE_CONFIGS: Record<FieldType, FieldTypeConfig> = {
  text: {
    type: "text",
    label: "Short Text",
    icon: "Type",
    supportsOptions: false,
    supportsPlaceholder: true,
  },
  email: {
    type: "email",
    label: "Email",
    icon: "Mail",
    supportsOptions: false,
    supportsPlaceholder: true,
  },
  number: {
    type: "number",
    label: "Number",
    icon: "Hash",
    supportsOptions: false,
    supportsPlaceholder: true,
  },
  phone: {
    type: "phone",
    label: "Phone",
    icon: "Phone",
    supportsOptions: false,
    supportsPlaceholder: true,
  },
  url: {
    type: "url",
    label: "URL",
    icon: "Link",
    supportsOptions: false,
    supportsPlaceholder: true,
  },
  textarea: {
    type: "textarea",
    label: "Long Text",
    icon: "AlignLeft",
    supportsOptions: false,
    supportsPlaceholder: true,
  },
  select: {
    type: "select",
    label: "Dropdown",
    icon: "ChevronDown",
    supportsOptions: true,
    supportsPlaceholder: true,
  },
  multi_select: {
    type: "multi_select",
    label: "Multi-Select",
    icon: "ListChecks",
    supportsOptions: true,
    supportsPlaceholder: true,
  },
  radio: {
    type: "radio",
    label: "Radio Group",
    icon: "CircleDot",
    supportsOptions: true,
    supportsPlaceholder: false,
  },
  choice_card: {
    type: "choice_card",
    label: "Choice Cards",
    icon: "LayoutGrid",
    supportsOptions: true,
    supportsPlaceholder: false,
  },
  checkbox: {
    type: "checkbox",
    label: "Checkbox",
    icon: "CheckSquare",
    supportsOptions: false,
    supportsPlaceholder: false,
  },
  checkbox_group: {
    type: "checkbox_group",
    label: "Checkbox Group",
    icon: "CheckSquare2",
    supportsOptions: true,
    supportsPlaceholder: false,
  },
  date: {
    type: "date",
    label: "Date",
    icon: "Calendar",
    supportsOptions: false,
    supportsPlaceholder: true,
  },
  time: {
    type: "time",
    label: "Time",
    icon: "Clock",
    supportsOptions: false,
    supportsPlaceholder: true,
  },
  datetime: {
    type: "datetime",
    label: "Date & Time",
    icon: "CalendarClock",
    supportsOptions: false,
    supportsPlaceholder: true,
  },
  file: {
    type: "file",
    label: "File Upload",
    icon: "Upload",
    supportsOptions: false,
    supportsPlaceholder: false,
  },
  rating: {
    type: "rating",
    label: "Rating",
    icon: "Star",
    supportsOptions: false,
    supportsPlaceholder: false,
  },
  slider: {
    type: "slider",
    label: "Slider",
    icon: "SlidersHorizontal",
    supportsOptions: false,
    supportsPlaceholder: false,
  },
  hidden: {
    type: "hidden",
    label: "Hidden Field",
    icon: "EyeOff",
    supportsOptions: false,
    supportsPlaceholder: false,
  },
  // Presentation fields
  content: {
    type: "content",
    label: "Content Block",
    icon: "FileText",
    supportsOptions: false,
    supportsPlaceholder: false,
  },
};

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_FIELD_APPEARANCE: FieldAppearance = {
  width: "full",
  labelPosition: "top",
  size: "default",
};

const DEFAULT_SUBMIT_BUTTON: FormSubmitButton = {
  text: "Submit",
  loadingText: "Submitting...",
  variant: "default",
  size: "default",
  fullWidth: false,
  position: "left",
};

const DEFAULT_SUCCESS_ACTION: FormSuccessAction = {
  type: "message",
  richContent: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Thank you!" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Your submission has been received. We'll be in touch soon.",
          },
        ],
      },
    ],
  },
};

const DEFAULT_DOUBLE_OPT_IN: DoubleOptIn = {
  enabled: true,
};

export const DEFAULT_FORM_SETTINGS: FormSettings = {
  submitButton: DEFAULT_SUBMIT_BUTTON,
  successAction: DEFAULT_SUCCESS_ACTION,
  doubleOptIn: DEFAULT_DOUBLE_OPT_IN,
  showProgressBar: false,
  allowSaveAndContinue: false,
  preventDuplicateSubmissions: false,
  theme: DEFAULT_LIGHT_THEME,
};

export const DEFAULT_FORM_STYLING: FormStyling = {
  layout: "stacked",
  labelStyle: "default",
  borderRadius: "md",
  spacing: "default",
};

const _DEFAULT_CONDITIONAL_LOGIC: ConditionalLogic = {
  enabled: false,
  action: "show",
  logicalOperator: "and",
  conditions: [],
};

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createEmptyField(type: FieldType, id: string): FormField {
  const config = FIELD_TYPE_CONFIGS[type];
  return {
    id,
    type,
    name: `field_${id}`,
    label: config.label,
    placeholder: config.supportsPlaceholder ? "" : undefined,
    options: config.supportsOptions ? [] : undefined,
    appearance: DEFAULT_FIELD_APPEARANCE,
  };
}

function _createEmptySection(id: string): FormSection {
  return {
    id,
    fields: [],
    collapsible: false,
    defaultCollapsed: false,
  } as unknown as FormSection; // fields will be populated
}

function _createEmptyPage(id: string): FormPage {
  const sectionId = `section_${id}_1`;
  return {
    id,
    sections: [
      {
        id: sectionId,
        fields: [],
        collapsible: false,
        defaultCollapsed: false,
      },
    ],
  } as unknown as FormPage; // sections[0].fields will be populated
}

export function createEmptyForm(id: string, title: string): FormBuilderSchema {
  return {
    id,
    version: 1,
    title,
    pages: [
      {
        id: "page_1",
        sections: [
          {
            id: "section_page_1_1",
            fields: [],
            collapsible: false,
            defaultCollapsed: false,
          },
        ],
      },
    ],
    settings: DEFAULT_FORM_SETTINGS,
    styling: DEFAULT_FORM_STYLING,
  } as unknown as FormBuilderSchema; // pages[0].sections[0].fields will be populated
}
