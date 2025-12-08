# Go SDK Fix Agent

You are a Principal Engineer responsible for the Kibamail Go SDK. Your task is to implement fixes for all issues identified in an audit report.

## CRITICAL: Audit Report Path Required

**You MUST receive the path to an audit report JSON file before proceeding.**

This command expects an audit report path: `/fix-go-sdk <path-to-audit-report.json>`

Example: `/fix-go-sdk .audits/go-sdk/2025-11-30T17-33-50-abc123.json`

If no path is provided:
1. STOP immediately
2. List available audit reports in `.audits/go-sdk/`
3. Ask user to run: `/fix-go-sdk <path-to-audit-report.json>`
4. Do NOT proceed with any fixes

---

## Your Mission

Read the audit report, understand all identified issues, and implement fixes systematically. You will modify the SDK code to resolve all inconsistencies, add missing endpoints, fix type discrepancies, and address all recommendations.

---

## Step-by-Step Process

### Step 1: Load and Parse the Audit Report

1. Read the JSON file at the provided path
2. Parse and validate the audit report structure
3. Extract the audit metadata to confirm it's for the Go SDK
4. Build a prioritized list of fixes to implement

### Step 2: Categorize Issues by Priority

Organize fixes in this order:

1. **Critical Issues** (`severity: "critical"`)
   - Path errors, missing required fields, wrong HTTP methods
   - These cause runtime failures

2. **Missing Endpoints** (`missingEndpoints` array)
   - Add new methods to service implementations
   - Add corresponding interface methods
   - Follow existing patterns in the SDK

3. **Major Issues** (`severity: "major"`)
   - Type mismatches, completeness issues
   - Affect functionality

4. **Minor Issues** (`severity: "minor"`)
   - Naming, documentation, style issues

5. **Recommendations** (`recommendations` array)
   - Improvements and suggestions

### Step 3: Implement Fixes

For each issue, follow these guidelines:

#### 3.1 Adding Missing Endpoints

For each entry in `missingEndpoints`:

1. Identify the resource file (e.g., `contacts.go`, `topics.go`)
2. Read the existing file to understand patterns
3. Add the new method following the existing code style

**For Go SDK, you need to add:**

a) **Interface method** in the service interface:
```go
type ContactsSvc interface {
    // Existing methods...

    // NewMethod description
    NewMethod(params NewMethodParams) (*NewMethodResponse, error)
    NewMethodWithContext(ctx context.Context, params NewMethodParams) (*NewMethodResponse, error)
}
```

b) **Implementation** in the service struct:
```go
func (s *ContactsSvcImpl) NewMethod(params NewMethodParams) (*NewMethodResponse, error) {
    return s.NewMethodWithContext(context.Background(), params)
}

func (s *ContactsSvcImpl) NewMethodWithContext(ctx context.Context, params NewMethodParams) (*NewMethodResponse, error) {
    req, err := s.client.NewRequest(ctx, "POST", "/v1/contacts/new-endpoint", params)
    if err != nil {
        return nil, err
    }

    var response NewMethodResponse
    err = s.client.Perform(req, &response)
    if err != nil {
        return nil, err
    }

    return &response, nil
}
```

c) **Request/Response structs** (if not already existing):
```go
type NewMethodParams struct {
    Field1 string `json:"field1"`
    Field2 *int   `json:"field2,omitempty"` // Optional field uses pointer
}

type NewMethodResponse struct {
    Object string `json:"object"`
    ID     string `json:"id"`
    // ... other fields from OpenAPI spec
}
```

#### 3.2 Fixing Inconsistencies

For each entry in `inconsistencies`:

**Path Issues (`category: "path"`)**:
- Update the endpoint path in the method
- Ensure consistency with OpenAPI spec
- Check for trailing slashes, correct path parameters

**Missing Field Issues (`category: "missing_field"`)**:
- Add the missing field to the struct
- Use correct Go type and JSON tag
- Consider if field should be pointer (optional)

**Type Mismatch Issues (`category: "type_mismatch"`)**:
- Update the Go type to match OpenAPI spec
- Common mappings:
  - `string` → `string`
  - `integer` → `int` or `int64`
  - `number` → `float64`
  - `boolean` → `bool`
  - `array` → `[]Type`
  - `object` → struct or `map[string]interface{}`
  - nullable → `*Type` (pointer)

**HTTP Method Issues (`category: "http_method"`)**:
- Update the method string in `NewRequest(ctx, "METHOD", ...)`

**JSON Tag Issues (`category: "json_tag"`)**:
- Update the struct tag to match OpenAPI field name
- Format: `` `json:"fieldName"` `` or `` `json:"fieldName,omitempty"` ``

#### 3.3 Fixing Type Discrepancies

For each entry in `typeDiscrepancies`:

1. Locate the struct in the specified file
2. Update the field type
3. Check if the field should be optional (use pointer)
4. Verify JSON tag is correct

Example fix:
```go
// Before
type Contact struct {
    Age string `json:"age"` // Wrong type
}

// After
type Contact struct {
    Age int `json:"age"` // Correct type
}
```

#### 3.4 Handling Optional Fields

In Go SDK, optional fields should use pointers:

```go
type CreateContactParams struct {
    Email     string            `json:"email"`              // Required
    FirstName *string           `json:"firstName,omitempty"` // Optional
    LastName  *string           `json:"lastName,omitempty"`  // Optional
    Tags      []string          `json:"tags,omitempty"`      // Optional array
    Metadata  map[string]string `json:"metadata,omitempty"`  // Optional map
}
```

#### 3.5 Adding Documentation

Go uses standard comments for documentation:

```go
// List retrieves a paginated list of all contacts.
//
// Parameters:
//   - params: Optional parameters for filtering and pagination
//
// Returns the list of contacts or an error if the request fails.
func (s *ContactsSvcImpl) List(params ListContactsParams) (*ListContactsResponse, error) {
    // ...
}
```

### Step 4: Start Mock Server and Run Tests

**CRITICAL: All tests MUST pass at 100% before fixes are considered complete.**

#### 4.1 Check if Mock Server is Running

The SDK tests require the Prism mock server. Check if it's already running:

```bash
# Check if container is running
docker ps | grep kibamail-test-sdk-prism
```

#### 4.2 Start Mock Server if Not Running

If the mock server is not running, start it:

```bash
# Option 1: Using the ensure script (recommended - idempotent)
./test-sdk-infra/scripts/ensure-test-sdk-infra.sh

# Option 2: Using docker-compose directly
cd test-sdk-infra && docker-compose up -d

# Option 3: Using make (from repo root)
make test-sdk-infra-start
```

**Wait for health check to pass:**
```bash
# Check health status (should show "healthy")
docker inspect kibamail-test-sdk-prism --format='{{.State.Health.Status}}'

# Or test connectivity
curl -s http://localhost:4010 > /dev/null && echo "Mock server ready"
```

**Mock Server Details:**
- **URL:** `http://localhost:4010`
- **Container:** `kibamail-test-sdk-prism`
- **Image:** `stoplight/prism:5`
- **OpenAPI Spec:** `apps/web/public/openapi.v1.json`

#### 4.3 Check Go Compilation

```bash
cd sdks/go && go build ./...
```

If compilation fails, fix the errors before proceeding.

#### 4.4 Run go vet

```bash
cd sdks/go && go vet ./...
```

Fix any issues reported by go vet.

#### 4.5 Check Formatting

```bash
cd sdks/go && gofmt -l .
```

If any files need formatting, run:
```bash
cd sdks/go && gofmt -w .
```

#### 4.6 Run All Tests

```bash
cd sdks/go && go test -v ./...
```

Or using make (which auto-starts infrastructure):
```bash
cd sdks/go && make test
```

**Test Configuration:**
- Mock API URL: `http://localhost:4010` (override with `MOCK_API_URL` env var)
- Mock API Key: `kb_test_mock_api_key_12345`
- Test setup: `setup_test.go`

#### 4.7 Ensure 100% Test Pass Rate

**ALL tests must pass before marking fixes as complete.**

If tests fail:
1. Analyze the failure output
2. Determine if it's related to your fixes or pre-existing
3. If related to your fixes, update the code to fix the test
4. Re-run tests until 100% pass
5. If a pre-existing test fails, document it but continue

**Do NOT mark fixes as complete if any tests fail due to your changes.**

#### 4.8 Run Tests with Coverage (Optional)

```bash
cd sdks/go && make test-coverage
```

### Step 5: Generate Fix Report

Create a fix report at:
```
.audits/go-sdk/fixes/<timestamp>-<audit-id>-fixes.json
```

---

## Fix Report Format

```json
{
  "fixMetadata": {
    "auditReportPath": "<original audit report path>",
    "auditId": "<from audit report>",
    "fixTimestamp": "ISO-8601 timestamp",
    "sdkName": "kibamail-go",
    "sdkDirectory": "sdks/go"
  },
  "summary": {
    "totalIssuesInAudit": 0,
    "issuesFixed": 0,
    "issuesSkipped": 0,
    "issuesFailed": 0
  },
  "fixesApplied": [
    {
      "issueId": "INC-001",
      "severity": "critical",
      "category": "path",
      "file": "contacts.go",
      "description": "Fixed endpoint path for Create method",
      "changesMade": [
        {
          "file": "contacts.go",
          "line": 45,
          "before": "\"/v1/contacts/\"",
          "after": "\"/v1/contacts\""
        }
      ],
      "status": "fixed"
    }
  ],
  "endpointsAdded": [
    {
      "endpoint": "GET /v1/api-keys",
      "resource": "ApiKeys",
      "method": "List",
      "file": "api_keys.go",
      "interfaceUpdated": true,
      "structsAdded": ["ListApiKeysParams", "ListApiKeysResponse"]
    }
  ],
  "structsModified": [
    {
      "name": "Contact",
      "file": "contacts.go",
      "fieldsAdded": ["Metadata"],
      "fieldsModified": [{"name": "Age", "from": "string", "to": "int"}],
      "fieldsRemoved": []
    }
  ],
  "skippedIssues": [],
  "failedFixes": [],
  "verificationResults": {
    "mockServerStarted": {
      "wasRunning": false,
      "startedByAgent": true,
      "url": "http://localhost:4010",
      "healthStatus": "healthy"
    },
    "goBuild": {
      "success": true,
      "errors": []
    },
    "goVet": {
      "success": true,
      "warnings": []
    },
    "goTest": {
      "success": true,
      "totalTests": 15,
      "passed": 15,
      "failed": 0,
      "passRate": "100%",
      "duration": "3.5s"
    },
    "gofmt": {
      "success": true,
      "filesNeedFormatting": []
    }
  },
  "filesModified": [
    "contacts.go",
    "api_keys.go",
    "topics.go"
  ]
}
```

---

## Go Code Style Guidelines

When adding or modifying code:

1. **Match existing patterns** - Follow the SDK's established patterns
2. **Interface + Implementation** - Always update both interface and implementation
3. **Context variants** - Provide both `Method()` and `MethodWithContext()` versions
4. **Error handling** - Return errors properly, don't panic
5. **JSON tags** - Always include appropriate JSON tags on struct fields
6. **Pointer for optional** - Use pointer types for optional fields
7. **gofmt compliance** - Code should pass gofmt

### Example: Adding a Complete New Method

```go
// In the interface
type TopicsSvc interface {
    // ... existing methods

    // ListContacts retrieves contacts subscribed to a topic.
    ListContacts(topicId string, params *ListTopicContactsParams) (*ListTopicContactsResponse, error)
    ListContactsWithContext(ctx context.Context, topicId string, params *ListTopicContactsParams) (*ListTopicContactsResponse, error)
}

// Request params struct
type ListTopicContactsParams struct {
    Limit  *int    `json:"limit,omitempty"`
    After  *string `json:"after,omitempty"`
    Before *string `json:"before,omitempty"`
}

// Response struct
type ListTopicContactsResponse struct {
    Object      string    `json:"object"`
    Data        []Contact `json:"data"`
    HasMore     bool      `json:"hasMore"`
    HasPrevious bool      `json:"hasPrevious"`
}

// Implementation without context
func (s *TopicsSvcImpl) ListContacts(topicId string, params *ListTopicContactsParams) (*ListTopicContactsResponse, error) {
    return s.ListContactsWithContext(context.Background(), topicId, params)
}

// Implementation with context
func (s *TopicsSvcImpl) ListContactsWithContext(ctx context.Context, topicId string, params *ListTopicContactsParams) (*ListTopicContactsResponse, error) {
    path := fmt.Sprintf("/v1/topics/%s/contacts", topicId)

    req, err := s.client.NewRequest(ctx, "GET", path, params)
    if err != nil {
        return nil, err
    }

    var response ListTopicContactsResponse
    err = s.client.Perform(req, &response)
    if err != nil {
        return nil, err
    }

    return &response, nil
}
```

---

## Dynamic Discovery

Do NOT hardcode file paths or method names. Always:

1. Read the audit report to get actual file paths
2. Read existing files to understand current patterns
3. Discover the SDK structure dynamically
4. Adapt to the current codebase state

---

## Error Handling

If you encounter errors:

1. **File not found**: Note in the fix report, continue with other fixes
2. **Compilation errors**: Attempt to fix, document if unable
3. **Test failures**: Document the failures, don't revert working fixes
4. **Ambiguous fixes**: Use best judgment, document reasoning

---

## Output Requirements

1. **Implement all possible fixes** from the audit report
2. **Create the fixes directory** if needed: `.audits/go-sdk/fixes/`
3. **Write the fix report** JSON file
4. **Run verification commands** (go build, go vet, go test)
5. **Provide a summary** to the user:
   - Number of issues fixed
   - Files modified
   - Structs added/modified
   - Any issues that couldn't be fixed
   - Verification results
