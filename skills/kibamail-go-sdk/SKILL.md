---
name: kibamail-go-sdk
description: >
  Integrate the Kibamail Go SDK into Go backend applications. Use this skill
  whenever the user imports `github.com/kibamail/kibamail/sdks/go`, calls
  `kibamail.NewClient(...)`, or asks about sending emails, managing contacts,
  forms, broadcasts, automations, or any email marketing feature from Go code.
  Also trigger when the user mentions the Kibamail Go SDK, the Kibamail API
  from Go, or wants to add transactional email / marketing automation to a Go
  service (Gin, Echo, Fiber, chi, net/http, worker, or CLI).
---

# Kibamail Go SDK

The `github.com/kibamail/kibamail/sdks/go` module provides a typed Go client for the Kibamail API. It handles authentication, URL building, JSON marshaling, and structured error parsing. Zero runtime dependencies.

**Current version:** `v0.1.0` · **Go:** `1.23+`

## Installation

```bash
go get github.com/kibamail/kibamail/sdks/go@latest
```

Import as:

```go
import kibamail "github.com/kibamail/kibamail/sdks/go"
```

## Quick Start

```go
package main

import (
    "context"
    "log"
    "os"
    "time"

    kibamail "github.com/kibamail/kibamail/sdks/go"
)

func main() {
    kb := kibamail.NewClient(os.Getenv("KIBAMAIL_API_KEY"))

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    res, err := kb.Contacts.CreateWithContext(ctx, &kibamail.CreateContactRequest{
        Email:     "user@example.com",
        FirstName: "Jane",
    })
    if err != nil {
        log.Fatal(err)
    }
    log.Println("contact id:", res.ID)
}
```

## Client Initialization

### Default (reads `KIBAMAIL_BASE_URL` from env, defaults to production)

```go
kb := kibamail.NewClient(os.Getenv("KIBAMAIL_API_KEY"))
```

### Custom HTTP client (timeouts, retries, tracing, proxy)

```go
httpClient := &http.Client{
    Timeout: 15 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        200,
        MaxIdleConnsPerHost: 50,
        IdleConnTimeout:     90 * time.Second,
    },
}
kb := kibamail.NewCustomClient(httpClient, os.Getenv("KIBAMAIL_API_KEY"))
```

### Staging / self-hosted base URL

```go
// Option A: env var (read at client construction)
os.Setenv("KIBAMAIL_BASE_URL", "https://api.staging.kibamail.com")
kb := kibamail.NewClient(apiKey)

// Option B: override after construction
kb := kibamail.NewClient(apiKey)
kb.BaseURL, _ = url.Parse("https://api.staging.kibamail.com/")
```

## Context & Method Variants

Every method has two forms:

| Form | When to use |
|---|---|
| `Client.Emails.Send(req)` | Scripts, CLIs, short-lived jobs. Uses `context.Background()`. |
| `Client.Emails.SendWithContext(ctx, req)` | **All server code.** Always pass the request-scoped `ctx`. |

```go
func handler(w http.ResponseWriter, r *http.Request) {
    res, err := kb.Emails.SendWithContext(r.Context(), &kibamail.SendEmailRequest{...})
    // ...
}
```

## Client is Goroutine-Safe — Share One

Create **one** `*kibamail.Client` per process. Inject it as a dependency. Do not construct a new client per request — it defeats HTTP connection pooling.

```go
// Wire at startup
type App struct { KB *kibamail.Client }

func NewApp() *App {
    return &App{KB: kibamail.NewClient(os.Getenv("KIBAMAIL_API_KEY"))}
}
```

## Available Services

Every resource is exposed as a typed service on `*kibamail.Client`:

| Service | Field | Description |
|---|---|---|
| Contacts | `kb.Contacts` | CRUD + cursor pagination + filter search |
| Contact Properties | `kb.ContactProperties` | Custom contact field definitions |
| Topics | `kb.Topics` | Interest lists contacts can subscribe to |
| Segments | `kb.Segments` | Dynamic contact groups |
| Forms | `kb.Forms` | Opt-in forms, deploy assets, versioning |
| Emails | `kb.Emails` | Transactional send + introspection |
| Broadcasts | `kb.Broadcasts` | One-off marketing campaigns |
| Marketing Emails | `kb.MarketingEmails` | Reusable campaign/template HTML |
| Automations | `kb.Automations` | Trigger-driven workflows |
| Domains | `kb.Domains` | Sending domain + DNS verification |
| Inbox | `kb.Inbox` | Inbound mail / conversation threading |
| Events | `kb.Events` | Custom analytics events |
| API Keys | `kb.ApiKeys` | API key administration |

## Response & Error Handling

Every method returns `(*T, error)`. On success `err == nil`; on failure `err` wraps one of two typed errors:

```go
_, err := kb.Contacts.CreateWithContext(ctx, req)
switch {
case err == nil:
    // success

case errors.Is(err, kibamail.ErrRateLimit):
    var rl *kibamail.RateLimitError
    errors.As(err, &rl)
    // honor rl.RetryAfter (seconds), back off, retry

default:
    var apiErr *kibamail.APIError
    if errors.As(err, &apiErr) {
        // apiErr.StatusCode, apiErr.Code, apiErr.Message,
        // apiErr.Hint, apiErr.RequestID, apiErr.ValidationErrors
        for _, v := range apiErr.ValidationErrors {
            log.Printf("  %s: %s", v.Field, v.Message)
        }
    } else {
        // transport error (DNS, TLS, context cancellation)
    }
}
```

**Always log `apiErr.RequestID`** — support triages failed calls by that ID.

### Retry policy

| Condition | Retry? |
|---|---|
| `*RateLimitError` (429) | Yes — honor `RetryAfter` |
| `500 / 502 / 503 / 504` | Yes — exponential backoff |
| Transport error / `context.DeadlineExceeded` | Yes — small backoff |
| `401 / 403` | No — rotate the key |
| `400 / 422` validation errors | No — fix the request |
| `409 *_already_exists` | No — treat as upsert-idempotent |

The SDK does **not** auto-retry. Wrap your calls in a thin retry helper if needed.

## Pagination

List endpoints use cursor pagination. `ListOptions.Limit` max is 200.

```go
limit := 200
var cursor *string

for {
    page, err := kb.Contacts.ListWithContext(ctx, &kibamail.ListOptions{
        Limit: &limit,
        After: cursor,
    })
    if err != nil { return err }
    for _, c := range page.Data { /* process */ }
    if !page.HasMore { break }
    last := page.Data[len(page.Data)-1].ID
    cursor = &last
}
```

## Pointer Helper (ergonomics)

The SDK uses `*string`, `*int`, `*bool` for optional fields so zero-values aren't accidentally sent. Define a generic pointer helper once:

```go
func ptr[T any](v T) *T { return &v }

// usage
kb.Emails.List(&kibamail.ListEmailsOptions{Limit: ptr(50), Status: ptr("DELIVERED")})
```

## Reference Files

Load these on demand for detailed per-resource examples and production patterns:

| File | When to read |
|---|---|
| `references/emails.md` | Sending transactional email, templates, attachments, batch, delivery introspection |
| `references/contacts.md` | Create, update, search, upsert, status lifecycle, custom properties |
| `references/forms.md` | Create forms, deploy HTML/assets, publish, versioning, double-opt-in |
| `references/broadcasts.md` | One-off campaigns, segments/topics, scheduling, per-send stats |
| `references/marketing-emails.md` | Reusable template CRUD, Handlebars variables, preview, stats |
| `references/transactional-email-templates.md` | HTML-only transactional templates — create, version, publish, resolve from Emails.Send |
| `references/automations.md` | Trigger types, manual trigger, versioning, dry-run simulate |
| `references/other-resources.md` | Domains, Topics, Segments, ContactProperties, Events, Inbox, ApiKeys |
| `references/integration-patterns.md` | net/http, Gin, Echo, Fiber, chi wiring + graceful shutdown |

## Hard Requirements

- **Always use `*WithContext` in server code.** The context-less variants are only for scripts.
- **Reuse one `*Client`.** Injected via constructor, never created per request.
- **Set an HTTP client `Timeout`.** The default has keep-alives but no top-level timeout — set 10–15s on the `*http.Client` you pass to `NewCustomClient` for production.
- **Never embed the API key in code.** Read from env or secret manager.
- **HTML email content:** for marketing/broadcast/transactional HTML, generate with a templating library (e.g. [`mjml-go`](https://github.com/Boostport/mjml), `html/template` + MJML) — don't hand-concatenate strings.
- **Template compliance variables:** when sending via a marketing-email template, the template HTML must include `{{business_address}}`, `{{unsubscribe_url}}`, `{{terms_url}}`, `{{privacy_url}}`. Raw `html` sends are exempt.
