# Test Utilities

Comprehensive test utilities for the Kibamail API. These utilities provide a clean, consistent way to write tests with minimal boilerplate.

## 🚀 Quick Start

```typescript
import { POST, GET } from "@/app/api/v1/contacts/route";
import type { Contact } from "@prisma/client";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  cleanupWorkspace,
  fakeContact,
  post,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";

// Setup with proper types
const workspace: TestWorkspace = createTestWorkspace();
const apiKey: CreatedApiKey = await createFullAccessApiKey(workspace.id);

// Make API calls with type safety
const contactData = fakeContact();
const request = post("/contacts", contactData, apiKey.key);
const response = await POST(request);
const responseData: { type: string; data: Contact } = await response.json();

// Cleanup
await cleanupWorkspace(workspace.id);
```

## 🎯 Type Safety Best Practices

Always use proper Prisma types instead of `any`:

```typescript
// ❌ Don't use any
const contacts: any[] = responseData.data;
contacts.forEach((contact: any) => {
  console.log(contact.email);
});

// ✅ Use proper Prisma types
import type { Contact } from "@prisma/client";

const contacts: Contact[] = responseData.data;
contacts.forEach((contact: Contact) => {
  console.log(contact.email); // TypeScript knows this exists
  console.log(contact.workspaceId); // And this too
});
```

### Available Prisma Types

```typescript
import type {
  Contact,
  ApiKey,
  Workspace,
  ContactStatus,
  TopicVisibility,
  SegmentType
} from "@prisma/client";
```

## 📡 API Client

### Fluent Request Builder

```typescript
import { apiRequest } from "@/tests/utils";

// Build complex requests
const request = apiRequest("/contacts")
  .method("POST")
  .auth(apiKey.key)
  .body({ email: "test@example.com" })
  .header("X-Custom", "value")
  .build();
```

### Quick Helpers

```typescript
import { get, post, put, del } from "@/tests/utils";

// Simple requests
const getRequest = get("/contacts", apiKey.key);
const postRequest = post("/contacts", data, apiKey.key);
const putRequest = put("/contacts/123", data, apiKey.key);
const deleteRequest = del("/contacts/123", apiKey.key);
```

## 🔑 API Key Management

### Create API Keys

```typescript
import { 
  createTestApiKey, 
  createFullAccessApiKey, 
  createReadOnlyApiKey 
} from "@/tests/utils";

// Custom scopes
const apiKey = await createTestApiKey({
  workspaceId: "workspace-123",
  scopes: ["read:contacts", "write:contacts"]
});

// Pre-configured keys
const fullAccess = await createFullAccessApiKey("workspace-123");
const readOnly = await createReadOnlyApiKey("workspace-123");
```

### Cleanup

```typescript
import { cleanupApiKeys, deleteApiKey } from "@/tests/utils";

// Clean all keys for workspace
await cleanupApiKeys("workspace-123");

// Delete specific key
await deleteApiKey("key-id");
```

## 🏭 Data Factories

### Generate Fake Data

```typescript
import { 
  fakeContact, 
  fakeMinimalContact, 
  fakeContacts,
  fakeTag,
  fakeTopic,
  fakeSegment 
} from "@/tests/utils";

// Single contact with all fields
const contact = fakeContact();

// Minimal contact (only required fields)
const minimal = fakeMinimalContact();

// Multiple contacts
const contacts = fakeContacts(5);

// Override specific fields
const specificContact = fakeContact({
  email: "test@example.com",
  status: "SUBSCRIBED"
});

// Other entities
const tag = fakeTag({ name: "VIP", color: "#ff0000" });
const topic = fakeTopic({ visibility: "PUBLIC" });
const segment = fakeSegment({ type: "DYNAMIC" });
```

## 🏢 Workspace Management

### Setup & Cleanup

```typescript
import { 
  createTestWorkspace, 
  cleanupWorkspace,
  createTestContacts 
} from "@/tests/utils";

// Create workspace
const workspace = createTestWorkspace();

// Create test data
const contactsData = fakeContacts(3);
await createTestContacts(workspace.id, contactsData);

// Clean everything up
await cleanupWorkspace(workspace.id);
```

## 📝 Complete Test Example

```typescript
import { POST } from "@/app/api/v1/contacts/route";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  createTestWorkspace,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  cleanupWorkspace,
  fakeContact,
  post,
  type TestWorkspace,
  type CreatedApiKey,
} from "@/tests/utils";

let testWorkspace: TestWorkspace;
let fullAccessApiKey: CreatedApiKey;
let readOnlyApiKey: CreatedApiKey;

beforeAll(async () => {
  testWorkspace = createTestWorkspace();
  fullAccessApiKey = await createFullAccessApiKey(testWorkspace.id);
  readOnlyApiKey = await createReadOnlyApiKey(testWorkspace.id);
});

afterAll(async () => {
  await cleanupWorkspace(testWorkspace.id);
});

describe("POST /api/v1/contacts", () => {
  test("should create a contact", async () => {
    const contactData = fakeContact();
    const request = post("/contacts", contactData, fullAccessApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(201);
    expect(responseData.type).toBe("contact");
    expect(responseData.id).toBeDefined();
  });

  test("should reject without proper scope", async () => {
    const contactData = fakeContact();
    const request = post("/contacts", contactData, readOnlyApiKey.key);

    const response = await POST(request);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(responseData.error).toContain("scope");
  });
});
```

## 🎯 Benefits

- **🧹 Clean Tests**: No boilerplate, focus on what matters
- **🔄 Consistent**: Same patterns across all tests
- **🎲 Realistic Data**: Faker generates believable test data
- **🚀 Fast Setup**: Quick workspace and API key creation
- **🧽 Easy Cleanup**: Automatic cleanup handles foreign keys
- **🔧 Flexible**: Override any field as needed
- **📖 Readable**: Fluent API makes tests self-documenting
