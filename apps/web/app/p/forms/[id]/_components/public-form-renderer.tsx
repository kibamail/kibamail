"use client";

import type { Form } from "@prisma/client";
import { Survey } from "survey-react-ui";
import { Model, type ITheme } from "survey-core";
import { useState, useEffect, useRef } from "react";
import { internalApi } from "@/lib/api/client";
import "survey-core/survey-core.css";
import { useMutation } from "@tanstack/react-query";

interface PublicFormRendererProps {
  form: Form;
  formId: string;
}

export function PublicFormRenderer({ form, formId }: PublicFormRendererProps) {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) {
      return;
    }

    mounted.current = true;
    internalApi.forms().trackView(formId);
  }, [formId]);

  const { mutate: submitForm } = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      internalApi.forms().submitPublic(formId, data),
    retry: 3,
    retryDelay: 500,
  });

  const [survey] = useState(() => {
    const model = new Model(form.fields as object);

    if (form.settings && Object.keys(form.settings).length > 0) {
      model.applyTheme(form.settings as ITheme);
    }

    model.onComplete.add((sender) => {
      submitForm(sender.data);
    });

    return model;
  });

  return <Survey model={survey} />;
}
