"use client";

import type { FilterFieldDefinition } from "@kibamail/owly/filter-builder";
import { useQuery } from "@tanstack/react-query";
import { internalApi } from "@/lib/api/client";

export function useIfElseFieldDefinitions() {
  const { data: contactPropertiesResponse, isLoading: propertiesLoading } =
    useQuery({
      queryKey: ["contact-properties"],
      queryFn: async () => {
        return await internalApi.contactProperties().list();
      },
    });

  const { data: topicsResponse, isLoading: topicsLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      return await internalApi.topics().list();
    },
  });

  const contactProperties = contactPropertiesResponse?.data ?? [];
  const topics = topicsResponse?.data ?? [];

  const isLoading = propertiesLoading || topicsLoading;

  const builtInFields: FilterFieldDefinition[] = [
    {
      id: "email",
      label: "Email",
      operators: [
        {
          id: "equals",
          label: "equals",
          valueInput: { type: "text", placeholder: "user@example.com" },
        },
        {
          id: "not-equals",
          label: "does not equal",
          valueInput: { type: "text", placeholder: "user@example.com" },
        },
        {
          id: "contains",
          label: "contains",
          valueInput: { type: "text", placeholder: "gmail" },
        },
        {
          id: "starts-with",
          label: "starts with",
          valueInput: { type: "text", placeholder: "admin" },
        },
        {
          id: "ends-with",
          label: "ends with",
          valueInput: { type: "text", placeholder: ".com" },
        },
      ],
      defaultOperator: "equals",
    },
    {
      id: "firstName",
      label: "First name",
      operators: [
        {
          id: "equals",
          label: "equals",
          valueInput: { type: "text", placeholder: "John" },
        },
        {
          id: "not-equals",
          label: "does not equal",
          valueInput: { type: "text", placeholder: "John" },
        },
        {
          id: "contains",
          label: "contains",
          valueInput: { type: "text", placeholder: "Jo" },
        },
        {
          id: "is-empty",
          label: "is empty",
          valueInput: { type: "none" },
        },
        {
          id: "is-not-empty",
          label: "is not empty",
          valueInput: { type: "none" },
        },
      ],
      defaultOperator: "equals",
    },
    {
      id: "lastName",
      label: "Last name",
      operators: [
        {
          id: "equals",
          label: "equals",
          valueInput: { type: "text", placeholder: "Doe" },
        },
        {
          id: "not-equals",
          label: "does not equal",
          valueInput: { type: "text", placeholder: "Doe" },
        },
        {
          id: "contains",
          label: "contains",
          valueInput: { type: "text", placeholder: "Do" },
        },
        {
          id: "is-empty",
          label: "is empty",
          valueInput: { type: "none" },
        },
        {
          id: "is-not-empty",
          label: "is not empty",
          valueInput: { type: "none" },
        },
      ],
      defaultOperator: "equals",
    },
    {
      id: "status",
      label: "Status",
      operators: [
        {
          id: "equals",
          label: "is",
          valueInput: {
            type: "select",
            options: [
              { value: "SUBSCRIBED", label: "Subscribed" },
              { value: "UNSUBSCRIBED", label: "Unsubscribed" },
              { value: "BOUNCED", label: "Bounced" },
              { value: "COMPLAINED", label: "Complained" },
            ],
          },
        },
        {
          id: "not-equals",
          label: "is not",
          valueInput: {
            type: "select",
            options: [
              { value: "SUBSCRIBED", label: "Subscribed" },
              { value: "UNSUBSCRIBED", label: "Unsubscribed" },
              { value: "BOUNCED", label: "Bounced" },
              { value: "COMPLAINED", label: "Complained" },
            ],
          },
        },
      ],
      defaultOperator: "equals",
    },
    {
      id: "subscribedAt",
      label: "Subscribed date",
      operators: [
        {
          id: "greater-than",
          label: "is after",
          valueInput: { type: "date", mode: "single" },
        },
        {
          id: "less-than",
          label: "is before",
          valueInput: { type: "date", mode: "single" },
        },
        {
          id: "between",
          label: "is between",
          valueInput: { type: "date", mode: "range" },
        },
      ],
      defaultOperator: "greater-than",
    },
  ];

  const customFields: FilterFieldDefinition[] = contactProperties.map(
    (property) => {
      const baseOperators = getOperatorsForType(property.type);

      return {
        id: `property.${property.name}`,
        label: property.name,
        category: "Custom Properties",
        operators: baseOperators,
        defaultOperator: baseOperators[0]?.id || "equals",
      };
    },
  );

  const topicFields: FilterFieldDefinition[] = topics.map((topic) => ({
    id: `topic.${topic.id}`,
    label: topic.name,
    category: "Topic Subscriptions",
    operators: [
      {
        id: "subscribed",
        label: "is subscribed to",
        valueInput: { type: "none" },
      },
      {
        id: "not-subscribed",
        label: "is not subscribed to",
        valueInput: { type: "none" },
      },
    ],
    defaultOperator: "subscribed",
  }));

  const fieldDefinitions = [...builtInFields, ...customFields, ...topicFields];

  return {
    fieldDefinitions,
    isLoading,
  };
}

function getOperatorsForType(type: string) {
  switch (type) {
    case "STRING":
      return [
        {
          id: "equals",
          label: "equals",
          valueInput: { type: "text" as const, placeholder: "Enter value" },
        },
        {
          id: "not-equals",
          label: "does not equal",
          valueInput: { type: "text" as const, placeholder: "Enter value" },
        },
        {
          id: "contains",
          label: "contains",
          valueInput: { type: "text" as const, placeholder: "Enter value" },
        },
        {
          id: "is-empty",
          label: "is empty",
          valueInput: { type: "none" as const },
        },
        {
          id: "is-not-empty",
          label: "is not empty",
          valueInput: { type: "none" as const },
        },
      ];
    case "NUMBER":
      return [
        {
          id: "equals",
          label: "equals",
          valueInput: { type: "number" as const },
        },
        {
          id: "not-equals",
          label: "does not equal",
          valueInput: { type: "number" as const },
        },
        {
          id: "greater-than",
          label: "greater than",
          valueInput: { type: "number" as const },
        },
        {
          id: "less-than",
          label: "less than",
          valueInput: { type: "number" as const },
        },
      ];
    case "DATE":
      return [
        {
          id: "greater-than",
          label: "after",
          valueInput: { type: "date" as const, mode: "single" as const },
        },
        {
          id: "less-than",
          label: "before",
          valueInput: { type: "date" as const, mode: "single" as const },
        },
        {
          id: "between",
          label: "between",
          valueInput: { type: "date" as const, mode: "range" as const },
        },
      ];
    default:
      return [
        {
          id: "equals",
          label: "equals",
          valueInput: { type: "text" as const, placeholder: "Enter value" },
        },
      ];
  }
}
