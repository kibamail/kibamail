# Transactional Email Templates

HTML-only reusable templates for transactional messages (receipts, OTP,
password reset, magic links, order confirmations). Unlike marketing email
templates, these:

- carry raw HTML as the source of truth (no visual-editor JSON)
- require only `{{business_address}}` for compliance (no unsubscribe)
- are referenced by `POST /v1/emails/send` via their `uniqueSlug`

**API path:** `/v1/transactional-email-templates`
**Service:** `client.TransactionalEmailTemplates`
**Scopes:** `read:templates`, `manage:templates`

---

## Lifecycle

```
          create (publish:true)                 create-version
 ┌──────┐ ──────────────────► ┌───────────┐ ──────────────────► ┌─────────┐
 │ none │                     │ PUBLISHED │                     │  DRAFT  │
 └──────┘                     └───────────┘                     └─────────┘
     │  create (publish:false)       ▲                                │
     └────────────┐                   │ publish (promotes              │
                  ▼                   │ and archives previous)         │
              ┌───────┐               └────────────────────────────────┘
              │ DRAFT │
              └───────┘
```

- **DRAFT** → editable via `Update`, can be published or deleted.
- **PUBLISHED** → immutable, resolvable by `POST /v1/emails/send`.
- **ARCHIVED** → previous versions after a successor is published.

Only one DRAFT per template family at a time. Only one PUBLISHED at a time.

---

## Create and publish in one call (recommended)

```go
import (
    "context"
    "os"

    kibamail "github.com/kibamail/kibamail/sdks/go"
)

html, err := os.ReadFile("templates/receipt.html")
if err != nil {
    return err
}

resp, err := client.TransactionalEmailTemplates.CreateWithContext(ctx,
    &kibamail.CreateTransactionalEmailTemplateRequest{
        Name:        "Order Receipt",
        UniqueSlug:  "order-receipt-v1",
        Subject:     "Receipt for order #{{orderNumber}}",
        PreviewText: "Thanks for your order",
        Html:        string(html),
        TrackClicks: kibamail.BoolPtr(true),
        TrackOpens:  kibamail.BoolPtr(true),
        // Publish defaults to true server-side; pass BoolPtr(false) for DRAFT.
    },
)
```

On success `resp.Status == "PUBLISHED"` and you can immediately send:

```go
_, err = client.Emails.SendWithContext(ctx, &kibamail.SendEmailRequest{
    From: kibamail.EmailAddress{Email: "orders@yourdomain.com"},
    To:   []kibamail.EmailAddress{{Email: "customer@example.com"}},
    Template: &kibamail.EmailTemplateReference{
        ID: "order-receipt-v1", // the uniqueSlug
        Variables: map[string]any{
            "orderNumber": "A-1138",
            "firstName":   "Alex",
        },
    },
})
```

---

## HTML requirements

### Compliance (transactional)

The only required variable is `{{business_address}}`. The SDK will reject
HTML missing it with a 400 `VALIDATION_FAILED`.

**Do not** include `{{unsubscribe_url}}` in transactional mail — it
confuses recipients and some regulators treat it as a marketing signal.
Transactional mail is functional by definition.

Marketing compliance variables (`{{unsubscribe_url}}`, `{{terms_url}}`,
`{{privacy_url}}`) are only required for broadcasts, automation marketing
emails, and double-opt-in forms — not here.

### Handlebars-compatible variables

Use `{{variableName}}` syntax. Resolution at send time happens against:

1. `template.variables` from the send request (highest priority)
2. Workspace compliance settings (`business_address`, etc.)

Unsubstituted variables are preserved verbatim — failing loud is safer
than silently sending `"Hello "` instead of `"Hello Alex"`.

### Declared variables (optional)

Pass typed definitions for documentation + type-check-at-send:

```go
req.Variables = []kibamail.VariableDefinition{
    {ID: "orderNumber", Name: "orderNumber", Type: "text"},
    {ID: "total",       Name: "total",       Type: "number"},
}
```

If the send call passes a `text` variable where a `number` is declared,
the send is rejected.

---

## Editing a published template (versioning)

Published templates are immutable. To ship a new copy:

```go
// 1. Create a DRAFT version — auto-copies subject/html from source
version, _ := client.TransactionalEmailTemplates.CreateVersionWithContext(
    ctx, "tpl_abc",
)

// 2. Edit the new DRAFT
_, _ = client.TransactionalEmailTemplates.UpdateWithContext(ctx, version.ID,
    &kibamail.UpdateTransactionalEmailTemplateRequest{
        Html:    string(newHtml),
        Subject: "Updated subject",
    },
)

// 3. Publish — this archives the current live version atomically
_, _ = client.TransactionalEmailTemplates.PublishWithContext(ctx, version.ID)
```

Subsequent sends referencing the original `uniqueSlug` resolve to the new
published version. No code change on the send side.

List all versions of a template family with
`ListVersionsWithContext(ctx, templateID)`.

---

## Preview before publishing

```go
preview, err := client.TransactionalEmailTemplates.PreviewWithContext(
    ctx, templateID,
)
if err != nil { return err }
_ = os.WriteFile("preview.html", []byte(preview.Html), 0o644)
```

The `Html` field has built-in `SAMPLE_VARIABLES` (e.g. `firstName → "Jane"`)
substituted so you can open the file in a browser without a live send. Use
in CI to snapshot-test design regressions.

---

## Error handling

| Status | Code | Meaning | Fix |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | HTML missing `{{business_address}}` or malformed | Append compliance footer |
| 400 | `INVALID_PARAMETER` | Update called on PUBLISHED template | Create a new version first |
| 404 | `RESOURCE_NOT_FOUND` | Template id or slug not in workspace | Check `uniqueSlug` / ID |
| 409 | `RESOURCE_ALREADY_EXISTS` | Duplicate `uniqueSlug` | Choose a unique slug or update existing |

Use `errors.As(err, &apiErr)` on `*kibamail.APIError` to branch on `Code`.

---

## CLI

The `kibamail` binary wraps every method:

```bash
kibamail transactional-email-templates create \
  --name "Order Receipt" \
  --slug order-receipt-v1 \
  --subject "Receipt for order #{{orderNumber}}" \
  --html-file templates/receipt.html \
  --sender-identity-id si_xxx

kibamail transactional-email-templates list
kibamail transactional-email-templates show tpl_abc
kibamail transactional-email-templates preview tpl_abc
kibamail transactional-email-templates create-version tpl_abc
kibamail transactional-email-templates update tpl_abc --html-file templates/receipt-v2.html
kibamail transactional-email-templates publish tpl_abc
```

**`--html-file` vs `--html`:** always prefer `--html-file` — inline HTML
breaks on Handlebars `{{ }}`, CSS curly braces, backticks, and multi-line
bodies. The two flags are mutually exclusive; use one or the other.

Aliases `tet` and `transactional-templates` work everywhere
`transactional-email-templates` does.

---

## When to use this vs. inline HTML on Emails.Send

| Situation | Use |
|---|---|
| One-off ad-hoc send | Inline `Html` on `SendEmailRequest` |
| Same template fired from >1 call site | `TransactionalEmailTemplates` + `uniqueSlug` |
| Need to version / A-B / approve before rollout | `TransactionalEmailTemplates` + `CreateVersion` → `Publish` |
| Non-engineer needs to edit the template | Internal dashboard (visual editor) — still resolvable from `Emails.Send` by the same `uniqueSlug` |

The slug namespace is shared with the dashboard. An ops-owned template
edited in the UI and an engineering-owned template uploaded via this SDK
are indistinguishable from the send side.
