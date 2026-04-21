# Quickstart

The 5-minute guide from `go get` to first successful API call.

## 1. Install

```bash
go get github.com/kibamail/kibamail/sdks/go@v0.1.0
```

Requires Go 1.23 or newer.

## 2. Get an API key

Create one in the dashboard under **Settings → API Keys**, or via the admin API:

```bash
curl https://api.kibamail.com/v1/api-keys \
  -H "Authorization: Bearer $KB_ADMIN_TOKEN" \
  -d '{"name":"my-service","scopes":["write:emails","read:emails"]}'
```

Store it in your secret manager. Never commit it.

## 3. Instantiate one client per process

```go
package main

import (
    "os"
    kibamail "github.com/kibamail/kibamail/sdks/go"
)

var kb = kibamail.NewClient(os.Getenv("KIBAMAIL_API_KEY"))
```

The client is goroutine-safe — share it. Do **not** create one per request; that defeats connection pooling in the underlying `http.Client`.

## 4. Send your first email

```go
res, err := kb.Emails.Send(&kibamail.SendEmailRequest{
    From:    "Acme <hello@acme.com>",
    To:      "user@example.com",
    Subject: "Welcome to Acme",
    Html:    "<h1>You're in.</h1>",
    Text:    "You're in.",
})
if err != nil {
    // See docs/errors.md for full handling
    return err
}
// res.ID is a stable handle you can store and query later
log.Printf("queued email %s", res.ID)
```

## 5. Use context for cancellation

In request handlers, pass the incoming `ctx`:

```go
func handler(w http.ResponseWriter, r *http.Request) {
    _, err := kb.Emails.SendWithContext(r.Context(), &kibamail.SendEmailRequest{...})
    // ...
}
```

Every method has a `*WithContext` variant. Use it.

## 6. Point at staging / self-hosted

```bash
export KIBAMAIL_BASE_URL=https://api.staging.kibamail.com
```

or programmatically:

```go
u, _ := url.Parse("https://api.staging.kibamail.com")
kb.BaseURL = u
```

## Next steps

- [Emails](./emails.md) — templates, attachments, batch, event timelines
- [Contacts](./contacts.md) — subscribers + properties
- [Errors](./errors.md) — how to handle validation + rate limits
- [Performance](./performance.md) — HTTP client tuning, pagination, backoff
