import type { ApiFieldMapping } from "@/lib/json-render/validation";

/**
 * Valid json-render spec with email field for testing.
 */
export const validFormSpec = {
  root: "form",
  elements: {
    form: {
      type: "FormRoot",
      props: { submitLabel: "Submit", loadingLabel: "Submitting..." },
      children: ["email-field"],
    },
    "email-field": {
      type: "Input",
      props: {
        name: "email",
        label: "Email",
        type: "email",
        checks: [
          { type: "required", message: "Email is required" },
          { type: "email", message: "Invalid email" },
        ],
      },
    },
  },
};

export const validFormFieldMapping: ApiFieldMapping = {
  email: {
    contactPropertyId: "email",
    contactPropertyType: "standard",
    fieldType: "string",
  },
};

/**
 * Multi-field form spec for comprehensive testing.
 */
export const multiFieldFormSpec = {
  root: "form",
  elements: {
    form: {
      type: "FormRoot",
      props: { submitLabel: "Submit" },
      children: ["email-field", "name-field", "phone-field", "rating-field"],
    },
    "email-field": {
      type: "Input",
      props: { name: "email", label: "Email", type: "email" },
    },
    "name-field": {
      type: "Input",
      props: { name: "name", label: "Full Name" },
    },
    "phone-field": {
      type: "Input",
      props: { name: "phone", label: "Phone" },
    },
    "rating-field": {
      type: "Rating",
      props: { name: "rating", label: "Rate us", maxRating: 5 },
    },
  },
};

export const multiFieldFormFieldMapping: ApiFieldMapping = {
  email: {
    contactPropertyId: "email",
    contactPropertyType: "standard",
    fieldType: "string",
  },
  name: {
    contactPropertyId: "firstName",
    contactPropertyType: "standard",
    fieldType: "string",
  },
  phone: {
    contactPropertyId: "phone",
    contactPropertyType: "standard",
    fieldType: "string",
  },
  rating: {
    contactPropertyId: "rating",
    contactPropertyType: "custom",
    fieldType: "number",
  },
};

/**
 * Sign-up form spec for submission testing.
 */
export const signUpFormSpec = {
  root: "form",
  elements: {
    form: {
      type: "FormRoot",
      props: { submitLabel: "Sign Up" },
      children: ["email-field", "first-name-field", "last-name-field"],
    },
    "email-field": {
      type: "Input",
      props: { name: "email", label: "Email", type: "email" },
    },
    "first-name-field": {
      type: "Input",
      props: { name: "firstName", label: "First Name" },
    },
    "last-name-field": {
      type: "Input",
      props: { name: "lastName", label: "Last Name" },
    },
  },
};

export const signUpFormFieldMapping: ApiFieldMapping = {
  email: {
    contactPropertyId: "email",
    contactPropertyType: "standard",
    fieldType: "string",
  },
  firstName: {
    contactPropertyId: "firstName",
    contactPropertyType: "standard",
    fieldType: "string",
  },
  lastName: {
    contactPropertyId: "lastName",
    contactPropertyType: "standard",
    fieldType: "string",
  },
};

/**
 * Survey form spec for submission testing.
 */
export const surveyFormSpec = {
  root: "form",
  elements: {
    form: {
      type: "FormRoot",
      props: { submitLabel: "Submit Feedback" },
      children: ["email-field", "feedback-field", "satisfaction-field"],
    },
    "email-field": {
      type: "Input",
      props: { name: "email", label: "Email", type: "email" },
    },
    "feedback-field": {
      type: "Textarea",
      props: { name: "feedback", label: "Your Feedback" },
    },
    "satisfaction-field": {
      type: "Rating",
      props: { name: "satisfaction", label: "How satisfied are you?", maxRating: 5 },
    },
  },
};

export const surveyFormFieldMapping: ApiFieldMapping = {
  email: {
    contactPropertyId: "email",
    contactPropertyType: "standard",
    fieldType: "string",
  },
  feedback: {
    contactPropertyId: "feedback",
    contactPropertyType: "custom",
    fieldType: "string",
  },
  satisfaction: {
    contactPropertyId: "satisfaction",
    contactPropertyType: "custom",
    fieldType: "number",
  },
};

/**
 * Default form settings for tests.
 */
export const DEFAULT_FORM_SETTINGS = {};

/**
 * Backward-compat aliases for tests that reference old fixture names.
 * These provide the spec in the `fields` column format (stored as JSON in DB).
 */
export const validFormFields = validFormSpec;
export const signUpFormFields = signUpFormSpec;
export const surveyFormFields = surveyFormSpec;
