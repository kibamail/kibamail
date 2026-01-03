"use client";

import { Button } from "@kibamail/owly/button";
import * as Dialog from "@kibamail/owly/dialog";
import { Heading } from "@kibamail/owly/heading";
import { Text } from "@kibamail/owly/text";
import { useToast } from "@kibamail/owly/toast";
import { Plus } from "iconoir-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FORM_TEMPLATES,
  type FormTemplate,
  type FormTemplateCategory,
  TEMPLATE_CATEGORIES,
} from "@/form-templates";
import { useMutation } from "@/hooks/use-mutation";
import { internalApi } from "@/lib/api/client";
import {
  DEFAULT_FORM_SETTINGS,
  DEFAULT_FORM_STYLING,
} from "@/lib/form-builder/schema";

interface SelectTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  formType: "SIGN_UP" | "SURVEY";
}

function getTemplateCategories(
  formType: "SIGN_UP" | "SURVEY",
): FormTemplateCategory[] {
  if (formType === "SIGN_UP") {
    return ["signup", "event", "contact", "feedback"];
  }
  return ["feedback"];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function templateToFormSchema(template: FormTemplate) {
  return {
    id: generateId(),
    version: 1,
    title: template.title,
    pages: [
      {
        id: `page_${generateId()}`,
        sections: [
          {
            id: `section_${generateId()}`,
            fields: template.fields.map((field) => ({
              ...field,
              id: `field_${generateId()}`,
            })),
            collapsible: false,
            defaultCollapsed: false,
          },
        ],
      },
    ],
    settings: DEFAULT_FORM_SETTINGS,
    styling: DEFAULT_FORM_STYLING,
  };
}

const PLACEHOLDER_IMAGE = "/kibamail-og-meta-image.webp";

export function SelectTemplateModal({
  open,
  onOpenChange,
  formId,
  formType,
}: SelectTemplateModalProps) {
  const router = useRouter();
  const { success: toast, error: toastError } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  const categories = getTemplateCategories(formType);
  const filteredTemplates = FORM_TEMPLATES.filter((t) =>
    categories.includes(t.category),
  );

  const mutation = useMutation({
    async mutationFn(template: FormTemplate) {
      const schema = templateToFormSchema(template);
      return internalApi.forms().update(formId, {
        fields: schema,
      });
    },
    onSuccess() {
      toast("Template applied successfully");
      onOpenChange(false);
      router.push(`/w/forms/${formId}/edit`);
      router.refresh();
    },
    onError() {
      toastError("Failed to apply template");
    },
  });

  function onContinue() {
    if (selectedTemplateId === "scratch") {
      onOpenChange(false);
      router.push(`/w/forms/${formId}/edit`);
      router.refresh();
      return;
    }

    const template = filteredTemplates.find((t) => t.id === selectedTemplateId);
    if (template) {
      mutation.mutate(template);
    }
  }

  const templatesByCategory = categories.reduce(
    (acc, category) => {
      acc[category] = filteredTemplates.filter((t) => t.category === category);
      return acc;
    },
    {} as Record<FormTemplateCategory, FormTemplate[]>,
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-w-4xl!">
        <Dialog.Header>
          <Dialog.Title>Choose a Template</Dialog.Title>
          <Dialog.Description>
            Start with a pre-built template or create your form from scratch.
          </Dialog.Description>
        </Dialog.Header>

        <div className="py-6 px-6 space-y-8 max-h-[65vh] overflow-y-auto">
          <div>
            <div className="mb-3">
              <Text className="font-medium">Blank</Text>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setSelectedTemplateId("scratch")}
                className={`
                  flex flex-col rounded-xl border-2 overflow-hidden cursor-pointer transition-all text-left
                  ${
                    selectedTemplateId === "scratch"
                      ? "border-kb-border-info bg-kb-bg-info-subtle"
                      : "border-kb-border-tertiary hover:border-kb-border-secondary"
                  }
                `}
              >
                <div className="aspect-4/3 bg-kb-bg-secondary flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-kb-bg-inverse flex items-center justify-center">
                    <Plus className="w-6 h-6 text-kb-content-primary-inverse" />
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <Heading as="h4" variant="heading">
                    Start from scratch
                  </Heading>
                  <Text className="text-kb-content-tertiary line-clamp-2">
                    Build your form with a blank canvas
                  </Text>
                </div>
              </button>
            </div>
          </div>

          {categories.map((category) => {
            const templates = templatesByCategory[category];

            if (templates.length === 0) {
              return null;
            }

            return (
              <div key={category}>
                <div className="mb-3">
                  <Text className="font-medium mb-3!" variant="secondary">
                    {TEMPLATE_CATEGORIES[category].label}
                  </Text>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`
                        flex flex-col rounded-lg border overflow-hidden cursor-pointer transition-all text-left
                        ${
                          selectedTemplateId === template.id
                            ? "border-kb-border-info bg-kb-bg-info-subtle"
                            : "border-kb-border-tertiary hover:border-kb-border-secondary"
                        }
                      `}
                    >
                      <div className="aspect-4/3 relative bg-kb-bg-secondary rounded-lg overflow-hidden">
                        <Image
                          src={PLACEHOLDER_IMAGE}
                          alt={template.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-4 flex flex-col gap-1">
                        <Heading as="h4" size="xs" variant="heading">
                          {template.title}
                        </Heading>
                        <Text className="text-kb-content-tertiary line-clamp-2">
                          {template.description}
                        </Text>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <Dialog.Footer className="flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            disabled={mutation.isPending || !selectedTemplateId}
            loading={mutation.isPending}
          >
            {selectedTemplateId === "scratch" || !selectedTemplateId
              ? "Start from scratch"
              : "Use template"}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
