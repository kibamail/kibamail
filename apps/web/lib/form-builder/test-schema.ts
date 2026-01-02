import type { FormBuilderSchema } from "./schema"
import { DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME } from "./schema"

/**
 * Segmentation Survey - RightMessage style
 *
 * Key principles:
 * - One question per page (step) for conversational feel
 * - Primarily radio/card choices for easy selection
 * - Questions focused on understanding WHO the person is
 * - Progress bar always visible
 * - Simple, direct questions
 */
export const TEST_FORM_SCHEMA: FormBuilderSchema = {
  id: "segmentation-survey",
  version: 1,
  title: "Help us personalize your experience",
  description: "Answer a few quick questions so we can show you the most relevant content.",
  pages: [
    // Step 1: Identity/Role - using choice_card for rich options
    {
      id: "step_role",
      title: "What best describes you?",
      sections: [
        {
          id: "section_role",
          fields: [
            {
              id: "field_role",
              type: "choice_card",
              name: "role",
              label: "Select the option that fits you best",
              options: [
                {
                  id: "role_1",
                  label: "Founder / CEO",
                  value: "founder",
                  description: "I'm building or running my own company",
                },
                {
                  id: "role_2",
                  label: "Marketing Manager",
                  value: "marketing",
                  description: "I manage marketing for a team or company",
                },
                {
                  id: "role_3",
                  label: "Developer / Technical",
                  value: "developer",
                  description: "I build products or work on technical projects",
                },
                {
                  id: "role_4",
                  label: "Freelancer / Consultant",
                  value: "freelancer",
                  description: "I work independently with multiple clients",
                },
                {
                  id: "role_5",
                  label: "Just exploring",
                  value: "exploring",
                  description: "I'm curious and want to learn more",
                },
              ],
              validation: {
                required: true,
                requiredMessage: "Please select an option to continue",
              },
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
    // Step 2: Company Size
    {
      id: "step_company_size",
      title: "How big is your team?",
      sections: [
        {
          id: "section_company_size",
          fields: [
            {
              id: "field_company_size",
              type: "radio",
              name: "company_size",
              label: "Select your team size",
              options: [
                { id: "size_1", label: "Just me", value: "solo" },
                { id: "size_2", label: "2-10 people", value: "small" },
                { id: "size_3", label: "11-50 people", value: "medium" },
                { id: "size_4", label: "51-200 people", value: "large" },
                { id: "size_5", label: "200+ people", value: "enterprise" },
              ],
              validation: {
                required: true,
                requiredMessage: "Please select your team size",
              },
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
    // Step 3: Primary Challenge - using choice_card
    {
      id: "step_challenge",
      title: "What's your biggest challenge right now?",
      sections: [
        {
          id: "section_challenge",
          fields: [
            {
              id: "field_challenge",
              type: "choice_card",
              name: "primary_challenge",
              label: "Select your main challenge",
              options: [
                {
                  id: "challenge_1",
                  label: "Growing my email list",
                  value: "list_growth",
                  description: "I need more subscribers to grow my audience",
                },
                {
                  id: "challenge_2",
                  label: "Improving deliverability",
                  value: "deliverability",
                  description: "My emails aren't reaching the inbox",
                },
                {
                  id: "challenge_3",
                  label: "Writing better emails",
                  value: "copywriting",
                  description: "I struggle with what to write and how to engage",
                },
                {
                  id: "challenge_4",
                  label: "Automating workflows",
                  value: "automation",
                  description: "I want to save time with automated sequences",
                },
                {
                  id: "challenge_5",
                  label: "Understanding analytics",
                  value: "analytics",
                  description: "I don't know what's working and what isn't",
                },
              ],
              validation: {
                required: true,
                requiredMessage: "Please select your biggest challenge",
              },
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
    // Step 4: Current Stage
    {
      id: "step_stage",
      title: "Where are you in your email marketing journey?",
      sections: [
        {
          id: "section_stage",
          fields: [
            {
              id: "field_stage",
              type: "radio",
              name: "current_stage",
              label: "Select your current stage",
              options: [
                { id: "stage_1", label: "Just getting started (0-1,000 subscribers)", value: "beginner" },
                { id: "stage_2", label: "Building momentum (1,000-10,000 subscribers)", value: "growing" },
                { id: "stage_3", label: "Scaling up (10,000-50,000 subscribers)", value: "scaling" },
                { id: "stage_4", label: "Established (50,000+ subscribers)", value: "established" },
              ],
              validation: {
                required: true,
                requiredMessage: "Please select your current stage",
              },
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
    // Step 5: Goal
    {
      id: "step_goal",
      title: "What's your #1 goal for the next 90 days?",
      sections: [
        {
          id: "section_goal",
          fields: [
            {
              id: "field_goal",
              type: "radio",
              name: "primary_goal",
              label: "Select your primary goal",
              options: [
                { id: "goal_1", label: "Double my email list", value: "grow_list" },
                { id: "goal_2", label: "Increase open rates", value: "open_rates" },
                { id: "goal_3", label: "Generate more revenue from email", value: "revenue" },
                { id: "goal_4", label: "Save time with automation", value: "save_time" },
                { id: "goal_5", label: "Launch my first email product", value: "launch" },
              ],
              validation: {
                required: true,
                requiredMessage: "Please select your primary goal",
              },
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
    // Step 6: Contact Info (final step)
    {
      id: "step_contact",
      title: "Almost done! Where should we send your personalized recommendations?",
      sections: [
        {
          id: "section_contact",
          fields: [
            {
              id: "field_name",
              type: "text",
              name: "first_name",
              label: "First name",
              placeholder: "Your first name",
              validation: {
                required: true,
                requiredMessage: "Please enter your first name",
              },
              appearance: {
                width: "full",
                labelPosition: "top",
                size: "default",
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
              appearance: {
                width: "full",
                labelPosition: "top",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
  ],
  settings: {
    submitButton: {
      text: "Get my recommendations",
      loadingText: "Processing...",
      variant: "default",
      size: "lg",
      fullWidth: true,
      position: "center",
    },
    successAction: {
      type: "message",
      message: "Thanks! Check your inbox for your personalized recommendations.",
    },
    doubleOptIn: { enabled: true },
    showProgressBar: true,
    allowSaveAndContinue: false,
    preventDuplicateSubmissions: true,
    theme: DEFAULT_LIGHT_THEME,
  },
  styling: {
    layout: "stacked",
    labelStyle: "default",
    borderRadius: "md",
    spacing: "default",
  },
}

/**
 * NPS / Feedback Survey
 *
 * Simple feedback collection with rating + open text
 */
export const FEEDBACK_SURVEY_SCHEMA: FormBuilderSchema = {
  id: "feedback-survey",
  version: 1,
  title: "Quick feedback",
  description: "Help us improve by sharing your thoughts.",
  pages: [
    {
      id: "step_rating",
      title: "How likely are you to recommend us to a friend?",
      sections: [
        {
          id: "section_rating",
          fields: [
            {
              id: "field_nps",
              type: "rating",
              name: "nps_score",
              label: "Rate from 1-10",
              validation: {
                required: true,
                requiredMessage: "Please select a rating",
                rating: {
                  maxRating: 10,
                },
              },
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
    {
      id: "step_reason",
      title: "What's the main reason for your score?",
      sections: [
        {
          id: "section_reason",
          fields: [
            {
              id: "field_reason",
              type: "textarea",
              name: "feedback_reason",
              label: "Your feedback",
              placeholder: "Tell us what's working well or what we could improve...",
              validation: {
                text: {
                  maxLength: 1000,
                },
              },
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
    {
      id: "step_followup",
      title: "Can we follow up with you?",
      sections: [
        {
          id: "section_followup",
          fields: [
            {
              id: "field_followup",
              type: "radio",
              name: "can_followup",
              label: "Follow up preference",
              options: [
                { id: "yes", label: "Yes, I'd be happy to chat more", value: "yes" },
                { id: "no", label: "No thanks, just wanted to share feedback", value: "no" },
              ],
              validation: {
                required: true,
              },
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
  ],
  settings: {
    submitButton: {
      text: "Submit feedback",
      loadingText: "Submitting...",
      variant: "default",
      size: "default",
      fullWidth: true,
      position: "center",
    },
    successAction: {
      type: "message",
      message: "Thank you for your feedback! It means a lot to us.",
    },
    doubleOptIn: { enabled: false },
    showProgressBar: true,
    allowSaveAndContinue: false,
    preventDuplicateSubmissions: true,
    theme: DEFAULT_DARK_THEME,
  },
  styling: {
    layout: "stacked",
    labelStyle: "default",
    borderRadius: "md",
    spacing: "default",
  },
}

/**
 * Product Quiz - Outcome based
 *
 * Questions that lead to a personalized product recommendation
 */
export const PRODUCT_QUIZ_SCHEMA: FormBuilderSchema = {
  id: "product-quiz",
  version: 1,
  title: "Find your perfect plan",
  description: "Answer 3 quick questions to get a personalized recommendation.",
  pages: [
    {
      id: "step_usage",
      title: "What will you primarily use this for?",
      sections: [
        {
          id: "section_usage",
          fields: [
            {
              id: "field_usage",
              type: "radio",
              name: "primary_usage",
              label: "Primary use case",
              options: [
                { id: "usage_1", label: "Newsletter for my blog or content", value: "newsletter" },
                { id: "usage_2", label: "Marketing emails for my business", value: "marketing" },
                { id: "usage_3", label: "Transactional emails (receipts, notifications)", value: "transactional" },
                { id: "usage_4", label: "All of the above", value: "all" },
              ],
              validation: {
                required: true,
              },
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
    {
      id: "step_volume",
      title: "How many emails do you send per month?",
      sections: [
        {
          id: "section_volume",
          fields: [
            {
              id: "field_volume",
              type: "radio",
              name: "email_volume",
              label: "Monthly email volume",
              options: [
                { id: "vol_1", label: "Less than 10,000", value: "starter" },
                { id: "vol_2", label: "10,000 - 100,000", value: "growth" },
                { id: "vol_3", label: "100,000 - 1,000,000", value: "scale" },
                { id: "vol_4", label: "More than 1,000,000", value: "enterprise" },
              ],
              validation: {
                required: true,
              },
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
    {
      id: "step_features",
      title: "Which features matter most to you?",
      description: "Select all that apply",
      sections: [
        {
          id: "section_features",
          fields: [
            {
              id: "field_features",
              type: "checkbox_group",
              name: "important_features",
              label: "Important features",
              options: [
                { id: "feat_1", label: "Advanced automation workflows", value: "automation" },
                { id: "feat_2", label: "Detailed analytics & reporting", value: "analytics" },
                { id: "feat_3", label: "A/B testing", value: "ab_testing" },
                { id: "feat_4", label: "Dedicated IP address", value: "dedicated_ip" },
                { id: "feat_5", label: "Priority support", value: "priority_support" },
              ],
              appearance: {
                width: "full",
                labelPosition: "hidden",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
  ],
  settings: {
    submitButton: {
      text: "See my recommendation",
      loadingText: "Finding your perfect plan...",
      variant: "default",
      size: "lg",
      fullWidth: true,
      position: "center",
    },
    successAction: {
      type: "message",
      message: "Based on your answers, we recommend the Growth plan!",
    },
    doubleOptIn: { enabled: false },
    showProgressBar: true,
    allowSaveAndContinue: false,
    preventDuplicateSubmissions: false,
    theme: DEFAULT_LIGHT_THEME,
  },
  styling: {
    layout: "stacked",
    labelStyle: "default",
    borderRadius: "md",
    spacing: "default",
  },
}

/**
 * Simple single-page form for basic testing
 */
export const SIMPLE_TEST_FORM_SCHEMA: FormBuilderSchema = {
  id: "simple-contact",
  version: 1,
  title: "Get in touch",
  pages: [
    {
      id: "page_1",
      sections: [
        {
          id: "section_1",
          fields: [
            {
              id: "field_1",
              type: "text",
              name: "name",
              label: "Your name",
              placeholder: "Enter your name",
              validation: {
                required: true,
              },
              appearance: {
                width: "full",
                labelPosition: "top",
                size: "default",
              },
            },
            {
              id: "field_2",
              type: "email",
              name: "email",
              label: "Email",
              placeholder: "you@example.com",
              validation: {
                required: true,
              },
              appearance: {
                width: "full",
                labelPosition: "top",
                size: "default",
              },
            },
            {
              id: "field_3",
              type: "textarea",
              name: "message",
              label: "Message",
              placeholder: "What would you like to tell us?",
              validation: {
                required: true,
              },
              appearance: {
                width: "full",
                labelPosition: "top",
                size: "default",
              },
            },
          ],
          collapsible: false,
          defaultCollapsed: false,
        },
      ],
    },
  ],
  settings: {
    submitButton: {
      text: "Send message",
      loadingText: "Sending...",
      variant: "default",
      size: "default",
      fullWidth: true,
      position: "center",
    },
    successAction: {
      type: "message",
      message: "Thanks! We'll get back to you soon.",
    },
    doubleOptIn: { enabled: false },
    showProgressBar: false,
    allowSaveAndContinue: false,
    preventDuplicateSubmissions: false,
    theme: DEFAULT_LIGHT_THEME,
  },
  styling: {
    layout: "stacked",
    labelStyle: "default",
    borderRadius: "md",
    spacing: "default",
  },
}
