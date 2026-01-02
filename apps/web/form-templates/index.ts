// Types
export type { FormTemplate, FormTemplateCategory } from "./types";

// Templates
export { newsletterSignupTemplate } from "./newsletter-signup";
export { fullSignupTemplate } from "./full-signup";
export { waitlistTemplate } from "./waitlist";
export { eventRegistrationTemplate } from "./event-registration";
export { webinarRegistrationTemplate } from "./webinar-registration";
export { contactFormTemplate } from "./contact-form";
export { feedbackFormTemplate } from "./feedback-form";

// All templates array for easy iteration
import { newsletterSignupTemplate } from "./newsletter-signup";
import { fullSignupTemplate } from "./full-signup";
import { waitlistTemplate } from "./waitlist";
import { eventRegistrationTemplate } from "./event-registration";
import { webinarRegistrationTemplate } from "./webinar-registration";
import { contactFormTemplate } from "./contact-form";
import { feedbackFormTemplate } from "./feedback-form";
import type { FormTemplate } from "./types";

export const FORM_TEMPLATES: FormTemplate[] = [
  newsletterSignupTemplate,
  fullSignupTemplate,
  waitlistTemplate,
  eventRegistrationTemplate,
  webinarRegistrationTemplate,
  contactFormTemplate,
  feedbackFormTemplate,
];

// Helper to get template by ID
export function getTemplateById(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((template) => template.id === id);
}

// Helper to get templates by category
export function getTemplatesByCategory(
  category: FormTemplate["category"]
): FormTemplate[] {
  return FORM_TEMPLATES.filter((template) => template.category === category);
}

// Template category metadata
export const TEMPLATE_CATEGORIES = {
  signup: {
    label: "Signup Forms",
    description: "Grow your email list",
  },
  event: {
    label: "Event Forms",
    description: "Manage registrations",
  },
  feedback: {
    label: "Feedback Forms",
    description: "Collect customer insights",
  },
  contact: {
    label: "Contact Forms",
    description: "Let visitors reach you",
  },
} as const;
