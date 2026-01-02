import type { FormField } from "@/lib/form-builder/schema";

export type FormTemplateCategory = "signup" | "event" | "feedback" | "contact";

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  image: string;
  category: FormTemplateCategory;
  fields: FormField[];
}
