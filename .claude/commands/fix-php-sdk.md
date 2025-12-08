# PHP SDK Fix Agent

You are a Principal Engineer responsible for the Kibamail PHP SDK. Your task is to implement fixes for all issues identified in an audit report.

## CRITICAL: Audit Report Path Required

**You MUST receive the path to an audit report JSON file before proceeding.**

This command expects an audit report path: `/fix-php-sdk <path-to-audit-report.json>`

Example: `/fix-php-sdk .audits/php-sdk/2025-11-30T17-33-50-abc123.json`

If no path is provided:
1. STOP immediately
2. List available audit reports in `.audits/php-sdk/`
3. Ask user to run: `/fix-php-sdk <path-to-audit-report.json>`
4. Do NOT proceed with any fixes

---

## Your Mission

Read the audit report, understand all identified issues, and implement fixes systematically. You will modify the SDK code to resolve all inconsistencies, add missing endpoints, fix type discrepancies, and address all recommendations.

---

## Step-by-Step Process

### Step 1: Load and Parse the Audit Report

1. Read the JSON file at the provided path
2. Parse and validate the audit report structure
3. Extract the audit metadata to confirm it's for the PHP SDK
4. Build a prioritized list of fixes to implement

### Step 2: Categorize Issues by Priority

Organize fixes in this order:

1. **Critical Issues** (`severity: "critical"`)
   - Path errors, missing required fields, wrong HTTP methods
   - These cause runtime failures

2. **Missing Endpoints** (`missingEndpoints` array)
   - Add new methods to Service classes
   - Add corresponding Model classes if needed
   - Follow existing patterns in the SDK

3. **Major Issues** (`severity: "major"`)
   - Type mismatches, model issues
   - Affect functionality

4. **Minor Issues** (`severity: "minor"`)
   - Naming, documentation, style issues

5. **Recommendations** (`recommendations` array)
   - Improvements and suggestions

### Step 3: Implement Fixes

For each issue, follow these guidelines:

#### 3.1 Adding Missing Endpoints

For each entry in `missingEndpoints`:

1. Identify the Service file (e.g., `src/Service/Contacts.php`)
2. Read the existing file to understand patterns
3. Add the new method following the existing code style

**PHP SDK Structure:**

a) **Service Method** in the appropriate service class:
```php
<?php

namespace Kibamail\Service;

class ApiKeys extends Service
{
    /**
     * Retrieve a paginated list of all API keys.
     *
     * Returns key metadata without the actual key values for security.
     *
     * @param array{
     *     limit?: int,
     *     after?: string,
     *     before?: string
     * } $params Optional pagination parameters
     *
     * @return \Kibamail\Collection<\Kibamail\ApiKey>
     *
     * @throws \Kibamail\Exceptions\KibamailException
     */
    public function list(array $params = []): Collection
    {
        $response = $this->transporter->request(
            Payload::list('api-keys', $params)
        );

        return Collection::from($response, ApiKey::class);
    }

    /**
     * Delete an API key permanently.
     *
     * Cannot delete the currently authenticated key.
     *
     * @param string $keyId The ID of the API key to delete
     *
     * @return bool True if deletion was successful
     *
     * @throws \Kibamail\Exceptions\KibamailException
     */
    public function delete(string $keyId): bool
    {
        $this->transporter->request(
            Payload::delete('api-keys', $keyId)
        );

        return true;
    }
}
```

b) **Model Class** (if response needs a new model):
```php
<?php

namespace Kibamail;

class ApiKey extends Resource
{
    public readonly string $id;
    public readonly string $object;
    public readonly string $name;
    public readonly ?string $key;
    public readonly string $createdAt;

    public function __construct(array $data)
    {
        $this->id = $data['id'];
        $this->object = $data['object'];
        $this->name = $data['name'];
        $this->key = $data['key'] ?? null;
        $this->createdAt = $data['createdAt'];
    }
}
```

c) **Update ServiceFactory** if adding a new service:
```php
// In src/Service/ServiceFactory.php
public function make(string $service): Service
{
    return match ($service) {
        'contacts' => new Contacts($this->transporter),
        'topics' => new Topics($this->transporter),
        'apiKeys' => new ApiKeys($this->transporter),
        // ... other services
    };
}
```

#### 3.2 Fixing Inconsistencies

For each entry in `inconsistencies`:

**Path Issues (`category: "path"`)**:
- Update the endpoint path in the Payload call
- Ensure consistency with OpenAPI spec

**Missing Field Issues (`category: "missing_field"`)**:
- Add the missing property to the Model class
- Update the constructor to handle it
- Use appropriate type hint

**Type Mismatch Issues (`category: "type_mismatch"`)**:
- Update the PHP type hint
- Common mappings:
  - `string` → `string`
  - `integer` → `int`
  - `number` → `float`
  - `boolean` → `bool`
  - `array` → `array` with PHPDoc for item types
  - `object` → class or `array`
  - nullable → `?Type`

**Model Mapping Issues (`category: "model_mapping"`)**:
- Verify the Model constructor handles all response fields
- Add missing properties
- Fix type declarations

#### 3.3 Fixing Model Issues

For each entry in `modelIssues`:

1. Locate the Model class
2. Add missing properties with correct types
3. Update constructor to populate them
4. Use PHP 8+ features (readonly, constructor promotion)

Example Model fix:
```php
<?php

namespace Kibamail;

class Contact extends Resource
{
    public function __construct(
        public readonly string $id,
        public readonly string $object,
        public readonly string $email,
        public readonly ?string $firstName,  // Added missing field
        public readonly ?string $lastName,   // Added missing field
        public readonly array $tags,
        public readonly string $createdAt,
        public readonly string $updatedAt,
    ) {}

    public static function from(array $data): self
    {
        return new self(
            id: $data['id'],
            object: $data['object'],
            email: $data['email'],
            firstName: $data['firstName'] ?? null,
            lastName: $data['lastName'] ?? null,
            tags: $data['tags'] ?? [],
            createdAt: $data['createdAt'],
            updatedAt: $data['updatedAt'],
        );
    }
}
```

#### 3.4 Fixing Service Issues

For each entry in `serviceIssues`:

1. Locate the Service class
2. Fix the HTTP method, path, or parameters
3. Ensure proper error handling
4. Verify return types

#### 3.5 Fixing Payload Issues

For each entry in `payloadIssues`:

1. Locate the Payload class or method
2. Add missing fields to the payload
3. Remove extra fields not in the spec
4. Ensure proper type handling

#### 3.6 Adding PHPDoc Documentation

PHP SDK should have comprehensive PHPDoc:

```php
/**
 * Create a new contact in your Kibamail workspace.
 *
 * Creates a contact with the provided email address and optional attributes.
 * If a contact with the same email already exists, returns an error.
 *
 * @param array{
 *     email: string,
 *     firstName?: string,
 *     lastName?: string,
 *     tags?: string[],
 *     properties?: array<string, mixed>,
 *     subscriptions?: array{topicId: string, status: string}[]
 * } $params Contact creation parameters
 *
 * @return \Kibamail\Contact The created contact
 *
 * @throws \Kibamail\Exceptions\ValidationException When parameters are invalid
 * @throws \Kibamail\Exceptions\DuplicateException When email already exists
 * @throws \Kibamail\Exceptions\KibamailException For other API errors
 *
 * @example
 * $contact = $client->contacts->create([
 *     'email' => 'user@example.com',
 *     'firstName' => 'John',
 *     'tags' => ['newsletter', 'premium'],
 * ]);
 */
public function create(array $params): Contact
{
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

#### 4.3 Check PHP Syntax

```bash
cd sdks/php && find src -name "*.php" -exec php -l {} \;
```

If syntax errors are found, fix them before proceeding.

#### 4.4 Update Composer Autoload

```bash
cd sdks/php && composer dump-autoload
```

#### 4.5 Run PHPStan (if configured)

```bash
cd sdks/php && vendor/bin/phpstan analyse
```

Fix any static analysis issues.

#### 4.6 Run All Tests

```bash
cd sdks/php && composer test
```

Or using vendor binaries directly:
```bash
cd sdks/php && vendor/bin/pest
```

**Test Configuration:**
- Test framework: Pest (PHPUnit-based)
- Test files: `tests/**/*.php`
- Mock API URL: `http://localhost:4010` (configured in `phpunit.xml`)
- Mock API Key: `kb_test_mock_api_key_12345`
- Test setup: `tests/Pest.php`

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
cd sdks/php && composer test:coverage
```

### Step 5: Generate Fix Report

Create a fix report at:
```
.audits/php-sdk/fixes/<timestamp>-<audit-id>-fixes.json
```

---

## Fix Report Format

```json
{
  "fixMetadata": {
    "auditReportPath": "<original audit report path>",
    "auditId": "<from audit report>",
    "fixTimestamp": "ISO-8601 timestamp",
    "sdkName": "kibamail-php",
    "sdkDirectory": "sdks/php"
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
      "file": "src/Service/ApiKeys.php",
      "description": "Fixed endpoint path for create method",
      "changesMade": [
        {
          "file": "src/Service/ApiKeys.php",
          "line": 45,
          "before": "'api-keys/'",
          "after": "'api-keys'"
        }
      ],
      "status": "fixed"
    }
  ],
  "endpointsAdded": [
    {
      "endpoint": "GET /v1/api-keys",
      "service": "ApiKeys",
      "method": "list",
      "file": "src/Service/ApiKeys.php",
      "returnType": "Collection<ApiKey>"
    }
  ],
  "modelsModified": [
    {
      "name": "Contact",
      "file": "src/Contact.php",
      "propertiesAdded": ["firstName", "lastName"],
      "propertiesModified": [],
      "propertiesRemoved": []
    }
  ],
  "modelsCreated": [
    {
      "name": "ApiKeyListItem",
      "file": "src/ApiKeyListItem.php",
      "properties": ["id", "name", "createdAt"]
    }
  ],
  "skippedIssues": [],
  "failedFixes": [],
  "verificationResults": {
    "phpSyntax": {
      "success": true,
      "errors": []
    },
    "phpstan": {
      "success": true,
      "errors": []
    },
    "phpunit": {
      "success": true,
      "passed": 10,
      "failed": 0
    },
    "composerAutoload": {
      "success": true
    }
  },
  "filesModified": [
    "src/Service/ApiKeys.php",
    "src/Contact.php"
  ],
  "filesCreated": [
    "src/ApiKeyListItem.php"
  ]
}
```

---

## PHP Code Style Guidelines

When adding or modifying code:

1. **PHP 8+ Features**:
   - Use constructor property promotion
   - Use readonly properties where appropriate
   - Use named arguments for clarity
   - Use match expressions instead of switch
   - Use union types and nullable types

2. **PSR-4 Autoloading**:
   - Namespace must match directory structure
   - Class name must match file name

3. **PHPDoc**:
   - Document all public methods
   - Use array shapes for complex parameters
   - Document exceptions
   - Include examples

4. **Type Safety**:
   - Use strict types: `declare(strict_types=1);`
   - Add return type declarations
   - Add parameter type hints
   - Use nullable types for optional values

5. **Error Handling**:
   - Throw specific exceptions
   - Never suppress errors
   - Document thrown exceptions

### Example: Complete Service Method Addition

```php
<?php

declare(strict_types=1);

namespace Kibamail\Service;

use Kibamail\Collection;
use Kibamail\Contact;
use Kibamail\Exceptions\KibamailException;
use Kibamail\ValueObjects\Payload;

class Topics extends Service
{
    // ... existing methods

    /**
     * Retrieve contacts subscribed to a specific topic.
     *
     * Returns a paginated list of contacts who are subscribed to the given topic.
     * Only contacts with active subscriptions are included.
     *
     * @param string $topicId The topic ID to get subscribers for
     * @param array{
     *     limit?: int,
     *     after?: string,
     *     before?: string
     * } $params Optional pagination parameters
     *
     * @return Collection<Contact> Paginated list of subscribed contacts
     *
     * @throws KibamailException When the API request fails
     *
     * @example
     * // Get first page of subscribers
     * $subscribers = $client->topics->listContacts('topic_123');
     *
     * // With pagination
     * $subscribers = $client->topics->listContacts('topic_123', [
     *     'limit' => 50,
     *     'after' => 'cursor_abc',
     * ]);
     */
    public function listContacts(string $topicId, array $params = []): Collection
    {
        $response = $this->transporter->request(
            Payload::list("topics/{$topicId}/contacts", $params)
        );

        return Collection::from($response, Contact::class);
    }
}
```

---

## Dynamic Discovery

Do NOT hardcode file paths or class names. Always:

1. Read the audit report to get actual file paths
2. Read existing files to understand current patterns
3. Discover the SDK structure dynamically
4. Adapt to the current codebase state

---

## Error Handling

If you encounter errors:

1. **File not found**: Note in the fix report, continue with other fixes
2. **Syntax errors**: Attempt to fix, document if unable
3. **Test failures**: Document the failures, don't revert working fixes
4. **Ambiguous fixes**: Use best judgment, document reasoning

---

## Output Requirements

1. **Implement all possible fixes** from the audit report
2. **Create the fixes directory** if needed: `.audits/php-sdk/fixes/`
3. **Write the fix report** JSON file
4. **Run verification commands** (php -l, phpstan, phpunit)
5. **Provide a summary** to the user:
   - Number of issues fixed
   - Files modified/created
   - Models added/modified
   - Any issues that couldn't be fixed
   - Verification results
