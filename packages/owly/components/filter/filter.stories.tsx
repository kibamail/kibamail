import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import { Filter } from "./filter";
import type { FilterFieldDefinition, FilterValue } from "./filter.types";

import "./filter.css";
import "../text-field/text-field.css";
import "../calendar/calendar.css";

const meta: Meta<typeof Filter> = {
  title: "Components/Filter",
};

type FilterStoryFn = StoryFn<typeof Filter>;

// Updated field definitions using the new operator-driven structure
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
        id: "starts_with",
        label: "starts with",
        valueInput: { type: "text", placeholder: "Enter text" },
      },
      {
        id: "ends_with",
        label: "ends with",
        valueInput: { type: "text", placeholder: "Enter text" },
      },
      {
        id: "is_empty",
        label: "is empty",
        valueInput: { type: "none" },
      },
      {
        id: "is_not_empty",
        label: "is not empty",
        valueInput: { type: "none" },
      },
    ],
    defaultOperator: "equals",
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
        id: "not_contains",
        label: "does not contain",
        valueInput: { type: "text", placeholder: "Enter text" },
      },
      {
        id: "ends_with",
        label: "ends with",
        valueInput: { type: "text", placeholder: "e.g., @gmail.com" },
      },
    ],
  },
  {
    id: "age",
    label: "Age",
    category: "numeric",
    operators: [
      {
        id: "equals",
        label: "is equal to",
        valueInput: { type: "number", min: 0, max: 150 },
      },
      {
        id: "not_equals",
        label: "is not equal to",
        valueInput: { type: "number", min: 0, max: 150 },
      },
      {
        id: "greater_than",
        label: "greater than",
        valueInput: { type: "number", min: 0, max: 150 },
      },
      {
        id: "less_than",
        label: "less than",
        valueInput: { type: "number", min: 0, max: 150 },
      },
      {
        id: "greater_than_or_equal",
        label: "greater than or equal to",
        valueInput: { type: "number", min: 0, max: 150 },
      },
      {
        id: "less_than_or_equal",
        label: "less than or equal to",
        valueInput: { type: "number", min: 0, max: 150 },
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
  {
    id: "tags",
    label: "Tags",
    category: "multi-select",
    operators: [
      {
        id: "is_one_of",
        label: "is one of",
        valueInput: {
          type: "multi-select",
          options: [
            { value: "vip", label: "VIP" },
            { value: "enterprise", label: "Enterprise" },
            { value: "trial", label: "Trial" },
            { value: "churned", label: "Churned" },
            { value: "active", label: "Active" },
          ],
        },
      },
      {
        id: "is_not_one_of",
        label: "is not one of",
        valueInput: {
          type: "multi-select",
          options: [
            { value: "vip", label: "VIP" },
            { value: "enterprise", label: "Enterprise" },
            { value: "trial", label: "Trial" },
            { value: "churned", label: "Churned" },
            { value: "active", label: "Active" },
          ],
        },
      },
    ],
  },
];

export const Default: FilterStoryFn = () => {
  const [filterValue, setFilterValue] = React.useState<FilterValue | undefined>(
    undefined
  );

  return (
    <div style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <Filter
        fields={fieldDefinitions}
        value={filterValue}
        onChange={setFilterValue}
        onDelete={() => {
          console.log("Delete filter");
          setFilterValue(undefined);
        }}
      />

      {filterValue && (
        <div style={{ fontSize: "12px", color: "#666", marginTop: "16px" }}>
          <strong>Current Filter Value:</strong>
          <pre style={{ background: "#f5f5f5", padding: "8px", borderRadius: "4px", marginTop: "8px" }}>
            {JSON.stringify(filterValue, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export const DateFilters: FilterStoryFn = () => {
  const [filterValue, setFilterValue] = React.useState<FilterValue | undefined>(
    undefined
  );

  const dateFieldDefinitions: FilterFieldDefinition[] = [
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
    {
      id: "updated_at",
      label: "Updated at",
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

  return (
    <div style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <h3>Date Filters - Single and Range</h3>
      <p style={{ fontSize: "14px", color: "#666" }}>
        Demonstrates single date picker for "is", "is before", "is after" operators,
        and date range picker for "is between" operator.
      </p>
      <Filter
        fields={dateFieldDefinitions}
        value={filterValue}
        onChange={setFilterValue}
        onDelete={() => {
          console.log("Delete filter");
          setFilterValue(undefined);
        }}
      />

      {filterValue && (
        <div style={{ fontSize: "12px", color: "#666", marginTop: "16px" }}>
          <strong>Current Filter Value:</strong>
          <pre style={{ background: "#f5f5f5", padding: "8px", borderRadius: "4px", marginTop: "8px" }}>
            {JSON.stringify(filterValue, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export const EmptyOperators: FilterStoryFn = () => {
  const [filterValue, setFilterValue] = React.useState<FilterValue | undefined>(
    undefined
  );

  const fieldDefinitionsWithEmpty: FilterFieldDefinition[] = [
    {
      id: "description",
      label: "Description",
      category: "text",
      operators: [
        {
          id: "contains",
          label: "contains",
          valueInput: { type: "text", placeholder: "Enter text" },
        },
        {
          id: "is_empty",
          label: "is empty",
          valueInput: { type: "none" },
        },
        {
          id: "is_not_empty",
          label: "is not empty",
          valueInput: { type: "none" },
        },
      ],
    },
  ];

  return (
    <div style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <h3>Operators with No Value Input</h3>
      <p style={{ fontSize: "14px", color: "#666" }}>
        Demonstrates operators like "is empty" and "is not empty" that don't require a value input.
        The value segment is automatically hidden for these operators.
      </p>
      <Filter
        fields={fieldDefinitionsWithEmpty}
        value={filterValue}
        onChange={setFilterValue}
        onDelete={() => {
          console.log("Delete filter");
          setFilterValue(undefined);
        }}
      />

      {filterValue && (
        <div style={{ fontSize: "12px", color: "#666", marginTop: "16px" }}>
          <strong>Current Filter Value:</strong>
          <pre style={{ background: "#f5f5f5", padding: "8px", borderRadius: "4px", marginTop: "8px" }}>
            {JSON.stringify(filterValue, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export const MultiSelectFilters: FilterStoryFn = () => {
  const [filterValue, setFilterValue] = React.useState<FilterValue | undefined>(
    undefined
  );

  const multiSelectFieldDefinitions: FilterFieldDefinition[] = [
    {
      id: "tags",
      label: "Tags",
      category: "multi-select",
      operators: [
        {
          id: "is_one_of",
          label: "is one of",
          valueInput: {
            type: "multi-select",
            options: [
              { value: "vip", label: "VIP" },
              { value: "enterprise", label: "Enterprise" },
              { value: "trial", label: "Trial" },
              { value: "churned", label: "Churned" },
              { value: "active", label: "Active" },
              { value: "premium", label: "Premium" },
            ],
          },
        },
        {
          id: "is_not_one_of",
          label: "is not one of",
          valueInput: {
            type: "multi-select",
            options: [
              { value: "vip", label: "VIP" },
              { value: "enterprise", label: "Enterprise" },
              { value: "trial", label: "Trial" },
              { value: "churned", label: "Churned" },
              { value: "active", label: "Active" },
              { value: "premium", label: "Premium" },
            ],
          },
        },
      ],
    },
    {
      id: "status",
      label: "Status",
      category: "multi-select",
      operators: [
        {
          id: "is_one_of",
          label: "is one of",
          valueInput: {
            type: "multi-select",
            options: [
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "in_review", label: "In Review" },
            ],
          },
        },
      ],
    },
  ];

  return (
    <div style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <h3>Multi-Select Filters</h3>
      <p style={{ fontSize: "14px", color: "#666" }}>
        Demonstrates multi-select filters with circular checkboxes. Users can select multiple options
        from a list. Great for tags, categories, and status filters.
      </p>
      <Filter
        fields={multiSelectFieldDefinitions}
        value={filterValue}
        onChange={setFilterValue}
        onDelete={() => {
          console.log("Delete filter");
          setFilterValue(undefined);
        }}
      />

      {filterValue && (
        <div style={{ fontSize: "12px", color: "#666", marginTop: "16px" }}>
          <strong>Current Filter Value:</strong>
          <pre style={{ background: "#f5f5f5", padding: "8px", borderRadius: "4px", marginTop: "8px" }}>
            {JSON.stringify(filterValue, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default meta;
