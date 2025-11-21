# Contacts API - Cursor-Based Pagination

The Contacts API

## Response Format

All paginated endpoints return responses with this structure:

```json
{
  "object": "list",
  "hasMore": true,
  "data": [
    {
      "id": "contact_123",
      "workspaceId": "workspace_456",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "country": "US",
      "timezone": "America/New_York",
      "city": "New York",
      "status": "SUBSCRIBED",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Pagination Parameters

- **`limit`** - Number of items to return per page (default: 20, max: 100)
- **`after`** - Cursor to get the next page of results (use contact ID)
- **`before`** - Cursor to get the previous page of results (use contact ID)

## Examples

### Get first page (default)

```bash
GET /api/v1/contacts
```

### Get first page with limit

```bash
GET /api/v1/contacts?limit=10
```

### Get next page using cursor

```bash
GET /api/v1/contacts?limit=10&after=contact_123
```

### Get previous page using cursor

```bash
GET /api/v1/contacts?limit=10&before=contact_456
```

## Pagination Strategy

1. **Start with first page**: `GET /api/v1/contacts?limit=20`
2. **Check `hasMore`**: If `true`, there are more results
3. **Get next page**: Use the `id` of the last item as the `after` cursor
4. **Continue**: Repeat until `hasMore` is `false`

### Example Flow (TypeScript)

```typescript
import type { Contact } from "@prisma/client";

interface ContactListResponse {
  object: "list";
  hasMore: boolean;
  data: Contact[];
}

let cursor: string | null = null;
let allContacts: Contact[] = [];

do {
  const url = cursor
    ? `/api/v1/contacts?limit=20&after=${cursor}`
    : `/api/v1/contacts?limit=20`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const result: ContactListResponse = await response.json();

  allContacts.push(...result.data);

  // Use the last contact's ID as the cursor for the next page
  cursor =
    result.data.length > 0 ? result.data[result.data.length - 1].id : null;
} while (result.hasMore);
```

## Key Features

- **Stable pagination**: Results remain consistent even if new contacts are added
- **Cursor exclusion**: The cursor contact itself is excluded from results
- **Efficient**: No need to count total items or calculate offsets
