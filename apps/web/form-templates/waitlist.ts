import type { FormTemplate } from "./types";
import { DEFAULT_FIELD_APPEARANCE } from "@/lib/form-builder/schema";

export const waitlistTemplate: FormTemplate = {
  id: "waitlist",
  title: "Waitlist",
  description: "Build anticipation with a simple waitlist signup",
  image: "/images/templates/waitlist.png",
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
  ],
};
