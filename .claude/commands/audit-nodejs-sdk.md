# Node.js SDK Audit Agent

You are a Principal Engineer responsible for the Kibamail Node.js SDK. Your sole task is to perform a comprehensive audit comparing the SDK implementation against the OpenAPI specification.

## CRITICAL: Audit ID Requirement

**You MUST receive an audit ID before proceeding.**

This command expects an audit ID to be provided as an argument: `/audit-nodejs-sdk <audit-id>`

If no audit ID is provided:
1. STOP immediately
2. Inform the user: "Audit ID is required. Please run: `/audit-nodejs-sdk <unique-audit-id>`"
3. Do NOT proceed with any analysis

The audit ID will be used to uniquely identify this audit run in the report filename.

## Your Mission

Analyze every method exposed in the Node.js SDK and compare it against the OpenAPI spec to identify inconsistencies, missing endpoints, incorrect types, and other discrepancies.

---

## Step-by-Step Process

### Step 1: Validate Audit ID

Extract the audit ID from the command arguments. If missing or empty, halt and request one.

### Step 2: Load the OpenAPI Specification

Read the OpenAPI spec from:
```
apps/web/public/openapi.v1.json
```

Parse and extract:
- All available endpoints (paths) with their HTTP methods
- Request body schemas for each operation
- Response schemas (success and error)
- Required vs optional parameters
- Path parameters and query parameters
- Authentication requirements
- All schema definitions in `components/schemas`

**Build a complete map of:**
```
{
  "operationId": {
    "path": "/api/...",
    "method": "GET|POST|PUT|DELETE",
    "requestSchema": {...},
    "responseSchema": {...},
    "pathParams": [...],
    "queryParams": [...],
    "requiredFields": [...],
    "optionalFields": [...]
  }
}
```

### Step 3: Discover and Analyze the Node.js SDK

**IMPORTANT: Do NOT assume a fixed file structure. The SDK may have changed.**

#### 3.1 Discovery Phase

1. **Read `package.json`** to understand:
   - Package name and version
   - Entry points (main, module, types)
   - Dependencies (especially `openapi-fetch`, `openapi-typescript`)
   - Build configuration

2. **List all TypeScript files** in `sdks/nodejs/`:
   - Root `.ts` files
   - Files in subdirectories (e.g., `resources/`, `lib/`, `src/`)
   - Exclude `*.test.ts`, `*.spec.ts`, `node_modules/`, `dist/`

3. **Identify key file types**:
   - Main SDK entry class (exports the main API)
   - HTTP client configuration
   - Resource/service classes
   - Type definition files (`.d.ts`)
   - Schema files (generated from OpenAPI)

#### 3.2 Analysis Phase

For EACH TypeScript file discovered:

1. **Parse imports and exports**
2. **Extract all exported classes**:
   - Class name
   - Constructor parameters
   - All public methods
   - Method signatures (parameters and return types)
3. **Extract all exported interfaces and types**
4. **Extract all exported functions**
5. **For each class method that makes HTTP calls**:
   - HTTP method used (GET, POST, PUT, DELETE)
   - API endpoint path
   - Request body type
   - Response type
   - Query parameters
   - Path parameters

#### 3.3 Pattern Recognition

Look for these common Node.js/TypeScript SDK patterns:
- Class-based resource organization (e.g., `Contacts`, `Topics`)
- Method patterns: `create()`, `list()`, `get()`, `update()`, `delete()`, `search()`
- HTTP client wrapper (e.g., `openapi-fetch` client)
- Generated types from OpenAPI schema
- JSDoc documentation with `@param`, `@returns`, `@throws`, `@example`
- Async/await patterns returning Promises
- Error handling with custom error types

#### 3.4 Schema Analysis

If a schema file exists (e.g., `schema.d.ts`):
1. Parse all type definitions
2. Map them to OpenAPI schemas
3. Check for sync status with current OpenAPI spec
4. Note any missing or outdated types

#### 3.5 Resource Enumeration

Build a complete inventory of:
- All resource classes discovered (not just expected ones)
- All methods per resource with full signatures
- All TypeScript types used for requests/responses
- All HTTP endpoints called
- All JSDoc documentation

### Step 4: Perform Comprehensive Comparison

For EACH SDK method discovered, verify:

1. **Endpoint Existence**
   - Does the endpoint exist in OpenAPI spec?
   - Is the operation ID referenced correctly?

2. **HTTP Method Correctness**
   - GET for retrieval operations
   - POST for creation and search
   - PUT/PATCH for updates
   - DELETE for removal

3. **Path Accuracy**
   - Correct base path
   - Path parameters properly interpolated
   - Template literals used correctly

4. **Request Body Schema**
   - TypeScript type matches OpenAPI request schema
   - All required fields marked as required (not optional `?`)
   - Optional fields correctly typed with `?`
   - Field types match:
     - `string` -> `string`
     - `integer`/`number` -> `number`
     - `boolean` -> `boolean`
     - `array` -> `Type[]`
     - `object` -> interface/type
   - No extra fields not in spec
   - No missing fields from spec

5. **Response Schema**
   - Return type matches OpenAPI response
   - All response fields typed correctly
   - Nested objects properly typed
   - Arrays correctly typed
   - Promise wrapper correct

6. **Query Parameters**
   - Pagination: `limit`, `after`, `before` typed correctly
   - Filtering parameters present
   - Correct parameter names and types

7. **Error Handling**
   - Error types match OpenAPI error schemas
   - Proper error throwing
   - Error type exports

8. **Type Definitions**
   - Generated schema matches current OpenAPI spec
   - All types properly exported
   - No stale types

9. **JSDoc Accuracy**
   - Method descriptions match OpenAPI descriptions
   - Parameter descriptions accurate
   - Return type descriptions accurate
   - Examples are valid and current

10. **New Resources Check**
    - Are there OpenAPI endpoints with NO corresponding SDK method?
    - Are there SDK methods with NO corresponding OpenAPI endpoint?

### Step 5: Generate the Audit Report

**Report Location:**
```
.audits/nodejs-sdk/<timestamp>-<audit-id>.json
```

Where:
- `<timestamp>` is ISO-8601 format: `YYYY-MM-DDTHH-MM-SS`
- `<audit-id>` is the provided audit ID

**Create the directory if it doesn't exist.**

---

## Report Format

```json
{
  "auditMetadata": {
    "auditId": "<provided-audit-id>",
    "sdkName": "kibamail-nodejs",
    "sdkLanguage": "typescript",
    "sdkVersion": "<from package.json>",
    "nodeVersion": "<from package.json engines if specified>",
    "openApiVersion": "<from spec>",
    "openApiTitle": "<from spec info.title>",
    "auditTimestamp": "ISO-8601 timestamp",
    "reportPath": ".audits/nodejs-sdk/<timestamp>-<audit-id>.json",
    "sdkDirectory": "sdks/nodejs",
    "openApiPath": "apps/web/public/openapi.v1.json"
  },
  "coverage": {
    "totalEndpointsInSpec": 0,
    "totalMethodsInSdk": 0,
    "endpointsCovered": 0,
    "endpointsMissing": 0,
    "coveragePercentage": 0.0,
    "extraSdkMethods": 0
  },
  "sdkStructure": {
    "filesAnalyzed": ["file1.ts", "file2.ts"],
    "entryPoint": "index.ts",
    "mainClass": "Kibamail",
    "resourcesDiscovered": [
      {
        "name": "contacts",
        "className": "Contacts",
        "file": "resources/contacts.ts",
        "methods": [
          {
            "name": "create",
            "async": true,
            "parameters": ["params: CreateContactParams"],
            "returnType": "Promise<Contact>"
          }
        ]
      }
    ],
    "typesDiscovered": ["Contact", "Topic", "Segment"],
    "schemaFile": "schema.d.ts",
    "schemaInSync": true,
    "totalClasses": 0,
    "totalMethods": 0,
    "totalTypes": 0
  },
  "summary": {
    "totalIssues": 0,
    "critical": 0,
    "major": 0,
    "minor": 0,
    "suggestions": 0,
    "passedChecks": 0
  },
  "missingEndpoints": [
    {
      "path": "/api/endpoint",
      "method": "POST",
      "operationId": "operationName",
      "description": "What this endpoint does",
      "specLocation": "Line number or path in spec",
      "recommendation": "Add method X to resource Y",
      "suggestedCode": "async methodName(params: Params): Promise<Response> {...}"
    }
  ],
  "extraSdkMethods": [
    {
      "resource": "resource name",
      "method": "methodName",
      "file": "filename.ts",
      "line": 0,
      "assessment": "Helper method (acceptable) | Deprecated endpoint | Unknown"
    }
  ],
  "inconsistencies": [
    {
      "id": "INC-001",
      "severity": "critical|major|minor",
      "category": "endpoint|request_schema|response_schema|http_method|path|type_mismatch|missing_field|extra_field|async|promise|naming",
      "resource": "resource name",
      "sdkMethod": "methodName",
      "sdkFile": "filename.ts",
      "sdkLine": 0,
      "openApiPath": "/api/path",
      "openApiOperation": "operationId",
      "issue": "Clear description of the inconsistency",
      "expected": "What the OpenAPI spec defines",
      "actual": "What the SDK implements",
      "impact": "What could go wrong if not fixed",
      "recommendation": "Specific fix recommendation",
      "codeExample": "// Example fix\nasync methodName(params: CorrectParams): Promise<CorrectResponse> {...}"
    }
  ],
  "typeDiscrepancies": [
    {
      "id": "TYPE-001",
      "severity": "major|minor",
      "resource": "resource name",
      "field": "fieldName",
      "sdkType": "TypeScript type in SDK",
      "openApiType": "OpenAPI type",
      "openApiFormat": "format if specified",
      "schemaType": "Type in schema.d.ts if different",
      "location": "request|response",
      "file": "filename.ts",
      "line": 0,
      "recommendation": "How to fix",
      "codeExample": "fieldName: correctType"
    }
  ],
  "schemaIssues": [
    {
      "id": "SCHEMA-001",
      "severity": "major|minor",
      "schemaFile": "schema.d.ts",
      "issue": "Description of schema issue",
      "openApiDefinition": "What OpenAPI defines",
      "schemaDefinition": "What schema.d.ts has",
      "affectedTypes": ["Type1", "Type2"],
      "recommendation": "Regenerate schema or manual fix",
      "regenerateCommand": "npx openapi-typescript ... if applicable"
    }
  ],
  "jsdocIssues": [
    {
      "id": "DOC-001",
      "severity": "minor",
      "file": "filename.ts",
      "method": "methodName",
      "line": 0,
      "issue": "Inaccurate or missing documentation",
      "currentDoc": "Current JSDoc if any",
      "expectedDoc": "What it should say based on OpenAPI",
      "recommendation": "Updated documentation"
    }
  ],
  "schemaCompleteness": [
    {
      "schemaName": "ContactCreateRequest",
      "sdkType": "CreateContactParams",
      "file": "resources/contacts.ts",
      "missingFields": [
        {
          "field": "fieldName",
          "type": "string",
          "required": true
        }
      ],
      "extraFields": [
        {
          "field": "extraField",
          "type": "string"
        }
      ],
      "fieldMappingIssues": [
        {
          "specField": "spec_field_name",
          "sdkField": "sdkFieldName",
          "issue": "Property name mismatch"
        }
      ]
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "consistency|completeness|type_safety|documentation|architecture|new_feature|schema_regeneration",
      "title": "Short title",
      "description": "Detailed recommendation",
      "rationale": "Why this matters",
      "affectedFiles": ["file1.ts", "file2.ts"],
      "estimatedEffort": "small|medium|large",
      "suggestedImplementation": "Optional code or approach"
    }
  ],
  "newEndpointsInSpec": [
    {
      "path": "/api/new/endpoint",
      "method": "POST",
      "operationId": "newOperation",
      "addedInSpecVersion": "if detectable",
      "recommendation": "Implement in next SDK release"
    }
  ]
}
```

---

## Severity Definitions

| Severity | Definition | Examples |
|----------|------------|----------|
| **critical** | Breaking issues causing runtime failures or type unsafety | Wrong HTTP method, missing required fields, incorrect types, broken Promise chains |
| **major** | Significant issues affecting functionality or developer experience | Type mismatches, schema out of sync, missing response fields, incorrect JSDoc |
| **minor** | Issues that don't break functionality but reduce quality | Naming inconsistencies, missing optional fields, incomplete docs |
| **suggestion** | Improvements that would enhance the SDK | Better error messages, stricter types, additional utility methods |

---

## Dynamic Discovery Guidelines

Since the SDK structure may change over time:

1. **Never hardcode file names** - Always discover files dynamically by scanning directories
2. **Never hardcode resource names** - Discover from class exports and patterns
3. **Look for patterns, not specific names**:
   - Classes with HTTP client methods (`GET`, `POST`, `PUT`, `DELETE`)
   - Async methods returning Promises
   - Classes instantiated in main SDK class
   - Exported types/interfaces
4. **Handle new resources gracefully** - If a new resource class is added, analyze it fully
5. **Handle removed resources** - Note if expected resources are missing
6. **Check for structural changes**:
   - Different directory organization (e.g., `src/` vs `resources/` vs `lib/`)
   - Monorepo structure changes
   - Build output changes
7. **Detect schema generation approach**:
   - Check for `openapi-typescript` usage
   - Check for manual type definitions
   - Check for other codegen tools

---

## Special Node.js/TypeScript Considerations

1. **openapi-fetch Integration**: If used, verify the client is properly typed and methods align with spec
2. **Generated Types**: Check if types need regeneration when spec changes
3. **Async/Await**: All API methods should be async and return properly typed Promises
4. **Error Types**: Verify error classes match OpenAPI error schemas
5. **ESM/CJS Compatibility**: Note if there are module format issues
6. **TypeScript Strictness**: Check if strict mode issues affect type accuracy

---

## Output Requirements

1. **Create the audit directory** if it doesn't exist: `.audits/nodejs-sdk/`
2. **Write the JSON report** to `.audits/nodejs-sdk/<timestamp>-<audit-id>.json`
3. **Provide a summary** to the user including:
   - Total issues found by severity
   - Coverage percentage
   - Schema sync status
   - Top 3 critical issues (if any)
   - Top 3 recommendations
   - Report file location
