# Transactional Email Reference

Send individual emails (password resets, receipts, notifications) and track delivery.

## emails send

Send a transactional email. Requires a verified sending domain for real recipients.

**Flags:**
- `--from string` — Sender email address **[REQUIRED]** (must be from a verified domain)
- `--to string` — Recipient email address **[REQUIRED]**
- `--subject string` — Email subject
- `--html string` — HTML body
- `--text string` — Plain text body (auto-generated from HTML if omitted)
- `--reply-to-email string` — Reply-to email
- `--reply-to-name string` — Reply-to display name
- `--template-id string` — Template slug (use instead of subject/html)
- `--template-variables string` — Template variables as JSON
- `--metadata string` — Custom tracking metadata as JSON

**Examples:**
```bash
# Send with inline content
kibamail emails send --from noreply@yourdomain.com --to user@example.com --subject "Your receipt" --html "<h1>Thanks!</h1><p>Order #12345</p>" --json

# Send with template
kibamail emails send --from noreply@yourdomain.com --to user@example.com --template-id welcome-email --template-variables '{"firstName":"Alice"}' --json

# Send with metadata for tracking
kibamail emails send --from noreply@yourdomain.com --to user@example.com --subject "Reset password" --html "<p>Click here</p>" --metadata '{"userId":"u123"}' --json
```

Either `--subject` + `--html` or `--template-id` is required. Template variables use `{{variableName}}` syntax.

---

## emails list

List sent transactional emails with filters.

**Flags:**
- `--limit int` — Max results (default 20)
- `--after string` — Cursor for next page
- `--status string` — Filter: QUEUED, SENT, DELIVERED, BOUNCED, COMPLAINED, FAILED
- `--to string` — Filter by recipient (partial match)
- `--subject string` — Filter by subject (partial match)
- `--from-date string` — Start date (ISO 8601)
- `--to-date string` — End date (ISO 8601)

**Examples:**
```bash
kibamail emails list --json
kibamail emails list --status DELIVERED --limit 50 --json
kibamail emails list --to user@example.com --json
kibamail emails list --from-date 2026-03-01T00:00:00Z --to-date 2026-03-31T23:59:59Z --json
```

---

## emails show \<id\>

Get full details: status, open/click counts, timestamps, metadata.

```bash
kibamail emails show eml_abc123 --json
```

---

## emails events \<id\>

Get chronological event timeline (delivery, opens, clicks, bounces).

```bash
kibamail emails events eml_abc123 --json
```

---

## emails content \<id\>

Get the HTML and plain text content that was sent.

```bash
kibamail emails content eml_abc123 --json
```

---

## Sandbox Testing

Send to `@kibamail.dev` addresses without a verified domain:

| Address | Simulates |
|---|---|
| `delivered@kibamail.dev` | Successful delivery |
| `bounced@kibamail.dev` | Hard bounce |
| `softbounce@kibamail.dev` | Soft bounce |
| `complained@kibamail.dev` | Spam complaint |
| `failed@kibamail.dev` | Permanent failure |
| `opened@kibamail.dev` | Delivered + opened |
| `clicked@kibamail.dev` | Delivered + opened + clicked |

Add `+label` for tracking: `delivered+campaign1@kibamail.dev`

```bash
kibamail emails send --from test@example.com --to delivered@kibamail.dev --subject "Test" --html "<p>Testing</p>" --json
```
