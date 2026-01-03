"use client";

import type { FilterFieldDefinition } from "@kibamail/owly/filter-builder";
import { useQuery } from "@tanstack/react-query";
import { internalApi } from "@/lib/api/client";

/**
 * Hook to get field definitions for segment filtering
 * Based on the exact segment conditions schema and built-in contact fields
 */
export function useSegmentFieldDefinitions() {
  const { data: contactProperties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["contact-properties"],
    queryFn: async () => {
      const response = await internalApi.contactProperties().list();
      return response.data;
    },
  });

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const response = await internalApi.topics().list();
      return response.data;
    },
  });

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
        { id: "exists", label: "has a value", valueInput: { type: "boolean" } },
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
          id: "starts-with",
          label: "starts with",
          valueInput: { type: "text", placeholder: "J" },
        },
        {
          id: "ends-with",
          label: "ends with",
          valueInput: { type: "text", placeholder: "n" },
        },
        { id: "exists", label: "has a value", valueInput: { type: "boolean" } },
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
          id: "starts-with",
          label: "starts with",
          valueInput: { type: "text", placeholder: "D" },
        },
        {
          id: "ends-with",
          label: "ends with",
          valueInput: { type: "text", placeholder: "e" },
        },
        { id: "exists", label: "has a value", valueInput: { type: "boolean" } },
      ],
      defaultOperator: "equals",
    },

    {
      id: "status",
      label: "Status",
      operators: [
        {
          id: "in",
          label: "is one of",
          valueInput: {
            type: "multi-select",
            options: [
              { value: "SUBSCRIBED", label: "Subscribed" },
              { value: "UNSUBSCRIBED", label: "Unsubscribed" },
              { value: "BOUNCED", label: "Bounced" },
              { value: "COMPLAINED", label: "Complained" },
              { value: "ARCHIVED", label: "Archived" },
            ],
          },
        },
        {
          id: "nin",
          label: "is not one of",
          valueInput: {
            type: "multi-select",
            options: [
              { value: "SUBSCRIBED", label: "Subscribed" },
              { value: "UNSUBSCRIBED", label: "Unsubscribed" },
              { value: "BOUNCED", label: "Bounced" },
              { value: "COMPLAINED", label: "Complained" },
              { value: "ARCHIVED", label: "Archived" },
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
          label: "after",
          valueInput: { type: "date", mode: "single" },
        },
        {
          id: "less-than",
          label: "before",
          valueInput: { type: "date", mode: "single" },
        },
        {
          id: "between",
          label: "between",
          valueInput: { type: "date", mode: "range" },
        },
      ],
      defaultOperator: "greater-than",
    },
  ];

  const customFields: FilterFieldDefinition[] = (contactProperties || []).map(
    (property) => {
      const baseOperators = getOperatorsForType(property.type);

      return {
        id: property.name,
        label: property.name,
        category: "Custom Properties",
        operators: baseOperators,
        defaultOperator: baseOperators[0]?.id || "equals",
      };
    },
  );

  const topicFields: FilterFieldDefinition[] = (topics || []).map((topic) => ({
    id: `subscribedToTopic.${topic.id}`,
    label: topic.name,
    category: "Topic Subscriptions",
    operators: [
      {
        id: "equals",
        label: "is subscribed",
        valueInput: { type: "boolean" },
      },
    ],
    defaultOperator: "equals",
  }));

  const fieldDefinitions = [...builtInFields, ...customFields, ...topicFields];

  return {
    fieldDefinitions,
    isLoading,
  };
}

/**
 * Get appropriate operators for a contact property type
 */
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
          id: "starts-with",
          label: "starts with",
          valueInput: { type: "text" as const, placeholder: "Enter value" },
        },
        {
          id: "ends-with",
          label: "ends with",
          valueInput: { type: "text" as const, placeholder: "Enter value" },
        },
        {
          id: "exists",
          label: "exists",
          valueInput: { type: "boolean" as const },
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
          id: "greater-than-equal",
          label: "greater than or equal",
          valueInput: { type: "number" as const },
        },
        {
          id: "less-than",
          label: "less than",
          valueInput: { type: "number" as const },
        },
        {
          id: "less-than-equal",
          label: "less than or equal",
          valueInput: { type: "number" as const },
        },
        {
          id: "exists",
          label: "exists",
          valueInput: { type: "boolean" as const },
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
          id: "greater-than-equal",
          label: "on or after",
          valueInput: { type: "date" as const, mode: "single" as const },
        },
        {
          id: "less-than-equal",
          label: "on or before",
          valueInput: { type: "date" as const, mode: "single" as const },
        },
        {
          id: "between",
          label: "between",
          valueInput: { type: "date" as const, mode: "range" as const },
        },
        {
          id: "exists",
          label: "exists",
          valueInput: { type: "boolean" as const },
        },
      ];
    case "BOOLEAN":
      return [
        {
          id: "equals",
          label: "is",
          valueInput: { type: "boolean" as const },
        },
      ];
    default:
      return [
        {
          id: "equals",
          label: "equals",
          valueInput: { type: "text" as const, placeholder: "Enter value" },
        },
        {
          id: "exists",
          label: "exists",
          valueInput: { type: "boolean" as const },
        },
      ];
  }
}
