import * as React from "react";

// Value input types
export type ValueInputType =
  | { type: "text"; placeholder?: string; multiline?: boolean }
  | { type: "number"; min?: number; max?: number; step?: number }
  | { type: "date"; mode: "single" }
  | { type: "date"; mode: "range" }
  | {
      type: "select";
      options: Array<{ value: string; label: string }>;
      searchable?: boolean;
    }
  | {
      type: "multi-select";
      options: Array<{ value: string; label: string }>;
      max?: number;
    }
  | { type: "boolean" }
  | { type: "none" };

// Value data types
export type FilterValueData =
  | { type: "text"; value: string }
  | { type: "number"; value: number }
  | { type: "date-single"; value: Date }
  | { type: "date-range"; start: Date; end: Date }
  | { type: "select"; value: string; label?: string }
  | { type: "multi-select"; values: string[] }
  | { type: "boolean"; value: boolean }
  | { type: "none" };

export interface CustomRenderProps {
  field: FilterFieldDefinition;
  operator: FilterOperator;
  value: FilterValueData | undefined;
  onChange: (value: FilterValueData) => void;
  onClose: () => void;
}

export interface FilterOperator {
  id: string;
  label: string;
  valueInput: ValueInputType;
  validate?: (value: FilterValueData) => { valid: boolean; error?: string };
  render?: (props: CustomRenderProps) => React.ReactNode;
}

export interface FilterFieldDefinition {
  id: string;
  label: string;
  category?: string; // For UI grouping: "text", "numeric", "date", "status", etc.
  operators: FilterOperator[];
  defaultOperator?: string; // operator id to use by default
}

export interface FilterValue {
  fieldId: string;
  operatorId: string;
  value: FilterValueData;
}
