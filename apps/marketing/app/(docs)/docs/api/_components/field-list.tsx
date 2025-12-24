"use client";

import { useState } from "react";
import clsx from "clsx";
import { type OpenAPISchema, resolveRef } from "../_lib/openapi";

interface FieldProps {
  name: string;
  schema: OpenAPISchema;
  required?: boolean;
  level?: number;
}

function getTypeDisplay(schema: OpenAPISchema): string {
  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop() || "object";
    return refName;
  }

  if (schema.oneOf) {
    return schema.oneOf.map((s) => getTypeDisplay(s)).join(" | ");
  }

  if (schema.type === "array" && schema.items) {
    return `${getTypeDisplay(schema.items)}[]`;
  }

  let type = schema.type || "any";

  if (schema.format) {
    type = `${type}<${schema.format}>`;
  }

  if (schema.enum) {
    return schema.enum.map((e) => `"${e}"`).join(" | ");
  }

  return type;
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-kb-bg-inset px-2 py-0.5 text-xs font-medium text-kb-content-secondary">
      {type}
    </span>
  );
}

function Field({ name, schema, required, level = 0 }: FieldProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const resolvedSchema = schema.$ref ? resolveRef(schema.$ref) || schema : schema;

  const hasChildren =
    (resolvedSchema.type === "object" && resolvedSchema.properties) ||
    (resolvedSchema.type === "array" &&
      resolvedSchema.items?.type === "object" &&
      resolvedSchema.items?.properties);

  const childProperties =
    resolvedSchema.type === "object"
      ? resolvedSchema.properties
      : resolvedSchema.items?.properties;

  const childRequired =
    resolvedSchema.type === "object"
      ? resolvedSchema.required
      : resolvedSchema.items?.required;

  return (
    <div
      className={clsx(
        "border-b border-kb-border-tertiary py-4 last:border-0",
        level > 0 && "ml-4 border-l border-kb-border-tertiary pl-4"
      )}
    >
      {/* Field header */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2">
            <code className="font-mono text-sm font-semibold text-kb-accent-primary">
              {name}
            </code>
            <TypeBadge type={getTypeDisplay(resolvedSchema)} />
            {required && (
              <span className="text-[10px] font-medium uppercase text-red-500">
                required
              </span>
            )}
          </div>

          {/* Description */}
          {(resolvedSchema.description || schema.description) && (
            <p className="mt-2 text-sm text-kb-content-secondary">
              {resolvedSchema.description || schema.description}
            </p>
          )}

          {/* Constraints */}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {resolvedSchema.minimum !== undefined && (
              <span className="text-xs text-kb-content-tertiary">
                Min: {resolvedSchema.minimum}
              </span>
            )}
            {resolvedSchema.maximum !== undefined && (
              <span className="text-xs text-kb-content-tertiary">
                Max: {resolvedSchema.maximum}
              </span>
            )}
            {resolvedSchema.minLength !== undefined && (
              <span className="text-xs text-kb-content-tertiary">
                Min length: {resolvedSchema.minLength}
              </span>
            )}
            {resolvedSchema.maxLength !== undefined && (
              <span className="text-xs text-kb-content-tertiary">
                Max length: {resolvedSchema.maxLength}
              </span>
            )}
            {resolvedSchema.minItems !== undefined && (
              <span className="text-xs text-kb-content-tertiary">
                Min items: {resolvedSchema.minItems}
              </span>
            )}
            {resolvedSchema.maxItems !== undefined && (
              <span className="text-xs text-kb-content-tertiary">
                Max items: {resolvedSchema.maxItems}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expandable children */}
      {hasChildren && childProperties && (
        <div className="mt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 rounded-lg border border-kb-border-secondary px-3 py-2 text-sm text-kb-content-secondary hover:bg-kb-bg-inset hover:text-kb-content-primary transition-colors"
          >
            <svg
              className={clsx(
                "h-3 w-3 transition-transform",
                isExpanded && "rotate-90"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>
              {isExpanded ? "Hide" : "Show"}{" "}
              {resolvedSchema.type === "array" ? "item" : "object"} properties
            </span>
          </button>

          {isExpanded && (
            <div className="mt-3 rounded-lg border border-kb-border-secondary">
              {Object.entries(childProperties).map(([propName, propSchema]) => (
                <Field
                  key={propName}
                  name={propName}
                  schema={propSchema as OpenAPISchema}
                  required={childRequired?.includes(propName)}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FieldListProps {
  schema: OpenAPISchema;
  title?: string;
}

export function FieldList({ schema, title }: FieldListProps) {
  const resolvedSchema = schema.$ref ? resolveRef(schema.$ref) || schema : schema;

  if (resolvedSchema.type !== "object" || !resolvedSchema.properties) {
    return (
      <div className="rounded-lg border border-kb-border-secondary bg-kb-bg-inset p-4">
        <code className="text-sm text-kb-content-secondary">
          {getTypeDisplay(resolvedSchema)}
        </code>
        {resolvedSchema.description && (
          <p className="mt-2 text-sm text-kb-content-tertiary">
            {resolvedSchema.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {Object.entries(resolvedSchema.properties).map(([name, propSchema]) => (
        <Field
          key={name}
          name={name}
          schema={propSchema as OpenAPISchema}
          required={resolvedSchema.required?.includes(name)}
        />
      ))}
    </div>
  );
}

interface ParameterFieldProps {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export function ParameterField({
  name,
  type,
  description,
  required,
}: ParameterFieldProps) {
  return (
    <div className="border-b border-kb-border-tertiary py-4 last:border-0">
      <div className="flex items-center flex-wrap gap-2">
        <code className="font-mono text-sm font-semibold text-kb-accent-primary">
          {name}
        </code>
        <TypeBadge type={type} />
        {required && (
          <span className="text-[10px] font-medium uppercase text-red-500">
            required
          </span>
        )}
      </div>
      {description && (
        <p className="mt-2 text-sm text-kb-content-secondary">{description}</p>
      )}
    </div>
  );
}
