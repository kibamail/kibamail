import { z } from "zod"

// =============================================================================
// FIELD TYPES
// =============================================================================

export const FIELD_TYPES = {
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
} as const

export const fieldTypeSchema = z.enum([
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
])

export type FieldType = z.infer<typeof fieldTypeSchema>

// =============================================================================
// VALIDATION RULES
// =============================================================================

export const textValidationSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
})

export const numberValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  integer: z.boolean().optional(),
})

export const dateValidationSchema = z.object({
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
  disablePastDates: z.boolean().optional(),
  disableFutureDates: z.boolean().optional(),
})

export const fileValidationSchema = z.object({
  maxSize: z.number().int().min(1).optional(), // in bytes
  maxFiles: z.number().int().min(1).optional(),
  allowedTypes: z.array(z.string()).optional(), // MIME types
})

export const ratingValidationSchema = z.object({
  maxRating: z.number().int().min(2).max(10).optional(),
})

export const sliderValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
})

export const validationSchema = z.object({
  required: z.boolean().optional(),
  requiredMessage: z.string().optional(),
  text: textValidationSchema.optional(),
  number: numberValidationSchema.optional(),
  date: dateValidationSchema.optional(),
  file: fileValidationSchema.optional(),
  rating: ratingValidationSchema.optional(),
  slider: sliderValidationSchema.optional(),
})

export type ValidationRules = z.infer<typeof validationSchema>

// =============================================================================
// FIELD OPTIONS (for select, radio, checkbox_group)
// =============================================================================

export const fieldOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(), // Used for choice_card options
})

export type FieldOption = z.infer<typeof fieldOptionSchema>

// =============================================================================
// CONDITIONAL LOGIC
// =============================================================================

export const COMPARISON_OPERATORS = {
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
} as const

export const comparisonOperatorSchema = z.enum([
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
])

export type ComparisonOperator = z.infer<typeof comparisonOperatorSchema>

export const LOGICAL_OPERATORS = {
  AND: "and",
  OR: "or",
} as const

export const logicalOperatorSchema = z.enum(["and", "or"])

export type LogicalOperator = z.infer<typeof logicalOperatorSchema>

export const conditionSchema = z.object({
  fieldId: z.string().min(1),
  operator: comparisonOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
})

export type Condition = z.infer<typeof conditionSchema>

export const conditionalLogicSchema = z.object({
  enabled: z.boolean(),
  action: z.enum(["show", "hide"]),
  logicalOperator: logicalOperatorSchema,
  conditions: z.array(conditionSchema),
})

export type ConditionalLogic = z.infer<typeof conditionalLogicSchema>

// =============================================================================
// FIELD APPEARANCE
// =============================================================================

export const fieldWidthSchema = z.enum(["full", "half", "third", "quarter"])
export const labelPositionSchema = z.enum(["top", "left", "hidden"])
export const fieldSizeSchema = z.enum(["sm", "default", "lg"])

export const fieldAppearanceSchema = z.object({
  width: fieldWidthSchema,
  labelPosition: labelPositionSchema,
  size: fieldSizeSchema,
})

export type FieldWidth = z.infer<typeof fieldWidthSchema>
export type LabelPosition = z.infer<typeof labelPositionSchema>
export type FieldSize = z.infer<typeof fieldSizeSchema>
export type FieldAppearance = z.infer<typeof fieldAppearanceSchema>

// =============================================================================
// FORM FIELD
// =============================================================================

export const formFieldSchema = z.object({
  id: z.string().min(1),
  type: fieldTypeSchema,
  name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message: "Field name must start with a letter or underscore and contain only alphanumeric characters and underscores",
  }),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  options: z.array(fieldOptionSchema).optional(),
  validation: validationSchema.optional(),
  conditionalLogic: conditionalLogicSchema.optional(),
  appearance: fieldAppearanceSchema,
})

export type FormField = z.infer<typeof formFieldSchema>

// =============================================================================
// FORM SECTION
// =============================================================================

export const formSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).min(1),
  conditionalLogic: conditionalLogicSchema.optional(),
  collapsible: z.boolean(),
  defaultCollapsed: z.boolean(),
})

export type FormSection = z.infer<typeof formSectionSchema>

// =============================================================================
// FORM PAGE (for multi-page forms)
// =============================================================================

export const formPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  sections: z.array(formSectionSchema).min(1),
  conditionalLogic: conditionalLogicSchema.optional(),
})

export type FormPage = z.infer<typeof formPageSchema>

// =============================================================================
// FORM SETTINGS
// =============================================================================

export const buttonVariantSchema = z.enum(["default", "secondary", "outline", "ghost"])
export const buttonSizeSchema = z.enum(["sm", "default", "lg"])
export const buttonPositionSchema = z.enum(["left", "center", "right"])

export const formSubmitButtonSchema = z.object({
  text: z.string(),
  loadingText: z.string(),
  variant: buttonVariantSchema,
  size: buttonSizeSchema,
  fullWidth: z.boolean(),
  position: buttonPositionSchema,
})

export type ButtonVariant = z.infer<typeof buttonVariantSchema>
export type ButtonSize = z.infer<typeof buttonSizeSchema>
export type ButtonPosition = z.infer<typeof buttonPositionSchema>
export type FormSubmitButton = z.infer<typeof formSubmitButtonSchema>

export const formSuccessMessageSchema = z.object({
  type: z.literal("message"),
  message: z.string().min(1),
})

export const formSuccessRedirectSchema = z.object({
  type: z.literal("redirect"),
  url: z.string().url(),
  openInNewTab: z.boolean(),
})

export const formSuccessActionSchema = z.discriminatedUnion("type", [
  formSuccessMessageSchema,
  formSuccessRedirectSchema,
])

export type FormSuccessAction = z.infer<typeof formSuccessActionSchema>

export const formSettingsSchema = z.object({
  submitButton: formSubmitButtonSchema,
  successAction: formSuccessActionSchema,
  showProgressBar: z.boolean(),
  allowSaveAndContinue: z.boolean(),
  preventDuplicateSubmissions: z.boolean(),
  theme: z.lazy(() => formThemeSchema),
})

export type FormSettings = z.infer<typeof formSettingsSchema>

// =============================================================================
// FORM THEME (shadcn-compatible)
// =============================================================================

export const formThemeColorsSchema = z.object({
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
})

export type FormThemeColors = z.infer<typeof formThemeColorsSchema>

export const formThemeFontSchema = z.object({
  family: z.string(),
  url: z.string().url(),
})

export type FormThemeFont = z.infer<typeof formThemeFontSchema>

// CSS properties schema - allows any valid CSS property/value pairs
export const cssPropertiesSchema = z.record(z.string(), z.union([z.string(), z.number()]))

export type CSSPropertiesRecord = z.infer<typeof cssPropertiesSchema>

export const formThemeSchema = z.object({
  mode: z.enum(["light", "dark"]),
  radius: z.string(),
  colors: formThemeColorsSchema,
  font: formThemeFontSchema,
  body: cssPropertiesSchema,
  container: cssPropertiesSchema,
})

export type FormTheme = z.infer<typeof formThemeSchema>

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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    boxSizing: "border-box",
    background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)",
  },
  container: {
    width: "100%",
    maxWidth: "32rem",
    backgroundColor: "#ffffff",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    padding: "2rem",
    boxSizing: "border-box",
  },
  colors: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.141 0.005 285.823)",
    card: "oklch(1 0 0)",
    cardForeground: "oklch(0.141 0.005 285.823)",
    popover: "oklch(1 0 0)",
    popoverForeground: "oklch(0.141 0.005 285.823)",
    primary: "oklch(0.21 0.006 285.885)",
    primaryForeground: "oklch(0.985 0 0)",
    secondary: "oklch(0.967 0.001 286.375)",
    secondaryForeground: "oklch(0.21 0.006 285.885)",
    muted: "oklch(0.967 0.001 286.375)",
    mutedForeground: "oklch(0.552 0.016 285.938)",
    accent: "oklch(0.967 0.001 286.375)",
    accentForeground: "oklch(0.21 0.006 285.885)",
    destructive: "oklch(0.577 0.245 27.325)",
    border: "oklch(0.92 0.004 286.32)",
    input: "oklch(0.92 0.004 286.32)",
    ring: "oklch(0.705 0.015 286.067)",
  },
}

// Default dark theme (shadcn zinc)
export const DEFAULT_DARK_THEME: FormTheme = {
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
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.2)",
    padding: "2rem",
    boxSizing: "border-box",
  },
  colors: {
    background: "oklch(0.141 0.005 285.823)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.21 0.006 285.885)",
    cardForeground: "oklch(0.985 0 0)",
    popover: "oklch(0.21 0.006 285.885)",
    popoverForeground: "oklch(0.985 0 0)",
    primary: "oklch(0.92 0.004 286.32)",
    primaryForeground: "oklch(0.21 0.006 285.885)",
    secondary: "oklch(0.274 0.006 286.033)",
    secondaryForeground: "oklch(0.985 0 0)",
    muted: "oklch(0.274 0.006 286.033)",
    mutedForeground: "oklch(0.705 0.015 286.067)",
    accent: "oklch(0.274 0.006 286.033)",
    accentForeground: "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: "oklch(0.552 0.016 285.938)",
  },
}

// =============================================================================
// FORM STYLING
// =============================================================================

export const formLayoutSchema = z.enum(["stacked", "inline"])
export const labelStyleSchema = z.enum(["default", "floating"])
export const borderRadiusSchema = z.enum(["none", "sm", "md", "lg", "full"])
export const spacingSchema = z.enum(["compact", "default", "relaxed"])

export const formStylingSchema = z.object({
  layout: formLayoutSchema,
  labelStyle: labelStyleSchema,
  borderRadius: borderRadiusSchema,
  spacing: spacingSchema,
})

export type FormLayout = z.infer<typeof formLayoutSchema>
export type LabelStyle = z.infer<typeof labelStyleSchema>
export type BorderRadius = z.infer<typeof borderRadiusSchema>
export type Spacing = z.infer<typeof spacingSchema>
export type FormStyling = z.infer<typeof formStylingSchema>

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
})

export type FormBuilderSchema = z.infer<typeof formBuilderSchema>

// =============================================================================
// FORM SUBMISSION DATA
// =============================================================================

export const formSubmissionDataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])
)

export type FormSubmissionData = z.infer<typeof formSubmissionDataSchema>

// =============================================================================
// HELPER TYPES
// =============================================================================

export type FieldTypeConfig = {
  type: FieldType
  label: string
  icon: string
  supportsOptions: boolean
  supportsPlaceholder: boolean
  defaultValidation?: Partial<ValidationRules>
}

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
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_FIELD_APPEARANCE: FieldAppearance = {
  width: "full",
  labelPosition: "top",
  size: "default",
}

export const DEFAULT_SUBMIT_BUTTON: FormSubmitButton = {
  text: "Submit",
  loadingText: "Submitting...",
  variant: "default",
  size: "default",
  fullWidth: false,
  position: "left",
}

export const DEFAULT_SUCCESS_ACTION: FormSuccessAction = {
  type: "message",
  message: "Thank you for your submission!",
}

export const DEFAULT_FORM_SETTINGS: FormSettings = {
  submitButton: DEFAULT_SUBMIT_BUTTON,
  successAction: DEFAULT_SUCCESS_ACTION,
  showProgressBar: false,
  allowSaveAndContinue: false,
  preventDuplicateSubmissions: false,
  theme: DEFAULT_LIGHT_THEME,
}

export const DEFAULT_FORM_STYLING: FormStyling = {
  layout: "stacked",
  labelStyle: "default",
  borderRadius: "md",
  spacing: "default",
}

export const DEFAULT_CONDITIONAL_LOGIC: ConditionalLogic = {
  enabled: false,
  action: "show",
  logicalOperator: "and",
  conditions: [],
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createEmptyField(type: FieldType, id: string): FormField {
  const config = FIELD_TYPE_CONFIGS[type]
  return {
    id,
    type,
    name: `field_${id}`,
    label: config.label,
    placeholder: config.supportsPlaceholder ? "" : undefined,
    options: config.supportsOptions ? [] : undefined,
    appearance: DEFAULT_FIELD_APPEARANCE,
  }
}

export function createEmptySection(id: string): FormSection {
  return {
    id,
    fields: [],
    collapsible: false,
    defaultCollapsed: false,
  } as unknown as FormSection // fields will be populated
}

export function createEmptyPage(id: string): FormPage {
  const sectionId = `section_${id}_1`
  return {
    id,
    sections: [{
      id: sectionId,
      fields: [],
      collapsible: false,
      defaultCollapsed: false,
    }],
  } as unknown as FormPage // sections[0].fields will be populated
}

export function createEmptyForm(id: string, title: string): FormBuilderSchema {
  return {
    id,
    version: 1,
    title,
    pages: [{
      id: "page_1",
      sections: [{
        id: "section_page_1_1",
        fields: [],
        collapsible: false,
        defaultCollapsed: false,
      }],
    }],
    settings: DEFAULT_FORM_SETTINGS,
    styling: DEFAULT_FORM_STYLING,
  } as unknown as FormBuilderSchema // pages[0].sections[0].fields will be populated
}
