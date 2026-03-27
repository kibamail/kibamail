import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { formCatalog } from "./catalog";
import { FormRoot } from "./components/form-root";
import { Rating } from "./components/rating";
import { FileUpload } from "./components/file-upload";
import { HiddenField } from "./components/hidden-field";

/**
 * Component registry mapping catalog definitions to React implementations.
 */
export const { registry: formRegistry } = defineRegistry(formCatalog, {
  components: {
    // All shadcn components
    ...shadcnComponents,

    // Custom form components
    FormRoot,
    Rating,
    FileUpload,
    HiddenField,
  },

  actions: {
    submitForm: async (_params, ctx) => {
      // The actual submission logic is handled by the ActionProvider
      // in the form-renderer.tsx wrapper. This is a no-op placeholder
      // that gets overridden at render time.
    },
  },
});
