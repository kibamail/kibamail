import { DEFAULT_FIELD_APPEARANCE } from "@/lib/form-builder/schema";
import type { FormTemplate } from "./types";

export const feedbackFormTemplate: FormTemplate = {
  id: "feedback-form",
  title: "Feedback Form",
  description: "Collect customer feedback and ratings",
  image: "/images/templates/feedback-form.png",
  category: "feedback",
  fields: [
    {
      id: "field_name",
      type: "text",
      name: "name",
      label: "Your name",
      placeholder: "John Doe",
      validation: {
        required: false,
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
      id: "field_rating",
      type: "rating",
      name: "rating",
      label: "How would you rate your experience?",
      validation: {
        required: true,
        requiredMessage: "Please provide a rating",
        rating: {
          maxRating: 5,
        },
      },
      appearance: DEFAULT_FIELD_APPEARANCE,
    },
    {
      id: "field_feedback",
      type: "textarea",
      name: "feedback",
      label: "Your feedback",
      placeholder: "Tell us what you think...",
      validation: {
        required: false,
      },
      appearance: DEFAULT_FIELD_APPEARANCE,
    },
  ],
};
