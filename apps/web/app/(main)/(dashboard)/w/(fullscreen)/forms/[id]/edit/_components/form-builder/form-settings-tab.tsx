"use client";

import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { WarningTriangle, EditPencil } from "iconoir-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@kibamail/owly/toast";
import { useFormBuilder } from "./form-builder-context";
import type { FormSuccessAction } from "./types";
import { ContentFieldEditor } from "./content-field-editor";
import {
  SelectField,
  Switch,
  Checkbox,
  Alert,
  TextField,
} from "@kibamail/owly";
import { Button } from "@kibamail/owly/button";
import { internalApi } from "@/lib/api/client";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-kb-border-primary pb-8">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-kb-content-primary">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-kb-content-secondary">{description}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function SettingsField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-kb-content-primary">
          {label}
        </span>
        {description && (
          <p className="text-xs text-kb-content-tertiary">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function SuccessMessageEditor({
  content,
  onChange,
}: {
  content?: Record<string, unknown>;
  onChange: (content: JSONContent) => void;
}) {
  return (
    <div className="rounded-lg border border-kb-border-primary bg-kb-bg-primary overflow-hidden">
      <ContentFieldEditor
        content={content}
        onChange={onChange}
        placeholder="Create your thank you message..."
      />
    </div>
  );
}

const DEFAULT_RICH_CONTENT = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Thank you!" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Your submission has been received. We'll be in touch soon.",
        },
      ],
    },
  ],
};

function SuccessActionSettings() {
  const { schema, updateSettings } = useFormBuilder();
  const successAction = schema.settings.successAction ?? { type: "message", richContent: DEFAULT_RICH_CONTENT };

  function onTypeChange(type: "message" | "redirect") {
    if (type === "message") {
      const existingRichContent = successAction.type === "message" ? successAction.richContent : undefined;
      updateSettings({
        successAction: {
          type: "message",
          richContent: existingRichContent ?? DEFAULT_RICH_CONTENT,
        },
      });
    } else {
      updateSettings({
        successAction: {
          type: "redirect",
          url: successAction.type === "redirect" ? successAction.url : "https://",
          openInNewTab: successAction.type === "redirect" ? successAction.openInNewTab : false,
        },
      });
    }
  }

  function onMessageChange(richContent: JSONContent) {
    updateSettings({
      successAction: {
        type: "message",
        richContent: richContent as Record<string, unknown>,
      },
    });
  }

  function onRedirectUrlChange(url: string) {
    if (successAction.type === "redirect") {
      updateSettings({
        successAction: {
          ...successAction,
          url,
        },
      });
    }
  }

  function onOpenInNewTabChange(checked: boolean) {
    if (successAction.type === "redirect") {
      updateSettings({
        successAction: {
          ...successAction,
          openInNewTab: checked,
        },
      });
    }
  }

  return (
    <SettingsSection
      title="After Submission"
      description="Configure what happens when someone submits your form"
    >
      <div className="space-y-2">
        <SelectField.Root
          value={successAction.type}
          onValueChange={(value) => onTypeChange(value as "message" | "redirect")}
        >
          <SelectField.Label>Success Action</SelectField.Label>
          <SelectField.Trigger placeholder="Select action" />
          <SelectField.Content>
            <SelectField.Item value="message">Show Success Message</SelectField.Item>
            <SelectField.Item value="redirect">Redirect to URL</SelectField.Item>
          </SelectField.Content>
          <SelectField.Hint>Choose what to show or do after a successful submission</SelectField.Hint>
        </SelectField.Root>
      </div>

      {successAction.type === "message" && (
        <SettingsField
          label="Success Message"
          description="Design a custom thank you message with text, images, and formatting"
        >
          <SuccessMessageEditor
            content={successAction.richContent ?? DEFAULT_RICH_CONTENT}
            onChange={onMessageChange}
          />
        </SettingsField>
      )}

      {successAction.type === "redirect" && (
        <>
          <div className="space-y-2">
            <TextField.Root
              type="url"
              value={successAction.url}
              onChange={(event) => onRedirectUrlChange(event.target.value)}
              placeholder="https://example.com/thank-you"
            >
              <TextField.Label>Redirect URL</TextField.Label>
              <TextField.Hint>The URL to redirect users to after submission</TextField.Hint>
            </TextField.Root>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={successAction.openInNewTab}
              onCheckedChange={(checked) => onOpenInNewTabChange(checked === true)}
            />
            <span className="text-sm text-kb-content-secondary cursor-pointer">
              Open in new tab
            </span>
          </div>
        </>
      )}
    </SettingsSection>
  );
}

function DoubleOptInSettings() {
  const { schema, updateSettings, formId, formName, doubleOptInEmailId, setDoubleOptInEmailId } = useFormBuilder();
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();
  const doubleOptIn = schema.settings.doubleOptIn ?? { enabled: true };
  const [isCreatingEmail, setIsCreatingEmail] = useState(false);

  function onToggle(enabled: boolean) {
    updateSettings({
      doubleOptIn: { enabled },
    });
  }

  async function onEditEmail() {
    if (doubleOptInEmailId) {
      router.push(`/w/forms/${formId}/email/${doubleOptInEmailId}`);
      return;
    }

    setIsCreatingEmail(true);
    try {
      const email = await internalApi.emails().create({
        name: `Double Opt-In Email for ${formName}`,
        subject: "Please confirm your subscription",
        type: "TRANSACTIONAL",
      });

      await internalApi.forms().update(formId, {
        doubleOptInEmailId: email.id,
      });

      setDoubleOptInEmailId(email.id);
      toast("Confirmation email created");

      router.push(`/w/forms/${formId}/email/${email.id}`);
    } catch {
      toastError("Failed to create confirmation email");
    } finally {
      setIsCreatingEmail(false);
    }
  }

  return (
    <SettingsSection
      title="Email Confirmation"
      description="Control how new subscribers are added to your list"
    >
      <div className="space-y-4">
        <Switch.Root
          checked={doubleOptIn.enabled}
          onCheckedChange={onToggle}
        >
          <Switch.Label>Double Opt-in</Switch.Label>
          <Switch.Hint>Require subscribers to confirm their email before being added</Switch.Hint>
        </Switch.Root>

        {!doubleOptIn.enabled && (
          <Alert.Root variant="warning">
            <Alert.Icon>
              <WarningTriangle className="h-4 w-4" />
            </Alert.Icon>
            <div className="space-y-2">
              <Alert.Title>Not Recommended</Alert.Title>
              <div className="text-sm">
                <p className="mb-2">
                  Disabling double opt-in can lead to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Higher spam complaints and bounces</li>
                  <li>Lower email deliverability rates</li>
                  <li>Potential GDPR compliance issues in some regions</li>
                  <li>Fake or mistyped email addresses on your list</li>
                </ul>
                <p className="mt-2 font-medium">
                  We strongly recommend keeping double opt-in enabled.
                </p>
              </div>
            </div>
          </Alert.Root>
        )}

        {doubleOptIn.enabled && (
          <div className="space-y-4">
            <div className="rounded-lg border border-kb-border-primary bg-kb-bg-secondary p-4">
              <p className="text-sm text-kb-content-secondary">
                When someone submits this form, they will receive a confirmation email.
                They must click the confirmation link to be added to your list.
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={onEditEmail}
              disabled={isCreatingEmail}
            >
              <EditPencil className="w-4 h-4" />
              {isCreatingEmail
                ? "Creating..."
                : doubleOptInEmailId
                  ? "Edit Confirmation Email"
                  : "Create Confirmation Email"}
            </Button>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}

export function FormSettingsTab() {
  return (
    <div className="h-full w-full bg-kb-bg-primary overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">
        <div className="pb-6 border-b border-kb-border-primary">
          <h2 className="text-xl font-semibold text-kb-content-primary">
            Form Settings
          </h2>
          <p className="mt-1 text-sm text-kb-content-secondary">
            Configure your form's behavior and appearance
          </p>
        </div>

        <SuccessActionSettings />
        <DoubleOptInSettings />
      </div>
    </div>
  );
}
