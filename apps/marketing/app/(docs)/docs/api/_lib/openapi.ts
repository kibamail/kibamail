import openApiSpec from "../../../../../../../apps/web/public/openapi.v1.json";

export interface OpenAPIOperation {
  method: string;
  path: string;
  summary: string;
  description: string;
  operationId: string;
  tags: string[];
  parameters: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: Array<Record<string, string[]>>;
}

export interface OpenAPIParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
}

export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content: Record<
    string,
    {
      schema?: OpenAPISchema;
      example?: unknown;
    }
  >;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<
    string,
    {
      schema?: OpenAPISchema;
      example?: unknown;
    }
  >;
}

export interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  required?: string[];
  description?: string;
  example?: unknown;
  enum?: string[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  oneOf?: OpenAPISchema[];
  $ref?: string;
}

export interface TagGroup {
  tag: string;
  slug: string;
  description?: string;
  operations: OperationSummary[];
}

export interface OperationSummary {
  method: string;
  path: string;
  summary: string;
  slug: string;
  operationId: string;
}

// Convert tag name to URL-friendly slug
function tagToSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, "-");
}

// Generate operation slug from method and path
function generateOperationSlug(method: string, path: string): string {
  // Remove /v1/ prefix and parameter placeholders
  const cleanPath = path
    .replace(/^\/v1\//, "")
    .replace(/\{[^}]+\}/g, "by-id")
    .replace(/\//g, "-");

  return `${method.toLowerCase()}-${cleanPath}`;
}

// Generate a human-readable operation name
function generateOperationName(
  method: string,
  path: string,
  summary: string
): string {
  if (summary) return summary;

  const methodNames: Record<string, string> = {
    GET: "Get",
    POST: "Create",
    PUT: "Update",
    PATCH: "Update",
    DELETE: "Delete",
  };

  const cleanPath = path.replace(/^\/v1\//, "").replace(/\{[^}]+\}/g, "");
  const resource = cleanPath.split("/")[0];

  return `${methodNames[method] || method} ${resource}`;
}

// Parse the OpenAPI spec and group operations by tag
export function getTagGroups(): TagGroup[] {
  const spec = openApiSpec as {
    paths: Record<string, Record<string, unknown>>;
    tags?: Array<{ name: string; description?: string }>;
  };
  const tagMap = new Map<string, TagGroup>();

  // Initialize tags from spec if available
  if (spec.tags) {
    for (const tag of spec.tags) {
      tagMap.set(tag.name, {
        tag: tag.name,
        slug: tagToSlug(tag.name),
        description: tag.description,
        operations: [],
      });
    }
  }

  // Process all paths and operations
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (
        typeof operation !== "object" ||
        operation === null ||
        !("tags" in operation)
      ) {
        continue;
      }

      const op = operation as {
        tags?: string[];
        summary?: string;
        operationId?: string;
      };
      const tags = op.tags || ["Other"];

      for (const tag of tags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, {
            tag,
            slug: tagToSlug(tag),
            operations: [],
          });
        }

        const group = tagMap.get(tag)!;
        const operationSlug = generateOperationSlug(method, path);

        group.operations.push({
          method: method.toUpperCase(),
          path,
          summary:
            op.summary ||
            generateOperationName(method.toUpperCase(), path, op.summary || ""),
          slug: operationSlug,
          operationId: op.operationId || operationSlug,
        });
      }
    }
  }

  // Sort operations within each group: GET first, then POST, PUT, DELETE
  const methodOrder = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  for (const group of tagMap.values()) {
    group.operations.sort((a, b) => {
      const methodDiff =
        methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method);
      if (methodDiff !== 0) return methodDiff;
      return a.path.localeCompare(b.path);
    });
  }

  // Sort groups alphabetically, but put common ones first
  const priorityTags = ["Contacts", "Topics", "Segments"];
  return Array.from(tagMap.values()).sort((a, b) => {
    const aIndex = priorityTags.indexOf(a.tag);
    const bIndex = priorityTags.indexOf(b.tag);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.tag.localeCompare(b.tag);
  });
}

// Get a specific operation by tag slug and operation slug
export function getOperation(
  tagSlug: string,
  operationSlug: string
): OpenAPIOperation | null {
  const spec = openApiSpec as {
    paths: Record<string, Record<string, unknown>>;
  };

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation !== "object" || operation === null) continue;

      const op = operation as {
        tags?: string[];
        summary?: string;
        description?: string;
        operationId?: string;
        parameters?: OpenAPIParameter[];
        requestBody?: OpenAPIRequestBody;
        responses?: Record<string, OpenAPIResponse>;
        security?: Array<Record<string, string[]>>;
      };

      const tags = op.tags || [];
      const generatedSlug = generateOperationSlug(method, path);

      // Check if this operation matches
      const matchesTag = tags.some((t) => tagToSlug(t) === tagSlug);
      const matchesOperation = generatedSlug === operationSlug;

      if (matchesTag && matchesOperation) {
        return {
          method: method.toUpperCase(),
          path,
          summary: op.summary || "",
          description: op.description || "",
          operationId: op.operationId || "",
          tags,
          parameters: op.parameters || [],
          requestBody: op.requestBody,
          responses: op.responses || {},
          security: op.security,
        };
      }
    }
  }

  return null;
}

// Get tag overview information
export function getTagInfo(tagSlug: string): TagGroup | null {
  const groups = getTagGroups();
  return groups.find((g) => g.slug === tagSlug) || null;
}

// Get all operation slugs for static generation
export function getAllOperationPaths(): Array<{
  tagSlug: string;
  operationSlug: string;
}> {
  const groups = getTagGroups();
  const paths: Array<{ tagSlug: string; operationSlug: string }> = [];

  for (const group of groups) {
    for (const op of group.operations) {
      paths.push({
        tagSlug: group.slug,
        operationSlug: op.slug,
      });
    }
  }

  return paths;
}

// Get all tag slugs for static generation
export function getAllTagSlugs(): string[] {
  return getTagGroups().map((g) => g.slug);
}

// Generate navigation structure for the API reference
export function getApiNavigation(): Array<{
  title: string;
  href: string;
  items?: Array<{ title: string; href: string; method?: string }>;
}> {
  const staticSections = [
    {
      title: "Overview",
      href: "/docs/api",
      items: [
        { title: "Introduction", href: "/docs/api" },
        { title: "Authentication", href: "/docs/api/authentication" },
        { title: "Pagination", href: "/docs/api/pagination" },
        { title: "Errors", href: "/docs/api/errors" },
        { title: "Rate Limits", href: "/docs/api/rate-limits" },
      ],
    },
  ];

  const dynamicSections = getTagGroups().map((group) => ({
    title: group.tag,
    href: `/docs/api/${group.slug}`,
    items: group.operations.map((op) => ({
      title: op.summary,
      href: `/docs/api/${group.slug}/${op.slug}`,
      method: op.method,
    })),
  }));

  return [...staticSections, ...dynamicSections];
}

// Get OpenAPI info (title, version, description)
export function getApiInfo(): {
  title: string;
  version: string;
  description: string;
} {
  const spec = openApiSpec as {
    info: { title: string; version: string; description?: string };
  };
  return {
    title: spec.info.title,
    version: spec.info.version,
    description: spec.info.description || "",
  };
}

// Resolve a $ref to its schema
export function resolveRef(ref: string): OpenAPISchema | null {
  if (!ref.startsWith("#/")) return null;

  const parts = ref.slice(2).split("/");
  let current: unknown = openApiSpec;

  for (const part of parts) {
    if (typeof current !== "object" || current === null) return null;
    current = (current as Record<string, unknown>)[part];
  }

  return current as OpenAPISchema;
}
