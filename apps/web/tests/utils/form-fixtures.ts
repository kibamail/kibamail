import type { ApiFieldMapping } from "@/lib/forms/html-validation";

/**
 * Valid form HTML with email field for testing.
 */
export const validFormHtml = `<form>
  <input type="email" name="email" required />
  <button type="submit">Submit</button>
</form>`;

export const validFormFieldMapping: ApiFieldMapping = {
  email: {
    contactPropertyId: "email",
    contactPropertyType: "standard",
    fieldType: "string",
  },
};

/**
 * Form content object as stored in the `fields` column.
 */
export const validFormContent = {
  html: validFormHtml,
  deployId: "test-deploy",
  files: [],
};

/**
 * Multi-field form for comprehensive testing.
 */
export const multiFieldFormHtml = `<form>
  <input type="email" name="email" />
  <input type="text" name="name" />
  <input type="tel" name="phone" />
  <input type="number" name="rating" />
  <button type="submit">Submit</button>
</form>`;

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

export const multiFieldFormContent = {
  html: multiFieldFormHtml,
  deployId: "test-deploy",
  files: [],
};

/**
 * Sign-up form for submission testing.
 */
export const signUpFormHtml = `<form>
  <input type="email" name="email" required />
  <input type="text" name="firstName" />
  <input type="text" name="lastName" />
  <button type="submit">Sign Up</button>
</form>`;

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

export const signUpFormContent = {
  html: signUpFormHtml,
  deployId: "test-deploy",
  files: [],
};

/**
 * Survey form for submission testing.
 */
export const surveyFormHtml = `<form>
  <input type="email" name="email" />
  <textarea name="feedback"></textarea>
  <input type="number" name="satisfaction" min="1" max="5" />
  <button type="submit">Submit Feedback</button>
</form>`;

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

export const surveyFormContent = {
  html: surveyFormHtml,
  deployId: "test-deploy",
  files: [],
};

/**
 * Default form settings for tests.
 */
export const DEFAULT_FORM_SETTINGS = {};

/**
 * Backward-compat aliases.
 */
export const validFormFields = validFormContent;
export const validFormSpec = validFormContent;
export const signUpFormFields = signUpFormContent;
export const signUpFormSpec = signUpFormContent;
export const surveyFormFields = surveyFormContent;
export const surveyFormSpec = surveyFormContent;
export const multiFieldFormSpec = multiFieldFormContent;
