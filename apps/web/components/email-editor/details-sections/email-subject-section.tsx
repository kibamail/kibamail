"use client";

import { useId } from "react";
import * as TextField from "@kibamail/owly/text-field";
import { SectionHeader } from "@/components/email-editor/details-sections/shared";
import type { EmailDetails } from "@/components/email-editor/types";

interface EmailSubjectSectionProps {
  subject: string;
  previewText: string;
  onChange: (updates: Partial<EmailDetails>) => void;
  readonly?: boolean;
}

export function EmailSubjectSection({
  subject,
  previewText,
  onChange,
  readonly = false,
}: EmailSubjectSectionProps) {
  const subjectFieldId = useId();
  const previewTextFieldId = useId();

  return (
    <section>
      <SectionHeader
        title="Email subject"
        description="Read our article on best practices for picking an email subject and preview text."
      />

      <div className="space-y-4">
        <div>
          <TextField.Root
            id={subjectFieldId}
            value={subject}
            onChange={(event) => onChange({ subject: event.target.value })}
            placeholder="Your weekly newsletter is here!"
            disabled={readonly}
          >
            <TextField.Label>Subject line</TextField.Label>
            <TextField.Hint>{subject.length}/50 characters</TextField.Hint>
          </TextField.Root>
        </div>

        <div>
          <TextField.Root
            id={previewTextFieldId}
            value={previewText}
            onChange={(event) => onChange({ previewText: event.target.value })}
            placeholder="A quick summary of what's inside..."
            disabled={readonly}
          >
            <TextField.Label>Preview text</TextField.Label>
            <TextField.Hint>
              This text appears after the subject line in most email clients.
            </TextField.Hint>
          </TextField.Root>
        </div>
      </div>
    </section>
  );
}
