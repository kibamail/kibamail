# Emails

Transactional sending, templates, attachments, and introspection via `client.Emails`.

## Send a simple email

```go
res, err := kb.Emails.Send(&kibamail.SendEmailRequest{
    From:    "Acme <hello@acme.com>",
    To:      "user@example.com",
    Subject: "Order confirmed",
    Html:    "<p>Thanks for your order.</p>",
    Text:    "Thanks for your order.",
})
// res.ID → persist this. It's your handle for later Get/Events/Content calls.
```

**Always send both `Html` and `Text`.** It improves deliverability with strict MTAs and Gmail's spam scoring.

## Multiple recipients

The `To` field is `interface{}` — pass a string or a slice:

```go
// single
To: "a@example.com",

// multiple
To: []string{"a@example.com", "b@example.com", "c@example.com"},
```

Each recipient gets a separate send and separate `id` — but the SDK returns a single `SendEmailResponse` with the orchestration id. Use `Events` to observe per-recipient delivery.

## Reply-To

```go
kb.Emails.Send(&kibamail.SendEmailRequest{
    From:    "noreply@acme.com",
    ReplyTo: &kibamail.SendEmailReplyTo{Email: "support@acme.com", Name: "Acme Support"},
    To:      "user@example.com",
    Subject: "Ticket opened",
    Html:    "...",
})
```

## Templates

Use a stored Marketing Email template instead of inline HTML:

```go
kb.Emails.Send(&kibamail.SendEmailRequest{
    From:    "hello@acme.com",
    To:      "user@example.com",
    Subject: "Welcome {{firstName}}",
    Template: &kibamail.SendEmailTemplate{
        ID: "mkemail_abc123",
        Variables: map[string]interface{}{
            "firstName": "Alex",
            "planName":  "Enterprise",
            "cta_url":   "https://app.acme.com/dashboard",
        },
    },
})
```

`Subject` itself supports `{{variables}}` from the same map. If you set both `Template.ID` **and** `Html`, the template wins.

## Attachments

Attachments must be **base64-encoded** on the wire:

```go
import "encoding/base64"

pdf, _ := os.ReadFile("invoice.pdf")

kb.Emails.Send(&kibamail.SendEmailRequest{
    From: "billing@acme.com",
    To:   "user@example.com",
    Subject: "Your invoice",
    Html: "<p>Attached.</p>",
    Attachments: []kibamail.SendEmailAttachment{{
        Filename:    "invoice.pdf",
        Content:     base64.StdEncoding.EncodeToString(pdf),
        ContentType: "application/pdf",
    }},
})
```

Keep total payload (HTML + text + attachments) under **10 MB** after base64 expansion (~7.5 MB raw). Anything larger: host the file and send a link instead.

## Metadata & tags

```go
Metadata: map[string]string{
    "order_id":   "ord_9a8b7c",
    "user_tier":  "enterprise",
},
```

Metadata is echoed back on webhooks and `EmailDetail`. Great for correlating opens/clicks with your app state. Keep keys short, values ≤ 256 chars.

## Idempotency

The send endpoint is **not idempotent** — retrying a failed send will double-send if the first actually got through but the response didn't reach you. Two mitigations:

1. **Store `res.ID` before returning success to your caller.** If you crash mid-flight, you'll know whether to retry.
2. **Use a unique per-business-event metadata key** (e.g. `metadata["idempotency_key"] = "order:9a8b7c:confirmation"`). Query recent sends with that filter before retrying.

## Batch sending

The API exposes a single endpoint per call. For bulk (≥1000 messages) use **Broadcasts** ([see broadcasts.md](./broadcasts.md)) — it's optimized server-side.

For medium bulk (≤1000), fan out with a bounded worker pool:

```go
sem := make(chan struct{}, 20) // 20 concurrent in-flight
var wg sync.WaitGroup
for _, r := range recipients {
    wg.Add(1)
    sem <- struct{}{}
    go func(to string) {
        defer wg.Done()
        defer func() { <-sem }()
        kb.Emails.SendWithContext(ctx, &kibamail.SendEmailRequest{...})
    }(r)
}
wg.Wait()
```

Mind the [rate limit](./errors.md#rate-limits). Handle `ErrRateLimit` by respecting `RetryAfter`.

## Introspection

### Get a single email

```go
detail, err := kb.Emails.Get(emailID)
// detail.Status: "queued" | "sent" | "delivered" | "bounced" | "complained"
// detail.OpenCount, detail.ClickCount
// detail.DeliveredAt, detail.FirstOpenedAt, ...
```

### List emails (paginated, filterable)

```go
limit := 50
status := "delivered"
toFilter := "user@example.com"

emails, err := kb.Emails.List(&kibamail.ListEmailsOptions{
    Limit:  &limit,
    Status: &status,
    To:     &toFilter,
})

for emails.HasMore {
    last := emails.Data[len(emails.Data)-1].ID
    emails, _ = kb.Emails.List(&kibamail.ListEmailsOptions{
        Limit: &limit, After: &last, Status: &status,
    })
}
```

Supported filters: `Status`, `To`, `Subject`, `FromDate`, `ToDate` (ISO 8601).

### Event timeline

```go
evs, _ := kb.Emails.Events(emailID)
for _, e := range evs.Events {
    // e.Type: "queued" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained"
    // e.Origin: device/browser/country for opens/clicks
    // e.Response: SMTP response for bounces
    fmt.Println(e.Timestamp, e.Type)
}
```

### Rendered content

```go
content, _ := kb.Emails.Content(emailID)
// content.Html / content.Text — exactly what was sent
```

## Common pitfalls

| Problem | Fix |
|---|---|
| `from_not_verified` error | Domain not DNS-verified. Use `client.Domains.Verify(...)` or verify via dashboard. |
| Emails stuck `status="queued"` for >30s | Check MTA health; sender reputation can also throttle. Query Support with the `res.ID`. |
| Template variables render as `{{firstName}}` literal | Variable not passed in `Template.Variables`. Map keys are case-sensitive. |
| Attachment silently dropped | Exceeded 10 MB payload or bad base64. Verify `ContentType` matches actual bytes. |
