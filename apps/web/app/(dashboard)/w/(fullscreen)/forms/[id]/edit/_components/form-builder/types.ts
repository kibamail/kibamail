export type FieldType =
  | "text"
  | "email"
  | "number"
  | "phone"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "url"
  | "hidden";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string;
}

export interface FormSection {
  id: string;
  title?: string;
  description?: string;
  fields: FormField[];
}

export interface FormPage {
  id: string;
  title?: string;
  description?: string;
  sections: FormSection[];
}

export interface FormSchema {
  pages: FormPage[];
}

export interface FieldDefinition {
  type: FieldType;
  label: string;
  icon: string;
  description: string;
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    type: "text",
    label: "Text",
    icon: "Type",
    description: "Single line text input",
  },
  {
    type: "email",
    label: "Email",
    icon: "AtSign",
    description: "Email address input",
  },
  {
    type: "number",
    label: "Number",
    icon: "Hash",
    description: "Numeric input",
  },
  {
    type: "phone",
    label: "Phone",
    icon: "Phone",
    description: "Phone number input",
  },
  {
    type: "textarea",
    label: "Long Text",
    icon: "AlignLeft",
    description: "Multi-line text input",
  },
  {
    type: "select",
    label: "Dropdown",
    icon: "ChevronDown",
    description: "Single select dropdown",
  },
  {
    type: "radio",
    label: "Radio",
    icon: "Circle",
    description: "Radio button group",
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: "CheckSquare",
    description: "Checkbox options",
  },
  {
    type: "date",
    label: "Date",
    icon: "Calendar",
    description: "Date picker",
  },
  {
    type: "url",
    label: "URL",
    icon: "Link",
    description: "Website URL input",
  },
  {
    type: "hidden",
    label: "Hidden",
    icon: "EyeOff",
    description: "Hidden field",
  },
];
