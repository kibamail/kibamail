# Kibamail Go SDK

Official Go SDK for the [Kibamail](https://kibamail.com) API — transactional email, marketing campaigns, contacts, forms, automations.

[![Go Reference](https://pkg.go.dev/badge/github.com/kibamail/kibamail/sdks/go.svg)](https://pkg.go.dev/github.com/kibamail/kibamail/sdks/go)
[![Go Report Card](https://goreportcard.com/badge/github.com/kibamail/kibamail/sdks/go)](https://goreportcard.com/report/github.com/kibamail/kibamail/sdks/go)

**Version:** `v0.1.0` · **Go:** `1.23+` · **Status:** stable

---

## Install

```bash
go get github.com/kibamail/kibamail/sdks/go@v0.1.0
```

## 30-second example

```go
package main

import (
    "log"
    kibamail "github.com/kibamail/kibamail/sdks/go"
)

func main() {
    client := kibamail.NewClient("kb_your_api_key")

    res, err := client.Emails.Send(&kibamail.SendEmailRequest{
        From:    "Acme <hello@acme.com>",
        To:      "user@example.com",
        Subject: "Welcome",
        Html:    "<h1>Hello</h1>",
        Text:    "Hello",
    })
    if err != nil {
        log.Fatal(err)
    }
    log.Println("email id:", res.ID)
}
```

## Documentation

Deep-dives for each resource, with production patterns, live in [`docs/`](./docs):

| Guide | Use when you need to |
|---|---|
| [Quickstart](./docs/quickstart.md) | Get an authenticated client running |
| [Emails](./docs/emails.md) | Send transactional mail, templates, attachments, batch, introspect events |
| [Contacts](./docs/contacts.md) | Create/update/search subscribers, manage properties and topics |
| [Forms](./docs/forms.md) | Build opt-in forms with double-opt-in flows |
| [Broadcasts](./docs/broadcasts.md) | Schedule one-off campaigns to segments |
| [Marketing Emails](./docs/marketing-emails.md) | Manage reusable templates for campaigns and automations |
| [Automations](./docs/automations.md) | Build trigger-based drip flows |
| [Errors](./docs/errors.md) | Handle `*APIError`, validation, and rate limits correctly |
| [Performance](./docs/performance.md) | Reuse clients, tune HTTP, paginate, respect rate limits |

## Services on the client

Every resource is exposed as a typed service on `*kibamail.Client`:

```go
client.Emails              // transactional sending + introspection
client.Contacts            // subscribers
client.ContactProperties   // custom field definitions
client.Topics              // interest lists
client.Segments            // dynamic contact segments
client.Forms               // hosted / embedded opt-in forms
client.Broadcasts          // one-off marketing sends
client.MarketingEmails     // reusable campaign templates
client.Automations         // trigger-driven workflows
client.Domains             // sending-domain config + DNS verification
client.Inbox               // inbound mail parsing
client.Events              // webhook event streams
client.ApiKeys             // API key management (for admin tokens)
```

Every method exists in two forms — the default passes `context.Background()`, the `*WithContext` variant takes an explicit `context.Context`. Always use `WithContext` in request-scoped code:

```go
email, err := client.Emails.GetWithContext(ctx, emailID)
```

## Configuration

| Knob | How |
|---|---|
| API key | `kibamail.NewClient("kb_...")` |
| Custom `http.Client` (timeouts, retries, proxies) | `kibamail.NewCustomClient(httpClient, "kb_...")` |
| Custom base URL (staging, self-host) | Env `KIBAMAIL_BASE_URL=https://api.staging.kibamail.com` or mutate `client.BaseURL` after construction |

## Errors

All SDK methods return a typed error. API-level failures unwrap to `*kibamail.APIError` (with `Code`, `Message`, `Hint`, `RequestID`, `ValidationErrors`). Rate limits unwrap to `*kibamail.RateLimitError` (and satisfy `errors.Is(err, kibamail.ErrRateLimit)`).

```go
if _, err := client.Contacts.Create(req); err != nil {
    var apiErr *kibamail.APIError
    if errors.As(err, &apiErr) && apiErr.Code == "validation_failed" {
        for _, v := range apiErr.ValidationErrors {
            log.Printf("%s: %s", v.Field, v.Message)
        }
    }
}
```

Full matrix in [`docs/errors.md`](./docs/errors.md).

## Contributing

```bash
make tidy fmt build test   # full local check
make mock-start            # spin up SDK test infra
make test-coverage         # HTML coverage report
```

## License

MIT © Kibamail
