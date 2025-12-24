import { type OpenAPIOperation, resolveRef } from "../_lib/openapi";
import { MethodBadge } from "./method-badge";
import { FieldList, ParameterField } from "./field-list";
import { Markdown } from "./markdown";
import { CodePanel } from "./code-panel";
import { DocsPagination } from "../../_components/pagination";

interface EndpointPageProps {
  operation: OpenAPIOperation;
  tagName: string;
}

function ParametersSection({
  parameters,
  title,
}: {
  parameters: OpenAPIOperation["parameters"];
  title: string;
}) {
  if (!parameters || parameters.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-kb-content-primary">{title}</h2>
      <div className="mt-4">
        {parameters.map((param) => (
          <ParameterField
            key={param.name}
            name={param.name}
            type={param.schema?.type || "string"}
            description={param.description}
            required={param.required}
          />
        ))}
      </div>
    </section>
  );
}

function RequestBodySection({
  requestBody,
}: {
  requestBody?: OpenAPIOperation["requestBody"];
}) {
  if (!requestBody) return null;

  const jsonContent = requestBody.content?.["application/json"];
  if (!jsonContent?.schema) return null;

  const schema = jsonContent.schema.$ref
    ? resolveRef(jsonContent.schema.$ref) || jsonContent.schema
    : jsonContent.schema;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-kb-content-primary">
        Body
        {requestBody.required && (
          <span className="ml-2 text-sm font-normal text-red-500">required</span>
        )}
      </h2>
      {requestBody.description && (
        <p className="mt-2 text-sm text-kb-content-secondary">
          {requestBody.description}
        </p>
      )}
      <div className="mt-4">
        <FieldList schema={schema} />
      </div>
    </section>
  );
}

function ResponsesSection({
  responses,
}: {
  responses: OpenAPIOperation["responses"];
}) {
  if (!responses || Object.keys(responses).length === 0) return null;

  // Only show the success response (2xx) in the main content
  const successResponses = Object.entries(responses).filter(([code]) =>
    code.startsWith("2")
  );

  if (successResponses.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-kb-content-primary">Response</h2>
      <div className="mt-4">
        {successResponses.map(([statusCode, response]) => {
          const jsonContent = response.content?.["application/json"];
          const schema = jsonContent?.schema?.$ref
            ? resolveRef(jsonContent.schema.$ref) || jsonContent.schema
            : jsonContent?.schema;

          return (
            <div key={statusCode}>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                  {statusCode}
                </span>
                <span className="text-sm text-kb-content-secondary">
                  {response.description}
                </span>
              </div>
              {schema && <FieldList schema={schema} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function EndpointPage({ operation, tagName }: EndpointPageProps) {
  const pathParams = operation.parameters?.filter((p) => p.in === "path") || [];
  const queryParams = operation.parameters?.filter((p) => p.in === "query") || [];
  const headerParams =
    operation.parameters?.filter((p) => p.in === "header") || [];

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 pt-10 pb-24 xl:grid-cols-[minmax(0,1fr)_420px] xl:px-8">
      <article>
        {/* Category label */}
        <p className="mb-2 font-mono text-xs/6 font-medium tracking-widest text-kb-content-tertiary uppercase">
          {tagName}
        </p>

        {/* Title with method badge */}
        <div className="flex items-center gap-3">
          <MethodBadge method={operation.method} size="lg" />
          <h1 className="text-2xl font-bold tracking-tight text-kb-content-primary sm:text-3xl">
            {operation.summary}
          </h1>
        </div>

        {/* Endpoint path */}
        <div className="mt-4 rounded-lg border border-kb-border-secondary bg-kb-bg-inset px-4 py-3">
          <code className="font-mono text-sm">
            <span className="font-semibold text-kb-content-secondary">
              {operation.method}
            </span>{" "}
            <span className="text-kb-content-primary">{operation.path}</span>
          </code>
        </div>

        {/* Description */}
        {operation.description && (
          <Markdown content={operation.description} className="mt-6" />
        )}

        {/* Parameters sections */}
        <ParametersSection parameters={pathParams} title="Path parameters" />
        <ParametersSection parameters={queryParams} title="Query parameters" />
        <ParametersSection parameters={headerParams} title="Header parameters" />

        {/* Request body */}
        <RequestBodySection requestBody={operation.requestBody} />

        {/* Responses */}
        <ResponsesSection responses={operation.responses} />

        {/* Pagination */}
        <DocsPagination slug="" />
      </article>

      {/* Right panel - Code examples */}
      <aside className="hidden xl:block">
        <div className="sticky top-20">
          <CodePanel operation={operation} />
        </div>
      </aside>
    </div>
  );
}
