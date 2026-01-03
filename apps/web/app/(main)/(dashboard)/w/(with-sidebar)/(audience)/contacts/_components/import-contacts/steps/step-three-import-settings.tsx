"use client";

import { Button } from "@kibamail/owly/button";
import { Heading } from "@kibamail/owly/heading";
import * as MultiSelect from "@kibamail/owly/multi-select";
import { Text } from "@kibamail/owly/text";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NavArrowLeft, Plus } from "iconoir-react";
import { useRef, useState, type FormEvent } from "react";
import { useToggleState } from "@/hooks/utils/useToggleState";
import { internalApi } from "@/lib/api/client";
import type { UpdateContactImportRequest } from "@/app/(main)/api/internal/v1/contact-imports/schema";
import * as CheckboxField from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/import-contacts/components/checkbox-field";
import { useImportContactsStore } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/contacts/_components/import-contacts/store/import-contacts-store";
import { CreateTopicModal } from "@/app/(main)/(dashboard)/w/(with-sidebar)/(audience)/topics/_components/create-topic-modal";

export function StepThreeImportSettings() {
  const selectedTopicsRef = useRef<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [autoSubscribe, setAutoSubscribe] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);

  const queryClient = useQueryClient();
  const createTopicModal = useToggleState();

  const { prevStep, nextStep, contactImportId, contactProperties, totalRows } =
    useImportContactsStore();

  const updateImportMutation = useMutation({
    mutationFn: async (data: UpdateContactImportRequest) => {
      return internalApi.contactImports().update(contactImportId, data);
    },
    onSuccess: () => {
      nextStep();
    },
  });

  const { data: topics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const response = await internalApi.topics().list();
      return response.data;
    },
  });

  function onGoBack() {
    prevStep();
  }

  function onTopicsChange(values: string[]) {
    setSelectedTopics(values);
    selectedTopicsRef.current = values;
  }

  function onTopicCreated() {
    queryClient.invalidateQueries({ queryKey: ["topics"] });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const columnMapping: Record<string, string> = {};

    if (contactProperties.email) {
      columnMapping[contactProperties.email] = "email";
    }
    if (contactProperties.firstName) {
      columnMapping[contactProperties.firstName] = "firstName";
    }
    if (contactProperties.lastName) {
      columnMapping[contactProperties.lastName] = "lastName";
    }

    if (contactProperties.customProperties) {
      for (const [columnName, property] of Object.entries(
        contactProperties.customProperties
      )) {
        columnMapping[columnName] = property.id;
      }
    }

    updateImportMutation.mutate({
      columnMapping,
      topicIds: selectedTopicsRef.current,
      autoSubscribe,
      updateExisting,
      totalRows,
    });
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="pt-10 lg:pt-24 flex flex-col gap-y-2"
      >
        <Heading className="text-left">Subscribe to topics</Heading>

        <Text as="p" className="text-kb-content-secondary">
          You may optionally subscribe all new contacts to one or more topics.
          That way, you can segment and filter by them in future.
        </Text>

        <div className="my-6 grid grid-cols-1 gap-y-6">
          <div className="max-w-[640px]">
            <MultiSelect.Root
              value={selectedTopics}
              onValueChange={onTopicsChange}
            >
              <MultiSelect.Label>Topics</MultiSelect.Label>
              <MultiSelect.Trigger placeholder="Select topics to subscribe contacts to" />
              <MultiSelect.Content className="z-50">
                {topics.map((topic) => (
                  <MultiSelect.Item key={topic.id} value={topic.id}>
                    {topic.name}
                  </MultiSelect.Item>
                ))}
                {topics.length > 0 && (
                  <div
                    aria-hidden
                    className="h-px my-1 bg-kb-bg-secondary w-full"
                  />
                )}
                <button
                  type="button"
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-kb-content-secondary hover:bg-kb-bg-secondary rounded-md transition-colors"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    createTopicModal.onOpenChange?.(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add new topic
                </button>
              </MultiSelect.Content>
            </MultiSelect.Root>
          </div>

          <CheckboxField.Root
            id="subscribeAllContacts"
            name="subscribeAllContacts"
            checked={autoSubscribe}
            onCheckedChange={(checked) => setAutoSubscribe(checked === true)}
          >
            <CheckboxField.Label htmlFor="subscribeAllContacts">
              Auto subscribe all contacts
            </CheckboxField.Label>
            <CheckboxField.Description>
              We'll automatically subscribe all new contacts to your audience.
              By checking this option, you agree that all the contacts in the
              import have consented to being subscribed to your newsletter.
            </CheckboxField.Description>
          </CheckboxField.Root>

          <CheckboxField.Root
            id="updateExistingContacts"
            name="updateExistingContacts"
            checked={updateExisting}
            onCheckedChange={(checked) => setUpdateExisting(checked === true)}
          >
            <CheckboxField.Label htmlFor="updateExistingContacts">
              Update any existing contacts
            </CheckboxField.Label>
            <CheckboxField.Description>
              As we import your contacts, if we encounter duplicates, we will
              automatically overwrite the existing contact with the new
              information from your CSV.
            </CheckboxField.Description>
          </CheckboxField.Root>
        </div>

        {updateImportMutation.error && (
          <div className="mt-4">
            <Text className="text-kb-content-error text-sm">
              {updateImportMutation.error instanceof Error
                ? updateImportMutation.error.message
                : "Failed to finalize import"}
            </Text>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button type="button" variant="tertiary" onClick={onGoBack}>
            <NavArrowLeft className="w-4 h-4" />
            Back to matching columns
          </Button>

          <Button type="submit" loading={updateImportMutation.isPending}>
            Finish
          </Button>
        </div>
      </form>

      <CreateTopicModal
        open={createTopicModal.open}
        onOpenChange={(open) => {
          createTopicModal.onOpenChange?.(open);
          if (!open) {
            onTopicCreated();
          }
        }}
      />
    </>
  );
}
