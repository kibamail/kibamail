# Contacts Command Reference

## contacts list

List contacts with cursor pagination.

**Flags:**
- `--limit int` — Maximum results per page
- `--after string` — Cursor for next page (use last contact's ID)
- `--before string` — Cursor for previous page

**Examples:**
```bash
kibamail contacts list --json
kibamail contacts list --limit 10 --json
kibamail contacts list --fields id,email,status --json
kibamail contacts list --quiet
kibamail contacts list --limit 50 --after clx123abc --json
```

**Output:**
```json
{"object":"contact_list","data":[{"id":"clx1","email":"alice@example.com","firstName":"Alice","lastName":"","status":"SUBSCRIBED","createdAt":"2026-03-15T10:00:00Z"}],"hasMore":false}
```

Pagination: if `hasMore` is true, pass the last item's `id` as `--after` for the next page.

**Note:** List and search responses do NOT include the `topics` field on each contact. Only the single `contacts show <id>` endpoint includes topics.

---

## contacts show \<id\>

Show a single contact by ID.

**Examples:**
```bash
kibamail contacts show clx123abc --json
```

---

## contacts create

Create a new contact.

**Flags:**
- `--email string` — Email address **[REQUIRED]**
- `--first-name string` — First name
- `--last-name string` — Last name
- `--phone string` — Phone number
- `--country string` — Country
- `--status string` — Contact status: `SUBSCRIBED`, `UNSUBSCRIBED`, `BOUNCED`, `COMPLAINED`, `ARCHIVED`, `UNCONFIRMED`
- `--timezone string` — Contact timezone
- `--city string` — Contact city
- `--subscribed-at string` — Subscription timestamp
- `--unsubscribed-at string` — Unsubscription timestamp
- `--properties string` — Custom contact properties object (JSON)
- `--topics strings` — Topic IDs to subscribe (comma-separated)

**Examples:**
```bash
kibamail contacts create --email alice@example.com --first-name Alice --json
kibamail contacts create --email bob@example.com --topics topicId1,topicId2 --json
```

**Output:**
```json
{"object":"contact","id":"clx_new123"}
```

**Common errors:**
- `CONTACT_ALREADY_EXISTS` — A contact with this email exists. Use `contacts search` to find it, then `contacts update` to modify it.
- `INVALID_EMAIL_FORMAT` — Check the email format. Use `user@domain.com`.

---

## contacts update \<id\>

Update an existing contact. Only provided fields are changed.

**Flags:**
- `--email string` — New email address
- `--first-name string` — New first name
- `--last-name string` — New last name
- `--phone string` — Phone number
- `--country string` — Country
- `--status string` — Contact status: `SUBSCRIBED`, `UNSUBSCRIBED`, `BOUNCED`, `COMPLAINED`, `ARCHIVED`, `UNCONFIRMED`
- `--timezone string` — Contact timezone
- `--city string` — Contact city
- `--subscribed-at string` — Subscription timestamp
- `--unsubscribed-at string` — Unsubscription timestamp
- `--properties string` — Custom contact properties object (JSON)

**Examples:**
```bash
kibamail contacts update clx123 --first-name Updated --json
kibamail contacts update clx123 --email newemail@example.com --json
```

---

## contacts delete \<id\>

Delete a contact. No confirmation prompt — executes immediately.

**Examples:**
```bash
kibamail contacts delete clx123 --json
```

**Output:**
```json
{"object":"contact","id":"clx123"}
```

---

## contacts search

Search contacts using a conditions filter (same format as segment conditions).

Note: The CLI flag is `--conditions`, but the API request body sends this as the `filters` field. The CLI handles this mapping automatically.

**Flags:**
- `--conditions string` — Search conditions as JSON **[REQUIRED]**

**Condition format:**

Field condition:
```json
{"field": "email", "operator": "eq", "value": "alice@example.com"}
```

Available operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `contains`, `startsWith`, `endsWith`, `exists`

Topic conditions:
```json
{"subscribedToTopic": ["topicId1", "topicId2"]}
{"notSubscribedToTopic": ["topicId1"]}
```

Logical operators:
```json
{"$and": [condition1, condition2]}
{"$or": [condition1, condition2]}
{"$not": condition}
```

**Examples:**
```bash
# Find subscribed contacts
kibamail contacts search --conditions '{"field":"status","operator":"eq","value":"SUBSCRIBED"}' --json

# Find contacts in a country
kibamail contacts search --conditions '{"field":"country","operator":"eq","value":"US"}' --json

# Compound conditions
kibamail contacts search --conditions '{"$and":[{"field":"status","operator":"eq","value":"SUBSCRIBED"},{"field":"country","operator":"eq","value":"US"}]}' --json

# Find by email
kibamail contacts search --conditions '{"field":"email","operator":"eq","value":"alice@example.com"}' --json

# Find contacts subscribed to a topic
kibamail contacts search --conditions '{"subscribedToTopic":["topicId1"]}' --json
```
