import React from "react";
import type { Meta, StoryFn } from "@storybook/react";
import * as FilterBuilder from "./filter-builder";
import type { FilterBuilderFilter } from "./filter-builder";
import type { FilterFieldDefinition } from "../filter/filter.types";

const meta: Meta<typeof FilterBuilder> = {
  title: "Components/FilterBuilder",
};

type FilterBuilderStoryFn = StoryFn<typeof FilterBuilder>;

// Sample field definitions for stories
const fieldDefinitions: FilterFieldDefinition[] = [
  {
    id: "name",
    label: "Name",
    category: "text",
    operators: [
      {
        id: "equals",
        label: "is equal to",
        valueInput: { type: "text", placeholder: "Enter name" },
      },
      {
        id: "contains",
        label: "contains",
        valueInput: { type: "text", placeholder: "Enter text" },
      },
      {
        id: "not_contains",
        label: "does not contain",
        valueInput: { type: "text", placeholder: "Enter text" },
      },
      {
        id: "is_empty",
        label: "is empty",
        valueInput: { type: "none" },
      },
    ],
  },
  {
    id: "email",
    label: "Email",
    category: "text",
    operators: [
      {
        id: "equals",
        label: "is equal to",
        valueInput: { type: "text", placeholder: "Enter email" },
      },
      {
        id: "contains",
        label: "contains",
        valueInput: { type: "text", placeholder: "Enter text" },
      },
      {
        id: "ends_with",
        label: "ends with",
        valueInput: { type: "text", placeholder: "Enter domain" },
      },
    ],
  },
  {
    id: "status",
    label: "Status",
    category: "select",
    operators: [
      {
        id: "equals",
        label: "is",
        valueInput: {
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "pending", label: "Pending" },
            { value: "suspended", label: "Suspended" },
          ],
        },
      },
      {
        id: "not_equals",
        label: "is not",
        valueInput: {
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "pending", label: "Pending" },
            { value: "suspended", label: "Suspended" },
          ],
        },
      },
    ],
  },
  {
    id: "created_at",
    label: "Created at",
    category: "date",
    operators: [
      {
        id: "is",
        label: "is",
        valueInput: { type: "date", mode: "single" },
      },
      {
        id: "is_before",
        label: "is before",
        valueInput: { type: "date", mode: "single" },
      },
      {
        id: "is_after",
        label: "is after",
        valueInput: { type: "date", mode: "single" },
      },
      {
        id: "is_between",
        label: "is between",
        valueInput: { type: "date", mode: "range" },
      },
    ],
  },
];

export const Default: FilterBuilderStoryFn = () => {
  const [filters, setFilters] = React.useState<FilterBuilderFilter[]>([]);

  return (
    <div
      style={{
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <h3>Basic FilterBuilder</h3>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
        Click the button to add new filters. Filters are displayed horizontally
        and wrap to new lines as needed.
      </p>

      <FilterBuilder.Root
        fields={fieldDefinitions}
        filters={filters}
        onChange={setFilters}
      >
        <FilterBuilder.Trigger asChild>
          <button
            style={{
              padding: "8px 16px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Add Filter
          </button>
        </FilterBuilder.Trigger>
        <FilterBuilder.Filters />
      </FilterBuilder.Root>

      {filters.length > 0 && (
        <div style={{ fontSize: "12px", color: "#666", marginTop: "16px" }}>
          <strong>Current Filters ({filters.length}):</strong>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "8px",
              borderRadius: "4px",
              marginTop: "8px",
            }}
          >
            {JSON.stringify(filters, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export const WithMaxFilters: FilterBuilderStoryFn = () => {
  const [filters, setFilters] = React.useState<FilterBuilderFilter[]>([]);

  return (
    <div
      style={{
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <h3>FilterBuilder with Maximum Filters</h3>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
        Limited to maximum 3 filters. The trigger becomes disabled when limit is
        reached.
      </p>

      <FilterBuilder.Root
        fields={fieldDefinitions}
        filters={filters}
        onChange={setFilters}
        maxFilters={3}
      >
        <FilterBuilder.Trigger asChild>
          <button
            style={{
              padding: "8px 16px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Add Filter ({filters.length}/3)
          </button>
        </FilterBuilder.Trigger>
        <FilterBuilder.Filters />
      </FilterBuilder.Root>
    </div>
  );
};

export const WithInitialFilters: FilterBuilderStoryFn = () => {
  const initialFilters: FilterBuilderFilter[] = [
    {
      id: "filter-1",
      fieldId: "name",
      operatorId: "contains",
      value: { type: "text", value: "john" },
    },
    {
      id: "filter-2",
      fieldId: "status",
      operatorId: "equals",
      value: { type: "select", value: "active" },
    },
    {
      id: "filter-3",
      fieldId: "email",
      operatorId: "ends_with",
      value: { type: "text", value: "@company.com" },
    },
    {
      id: "filter-4",
      fieldId: "created_at",
      operatorId: "is_after",
      value: { type: "date-single", value: new Date("2024-01-01") },
    },
  ];

  const [filters, setFilters] =
    React.useState<FilterBuilderFilter[]>(initialFilters);

  return (
    <div
      style={{
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <h3>Horizontal Layout with Wrapping</h3>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
        Multiple filters are displayed horizontally and wrap to new lines. Try
        resizing the window to see the wrapping behavior.
      </p>

      <FilterBuilder.Root
        fields={fieldDefinitions}
        filters={filters}
        onChange={setFilters}
      >
        <FilterBuilder.Trigger asChild>
          <button
            style={{
              padding: "8px 16px",
              background: "#6f42c1",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            + Add Another Filter
          </button>
        </FilterBuilder.Trigger>
        <FilterBuilder.Filters />
      </FilterBuilder.Root>

      {filters.length > 0 && (
        <div style={{ fontSize: "12px", color: "#666", marginTop: "16px" }}>
          <strong>Active Filters ({filters.length}):</strong>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "8px",
              borderRadius: "4px",
              marginTop: "8px",
            }}
          >
            {JSON.stringify(filters, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export const CustomTrigger: FilterBuilderStoryFn = () => {
  const [filters, setFilters] = React.useState<FilterBuilderFilter[]>([]);

  return (
    <div
      style={{
        padding: "40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <h3>Custom Trigger</h3>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
        Demonstrates how you can use any element as the trigger to add filters.
      </p>

      <FilterBuilder.Root
        fields={fieldDefinitions}
        filters={filters}
        onChange={setFilters}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h4 style={{ margin: 0 }}>Applied Filters ({filters.length})</h4>
          <FilterBuilder.Trigger asChild>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                background: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              <span style={{ fontSize: "16px" }}>+</span>
              New Filter
            </div>
          </FilterBuilder.Trigger>
        </div>

        <FilterBuilder.Filters />
      </FilterBuilder.Root>
    </div>
  );
};

export default meta;
