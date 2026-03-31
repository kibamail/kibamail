# Marketing Emails Reference

Marketing emails are reusable HTML email templates used in automation workflows and double opt-in confirmation flows. They support template variables for personalization.

## Create a Marketing Email

```bash
kibamail marketing-emails create --name "Welcome Email" \
  --subject "Welcome, {{firstName}}!" \
  --html '<html><body><h1>Welcome</h1><p>Thanks for subscribing.</p></body></html>' \
  --type AUTOMATION --json
```

**Flags:**
- `--name string` — Template name **[REQUIRED]** (max 255 chars)
- `--subject string` — Email subject line (max 998 chars, supports `{{variables}}`)
- `--preview-text string` — Preview text shown in email clients (max 255 chars)
- `--html string` — Raw HTML content (validated for structure)
- `--sender-identity-id string` — Sender identity ID
- `--reply-to-identity-id string` — Reply-to identity ID
- `--track-clicks boolean` — Enable click tracking (default: true)
- `--track-opens boolean` — Enable open tracking (default: true)
- `--type string` — `AUTOMATION` or `NOTIFICATION` (default: `AUTOMATION`)

**Response (201):**
```json
{"object":"marketing_email","id":"eml_abc123"}
```

---

## List Marketing Emails

```bash
kibamail marketing-emails list --json
kibamail marketing-emails list --limit 20 --json
```

**Flags:**
- `--limit int` — Maximum results per page
- `--after string` — Cursor for next page
- `--before string` — Cursor for previous page

Returns list items with: `id`, `name`, `subject`, `previewText`, `type`, `trackClicks`, `trackOpens`, `createdAt`, `updatedAt`.

---

## Get Marketing Email

```bash
kibamail marketing-emails show <email-id> --json
```

Returns full email details including `html`, `variables` (extracted template variable names), `senderIdentityId`, `replyToIdentityId`.

---

## Update a Marketing Email

```bash
kibamail marketing-emails update <email-id> --subject "New Subject" --json

kibamail marketing-emails update <email-id> --html '<html><body>Updated</body></html>' --json
```

All flags from create are available (all optional). Pass `null` to clear nullable fields (`subject`, `previewText`, `html`, `senderIdentityId`, `replyToIdentityId`).

**Response (200):**
```json
{"object":"marketing_email","id":"eml_abc123"}
```

---

## Delete a Marketing Email

```bash
kibamail marketing-emails delete <email-id> --json
```

Fails with `RESOURCE_CONFLICT` if the email is used by a form's double opt-in configuration. Unlink it from the form first.

---

## Preview a Marketing Email

```bash
kibamail marketing-emails show <email-id> --preview --json
```

Returns HTML with sample variable values substituted (e.g., `{{firstName}}` → `"John"`, `{{confirmation_url}}` → `"#confirm-subscription"`). Useful for testing templates without sending.

**Response:**
```json
{"html":"<html>...rendered...</html>","hasContent":true}
```

---

## Get Marketing Email Stats

```bash
kibamail marketing-emails show <email-id> --stats --json
```

Returns delivery analytics aggregated across all forms using this email (e.g., double opt-in sends).

**Response fields:**
- `totalSent`, `totalDelivered`, `totalOpened`, `totalClicked`, `totalBounced`, `totalComplained` — counts
- `openRate`, `clickRate` — decimal rates (e.g., 0.45 = 45%)
- `usedByForms` — array of `{id, name}` for forms using this email

---

## Template Variables

Use `{{variableName}}` syntax in subject and HTML. Available variables:

| Variable | Description |
|---|---|
| `{{email}}` | Contact email address |
| `{{firstName}}` / `{{first_name}}` | Contact first name |
| `{{lastName}}` / `{{last_name}}` | Contact last name |
| `{{phone}}` | Contact phone |
| `{{country}}` | Contact country |
| `{{timezone}}` | Contact timezone |
| `{{city}}` | Contact city |
| `{{confirmation_url}}` | Double opt-in confirmation link |
| `{{unsubscribe_url}}` | Unsubscribe link |
| `{{preferences_url}}` | Email preferences link |

Also supports dot notation: `{{contact.email}}`, `{{contact.first_name}}`, `{{contact.last_name}}`.

---

## Common Errors

| Code | Meaning |
|---|---|
| `RESOURCE_NOT_FOUND` | Marketing email not found in this workspace |
| `VALIDATION_FAILED` | Invalid HTML structure |
| `RESOURCE_CONFLICT` | Cannot delete — email is used by a form |
