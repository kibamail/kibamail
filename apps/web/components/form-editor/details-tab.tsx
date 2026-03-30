"use client";

import { Badge } from "@kibamail/owly";
import { Button } from "@kibamail/owly/button";
import * as SelectField from "@kibamail/owly/select-field";
import * as TextField from "@kibamail/owly/text-field";
import { Text } from "@kibamail/owly/text";
import cn from "classnames";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle,
  Clock,
  Globe,
  Mail,
  MapPin,
  NavArrowRight,
  Number0Square,
  Phone,
  Plus,
  Text as TextIcon,
  Trash,
} from "iconoir-react";
import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@kibamail/owly/toast";
import { CreateContactPropertyModal } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/create-contact-property-modal";
import {
  SectionHeader,
  SectionDivider,
  SectionSaveButton,
} from "@/components/email-editor/details-sections/shared";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";

interface FieldMappingEntry {
  fieldName: string;
  propertyId: string;
  propertyType: "standard" | "custom";
  fieldType: "string" | "number";
}

interface FormDetailsTabProps {
  formId: string;
  readonly: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageUrl: string | null;
  seoFaviconUrl: string | null;
  slug: string | null;
  settings: Record<string, unknown> | null;
  fieldMapping: Record<string, unknown> | null;
  doubleOptInEmail: { id: string; name: string } | null;
  formName: string;
}

type PropertyType = "standard" | "text" | "number" | "date";

function getPropertyIcon(
  type: PropertyType,
): React.ComponentType<{ className?: string }> {
  switch (type) {
    case "date":
      return Calendar;
    case "number":
      return Number0Square;
    default:
      return TextIcon;
  }
}

function mapDbTypeToPropertyType(dbType: string): PropertyType {
  switch (dbType) {
    case "NUMBER":
      return "number";
    case "DATE":
      return "date";
    default:
      return "text";
  }
}

const STANDARD_PROPERTIES = [
  { id: "email", name: "Email address", icon: Mail },
  { id: "firstName", name: "First name", icon: TextIcon },
  { id: "lastName", name: "Last name", icon: TextIcon },
  { id: "phone", name: "Phone", icon: Phone },
  { id: "country", name: "Country", icon: Globe },
  { id: "timezone", name: "Timezone", icon: Clock },
  { id: "city", name: "City", icon: MapPin },
] as const;

const EMAIL_MAPPING: FieldMappingEntry = {
  fieldName: "email",
  propertyId: "email",
  propertyType: "standard",
  fieldType: "string",
};

function initialMappingsFromRecord(
  fieldMapping: Record<string, unknown> | null,
): FieldMappingEntry[] {
  if (!fieldMapping) return [EMAIL_MAPPING];

  const entries = Object.entries(fieldMapping)
    .filter(([fieldName]) => fieldName !== "email")
    .map(([fieldName, mapping]) => {
      const m = mapping as {
        contactPropertyId: string;
        contactPropertyType: string;
        fieldType: string;
      };
      return {
        fieldName,
        propertyId: m.contactPropertyId,
        propertyType: m.contactPropertyType as "standard" | "custom",
        fieldType: m.fieldType as "string" | "number",
      };
    });

  return [EMAIL_MAPPING, ...entries];
}

function isEmailRow(mapping: FieldMappingEntry): boolean {
  return mapping.fieldName === "email" && mapping.propertyId === "email";
}

function mappingsToRecord(
  mappings: FieldMappingEntry[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const m of mappings) {
    if (!m.fieldName || !m.propertyId) continue;
    result[m.fieldName] = {
      contactPropertyId: m.propertyId,
      contactPropertyType: m.propertyType,
      fieldType: m.fieldType,
    };
  }
  return result;
}

function DoubleOptInEmailSection({
  formId,
  formName,
  doubleOptInEmail,
}: {
  formId: string;
  formName: string;
  doubleOptInEmail: { id: string; name: string } | null;
}) {
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: async () => {
      const email = await internalApi.emails().create({
        name: `Double opt-in confirmation - ${formName}`,
        subject: "Please confirm your subscription",
        type: "AUTOMATION",
      });

      await internalApi.forms().update(formId, {
        doubleOptInEmailId: email.id,
        settings: { doubleOptIn: { enabled: true } },
      });

      return email;
    },
    onSuccess: (email) => {
      router.push(`/w/marketing-emails/${email.id}`);
    },
  });

  return (
    <section>
      <SectionHeader
        title="Double opt-in email"
        description="The confirmation email sent to new contacts who sign up via this form."
      />

      {doubleOptInEmail ? (
        <Link
          href={`/w/marketing-emails/${doubleOptInEmail.id}`}
          className="flex items-center justify-between border border-kb-border-tertiary p-3 rounded-lg transition-colors hover:border-kb-border-secondary"
        >
          <div className="flex flex-col gap-1.5">
            <Text className="text-kb-content-primary font-medium">{doubleOptInEmail.name}</Text>
            <Badge size="sm" variant="tertiary" className="rounded-full! w-fit px-2!">Confirmation email</Badge>
          </div>
          <Badge size="sm" variant="info" className="rounded-full!">Email</Badge>
        </Link>
      ) : (
        <Button
          variant="secondary"
          onClick={() => createMutation.mutate()}
          loading={createMutation.isPending}
        >
          <Plus className="w-4 h-4" />
          Create double opt-in email
        </Button>
      )}
    </section>
  );
}

export function DetailsTab({
  formId,
  readonly,
  seoTitle: initialSeoTitle,
  seoDescription: initialSeoDescription,
  seoImageUrl: initialSeoImageUrl,
  seoFaviconUrl: initialSeoFaviconUrl,
  slug: initialSlug,
  settings: initialSettings,
  fieldMapping,
  doubleOptInEmail,
  formName,
}: FormDetailsTabProps) {
  const { success: toast } = useToast();
  const queryClient = useQueryClient();
  const createPropertyModal = useToggleState();

  const seoTitleId = useId();
  const seoDescriptionId = useId();
  const seoImageUrlId = useId();
  const seoFaviconUrlId = useId();
  const slugId = useId();
  const successMessageId = useId();
  const redirectUrlId = useId();

  const [seoTitle, setSeoTitle] = useState(initialSeoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    initialSeoDescription ?? "",
  );
  const [seoImageUrl, setSeoImageUrl] = useState(initialSeoImageUrl ?? "");
  const [seoFaviconUrl, setSeoFaviconUrl] = useState(
    initialSeoFaviconUrl ?? "",
  );
  const [slug, setSlug] = useState(initialSlug ?? "");

  const successActionType =
    (initialSettings as { successAction?: { type?: string } })?.successAction
      ?.type ?? "message";
  const [successType, setSuccessType] = useState(successActionType);
  const [successMessage, setSuccessMessage] = useState(
    (initialSettings as { successAction?: { message?: string } })
      ?.successAction?.message ?? "",
  );
  const [redirectUrl, setRedirectUrl] = useState(
    (initialSettings as { successAction?: { url?: string } })?.successAction
      ?.url ?? "",
  );

  const [mappings, setMappings] = useState<FieldMappingEntry[]>(
    initialMappingsFromRecord(fieldMapping),
  );

  const { data: dbContactProperties } = useQuery({
    queryKey: ["contact-properties"],
    queryFn: async () => {
      const response = await internalApi.contactProperties().list();
      return response.data;
    },
  });

  const dbPropertiesFormatted = (dbContactProperties || []).map((prop) => ({
    id: prop.id,
    name: prop.name,
    type: mapDbTypeToPropertyType(prop.type),
    icon: getPropertyIcon(mapDbTypeToPropertyType(prop.type)),
  }));

  const allProperties = [
    ...STANDARD_PROPERTIES.map((p) => ({
      ...p,
      type: "standard" as PropertyType,
    })),
    ...dbPropertiesFormatted,
  ];

  function updateMapping(index: number, updates: Partial<FieldMappingEntry>) {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m)),
    );
  }

  function addMapping() {
    setMappings((prev) => [
      ...prev,
      { fieldName: "", propertyId: "", propertyType: "standard", fieldType: "string" },
    ]);
  }

  function removeMapping(index: number) {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  }

  function onPropertySelect(index: number, propertyId: string) {
    const standardProp = STANDARD_PROPERTIES.find((p) => p.id === propertyId);
    if (standardProp) {
      updateMapping(index, {
        propertyId,
        propertyType: "standard",
        fieldType: "string",
      });
      return;
    }

    const customProp = dbPropertiesFormatted.find((p) => p.id === propertyId);
    if (customProp) {
      updateMapping(index, {
        propertyId,
        propertyType: "custom",
        fieldType: customProp.type === "number" ? "number" : "string",
      });
    }
  }

  function isPropertyDuplicate(propertyId: string, currentIndex: number): boolean {
    if (!propertyId) return false;
    return mappings.some(
      (m, i) => i !== currentIndex && m.propertyId === propertyId,
    );
  }

  function onPropertyCreated() {
    queryClient.invalidateQueries({ queryKey: ["contact-properties"] });
    createPropertyModal.onOpenChange?.(false);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const settings: Record<string, unknown> = {};

      if (successType === "redirect" && redirectUrl) {
        settings.successAction = { type: "redirect", url: redirectUrl };
      } else if (successMessage) {
        settings.successAction = { type: "message", message: successMessage };
      }

      await internalApi.forms().update(formId, {
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoImageUrl: seoImageUrl || null,
        seoFaviconUrl: seoFaviconUrl || null,
        slug: slug || null,
        settings,
        fieldMapping: mappingsToRecord(mappings) as Record<string, { contactPropertyId: string; contactPropertyType: "standard" | "custom"; fieldType: "string" | "number" }>,
      });
    },
    onSuccess: () => {
      toast("Details saved successfully");
    },
  });

  return (
    <div className="h-full overflow-auto bg-kb-surface-primary">
      <div className="max-w-xl mx-auto py-8 px-6">
        <section>
          <SectionHeader
            title="SEO settings"
            description="Configure how your form page appears in search results and social media."
          />

          <div className="space-y-4">
            <div>
              <TextField.Root
                id={seoTitleId}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                disabled={readonly}
              >
                <TextField.Label>Page title</TextField.Label>
                <TextField.Hint>{seoTitle.length}/200 characters</TextField.Hint>
              </TextField.Root>
            </div>

            <div>
              <TextField.Root
                id={seoDescriptionId}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                disabled={readonly}
              >
                <TextField.Label>Meta description</TextField.Label>
              </TextField.Root>
            </div>

            <div>
              <TextField.Root
                id={seoImageUrlId}
                value={seoImageUrl}
                onChange={(e) => setSeoImageUrl(e.target.value)}
                placeholder="https://..."
                disabled={readonly}
              >
                <TextField.Label>Open Graph image URL</TextField.Label>
              </TextField.Root>
            </div>

            <div>
              <TextField.Root
                id={seoFaviconUrlId}
                value={seoFaviconUrl}
                onChange={(e) => setSeoFaviconUrl(e.target.value)}
                placeholder="https://..."
                disabled={readonly}
              >
                <TextField.Label>Favicon URL</TextField.Label>
              </TextField.Root>
            </div>

            <div>
              <TextField.Root
                id={slugId}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-form"
                disabled={readonly}
              >
                <TextField.Label>URL slug</TextField.Label>
                <TextField.Hint>
                  Accessible at /p/forms/{slug || formId}
                </TextField.Hint>
              </TextField.Root>
            </div>
          </div>
        </section>

        <SectionDivider />

        <section>
          <SectionHeader
            title="Success action"
            description="What happens after a successful form submission."
          />

          <div className="space-y-4">
            <SelectField.Root
              value={successType}
              onValueChange={setSuccessType}
              disabled={readonly}
            >
              <SelectField.Label>On success</SelectField.Label>
              <SelectField.Trigger placeholder="Select action" />
              <SelectField.Content>
                <SelectField.Item value="message">Show message</SelectField.Item>
                <SelectField.Item value="redirect">Redirect to URL</SelectField.Item>
              </SelectField.Content>
            </SelectField.Root>

            {successType === "message" && (
              <div>
                <TextField.Root
                  id={successMessageId}
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  placeholder="Thank you for subscribing!"
                  disabled={readonly}
                >
                  <TextField.Label>Success message</TextField.Label>
                </TextField.Root>
              </div>
            )}

            {successType === "redirect" && (
              <div>
                <TextField.Root
                  id={redirectUrlId}
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://example.com/thank-you"
                  disabled={readonly}
                >
                  <TextField.Label>Redirect URL</TextField.Label>
                </TextField.Root>
              </div>
            )}
          </div>
        </section>

        <SectionDivider />

        <section>
          <SectionHeader
            title="Field mapping"
            description="Map your form's input fields to contact properties."
          />

          <div className="space-y-8">
            {mappings.map((mapping, index) => {
              const isEmail = isEmailRow(mapping);
              const hasProperty = !!mapping.propertyId;
              const isDuplicate = !isEmail && isPropertyDuplicate(mapping.propertyId, index);

              const availableProperties = isEmail
                ? allProperties.filter((p) => p.id === "email")
                : allProperties.filter((p) => p.id !== "email");

              return (
                <div key={index} className="flex flex-col w-full">
                  <div className="flex items-center gap-2">
                    <div className="grow">
                      <div className="h-9 w-full border border-kb-border-tertiary flex items-center justify-between px-3 rounded-lg bg-kb-bg-disabled">
                        {readonly || isEmail ? (
                          <Text className="text-kb-content-secondary font-mono">
                            {mapping.fieldName}
                          </Text>
                        ) : (
                          <input
                            value={mapping.fieldName}
                            onChange={(e) =>
                              updateMapping(index, { fieldName: e.target.value })
                            }
                            placeholder="field_name"
                            className="w-full bg-transparent text-sm text-kb-content-primary outline-none font-mono placeholder:text-kb-content-tertiary"
                          />
                        )}
                      </div>
                    </div>

                    {!readonly && !isEmail && (
                      <button
                        type="button"
                        onClick={() => removeMapping(index)}
                        className="p-2 rounded-lg hover:bg-kb-bg-tertiary transition-colors text-kb-content-tertiary hover:text-kb-content-error"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="h-12 w-full flex flex-col justify-center relative">
                    <div className="absolute w-px border-l border-kb-border-tertiary h-10 top-1 left-4" />

                    <div className="w-full py-1 z-1 flex items-center justify-between pl-8">
                      <Text size="sm" className="text-kb-content-secondary">
                        Matches to the following contact property:
                      </Text>

                      <CheckCircle
                        className={cn("w-4 h-4", {
                          "text-kb-content-disabled": !hasProperty,
                          "text-kb-content-positive": hasProperty && !isDuplicate,
                          "text-kb-content-error": isDuplicate,
                        })}
                      />
                    </div>
                  </div>

                  <SelectField.Root
                    value={mapping.propertyId}
                    onValueChange={(value) => onPropertySelect(index, value)}
                    disabled={readonly || isEmail}
                  >
                    <SelectField.Trigger placeholder="Select a property" />
                    <SelectField.Content className="z-50">
                      {availableProperties.map((property) => {
                        const Icon = property.icon;
                        return (
                          <SelectField.Item key={property.id} value={property.id}>
                            <Icon className="w-5 h-5" />
                            {property.name}
                          </SelectField.Item>
                        );
                      })}

                      {!isEmail && (
                        <>
                          <SelectField.Separator />
                          <button
                            type="button"
                            className="kb-select-item w-full sticky bottom-0 bg-kb-bg-primary flex items-center justify-between px-2 py-2 text-sm rounded-lg hover:bg-kb-bg-secondary cursor-pointer"
                            onClick={() =>
                              createPropertyModal.onOpenChange?.(true)
                            }
                          >
                            <span className="flex items-center gap-2">
                              <Plus className="w-5 h-5" />
                              Create a custom property
                            </span>
                            <NavArrowRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </SelectField.Content>

                    {isDuplicate && (
                      <SelectField.Error>
                        This property is already mapped to another field.
                      </SelectField.Error>
                    )}
                  </SelectField.Root>
                </div>
              );
            })}
          </div>

          {!readonly && (
            <Button
              variant="tertiary"
              className="mt-4"
              onClick={addMapping}
            >
              <Plus className="w-4 h-4" />
              Add field
            </Button>
          )}
        </section>

        <SectionDivider />
        <DoubleOptInEmailSection formId={formId} formName={formName} doubleOptInEmail={doubleOptInEmail} />

        {!readonly && (
          <SectionSaveButton
            onSave={() => saveMutation.mutate()}
            isSaving={saveMutation.isPending}
          />
        )}
      </div>

      <CreateContactPropertyModal
        open={createPropertyModal.open}
        onOpenChange={onPropertyCreated}
      />
    </div>
  );
}
