"use client";

import { Button } from "@kibamail/owly/button";
import { Checkbox } from "@kibamail/owly/checkbox";
import { Text } from "@kibamail/owly/text";
import * as TextField from "@kibamail/owly/text-field";
import { useId } from "react";

interface TemplateDetailsTabProps {
  subject: string;
  previewText?: string;
  senderEmail?: string;
  replyToEmail?: string;
  trackClicks: boolean;
  trackOpens: boolean;
  onSave: () => void;
  isSaving: boolean;
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-kb-content-primary">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-kb-content-secondary mt-1">{description}</p>
      )}
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-kb-border-secondary my-8" />;
}

function EmailSubjectSection({
  subject,
  previewText,
}: {
  subject: string;
  previewText?: string;
}) {
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
          <TextField.Root id={subjectFieldId} value={subject} readOnly>
            <TextField.Label>Subject line</TextField.Label>
            <TextField.Hint>{subject.length}/50 characters</TextField.Hint>
          </TextField.Root>
        </div>

        <div>
          <TextField.Root
            id={previewTextFieldId}
            value={previewText || ""}
            readOnly
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

function SenderDetailsSection({
  senderEmail,
  replyToEmail,
}: {
  senderEmail?: string;
  replyToEmail?: string;
}) {
  return (
    <section>
      <SectionHeader
        title="Sender details"
        description="Choose who this email will be sent from. Recipients will see this in their inbox."
      />

      <div className="flex flex-col gap-4">
        <TextField.Root value={senderEmail || "Not set"} readOnly>
          <TextField.Label>From</TextField.Label>
        </TextField.Root>

        <TextField.Root value={replyToEmail || "Not set"} readOnly>
          <TextField.Label>Reply-To</TextField.Label>
        </TextField.Root>
      </div>
    </section>
  );
}

function TrackingSection({
  trackClicks,
  trackOpens,
}: {
  trackClicks: boolean;
  trackOpens: boolean;
}) {
  const clickTrackingId = useId();
  const openTrackingId = useId();

  return (
    <section>
      <SectionHeader
        title="Tracking"
        description="Choose what engagement metrics to track for this email."
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 border border-kb-border-tertiary p-3 rounded-lg">
          <div className="flex flex-col gap-1">
            <Text className="text-kb-content-primary font-medium">
              Click tracking
            </Text>
            <Text size="sm" className="text-kb-content-tertiary">
              Track when recipients click links in your email
            </Text>
          </div>
          <Checkbox
            id={clickTrackingId}
            checked={trackClicks}
            disabled
            variant="circle"
          />
        </div>

        <div className="flex items-start justify-between gap-3 border border-kb-border-tertiary p-3 rounded-lg">
          <div className="flex flex-col gap-1">
            <Text className="text-kb-content-primary font-medium">
              Open tracking
            </Text>
            <Text size="sm" className="text-kb-content-tertiary">
              Track when recipients open your email
            </Text>
          </div>
          <Checkbox
            id={openTrackingId}
            checked={trackOpens}
            disabled
            variant="circle"
          />
        </div>
      </div>
    </section>
  );
}

export function TemplateDetailsTab({
  subject,
  previewText,
  senderEmail,
  replyToEmail,
  trackClicks,
  trackOpens,
  onSave,
  isSaving,
}: TemplateDetailsTabProps) {
  return (
    <div className="h-full overflow-auto bg-kb-surface-primary">
      <div className="max-w-xl mx-auto py-8 px-6">
        <EmailSubjectSection subject={subject} previewText={previewText} />

        <SectionDivider />

        <SenderDetailsSection
          senderEmail={senderEmail}
          replyToEmail={replyToEmail}
        />

        <SectionDivider />

        <TrackingSection trackClicks={trackClicks} trackOpens={trackOpens} />

        <SectionDivider />

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
