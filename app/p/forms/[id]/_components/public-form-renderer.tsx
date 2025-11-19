"use client";

import type { Form } from "@prisma/client";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import { useCallback } from "react";
import "survey-core/survey-core.css";

export function PublicFormRenderer({ form }: { form: Form }) {
  const survey = new Model(form.fields as object);

  const handleComplete = useCallback((sender: Model) => {
    const submissionData = sender.data;

    // TODO: Submit to the API endpoint
    // POST /api/v1/forms/{form.id}/submissions
    console.log("Form submitted:", submissionData);
  }, []);

  survey.onComplete.add(handleComplete);

  if (form.name) {
    survey.title = form.name;
  }

  if (form.description) {
    survey.description = form.description;
  }

  return <Survey model={survey} />;
}
