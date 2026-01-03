"use client";

import { useId, useCallback, useMemo } from "react";
import * as TextField from "@kibamail/owly/text-field";
import * as Alert from "@kibamail/owly/alert";
import { Checkbox } from "@kibamail/owly/checkbox";
import { Text } from "@kibamail/owly/text";
import { Button } from "@kibamail/owly/button";
import { WarningTriangle } from "iconoir-react";
import { SenderSelect } from "@/components/sender-select";
import { ReplyToSelect } from "@/components/reply-to-select";
import type {
  TransformedSenderIdentity,
  CreatedDomain,
} from "@/components/sender-select";

export interface EmailDetails {
  subject: string;
  previewText: string;
  senderIdentityId?: string;
  replyToIdentityId?: string;
  trackClicks?: boolean;
  trackOpens?: boolean;
}

interface Domain {
  id: string;
  name: string;
}

interface SenderSelectState {
  localPart: string;
  domainId: string;
  isAddingNew: boolean;
}

interface SenderSelectActions {
  onLocalPartChange: (value: string) => void;
  onDomainIdChange: (value: string) => void;
  onIsAddingNewChange: (value: boolean) => void;
  onDomainCreated: (domain: CreatedDomain) => void;
}

interface DoubleOptInDetailsTabProps {
  emailDetails: EmailDetails;
  senderIdentities: TransformedSenderIdentity[];
  domains: Domain[];
  onChange: (updates: Partial<EmailDetails>) => void;
  onSave: () => void;
  isSaving: boolean;
  senderState: SenderSelectState;
  senderActions: SenderSelectActions;
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
  onChange,
}: {
  subject: string;
  previewText: string;
  onChange: (updates: Partial<EmailDetails>) => void;
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
          <TextField.Root
            id={subjectFieldId}
            value={subject}
            onChange={(event) => onChange({ subject: event.target.value })}
            placeholder="Please confirm your subscription"
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
            placeholder="Click to confirm your email address..."
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
  senderIdentityId,
  replyToIdentityId,
  senderIdentities,
  domains,
  onChange,
  senderState,
  senderActions,
}: {
  senderIdentityId?: string;
  replyToIdentityId?: string;
  senderIdentities: TransformedSenderIdentity[];
  domains: Domain[];
  onChange: (updates: Partial<EmailDetails>) => void;
  senderState: SenderSelectState;
  senderActions: SenderSelectActions;
}) {
  const onSenderChange = useCallback(
    (id: string | undefined) => {
      onChange({ senderIdentityId: id });
    },
    [onChange]
  );

  const onReplyToChange = useCallback(
    (id: string | undefined) => {
      onChange({ replyToIdentityId: id });
    },
    [onChange]
  );

  const selectedSender = useMemo(() => {
    return senderIdentities.find((s) => s.id === senderIdentityId);
  }, [senderIdentities, senderIdentityId]);

  const replyToIdentities = useMemo(() => {
    if (!selectedSender) return [];
    return senderIdentities.filter(
      (s) => s.domainId === selectedSender.domainId
    );
  }, [senderIdentities, selectedSender]);

  return (
    <section>
      <SectionHeader
        title="Sender details"
        description="Choose who this email will be sent from. Recipients will see this in their inbox."
      />

      <div className="flex flex-col gap-4">
        <SenderSelect
          senderIdentities={senderIdentities}
          domains={domains}
          value={senderIdentityId}
          onChange={onSenderChange}
          onDomainCreated={senderActions.onDomainCreated}
          localPart={senderState.localPart}
          onLocalPartChange={senderActions.onLocalPartChange}
          domainId={senderState.domainId}
          onDomainIdChange={senderActions.onDomainIdChange}
          isAddingNew={senderState.isAddingNew}
          onIsAddingNewChange={senderActions.onIsAddingNewChange}
        />

        <ReplyToSelect
          senderIdentities={replyToIdentities}
          value={replyToIdentityId}
          onChange={onReplyToChange}
          disabled={!selectedSender}
        />
      </div>
    </section>
  );
}

function TrackingSection({
  trackClicks,
  trackOpens,
  onChange,
}: {
  trackClicks?: boolean;
  trackOpens?: boolean;
  onChange: (updates: Partial<EmailDetails>) => void;
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
        <label
          htmlFor={clickTrackingId}
          className="flex items-start justify-between gap-3 border border-kb-border-tertiary p-3 rounded-lg transition-colors cursor-pointer hover:border-kb-border-secondary"
        >
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
            checked={trackClicks ?? false}
            onCheckedChange={(checked) =>
              onChange({ trackClicks: checked === true })
            }
            variant="circle"
          />
        </label>

        <label
          htmlFor={openTrackingId}
          className="flex items-start justify-between gap-3 border border-kb-border-tertiary p-3 rounded-lg transition-colors cursor-pointer hover:border-kb-border-secondary"
        >
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
            checked={trackOpens ?? false}
            onCheckedChange={(checked) =>
              onChange({ trackOpens: checked === true })
            }
            variant="circle"
          />
        </label>

        <Alert.Root variant="warning" className="gap-4!">
          <Alert.Icon>
            <WarningTriangle />
          </Alert.Icon>
          <Alert.Title>
            Open tracking uses a tracking pixel which may affect deliverability
            with some email providers.
          </Alert.Title>
        </Alert.Root>
      </div>
    </section>
  );
}

export function DoubleOptInDetailsTab({
  emailDetails,
  senderIdentities,
  domains,
  onChange,
  onSave,
  isSaving,
  senderState,
  senderActions,
}: DoubleOptInDetailsTabProps) {
  return (
    <div className="h-full overflow-auto bg-kb-surface-primary">
      <div className="max-w-xl mx-auto py-8 px-6">
        <EmailSubjectSection
          subject={emailDetails.subject}
          previewText={emailDetails.previewText}
          onChange={onChange}
        />

        <SectionDivider />

        <SenderDetailsSection
          senderIdentityId={emailDetails.senderIdentityId}
          replyToIdentityId={emailDetails.replyToIdentityId}
          senderIdentities={senderIdentities}
          domains={domains}
          onChange={onChange}
          senderState={senderState}
          senderActions={senderActions}
        />

        <SectionDivider />

        <TrackingSection
          trackClicks={emailDetails.trackClicks}
          trackOpens={emailDetails.trackOpens}
          onChange={onChange}
        />

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
