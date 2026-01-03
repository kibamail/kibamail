import {
  DEFAULT_FIELD_APPEARANCE,
  DEFAULT_FORM_SETTINGS,
  DEFAULT_FORM_STYLING,
  type FormBuilderSchema,
} from "@/lib/form-builder/schema";

// Re-export defaults for test convenience
export { DEFAULT_FORM_SETTINGS, DEFAULT_FIELD_APPEARANCE };

/**
 * Valid form builder schema configuration for testing.
 * Includes an email field which is required for sign-up forms to be published.
 * All fields have contactProperty mappings for publish validation.
 */
export const validFormFields: FormBuilderSchema = {
  id: "test_form",
  version: 1,
  title: "Test Form",
  pages: [
    {
      id: "page_1",
      sections: [
        {
          id: "section_1",
          fields: [
            {
              id: "field_email",
              type: "email",
              name: "email",
              label: "Email",
              placeholder: "Enter your email",
              validation: {
                required: true,
                requiredMessage: "Email is required",
              },
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "standard",
                id: "email",
                name: "Email address",
              },
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

/**
 * Form schema with multiple fields for comprehensive testing.
 * All fields have contactProperty mappings for publish validation.
 */
export const multiFieldFormSchema: FormBuilderSchema = {
  id: "multi_field_form",
  version: 1,
  title: "Multi-Field Form",
  pages: [
    {
      id: "page_1",
      sections: [
        {
          id: "section_1",
          fields: [
            {
              id: "field_email",
              type: "email",
              name: "email",
              label: "Email Address",
              placeholder: "you@example.com",
              validation: {
                required: true,
                requiredMessage: "Email is required",
              },
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "standard",
                id: "email",
                name: "Email address",
              },
            },
            {
              id: "field_name",
              type: "text",
              name: "name",
              label: "Full Name",
              placeholder: "John Doe",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "standard",
                id: "firstName",
                name: "First name",
              },
            },
            {
              id: "field_phone",
              type: "phone",
              name: "phone",
              label: "Phone Number",
              placeholder: "+1 (555) 000-0000",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "standard",
                id: "phone",
                name: "Phone",
              },
            },
            {
              id: "field_rating",
              type: "rating",
              name: "rating",
              label: "How would you rate us?",
              validation: {
                rating: {
                  maxRating: 5,
                },
              },
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "rating",
                name: "Rating",
              },
            },
            {
              id: "field_message",
              type: "textarea",
              name: "message",
              label: "Message",
              placeholder: "Tell us more...",
              validation: {
                text: {
                  maxLength: 1000,
                },
              },
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "message",
                name: "Message",
              },
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

/**
 * Form schema with all supported field types for comprehensive testing.
 * All fields have contactProperty mappings for publish validation.
 */
export const allFieldTypesFormSchema: FormBuilderSchema = {
  id: "all_types_form",
  version: 1,
  title: "All Field Types Form",
  pages: [
    {
      id: "page_1",
      sections: [
        {
          id: "section_1",
          fields: [
            {
              id: "field_email",
              type: "email",
              name: "email",
              label: "Email",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "standard",
                id: "email",
                name: "Email address",
              },
            },
            {
              id: "field_text",
              type: "text",
              name: "text_field",
              label: "Text Field",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "text_field",
                name: "Text Field",
              },
            },
            {
              id: "field_number",
              type: "number",
              name: "number_field",
              label: "Number Field",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "number_field",
                name: "Number Field",
              },
            },
            {
              id: "field_phone",
              type: "phone",
              name: "phone_field",
              label: "Phone Field",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "standard",
                id: "phone",
                name: "Phone",
              },
            },
            {
              id: "field_url",
              type: "url",
              name: "url_field",
              label: "URL Field",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "url_field",
                name: "URL Field",
              },
            },
            {
              id: "field_textarea",
              type: "textarea",
              name: "textarea_field",
              label: "Textarea Field",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "textarea_field",
                name: "Textarea Field",
              },
            },
            {
              id: "field_select",
              type: "select",
              name: "select_field",
              label: "Select Field",
              options: [
                { id: "opt1", label: "Option 1", value: "option1" },
                { id: "opt2", label: "Option 2", value: "option2" },
              ],
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "select_field",
                name: "Select Field",
              },
            },
            {
              id: "field_rating",
              type: "rating",
              name: "rating_field",
              label: "Rating Field",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "rating_field",
                name: "Rating Field",
              },
            },
            {
              id: "field_slider",
              type: "slider",
              name: "slider_field",
              label: "Slider Field",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "slider_field",
                name: "Slider Field",
              },
            },
            {
              id: "field_date",
              type: "date",
              name: "date_field",
              label: "Date Field",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "date_field",
                name: "Date Field",
              },
            },
            {
              id: "field_checkbox",
              type: "checkbox",
              name: "checkbox_field",
              label: "Checkbox Field",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "custom",
                id: "checkbox_field",
                name: "Checkbox Field",
              },
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

/**
 * Form schema without an email field - used to test publish validation.
 * Has contactProperty mapping but none mapped to email.
 */
export const formWithoutEmailField: FormBuilderSchema = {
  id: "no_email_form",
  version: 1,
  title: "Form Without Email",
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
              label: "Name",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "standard",
                id: "firstName",
                name: "First name",
              },
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

/**
 * Form schema with unmapped fields - used to test publish validation.
 * Has fields without contactProperty mapping.
 */
export const formWithUnmappedFields: FormBuilderSchema = {
  id: "unmapped_form",
  version: 1,
  title: "Form With Unmapped Fields",
  pages: [
    {
      id: "page_1",
      sections: [
        {
          id: "section_1",
          fields: [
            {
              id: "field_email",
              type: "email",
              name: "email",
              label: "Email",
              appearance: DEFAULT_FIELD_APPEARANCE,
              contactProperty: {
                type: "standard",
                id: "email",
                name: "Email address",
              },
            },
            {
              id: "field_name",
              type: "text",
              name: "name",
              label: "Name",
              appearance: DEFAULT_FIELD_APPEARANCE,
              // No contactProperty - this field is unmapped
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

/**
 * Empty form schema with no fields - used to test publish validation.
 */
export const emptyFormSchema: FormBuilderSchema = {
  id: "empty_form",
  version: 1,
  title: "Empty Form",
  pages: [
    {
      id: "page_1",
      sections: [
        {
          id: "section_1",
          fields: [],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
  ],
  settings: DEFAULT_FORM_SETTINGS,
  styling: DEFAULT_FORM_STYLING,
} as unknown as FormBuilderSchema; // Cast to bypass min(1) validation

/**
 * Sign-up form schema with email, firstName, lastName fields.
 * Used for testing sign-up form submissions.
 */
export const signUpFormFields: FormBuilderSchema = {
  id: "signup_form",
  version: 1,
  title: "Newsletter Sign Up",
  pages: [
    {
      id: "page_1",
      sections: [
        {
          id: "section_1",
          fields: [
            {
              id: "field_email",
              type: "email",
              name: "email",
              label: "Email Address",
              validation: {
                required: true,
                requiredMessage: "Email is required",
              },
              appearance: DEFAULT_FIELD_APPEARANCE,
            },
            {
              id: "field_firstName",
              type: "text",
              name: "firstName",
              label: "First Name",
              appearance: DEFAULT_FIELD_APPEARANCE,
            },
            {
              id: "field_lastName",
              type: "text",
              name: "lastName",
              label: "Last Name",
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

/**
 * Survey form schema with email, feedback, and satisfaction fields.
 * Used for testing survey form submissions.
 */
export const surveyFormFields: FormBuilderSchema = {
  id: "survey_form",
  version: 1,
  title: "Customer Feedback",
  pages: [
    {
      id: "page_1",
      sections: [
        {
          id: "section_1",
          fields: [
            {
              id: "field_email",
              type: "email",
              name: "email",
              label: "Email",
              appearance: DEFAULT_FIELD_APPEARANCE,
            },
            {
              id: "field_feedback",
              type: "textarea",
              name: "feedback",
              label: "Your Feedback",
              appearance: DEFAULT_FIELD_APPEARANCE,
            },
            {
              id: "field_satisfaction",
              type: "rating",
              name: "satisfaction",
              label: "How satisfied are you?",
              validation: {
                rating: {
                  maxRating: 5,
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

/**
 * Form schema with content block (presentation field).
 */
const formWithContentBlock: FormBuilderSchema = {
  id: "content_form",
  version: 1,
  title: "Form With Content",
  pages: [
    {
      id: "page_1",
      sections: [
        {
          id: "section_1",
          fields: [
            {
              id: "field_content",
              type: "content",
              name: "content_block",
              label: "Content Block",
              richContent: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Welcome to our form!" }],
                  },
                ],
              },
              appearance: DEFAULT_FIELD_APPEARANCE,
            },
            {
              id: "field_email",
              type: "email",
              name: "email",
              label: "Email",
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
