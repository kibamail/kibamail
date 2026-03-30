---
name: kibamail-typescript-sdk
description: >
  Integrate the Kibamail TypeScript/Node.js SDK into applications. Use this skill
  whenever the user imports `kibamail`, uses `new Kibamail(...)`, or asks about
  sending emails, managing contacts, creating forms, or email marketing from
  TypeScript/Node.js code. Also trigger when the user mentions the Kibamail SDK,
  Kibamail API from Node.js, or wants to integrate email features into their app.
---

# Kibamail TypeScript SDK

The `kibamail` npm package provides a fully typed TypeScript SDK for the Kibamail API. It handles authentication, request building, and response typing automatically.

## Installation

```bash
npm install kibamail
# or
pnpm add kibamail
# or
yarn add kibamail
```

## Quick Start

```typescript
import { Kibamail } from "kibamail";

const kibamail = new Kibamail(process.env.KIBAMAIL_API_KEY as string);

const { data, error } = await kibamail.contacts.create({
  email: "user@example.com",
  firstName: "Jane",
});

if (error) {
  console.error(error);
} else {
  console.log("Created contact:", data.id);
}
```

## Client Initialization

```typescript
import { Kibamail } from "kibamail";

// Production — reads from KIBAMAIL_API_KEY env var
const kibamail = new Kibamail(process.env.KIBAMAIL_API_KEY as string);

// Custom base URL (local dev, staging, self hosted)
const kibamail = new Kibamail(process.env.KIBAMAIL_API_KEY as string, {
  baseURL: "http://localhost:18092/api",
});
```

## Response Pattern

Every method returns `{ data, error, response }`:

```typescript
const { data, error, response } = await kibamail.contacts.list();

if (error) {
  console.error(error);
  return;
}

// data is fully typed
console.log(data.data); // array of contacts
console.log(data.hasMore); // pagination
console.log(response.status); // HTTP status
```

## Available Resources

| Resource | Property | Description |
|----------|----------|-------------|
| Contacts | `kibamail.contacts` | CRUD, search contacts |
| Topics | `kibamail.topics` | Email communication topics |
| Segments | `kibamail.segments` | Dynamic contact groups |
| Forms | `kibamail.forms` | Signup forms (create, deploy, publish) |
| Broadcasts | `kibamail.broadcasts` | Email campaigns |
| Emails | `kibamail.emails` | Transactional emails |
| API Keys | `kibamail.apiKeys` | API key management |
| Contact Properties | `kibamail.contactProperties` | Custom contact fields |

## Reference Files

Read these on demand for detailed API examples per resource:

| File | When to read |
|------|-------------|
| `references/contacts.md` | Creating, updating, searching, deleting contacts |
| `references/forms.md` | Creating forms, deploying HTML, publishing |
| `references/emails.md` | Sending transactional emails, checking delivery |
| `references/broadcasts.md` | Creating and sending email campaigns |
| `references/other-resources.md` | Topics, segments, API keys, contact properties |

## Error Handling

```typescript
const { data, error } = await kibamail.contacts.create({
  email: "user@example.com",
});

if (error) {
  // error is the parsed JSON error body
  console.error(error.error.code);    // "RESOURCE_ALREADY_EXISTS"
  console.error(error.error.message); // "A record with this information already exists"
}
```

## TypeScript Types

Types are auto-generated from the OpenAPI spec. Import the `paths` type for advanced usage:

```typescript
import type { paths } from "kibamail/schema";

// Extract request/response types
type CreateContactBody = paths["/v1/contacts"]["post"]["requestBody"]["content"]["application/json"];
type ContactResponse = paths["/v1/contacts"]["post"]["responses"]["201"]["content"]["application/json"];
```

## Pagination

List endpoints use cursor-based pagination:

```typescript
// First page
const page1 = await kibamail.contacts.list({ limit: 20 });

// Next page using the last ID
const lastId = page1.data.data[page1.data.data.length - 1].id;
const page2 = await kibamail.contacts.list({ limit: 20, after: lastId });

if (!page2.data.hasMore) {
  // No more pages
}
```
