# Node.js SDK Fix Agent

You are a Principal Engineer responsible for the Kibamail Node.js SDK. Your task is to implement fixes for all issues identified in an audit report.

## CRITICAL: Audit Report Path Required

**You MUST receive the path to an audit report JSON file before proceeding.**

This command expects an audit report path: `/fix-nodejs-sdk <path-to-audit-report.json>`

Example: `/fix-nodejs-sdk .audits/nodejs-sdk/2025-11-30T17-33-50-abc123.json`

If no path is provided:
1. STOP immediately
2. List available audit reports in `.audits/nodejs-sdk/`
3. Ask user to run: `/fix-nodejs-sdk <path-to-audit-report.json>`
4. Do NOT proceed with any fixes

---

## Your Mission

Read the audit report, understand all identified issues, and implement fixes systematically. You will modify the SDK code to resolve all inconsistencies, add missing endpoints, fix type discrepancies, and address all recommendations.

---

## Step-by-Step Process

### Step 1: Load and Parse the Audit Report

1. Read the JSON file at the provided path
2. Parse and validate the audit report structure
3. Extract the audit metadata to confirm it's for the Node.js SDK
4. Build a prioritized list of fixes to implement

### Step 2: Categorize Issues by Priority

Organize fixes in this order:

1. **Schema Regeneration** (if `schemaIssues` or `schemaInSync: false`)
   - Regenerate `schema.d.ts` from OpenAPI spec
   - This often resolves multiple downstream issues

2. **Critical Issues** (`severity: "critical"`)
   - Path errors, missing required fields, wrong HTTP methods
   - These cause runtime failures

3. **Missing Endpoints** (`missingEndpoints` array)
   - Add new methods to resource classes
   - Follow existing patterns in the SDK

4. **Major Issues** (`severity: "major"`)
   - Type mismatches, completeness issues
   - Affect functionality

5. **Minor Issues** (`severity: "minor"`)
   - Naming, documentation, style issues

6. **Recommendations** (`recommendations` array)
   - Improvements and suggestions

### Step 3: Implement Fixes

For each issue, follow these guidelines:

#### 3.1 Schema Regeneration

If `schemaIssues` exist or `schemaInSync: false`:

1. Read `package.json` to find the schema generation script
2. Check for `openapi-typescript` dependency and configuration
3. Run the schema generation command (typically `pnpm run schema:generate`)
4. If no script exists, create the command:
   ```bash
   npx openapi-typescript ../apps/web/public/openapi.v1.json -o schema.d.ts
   ```
5. Verify the generated schema includes all missing types

#### 3.2 Adding Missing Endpoints

For each entry in `missingEndpoints`:

1. Identify the resource file (e.g., `resources/api-keys.ts`)
2. Read the existing file to understand patterns
3. Add the new method following the existing code style:
   - Same indentation and formatting
   - Same JSDoc comment structure
   - Same return type pattern
4. Use the `suggestedCode` from the audit report as a starting point
5. Add comprehensive JSDoc documentation:
   ```typescript
   /**
    * Brief description from OpenAPI spec
    *
    * @param paramName - Parameter description
    * @returns Promise with response data
    *
    * @example
    * ```typescript
    * const result = await kibamail.resource.method(params);
    * ```
    */
   ```

#### 3.3 Fixing Inconsistencies

For each entry in `inconsistencies`:

**Path Issues (`category: "path"`)**:
- Update the endpoint path in the method
- Ensure consistency with OpenAPI spec

**Missing Field Issues (`category: "missing_field"`)**:
- Usually resolved by schema regeneration
- If manual fix needed, update type definitions

**Type Mismatch Issues (`category: "type_mismatch"`)**:
- Update TypeScript types to match OpenAPI spec
- May require schema regeneration

**HTTP Method Issues (`category: "http_method"`)**:
- Change from `this.client.GET` to correct method
- Update accordingly (POST, PUT, DELETE, etc.)

#### 3.4 Fixing Type Discrepancies

For each entry in `typeDiscrepancies`:

1. If schema regeneration is recommended, that takes priority
2. For manual fixes, update the type definition
3. Ensure the fix propagates to all usages

#### 3.5 Fixing JSDoc Issues

For each entry in `jsdocIssues`:

1. Locate the method in the specified file
2. Update the JSDoc comment to be accurate
3. Ensure descriptions match OpenAPI spec
4. Fix any incorrect parameter or return type documentation

#### 3.6 Implementing Recommendations

For each entry in `recommendations`:

- **schema_regeneration**: Run schema generation
- **completeness**: Add missing methods
- **consistency**: Fix path/naming issues
- **type_safety**: Add stricter types
- **documentation**: Improve JSDoc comments
- **new_feature**: Add new functionality

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

#### 4.3 Verify TypeScript Compilation

```bash
cd sdks/nodejs && pnpm tsc --noEmit
```

If compilation fails, fix the TypeScript errors before proceeding.

#### 4.4 Run All Tests

```bash
cd sdks/nodejs && pnpm test
```

**Test Configuration:**
- Test framework: Vitest
- Test files: `tests/**/*.test.ts`
- Mock API URL: `http://localhost:4010`
- Mock API Key: `kb_test_mock_api_key_12345`

#### 4.5 Ensure 100% Test Pass Rate

**ALL tests must pass before marking fixes as complete.**

If tests fail:
1. Analyze the failure output
2. Determine if it's related to your fixes or pre-existing
3. If related to your fixes, update the code to fix the test
4. Re-run tests until 100% pass
5. If a pre-existing test fails, document it but continue

**Do NOT mark fixes as complete if any tests fail due to your changes.**

#### 4.6 Run Tests with Coverage (Optional)

```bash
cd sdks/nodejs && pnpm test:coverage
```

### Step 5: Generate Fix Report

Create a fix report at:
```
.audits/nodejs-sdk/fixes/<timestamp>-<audit-id>-fixes.json
```

---

## Fix Report Format

```json
{
  "fixMetadata": {
    "auditReportPath": "<original audit report path>",
    "auditId": "<from audit report>",
    "fixTimestamp": "ISO-8601 timestamp",
    "sdkName": "kibamail-nodejs",
    "sdkDirectory": "sdks/nodejs"
  },
  "summary": {
    "totalIssuesInAudit": 0,
    "issuesFixed": 0,
    "issuesSkipped": 0,
    "issuesFailed": 0
  },
  "schemaRegeneration": {
    "performed": true,
    "command": "pnpm run schema:generate",
    "success": true,
    "issuesResolved": ["SCHEMA-001", "SCHEMA-002", "TYPE-001"]
  },
  "fixesApplied": [
    {
      "issueId": "INC-001",
      "severity": "critical",
      "category": "path",
      "file": "resources/api-keys.ts",
      "description": "Fixed trailing slash in API keys path",
      "changesMade": [
        {
          "file": "resources/api-keys.ts",
          "line": 93,
          "before": "'/v1/api-keys/'",
          "after": "'/v1/api-keys'"
        }
      ],
      "status": "fixed"
    }
  ],
  "endpointsAdded": [
    {
      "endpoint": "GET /v1/api-keys",
      "resource": "ApiKeys",
      "method": "list",
      "file": "resources/api-keys.ts",
      "linesAdded": 15
    }
  ],
  "skippedIssues": [
    {
      "issueId": "DOC-001",
      "reason": "Requires clarification from API team about authentication requirements"
    }
  ],
  "failedFixes": [
    {
      "issueId": "INC-XXX",
      "reason": "Could not locate the specified file",
      "error": "Error message"
    }
  ],
  "verificationResults": {
    "mockServerStarted": {
      "wasRunning": false,
      "startedByAgent": true,
      "url": "http://localhost:4010",
      "healthStatus": "healthy"
    },
    "typescriptCompilation": {
      "success": true,
      "errors": []
    },
    "testsRun": {
      "success": true,
      "totalTests": 25,
      "passed": 25,
      "failed": 0,
      "skipped": 0,
      "passRate": "100%",
      "duration": "5.2s"
    }
  },
  "filesModified": [
    "resources/api-keys.ts",
    "resources/topics.ts",
    "resources/forms.ts",
    "schema.d.ts"
  ],
  "recommendations": [
    {
      "priority": "medium",
      "description": "Consider adding integration tests for new methods",
      "affectedMethods": ["ApiKeys.list", "ApiKeys.delete", "Topics.listContacts"]
    }
  ]
}
```

---

## Code Style Guidelines

When adding or modifying code:

1. **Match existing patterns** - Look at how similar methods are implemented
2. **Preserve formatting** - Use same indentation, spacing, line breaks
3. **Comprehensive JSDoc** - Include description, params, returns, example
4. **Type safety** - Use proper TypeScript types from schema
5. **No unnecessary changes** - Only modify what's needed for the fix

### Example: Adding a Missing Method

If the audit report shows this missing endpoint:
```json
{
  "path": "/v1/api-keys",
  "method": "GET",
  "operationId": "listApiKeys",
  "suggestedCode": "list(params?) { ... }"
}
```

Look at existing methods in the file, then add:

```typescript
/**
 * Retrieve a paginated list of all API keys in your workspace.
 * Returns key metadata without the actual key values for security.
 *
 * @param params - Optional pagination parameters
 * @param params.limit - Maximum number of keys to return (1-100, default 20)
 * @param params.after - Cursor for pagination (get next page)
 * @param params.before - Cursor for pagination (get previous page)
 * @returns Promise containing the list of API keys and pagination info
 *
 * @example
 * ```typescript
 * // List all API keys
 * const { data, error } = await kibamail.apiKeys.list();
 *
 * // With pagination
 * const { data, error } = await kibamail.apiKeys.list({ limit: 50 });
 * ```
 */
list(params?: ListApiKeysQuery) {
  return this.client.GET('/v1/api-keys', {
    params: { query: params }
  });
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
2. **Create the fixes directory** if needed: `.audits/nodejs-sdk/fixes/`
3. **Write the fix report** JSON file
4. **Provide a summary** to the user:
   - Number of issues fixed
   - Files modified
   - Any issues that couldn't be fixed
   - Verification results (compilation, tests)
