"use client";

import { useEffect } from "react";
import type { FormBuilderSchema, FormSubmissionData } from "@/lib/form-builder";
import { FormRenderer } from "@/lib/form-builder";

const VIEW_COOKIE_PREFIX = "kiba_fv_";
const VIEW_COOKIE_MAX_AGE_DAYS = 30;

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  // biome-ignore lint/suspicious/noDocumentCookie: Legitimate cookie setting for form view tracking
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

interface FormPageClientProps {
  formId: string;
  schema: FormBuilderSchema;
  shouldSetViewCookie?: boolean;
}

export function FormPageClient({
  formId,
  schema,
  shouldSetViewCookie,
}: FormPageClientProps) {
  useEffect(() => {
    if (shouldSetViewCookie) {
      const cookieName = `${VIEW_COOKIE_PREFIX}${formId}`;
      const maxAge = VIEW_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
      setCookie(cookieName, "1", maxAge);
    }
  }, [formId, shouldSetViewCookie]);

  async function onSubmit(data: FormSubmissionData): Promise<boolean> {
    try {
      const response = await fetch(
        `/api/internal/v1/forms/${formId}/submissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Form submission failed:", errorData);
        return false;
      }

      const successAction = schema.settings.successAction;
      if (successAction.type === "redirect") {
        if (successAction.openInNewTab) {
          window.open(successAction.url, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = successAction.url;
        }
      }

      return true;
    } catch (error) {
      console.error("Form submission error:", error);
      return false;
    }
  }

  return <FormRenderer schema={schema} onSubmit={onSubmit} />;
}
