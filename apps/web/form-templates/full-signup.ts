import type { FormTemplate } from "./types";
import { DEFAULT_FIELD_APPEARANCE } from "@/lib/form-builder/schema";

export const fullSignupTemplate: FormTemplate = {
  id: "full-signup",
  title: "Full Signup",
  description: "Complete signup form with name and email fields",
  image: "/images/templates/full-signup.png",
  category: "signup",
  fields: [
    {
      id: "field_first_name",
      type: "text",
      name: "first_name",
      label: "First name",
      placeholder: "John",
      validation: {
        required: true,
        requiredMessage: "Please enter your first name",
      },
      appearance: {
        ...DEFAULT_FIELD_APPEARANCE,
        width: "half",
      },
    },
    {
      id: "field_last_name",
      type: "text",
      name: "last_name",
      label: "Last name",
      placeholder: "Doe",
      validation: {
        required: true,
        requiredMessage: "Please enter your last name",
      },
      appearance: {
        ...DEFAULT_FIELD_APPEARANCE,
        width: "half",
      },
    },
    {
      id: "field_email",
      type: "email",
      name: "email",
      label: "Email address",
      placeholder: "you@example.com",
      validation: {
        required: true,
        requiredMessage: "Please enter your email address",
      },
      appearance: DEFAULT_FIELD_APPEARANCE,
    },
  ],
};
