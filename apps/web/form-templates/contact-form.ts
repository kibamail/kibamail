import type { FormTemplate } from "./types";
import { DEFAULT_FIELD_APPEARANCE } from "@/lib/form-builder/schema";

export const contactFormTemplate: FormTemplate = {
  id: "contact-form",
  title: "Contact Form",
  description: "Let visitors get in touch with you",
  image: "/images/templates/contact-form.png",
  category: "contact",
  fields: [
    {
      id: "field_name",
      type: "text",
      name: "name",
      label: "Your name",
      placeholder: "John Doe",
      validation: {
        required: true,
        requiredMessage: "Please enter your name",
      },
      appearance: DEFAULT_FIELD_APPEARANCE,
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
      id: "field_subject",
      type: "text",
      name: "subject",
      label: "Subject",
      placeholder: "How can we help?",
      validation: {
        required: false,
      },
      appearance: DEFAULT_FIELD_APPEARANCE,
    },
    {
      id: "field_message",
      type: "textarea",
      name: "message",
      label: "Message",
      placeholder: "Tell us more about your inquiry...",
      validation: {
        required: true,
        requiredMessage: "Please enter your message",
      },
      appearance: DEFAULT_FIELD_APPEARANCE,
    },
  ],
};
