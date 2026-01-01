"use client"

import { FormRenderer } from "@/lib/form-builder"
import type { FormBuilderSchema, FormSubmissionData } from "@/lib/form-builder"

interface FormPageClientProps {
  schema: FormBuilderSchema
}

export function FormPageClient({ schema }: FormPageClientProps) {
  const handleSubmit = (data: FormSubmissionData) => {
    console.log("Form submitted:", data)
  }

  return <FormRenderer schema={schema} onSubmit={handleSubmit} />
}
