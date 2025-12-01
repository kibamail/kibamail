# Go SDK Audit Agent

You are a Principal Engineer responsible for the Kibamail Go SDK. Your sole task is to perform a comprehensive audit comparing the SDK implementation against the OpenAPI specification.

## CRITICAL: Audit ID Requirement

**You MUST receive an audit ID before proceeding.**

This command expects an audit ID to be provided as an argument: `/audit-go-sdk <audit-id>`

If no audit ID is provided:
1. STOP immediately
2. Inform the user: "Audit ID is required. Please run: `/audit-go-sdk <unique-audit-id>`"
3. Do NOT proceed with any analysis

The audit ID will be used to uniquely identify this audit run in the report filename.

## Your Mission

Analyze every method exposed in the Go SDK and compare it against the OpenAPI spec to identify inconsistencies, missing endpoints, incorrect types, and other discrepancies.

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

### Step 3: Discover and Analyze the Go SDK

**IMPORTANT: Do NOT assume a fixed file structure. The SDK may have changed.**

#### 3.1 Discovery Phase

1. **List all `.go` files** in `sdks/go/` directory (excluding `*_test.go` files and `vendor/`)
2. **Read `go.mod`** to understand module name and dependencies
3. **Identify the main client file** - look for the primary `Client` struct definition
4. **Identify resource files** - look for files containing service interfaces and implementations

#### 3.2 Analysis Phase

For EACH `.go` file discovered:

1. **Parse package and imports**
2. **Extract all exported types** (structs, interfaces)
3. **Extract all exported functions and methods**
4. **For each struct, extract**:
   - Field names and types
   - JSON tags (for API field mapping)
   - Required vs optional (pointer types)
5. **For each method that makes HTTP calls, extract**:
   - HTTP method used
   - API endpoint path
   - Request parameters struct
   - Response struct
   - Error handling

#### 3.3 Pattern Recognition

Look for these common Go SDK patterns:
- Service interfaces (e.g., `ContactsSvc`, `TopicsSvc`)
- Service implementations (e.g., `ContactsSvcImpl`)
- Both sync and context variants (e.g., `Create()` and `CreateWithContext()`)
- Request/Response structs with JSON tags
- `NewRequest()` and `Perform()` patterns for HTTP operations
- Error types and handling

#### 3.4 Resource Enumeration

Build a complete inventory of:
- All resources/services discovered (not just expected ones)
- All methods per resource
- All request/response types
- All HTTP endpoints called

### Step 4: Perform Comprehensive Comparison

For EACH SDK method discovered, verify:

1. **Endpoint Existence**
   - Does the endpoint exist in OpenAPI spec?
   - Is the operation ID correct?

2. **HTTP Method Correctness**
   - GET for retrieval operations
   - POST for creation and search
   - PUT/PATCH for updates
   - DELETE for removal

3. **Path Accuracy**
   - Correct base path
   - Path parameters properly interpolated
   - No hardcoded IDs or typos

4. **Request Body Schema**
   - All required fields present in request struct
   - Field types match OpenAPI types:
     - `string` -> `string`
     - `integer` -> `int`, `int64`
     - `boolean` -> `bool`
     - `array` -> `[]Type`
     - `object` -> nested struct or `map[string]interface{}`
   - JSON tags match OpenAPI field names
   - Optional fields use pointer types or omitempty
   - No extra fields not in spec
   - No missing fields from spec

5. **Response Schema**
   - Response struct matches OpenAPI response
   - All response fields are mapped
   - Nested objects properly defined
   - Arrays correctly typed

6. **Query Parameters**
   - Pagination: `limit`, `after`, `before`
   - Filtering parameters
   - Correct parameter names and types

7. **Error Handling**
   - Error responses match OpenAPI error schemas
   - HTTP status codes properly handled
   - Error messages accessible

8. **New Resources Check**
   - Are there OpenAPI endpoints with NO corresponding SDK method?
   - Are there SDK methods with NO corresponding OpenAPI endpoint?

### Step 5: Generate the Audit Report

**Report Location:**
```
.audits/go-sdk/<timestamp>-<audit-id>.json
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
    "sdkName": "kibamail-go",
    "sdkLanguage": "go",
    "sdkVersion": "<from go.mod or version file>",
    "openApiVersion": "<from spec>",
    "openApiTitle": "<from spec info.title>",
    "auditTimestamp": "ISO-8601 timestamp",
    "reportPath": ".audits/go-sdk/<timestamp>-<audit-id>.json",
    "sdkDirectory": "sdks/go",
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
    "filesAnalyzed": ["file1.go", "file2.go"],
    "resourcesDiscovered": [
      {
        "name": "contacts",
        "file": "contacts.go",
        "interface": "ContactsSvc",
        "implementation": "ContactsSvcImpl",
        "methods": ["Create", "List", "Get", "Update", "Delete"]
      }
    ],
    "totalStructs": 0,
    "totalMethods": 0
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
      "suggestedCode": "func (s *ServiceImpl) MethodName(...) {...}"
    }
  ],
  "extraSdkMethods": [
    {
      "resource": "resource name",
      "method": "methodName",
      "file": "filename.go",
      "line": 0,
      "assessment": "Helper method (acceptable) | Deprecated endpoint | Unknown"
    }
  ],
  "inconsistencies": [
    {
      "id": "INC-001",
      "severity": "critical|major|minor",
      "category": "endpoint|request_schema|response_schema|http_method|path|type_mismatch|missing_field|extra_field|json_tag|naming",
      "resource": "resource name",
      "sdkMethod": "methodName",
      "sdkFile": "filename.go",
      "sdkLine": 0,
      "openApiPath": "/api/path",
      "openApiOperation": "operationId",
      "issue": "Clear description of the inconsistency",
      "expected": "What the OpenAPI spec defines",
      "actual": "What the SDK implements",
      "impact": "What could go wrong if not fixed",
      "recommendation": "Specific fix recommendation",
      "codeExample": "// Example fix\ntype CorrectStruct struct {...}"
    }
  ],
  "typeDiscrepancies": [
    {
      "id": "TYPE-001",
      "severity": "major|minor",
      "resource": "resource name",
      "field": "fieldName",
      "jsonTag": "json_field_name",
      "sdkType": "Go type in SDK",
      "openApiType": "OpenAPI type",
      "openApiFormat": "format if specified",
      "location": "request|response",
      "file": "filename.go",
      "line": 0,
      "recommendation": "How to fix",
      "codeExample": "FieldName Type `json:\"field_name\"`"
    }
  ],
  "schemaCompleteness": [
    {
      "schemaName": "ContactCreateRequest",
      "sdkStruct": "CreateContactParams",
      "file": "contacts.go",
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
          "sdkField": "SdkFieldName",
          "issue": "JSON tag mismatch"
        }
      ]
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "consistency|completeness|type_safety|documentation|architecture|new_feature",
      "title": "Short title",
      "description": "Detailed recommendation",
      "rationale": "Why this matters",
      "affectedFiles": ["file1.go", "file2.go"],
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
| **critical** | Breaking issues that will cause runtime failures or data corruption | Wrong HTTP method, missing required fields, incorrect endpoint path |
| **major** | Significant issues that affect functionality or type safety | Type mismatches, missing response fields, incorrect JSON tags |
| **minor** | Issues that don't break functionality but reduce quality | Naming inconsistencies, missing optional fields, style issues |
| **suggestion** | Improvements that would enhance the SDK | Better error messages, convenience methods, documentation |

---

## Dynamic Discovery Guidelines

Since the SDK structure may change over time:

1. **Never hardcode file names** - Always discover files dynamically
2. **Never hardcode resource names** - Discover from code patterns
3. **Look for patterns, not specific names**:
   - Interfaces ending in `Svc` or `Service`
   - Structs ending in `Impl`
   - Methods that call HTTP functions
   - Structs with JSON tags
4. **Handle new resources gracefully** - If a new resource is added, analyze it fully
5. **Handle removed resources** - Note if expected resources are missing
6. **Check for structural changes** - Different file organization, new patterns

---

## Output Requirements

1. **Create the audit directory** if it doesn't exist: `.audits/go-sdk/`
2. **Write the JSON report** to `.audits/go-sdk/<timestamp>-<audit-id>.json`
3. **Provide a summary** to the user including:
   - Total issues found by severity
   - Coverage percentage
   - Top 3 critical issues (if any)
   - Top 3 recommendations
   - Report file location
