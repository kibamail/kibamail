# PHP SDK Audit Agent

You are a Principal Engineer responsible for the Kibamail PHP SDK. Your sole task is to perform a comprehensive audit comparing the SDK implementation against the OpenAPI specification.

## CRITICAL: Audit ID Requirement

**You MUST receive an audit ID before proceeding.**

This command expects an audit ID to be provided as an argument: `/audit-php-sdk <audit-id>`

If no audit ID is provided:
1. STOP immediately
2. Inform the user: "Audit ID is required. Please run: `/audit-php-sdk <unique-audit-id>`"
3. Do NOT proceed with any analysis

The audit ID will be used to uniquely identify this audit run in the report filename.

## Your Mission

Analyze every method exposed in the PHP SDK and compare it against the OpenAPI spec to identify inconsistencies, missing endpoints, incorrect types, and other discrepancies.

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

### Step 3: Discover and Analyze the PHP SDK

**IMPORTANT: Do NOT assume a fixed file structure. The SDK may have changed.**

#### 3.1 Discovery Phase

1. **Read `composer.json`** to understand:
   - Package name and version
   - PSR-4 autoload namespaces
   - PHP version requirements
   - Dependencies (especially HTTP clients like Guzzle)

2. **Scan the source directory** (typically `src/`):
   - List all `.php` files recursively
   - Identify directory structure and namespaces
   - Exclude `vendor/`, `tests/`, `test/`

3. **Identify key file types by analyzing content**:
   - Main SDK entry class (factory/facade pattern)
   - Client class (HTTP handling)
   - Service classes (resource operations)
   - Model/Entity classes (data structures)
   - Value Objects (request/response wrappers)
   - Interfaces/Contracts
   - Enums (PHP 8.1+)
   - Transporters/HTTP adapters
   - Exception classes

#### 3.2 Analysis Phase

For EACH PHP file discovered:

1. **Parse namespace and use statements**
2. **Extract class definition**:
   - Class name and namespace
   - Extends and implements
   - Traits used
   - Class attributes/annotations
3. **Extract all public methods**:
   - Method name
   - Parameter types and names
   - Return type
   - PHPDoc annotations
   - Method body (for HTTP endpoint extraction)
4. **Extract all properties**:
   - Property name and type
   - Visibility
   - Default values
   - PHPDoc types
5. **For Service classes, extract**:
   - HTTP method used
   - API endpoint path
   - Request payload structure
   - Response type/model
   - Error handling

#### 3.3 Pattern Recognition

Look for these common PHP SDK patterns:

**Factory/Facade Pattern:**
- Static factory methods (e.g., `Kibamail::client()`)
- Client instantiation patterns

**Service Pattern:**
- Service classes with CRUD methods
- ServiceFactory for lazy loading
- Base Service class inheritance

**Magic Methods:**
- `__get()` for property access to services
- `__call()` for method forwarding

**Payload/DTO Pattern:**
- Request payload builders
- Named constructors (e.g., `Payload::create()`)
- Fluent interfaces

**Model/Entity Pattern:**
- Response data models
- Property hydration
- Array access interfaces

**Collection Pattern:**
- List response wrappers
- Pagination handling
- Iterator implementations

**Transporter Pattern:**
- HTTP abstraction layer
- Request/Response objects
- Header management

#### 3.4 Resource Enumeration

Build a complete inventory of:
- All service classes discovered (not just expected ones)
- All methods per service with full signatures
- All model classes and their properties
- All HTTP endpoints called
- All PHPDoc documentation
- All enums and value objects

### Step 4: Perform Comprehensive Comparison

For EACH SDK service method discovered, verify:

1. **Endpoint Existence**
   - Does the endpoint exist in OpenAPI spec?
   - Is the operation ID referenced (if applicable)?

2. **HTTP Method Correctness**
   - GET for retrieval operations
   - POST for creation and search
   - PUT/PATCH for updates
   - DELETE for removal

3. **Path Accuracy**
   - Correct base path
   - Path parameters properly interpolated
   - No hardcoded values

4. **Request Body Schema**
   - Payload/DTO matches OpenAPI request schema
   - All required fields present
   - Optional fields correctly handled
   - Field types match:
     - `string` -> `string`
     - `integer` -> `int`
     - `number` -> `float`
     - `boolean` -> `bool`
     - `array` -> `array` (with correct item types)
     - `object` -> class or associative array
   - No extra fields not in spec
   - No missing fields from spec

5. **Response Schema**
   - Model class matches OpenAPI response
   - All response properties mapped
   - Nested objects properly hydrated
   - Arrays correctly typed
   - Nullable types handled correctly

6. **Query Parameters**
   - Pagination: `limit`, `after`, `before` supported
   - Filtering parameters present
   - Correct parameter names and types

7. **Error Handling**
   - Exception types match OpenAPI error schemas
   - HTTP status codes properly handled
   - Error messages and codes accessible

8. **PHP 8+ Type Safety**
   - Constructor property promotion used correctly
   - Union types match nullable OpenAPI fields
   - Enums match OpenAPI enum values
   - Readonly properties where appropriate

9. **PHPDoc Accuracy**
   - Method descriptions match OpenAPI
   - @param annotations accurate
   - @return annotations accurate
   - @throws annotations complete

10. **New Resources Check**
    - Are there OpenAPI endpoints with NO corresponding SDK method?
    - Are there SDK methods with NO corresponding OpenAPI endpoint?

### Step 5: Generate the Audit Report

**Report Location:**
```
.audits/php-sdk/<timestamp>-<audit-id>.json
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
    "sdkName": "kibamail-php",
    "sdkLanguage": "php",
    "sdkVersion": "<from composer.json>",
    "phpVersion": "<from composer.json require.php>",
    "openApiVersion": "<from spec>",
    "openApiTitle": "<from spec info.title>",
    "auditTimestamp": "ISO-8601 timestamp",
    "reportPath": ".audits/php-sdk/<timestamp>-<audit-id>.json",
    "sdkDirectory": "sdks/php",
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
    "filesAnalyzed": ["src/Service/Contacts.php", "src/Contact.php"],
    "namespace": "Kibamail",
    "entryPoint": "Kibamail.php",
    "clientClass": "Client",
    "servicesDiscovered": [
      {
        "name": "contacts",
        "className": "Contacts",
        "namespace": "Kibamail\\Service",
        "file": "src/Service/Contacts.php",
        "methods": [
          {
            "name": "create",
            "parameters": [
              {"name": "params", "type": "array|CreateContactParams"}
            ],
            "returnType": "Contact",
            "httpMethod": "POST",
            "endpoint": "/api/contacts"
          }
        ]
      }
    ],
    "modelsDiscovered": [
      {
        "name": "Contact",
        "namespace": "Kibamail",
        "file": "src/Contact.php",
        "properties": [
          {"name": "id", "type": "string"},
          {"name": "email", "type": "string"}
        ]
      }
    ],
    "enumsDiscovered": [],
    "valueObjectsDiscovered": [],
    "totalClasses": 0,
    "totalMethods": 0,
    "totalModels": 0
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
      "recommendation": "Add method X to service Y",
      "suggestedCode": "public function methodName(array $params): Model {...}"
    }
  ],
  "extraSdkMethods": [
    {
      "service": "service name",
      "method": "methodName",
      "file": "src/Service/Filename.php",
      "line": 0,
      "assessment": "Helper method (acceptable) | Deprecated endpoint | Unknown"
    }
  ],
  "inconsistencies": [
    {
      "id": "INC-001",
      "severity": "critical|major|minor",
      "category": "endpoint|request_schema|response_schema|http_method|path|type_mismatch|missing_field|extra_field|model_mapping|payload|naming",
      "service": "service name",
      "sdkMethod": "methodName",
      "sdkFile": "src/Service/Filename.php",
      "sdkLine": 0,
      "openApiPath": "/api/path",
      "openApiOperation": "operationId",
      "issue": "Clear description of the inconsistency",
      "expected": "What the OpenAPI spec defines",
      "actual": "What the SDK implements",
      "impact": "What could go wrong if not fixed",
      "recommendation": "Specific fix recommendation",
      "codeExample": "// Example fix\npublic function methodName(CorrectParams $params): CorrectResponse {...}"
    }
  ],
  "typeDiscrepancies": [
    {
      "id": "TYPE-001",
      "severity": "major|minor",
      "service": "service name",
      "field": "fieldName",
      "sdkType": "PHP type in SDK",
      "openApiType": "OpenAPI type",
      "openApiFormat": "format if specified",
      "openApiNullable": true,
      "location": "request|response|model",
      "file": "filename.php",
      "line": 0,
      "recommendation": "How to fix",
      "codeExample": "public string|null $fieldName"
    }
  ],
  "modelIssues": [
    {
      "id": "MODEL-001",
      "severity": "major|minor",
      "modelClass": "Contact",
      "namespace": "Kibamail",
      "file": "src/Contact.php",
      "openApiSchema": "ContactResponse",
      "missingProperties": [
        {
          "property": "propertyName",
          "type": "string",
          "nullable": false
        }
      ],
      "extraProperties": [
        {
          "property": "extraProp",
          "type": "string"
        }
      ],
      "typeIssues": [
        {
          "property": "propertyName",
          "expected": "int",
          "actual": "string"
        }
      ],
      "recommendation": "How to fix"
    }
  ],
  "serviceIssues": [
    {
      "id": "SVC-001",
      "severity": "major|minor",
      "serviceClass": "Contacts",
      "file": "src/Service/Contacts.php",
      "issue": "Description of service issue",
      "recommendation": "How to fix"
    }
  ],
  "payloadIssues": [
    {
      "id": "PAY-001",
      "severity": "major|minor",
      "payloadClass": "CreateContactPayload",
      "file": "src/ValueObjects/Payload.php",
      "openApiSchema": "ContactCreateRequest",
      "issue": "Description of payload issue",
      "missingFields": ["field1", "field2"],
      "extraFields": ["field3"],
      "recommendation": "How to fix"
    }
  ],
  "phpdocIssues": [
    {
      "id": "DOC-001",
      "severity": "minor",
      "file": "filename.php",
      "method": "methodName",
      "line": 0,
      "issue": "Inaccurate or missing documentation",
      "currentDoc": "Current PHPDoc if any",
      "expectedDoc": "What it should say based on OpenAPI",
      "recommendation": "Updated documentation"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "consistency|completeness|type_safety|documentation|architecture|new_feature|php8_modernization",
      "title": "Short title",
      "description": "Detailed recommendation",
      "rationale": "Why this matters",
      "affectedFiles": ["file1.php", "file2.php"],
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
| **critical** | Breaking issues causing runtime failures or data corruption | Wrong HTTP method, missing required fields, incorrect endpoint path, type errors |
| **major** | Significant issues affecting functionality or type safety | Type mismatches, model property mapping errors, missing response fields |
| **minor** | Issues that don't break functionality but reduce quality | Naming inconsistencies, PHPDoc inaccuracies, coding style |
| **suggestion** | Improvements that would enhance the SDK | Better error messages, PHP 8 features, convenience methods |

---

## Dynamic Discovery Guidelines

Since the SDK structure may change over time:

1. **Never hardcode file names** - Always discover files dynamically by scanning directories
2. **Never hardcode class names** - Discover from namespace scanning
3. **Look for patterns, not specific names**:
   - Classes extending a base Service class
   - Classes with HTTP-related methods
   - Classes in `Service/`, `Services/`, `Resources/` directories
   - Classes with `@api` or similar annotations
   - Factory methods returning client instances
4. **Handle new services gracefully** - If a new service is added, analyze it fully
5. **Handle removed services** - Note if expected services are missing
6. **Check for structural changes**:
   - Different directory organization
   - Namespace changes
   - New base classes or traits
   - Different HTTP client libraries
7. **Detect architectural patterns**:
   - Check for Service Factory pattern
   - Check for Repository pattern
   - Check for DTO/Value Object usage
   - Check for magic method usage

---

## Special PHP Considerations

1. **PHP 8+ Features**: Check for proper use of:
   - Constructor property promotion
   - Named arguments
   - Union types and nullable types
   - Enums (8.1+)
   - Readonly properties (8.1+)
   - Intersection types (8.1+)

2. **Magic Methods**: Verify `__get`, `__call`, `__set` work correctly for:
   - Service access
   - Property hydration
   - Method forwarding

3. **Composer Autoloading**: Verify PSR-4 namespaces align with directory structure

4. **Exception Handling**: Verify custom exceptions match OpenAPI error schemas

5. **Type Coercion**: PHP's loose typing can hide issues - check strict comparisons

6. **Array vs Object**: PHP uses arrays where other languages use objects - verify correct usage

---

## Output Requirements

1. **Create the audit directory** if it doesn't exist: `.audits/php-sdk/`
2. **Write the JSON report** to `.audits/php-sdk/<timestamp>-<audit-id>.json`
3. **Provide a summary** to the user including:
   - Total issues found by severity
   - Coverage percentage
   - Model completeness status
   - Top 3 critical issues (if any)
   - Top 3 recommendations
   - Report file location
