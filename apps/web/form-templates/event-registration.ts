import type { FormTemplate } from "./types";
import { DEFAULT_FIELD_APPEARANCE } from "@/lib/form-builder/schema";

export const eventRegistrationTemplate: FormTemplate = {
  id: "event-registration",
  title: "Event Registration",
  description: "Collect attendee information for events and webinars",
  image: "/images/templates/event-registration.png",
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
      id: "field_phone",
      type: "phone",
      name: "phone",
      label: "Phone number",
      placeholder: "+1 (555) 000-0000",
      validation: {
        required: false,
      },
      appearance: DEFAULT_FIELD_APPEARANCE,
    },
    {
      id: "field_attendance",
      type: "radio",
      name: "attendance_type",
      label: "How will you attend?",
      validation: {
        required: true,
        requiredMessage: "Please select how you will attend",
      },
      options: [
        { id: "opt_in_person", label: "In person", value: "in_person" },
        { id: "opt_virtual", label: "Virtual / Online", value: "virtual" },
      ],
      appearance: DEFAULT_FIELD_APPEARANCE,
    },
  ],
};
