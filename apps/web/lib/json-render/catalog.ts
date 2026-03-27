import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod/v4";

/**
 * Form component catalog for json-render.
 *
 * Extends the shadcn component library with custom form-specific components:
 * FormRoot, Rating, FileUpload, HiddenField, and RichContent.
 */
export const formCatalog = defineCatalog(schema, {
  components: {
    // Include all shadcn components
    ...shadcnComponentDefinitions,

    // Custom form components
    FormRoot: {
      props: z.object({
        submitLabel: z.string().nullable(),
        loadingLabel: z.string().nullable(),
      }),
      slots: ["default"],
      description:
        "Form wrapper that handles submission. All form input components should be nested inside this.",
      example: {
        submitLabel: "Submit",
        loadingLabel: "Submitting...",
      },
    },

    Rating: {
      props: z.object({
        name: z.string(),
        label: z.string().nullable(),
        maxRating: z.number().nullable(),
        description: z.string().nullable(),
      }),
      slots: [],
      description:
        "Star rating input. Renders clickable stars for the user to select a rating.",
      example: {
        name: "satisfaction",
        label: "How satisfied are you?",
        maxRating: 5,
      },
    },

    FileUpload: {
      props: z.object({
        name: z.string(),
        label: z.string().nullable(),
        description: z.string().nullable(),
        accept: z.string().nullable(),
        maxSize: z.number().nullable(),
        maxFiles: z.number().nullable(),
      }),
      slots: [],
      description: "File upload input that supports drag-and-drop.",
      example: {
        name: "resume",
        label: "Upload your resume",
        accept: ".pdf,.doc,.docx",
        maxSize: 5242880,
        maxFiles: 1,
      },
    },

    HiddenField: {
      props: z.object({
        name: z.string(),
        value: z.string(),
      }),
      slots: [],
      description: "Hidden input field for passing data without user interaction.",
      example: {
        name: "source",
        value: "landing_page",
      },
    },

  },

  actions: {
    submitForm: {
      params: z.object({}),
      description:
        "Submit the form. Collects all form state and posts it to the submission endpoint.",
    },
  },
});
