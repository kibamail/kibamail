import {
  DEFAULT_FORM_SETTINGS,
  DEFAULT_FORM_STYLING,
  DEFAULT_FIELD_APPEARANCE,
  type FormBuilderSchema,
  type FormTheme,
} from "@/lib/form-builder/schema";

export const defaultForm: FormBuilderSchema = {
  id: "default",
  version: 1,
  title: "Contact Form",
  description: "Get in touch with us. We'd love to hear from you.",
  pages: [
    {
      id: "page_1",
      sections: [
        {
          id: "section_1",
          fields: [
            {
              id: "field_name",
              type: "text",
              name: "name",
              label: "Full Name",
              placeholder: "Enter your name",
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
              label: "Email Address",
              placeholder: "Enter your email",
              validation: {
                required: true,
                requiredMessage: "Please enter your email address",
              },
              appearance: DEFAULT_FIELD_APPEARANCE,
            },
            {
              id: "field_message",
              type: "textarea",
              name: "message",
              label: "Message",
              placeholder: "How can we help you?",
              validation: {
                required: true,
                requiredMessage: "Please enter a message",
                text: {
                  maxLength: 1000,
                },
              },
              appearance: DEFAULT_FIELD_APPEARANCE,
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
  ],
  settings: DEFAULT_FORM_SETTINGS,
  styling: DEFAULT_FORM_STYLING,
};

export const defaultTheme: FormTheme = DEFAULT_FORM_SETTINGS.theme;
