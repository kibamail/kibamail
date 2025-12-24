"use client";

import { useState } from "react";
import clsx from "clsx";
import { type OpenAPIOperation, type OpenAPISchema, resolveRef } from "../_lib/openapi";

interface CodePanelProps {
  operation: OpenAPIOperation;
}

type SDK = "curl" | "nodejs" | "python" | "php" | "go" | "ruby";

const sdkLabels: Record<SDK, string> = {
  curl: "cURL",
  nodejs: "Node.js",
  python: "Python",
  php: "PHP",
  go: "Go",
  ruby: "Ruby",
};

const sdkOrder: SDK[] = ["curl", "nodejs", "python", "php", "go", "ruby"];

function generateExampleValue(schema: OpenAPISchema): unknown {
  if (schema.example !== undefined) return schema.example;
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref);
    if (resolved) return generateExampleValue(resolved);
  }
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];

  switch (schema.type) {
    case "string":
      if (schema.format === "email") return "user@example.com";
      if (schema.format === "date-time") return new Date().toISOString();
      if (schema.format === "uri") return "https://example.com";
      return "string";
    case "integer":
    case "number":
      return schema.minimum ?? 1;
    case "boolean":
      return true;
    case "array":
      if (schema.items) {
        return [generateExampleValue(schema.items)];
      }
      return [];
    case "object":
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateExampleValue(propSchema);
        }
        return obj;
      }
      return {};
    default:
      return null;
  }
}

function generateRequestBody(operation: OpenAPIOperation): Record<string, unknown> | null {
  const jsonContent = operation.requestBody?.content?.["application/json"];
  if (!jsonContent?.schema) return null;

  const schema = jsonContent.schema.$ref
    ? resolveRef(jsonContent.schema.$ref) || jsonContent.schema
    : jsonContent.schema;

  return generateExampleValue(schema) as Record<string, unknown>;
}

function generateCurlExample(operation: OpenAPIOperation): string {
  const body = generateRequestBody(operation);
  const hasBody = body && Object.keys(body).length > 0;

  let curl = `curl -X ${operation.method} "https://api.kibamail.com${operation.path}"`;
  curl += ` \\\n  -H "Authorization: Bearer kb_your_api_key"`;
  curl += ` \\\n  -H "Content-Type: application/json"`;

  if (hasBody) {
    curl += ` \\\n  -d '${JSON.stringify(body, null, 2).split('\n').join('\n  ')}'`;
  }

  return curl;
}

function generateNodejsExample(operation: OpenAPIOperation): string {
  const body = generateRequestBody(operation);
  const hasBody = body && Object.keys(body).length > 0;
  const methodLower = operation.method.toLowerCase();

  let code = `import Kibamail from 'kibamail';\n\n`;
  code += `const kibamail = new Kibamail('kb_your_api_key');\n\n`;

  // Extract resource and action from path
  const pathParts = operation.path.replace('/v1/', '').split('/');
  const resource = pathParts[0].replace(/-/g, '');

  if (hasBody) {
    code += `const response = await kibamail.${resource}.${getActionName(operation)}(${JSON.stringify(body, null, 2)});`;
  } else {
    code += `const response = await kibamail.${resource}.${getActionName(operation)}();`;
  }

  return code;
}

function generatePythonExample(operation: OpenAPIOperation): string {
  const body = generateRequestBody(operation);
  const hasBody = body && Object.keys(body).length > 0;

  let code = `from kibamail import Kibamail\n\n`;
  code += `kibamail = Kibamail("kb_your_api_key")\n\n`;

  const pathParts = operation.path.replace('/v1/', '').split('/');
  const resource = pathParts[0].replace(/-/g, '_');

  if (hasBody) {
    const bodyStr = JSON.stringify(body, null, 2)
      .replace(/"/g, '"')
      .replace(/true/g, 'True')
      .replace(/false/g, 'False')
      .replace(/null/g, 'None');
    code += `response = kibamail.${resource}.${getActionName(operation)}(${bodyStr})`;
  } else {
    code += `response = kibamail.${resource}.${getActionName(operation)}()`;
  }

  return code;
}

function generatePhpExample(operation: OpenAPIOperation): string {
  const body = generateRequestBody(operation);
  const hasBody = body && Object.keys(body).length > 0;

  let code = `<?php\n\n`;
  code += `use Kibamail\\Kibamail;\n\n`;
  code += `$kibamail = new Kibamail('kb_your_api_key');\n\n`;

  const pathParts = operation.path.replace('/v1/', '').split('/');
  const resource = pathParts[0].replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  if (hasBody) {
    const bodyStr = JSON.stringify(body, null, 2)
      .replace(/"/g, "'")
      .replace(/: /g, " => ")
      .replace(/\{/g, "[")
      .replace(/\}/g, "]");
    code += `$response = $kibamail->${resource}->${getActionName(operation)}(${bodyStr});`;
  } else {
    code += `$response = $kibamail->${resource}->${getActionName(operation)}();`;
  }

  return code;
}

function generateGoExample(operation: OpenAPIOperation): string {
  const body = generateRequestBody(operation);
  const hasBody = body && Object.keys(body).length > 0;

  let code = `package main\n\n`;
  code += `import (\n    "github.com/kibamail/kibamail-go"\n)\n\n`;
  code += `func main() {\n`;
  code += `    client := kibamail.New("kb_your_api_key")\n\n`;

  const pathParts = operation.path.replace('/v1/', '').split('/');
  const resource = capitalize(pathParts[0].replace(/-/g, ''));

  if (hasBody) {
    code += `    response, err := client.${resource}.${capitalize(getActionName(operation))}(kibamail.${capitalize(getActionName(operation))}Params${JSON.stringify(body, null, 2).replace(/"/g, '').replace(/:/g, ':').split('\n').join('\n    ')})\n`;
  } else {
    code += `    response, err := client.${resource}.${capitalize(getActionName(operation))}()\n`;
  }
  code += `}`;

  return code;
}

function generateRubyExample(operation: OpenAPIOperation): string {
  const body = generateRequestBody(operation);
  const hasBody = body && Object.keys(body).length > 0;

  let code = `require 'kibamail'\n\n`;
  code += `kibamail = Kibamail::Client.new('kb_your_api_key')\n\n`;

  const pathParts = operation.path.replace('/v1/', '').split('/');
  const resource = pathParts[0].replace(/-/g, '_');

  if (hasBody) {
    const bodyStr = JSON.stringify(body, null, 2)
      .replace(/"/g, "'")
      .replace(/:/g, " =>")
      .replace(/true/g, 'true')
      .replace(/false/g, 'false')
      .replace(/null/g, 'nil');
    code += `response = kibamail.${resource}.${getActionName(operation)}(${bodyStr})`;
  } else {
    code += `response = kibamail.${resource}.${getActionName(operation)}`;
  }

  return code;
}

function getActionName(operation: OpenAPIOperation): string {
  const method = operation.method.toLowerCase();
  const pathParts = operation.path.replace('/v1/', '').split('/');

  if (method === 'get' && !pathParts.includes('{')) {
    return 'list';
  }
  if (method === 'get') {
    return 'get';
  }
  if (method === 'post' && operation.path.includes('/search')) {
    return 'search';
  }
  if (method === 'post') {
    return 'create';
  }
  if (method === 'put' || method === 'patch') {
    return 'update';
  }
  if (method === 'delete') {
    return 'delete';
  }
  return method;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateSdkExample(sdk: SDK, operation: OpenAPIOperation): string {
  switch (sdk) {
    case "curl":
      return generateCurlExample(operation);
    case "nodejs":
      return generateNodejsExample(operation);
    case "python":
      return generatePythonExample(operation);
    case "php":
      return generatePhpExample(operation);
    case "go":
      return generateGoExample(operation);
    case "ruby":
      return generateRubyExample(operation);
  }
}

function generateResponseExample(schema: OpenAPISchema): string {
  const example = generateExampleValue(schema);
  return JSON.stringify(example, null, 2);
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <pre className="max-h-[212px] overflow-auto rounded-lg bg-zinc-950 p-4">
      <code className="text-zinc-100 font-mono text-[12px] leading-relaxed whitespace-pre">
        {code}
      </code>
    </pre>
  );
}

function TabButton({
  active,
  onClick,
  children,
  variant = "default",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "status";
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-3 py-1.5 text-xs font-medium transition-colors rounded-md",
        active
          ? "bg-zinc-800 text-white"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status.startsWith("2")
    ? "text-emerald-400"
    : status.startsWith("4")
      ? "text-amber-400"
      : "text-red-400";

  return <span className={clsx("font-mono", color)}>{status}</span>;
}

export function CodePanel({ operation }: CodePanelProps) {
  const [activeSDK, setActiveSDK] = useState<SDK>("curl");
  const [activeResponse, setActiveResponse] = useState<string>(
    Object.keys(operation.responses || {})[0] || "200"
  );

  const responseCodes = Object.keys(operation.responses || {});

  return (
    <div className="flex flex-col gap-6">
      {/* Request Example */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Request</h3>
        </div>
        <div className="flex gap-1 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto">
          {sdkOrder.map((sdk) => (
            <TabButton
              key={sdk}
              active={activeSDK === sdk}
              onClick={() => setActiveSDK(sdk)}
            >
              {sdkLabels[sdk]}
            </TabButton>
          ))}
        </div>
        <div className="p-2">
          <CodeBlock
            code={generateSdkExample(activeSDK, operation)}
            language={activeSDK}
          />
        </div>
      </div>

      {/* Response Example */}
      {responseCodes.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Response</h3>
          </div>
          <div className="flex gap-1 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto">
            {responseCodes.map((code) => (
              <TabButton
                key={code}
                active={activeResponse === code}
                onClick={() => setActiveResponse(code)}
                variant="status"
              >
                <StatusBadge status={code} />
              </TabButton>
            ))}
          </div>
          <div className="p-2">
            {operation.responses[activeResponse] && (
              <>
                <p className="px-2 pb-2 text-xs text-zinc-400">
                  {operation.responses[activeResponse].description}
                </p>
                {operation.responses[activeResponse].content?.["application/json"]?.schema && (
                  <CodeBlock
                    code={generateResponseExample(
                      operation.responses[activeResponse].content!["application/json"]!.schema!.$ref
                        ? resolveRef(operation.responses[activeResponse].content!["application/json"]!.schema!.$ref!) || operation.responses[activeResponse].content!["application/json"]!.schema!
                        : operation.responses[activeResponse].content!["application/json"]!.schema!
                    )}
                    language="json"
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
