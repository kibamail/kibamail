# Emails (Transactional) — Go SDK Reference

Service: `kb.Emails`. Source: `sdks/go/emails.go`.

**HTML content:** generate HTML from a templating library (MJML, `html/template`) rather than hand-concatenating strings. Always include a plain-text alternative (`Text`) — it improves deliverability.

**Template compliance variables:** when sending with `Template`, the template body must include `{{business_address}}`, `{{unsubscribe_url}}`, `{{terms_url}}`, `{{privacy_url}}`. Sending raw `Html` bypasses this requirement.

## Send a single email

```go
res, err := kb.Emails.SendWithContext(ctx, &kibamail.SendEmailRequest{
    From:    "Acme <noreply@acme.com>",
    To:      "customer@example.com",   // string OR []string
    Subject: "Order confirmation #1234",
    Html:    htmlBody,
    Text:    plainBody,
})
if err != nil { return err }
log.Println("queued email id:", res.ID)
```

`To` accepts either a single `string` or `[]string` for multi-recipient (up to 50). Use discrete calls per recipient when you need per-recipient metadata.

## Reply-To

```go
kb.Emails.SendWithContext(ctx, &kibamail.SendEmailRequest{
    From:    "noreply@acme.com",
    To:      "customer@example.com",
    Subject: "We got your ticket",
    Html:    html,
    ReplyTo: &kibamail.SendEmailReplyTo{
        Email: "support@acme.com",
        Name:  "Acme Support",
    },
})
```

## Template-based send

```go
kb.Emails.SendWithContext(ctx, &kibamail.SendEmailRequest{
    From: "billing@acme.com",
    To:   "customer@example.com",
    Template: &kibamail.SendEmailTemplate{
        ID: "me_welcome_v3",
        Variables: map[string]interface{}{
            "firstName": "Jane",
            "orderId":   "ord_1234",
            "amount":    "$49.00",
        },
    },
})
```

Subject and body come from the marketing email template; `Variables` are merged with Handlebars `{{ var }}` placeholders.

## Attachments

`Content` must be **base64-encoded**.

```go
import "encoding/base64"

pdfBytes, _ := os.ReadFile("invoice.pdf")

kb.Emails.SendWithContext(ctx, &kibamail.SendEmailRequest{
    From:    "billing@acme.com",
    To:      "customer@example.com",
    Subject: "Your invoice",
    Html:    htmlBody,
    Attachments: []kibamail.SendEmailAttachment{{
        Filename:    "invoice.pdf",
        Content:     base64.StdEncoding.EncodeToString(pdfBytes),
        ContentType: "application/pdf",
    }},
})
```

Per-email attachment size limit: 10 MB total across all attachments.

## Metadata (custom key/value pairs)

```go
kb.Emails.SendWithContext(ctx, &kibamail.SendEmailRequest{
    From:    "noreply@acme.com",
    To:      "customer@example.com",
    Subject: "Receipt",
    Html:    html,
    Metadata: map[string]string{
        "orderId":  "ord_1234",
        "tenant":   "acme-corp",
        "campaign": "receipts",
    },
})
```

Metadata appears on webhook events and on `Emails.Get` responses — use it to correlate sends with your own entities. Keys are free-form; values are strings only.

## List sent emails

```go
status := "DELIVERED"
to := "customer@example.com"
limit := 50

page, err := kb.Emails.ListWithContext(ctx, &kibamail.ListEmailsOptions{
    Limit:  &limit,
    Status: &status,
    To:     &to,
    // FromDate, ToDate: RFC3339 strings
})
```

`Status` is one of: `QUEUED`, `SENT`, `DELIVERED`, `BOUNCED`, `COMPLAINED`, `FAILED`.

## Get a specific email

```go
e, err := kb.Emails.GetWithContext(ctx, emailID)
// e.Status, e.LastResponseCode, e.LastResponseMessage, e.BounceClassification,
// e.OpenCount, e.ClickCount, e.DeliveredAt, e.FirstOpenedAt, e.FirstClickedAt,
// e.Metadata, e.Tags
```

## Event timeline

```go
events, err := kb.Emails.EventsWithContext(ctx, emailID)
// Ordered timeline: Queued → Sent → Delivered → Opened → Clicked → ...
```

Each event carries `Type`, `Timestamp`, and `Response` (`Code` + `Content` SMTP details) where applicable.

## Rendered content

```go
content, err := kb.Emails.ContentWithContext(ctx, emailID)
// content.Html and content.Text as actually rendered and injected
```

Useful for debugging rendering issues — shows the final HTML post-variable-merge.

## Production patterns

### Bounded concurrency for burst sends

```go
sem := make(chan struct{}, 16) // cap at 16 concurrent sends
var wg sync.WaitGroup
for _, r := range recipients {
    r := r
    sem <- struct{}{}
    wg.Add(1)
    go func() {
        defer wg.Done()
        defer func() { <-sem }()
        if _, err := kb.Emails.SendWithContext(ctx, buildReq(r)); err != nil {
            log.Printf("send %s: %v", r.Email, err)
        }
    }()
}
wg.Wait()
```

Pick the cap based on your rate limit. Never fire unbounded goroutines at `Emails.Send`.

### Idempotency for retries

The `Send` endpoint is not auto-idempotent. If your worker retries after a network error, the same email may send twice. Deduplicate upstream by writing your own lookup key to `Metadata`:

```go
Metadata: map[string]string{"idempotencyKey": "order_1234_receipt"}
```

Before retrying, search for that key in `Emails.List` (filter by metadata not yet SDK-exposed — alternatively, short-circuit in your own DB).
