import type { FormTemplate } from "./types";
import { DEFAULT_FIELD_APPEARANCE } from "@/lib/form-builder/schema";

export const webinarRegistrationTemplate: FormTemplate = {
  id: "webinar-registration",
  title: "Webinar Registration",
  description: "Register attendees for online webinars",
  image: "/images/templates/webinar-registration.png",
  category: "event",
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
    {
      id: "field_company",
      type: "text",
      name: "company",
      label: "Company",
      placeholder: "Acme Inc.",
      validation: {
        required: false,
      },
      appearance: DEFAULT_FIELD_APPEARANCE,
    },
    {
      id: "field_questions",
      type: "textarea",
      name: "questions",
      label: "Questions for the presenter",
      placeholder: "Any topics you'd like us to cover?",
      validation: {
        required: false,
      },
      appearance: DEFAULT_FIELD_APPEARANCE,
    },
  ],
};
