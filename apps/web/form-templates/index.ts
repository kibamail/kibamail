// Types
export type { FormTemplate, FormTemplateCategory } from "./types";

import { contactFormTemplate } from "./contact-form";
import { eventRegistrationTemplate } from "./event-registration";
import { feedbackFormTemplate } from "./feedback-form";
import { fullSignupTemplate } from "./full-signup";
// All templates array for easy iteration
import { newsletterSignupTemplate } from "./newsletter-signup";
import type { FormTemplate } from "./types";
import { waitlistTemplate } from "./waitlist";
import { webinarRegistrationTemplate } from "./webinar-registration";

export const FORM_TEMPLATES: FormTemplate[] = [
  newsletterSignupTemplate,
  fullSignupTemplate,
  waitlistTemplate,
  eventRegistrationTemplate,
  webinarRegistrationTemplate,
  contactFormTemplate,
  feedbackFormTemplate,
];

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
