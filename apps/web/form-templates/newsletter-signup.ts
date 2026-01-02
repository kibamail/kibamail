import type { FormTemplate } from "./types";
import { DEFAULT_FIELD_APPEARANCE } from "@/lib/form-builder/schema";

export const newsletterSignupTemplate: FormTemplate = {
  id: "newsletter-signup",
  title: "Newsletter Signup",
  description: "Simple email capture form for newsletter subscriptions",
  image: "/images/templates/newsletter-signup.png",
  category: "signup",
  fields: [
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
    {
      id: "field_first_name",
      type: "text",
      name: "first_name",
      label: "First name",
      placeholder: "John",
      validation: {
        required: false,
      },
      appearance: DEFAULT_FIELD_APPEARANCE,
    },
  ],
};
