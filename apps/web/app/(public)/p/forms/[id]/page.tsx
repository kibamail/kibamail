import "@/app/forms.css";

import { TEST_FORM_SCHEMA } from "@/lib/form-builder";
import { FormPageClient } from "./_components/form-page-client";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // For now, we're using the static test schema
  // Later, this will fetch the form schema from the database based on the id
  const schema = TEST_FORM_SCHEMA;

  return <FormPageClient schema={schema} />;
}
