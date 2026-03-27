"use client";

import { useEffect } from "react";
import type { Spec, StateModel } from "@json-render/core";
import { FormRenderer } from "@/lib/json-render";
import type { FormSettings } from "@/lib/json-render/settings-schema";

const VIEW_COOKIE_PREFIX = "kiba_fv_";
const VIEW_COOKIE_MAX_AGE_DAYS = 30;

interface FormPageClientProps {
  formId: string;
  spec: Spec;
  settings: FormSettings | null;
  shouldSetViewCookie?: boolean;
}

export function FormPageClient({
  formId,
  spec,
  settings,
  shouldSetViewCookie,
}: FormPageClientProps) {
  useEffect(() => {
    if (shouldSetViewCookie) {
      const cookieName = `${VIEW_COOKIE_PREFIX}${formId}`;
      const maxAge = VIEW_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
      document.cookie = `${cookieName}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  }, [formId, shouldSetViewCookie]);

  async function onSubmit(data: StateModel): Promise<void> {
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
      return;
    }

    const successAction = settings?.successAction;
    if (successAction?.type === "redirect") {
      if (successAction.openInNewTab) {
        window.open(successAction.url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = successAction.url;
      }
    }
  }

  return <FormRenderer spec={spec} onSubmit={onSubmit} />;
}
