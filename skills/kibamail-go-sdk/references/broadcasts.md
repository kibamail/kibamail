# Broadcasts — Go SDK Reference

Service: `kb.Broadcasts`. Source: `sdks/go/broadcasts.go`. Broadcasts are one-off marketing sends to a topic, segment, or explicit recipient list.

## Two ways to send

### A. Draft → review → send

```go
// 1. Create draft
bc, err := kb.Broadcasts.CreateWithContext(ctx, &kibamail.CreateBroadcastRequest{
    Name:    "April product update",
    From:    "Product <updates@acme.com>",
    ReplyTo: "hello@acme.com",
    TopicId: "topic_product_updates", // or SegmentId
    EmailContent: &kibamail.BroadcastEmailContent{
        Subject:     "What's new in April",
        PreviewText: "New flows, new reports.",
        Html:        htmlBody,
        Text:        plainFallback,
    },
})

// 2. Revise (any number of times)
kb.Broadcasts.UpdateWithContext(ctx, bc.ID, &kibamail.UpdateBroadcastRequest{
    EmailContent: &kibamail.BroadcastEmailContent{
        Subject: "April product update — revised",
    },
})

// 3. Schedule (sends immediately when SendAt is past/absent via Send endpoint)
kb.Broadcasts.SendWithContext(ctx, bc.ID)
```

### B. Create-and-send in one call

```go
res, err := kb.Broadcasts.CreateAndSendWithContext(ctx, &kibamail.CreateAndSendBroadcastRequest{
    Name:    "Black Friday",
    From:    "Deals <deals@acme.com>",
    ReplyTo: "support@acme.com",
    EmailContent: &kibamail.BroadcastEmailContent{
        Subject: "48h only",
        Html:    htmlBody,
    },
    Recipients: &kibamail.BroadcastRecipients{
        Topic: "topic_buyers",
        // OR exactly one of:
        // Segment:  "seg_high_intent",
        // Contacts: []string{"ct_1", "ct_2"},
        // Emails:   []string{"a@x.com", "b@x.com"},
    },
    SendAt: "2026-11-28T14:00:00Z", // RFC3339 UTC; past = immediate
})
// res.ID
```

### Recipients precedence

Specify **exactly one** of `TopicId`, `SegmentId`, `Recipients.Contacts`, `Recipients.Emails`. Multiple is rejected with `validation_failed`.

`Recipients.Emails` auto-creates contacts as `SUBSCRIBED` — use carefully, respect prior consent.

## Get & list

```go
bc, _ := kb.Broadcasts.GetWithContext(ctx, bcID)
// bc.Status ∈ draft | scheduled | sending | sent | failed
// bc.SendAt, bc.EmailContent, bc.From, bc.ReplyTo, bc.CreatedAt

list, _ := kb.Broadcasts.ListWithContext(ctx, &kibamail.ListOptions{Limit: ptr(50)})
```

## Delete (cancels if unsent)

```go
kb.Broadcasts.DeleteWithContext(ctx, bcID)
```

Only works while `Status` is `draft` or `scheduled`.

## Per-recipient sends

```go
limit := 100
status := "bounced"
page, _ := kb.Broadcasts.ListSendsWithContext(ctx, bc.ID, &kibamail.ListBroadcastSendsOptions{
    Limit:  &limit,
    Status: &status, // queued | sent | delivered | bounced | complained | failed | unsubscribed
})

for _, s := range page.Data {
    fmt.Println(s.Email, s.Status, s.LastResponseCode, s.LastResponseMessage, s.BounceClassification)
}
```

Cursor pagination: use last `s.ID` as `After` on next call, check `page.HasMore`.

## Aggregate stats

```go
stats, _ := kb.Broadcasts.StatsWithContext(ctx, bc.ID)
fmt.Printf("delivered=%.0f/%.0f  open=%.1f%%  click=%.1f%%  bounce=%.1f%%  complaint=%.3f%%\n",
    stats.Recipients.Delivered, stats.Recipients.Total,
    stats.Engagement.OpenRate*100,
    stats.Engagement.ClickRate*100,
    stats.Deliverability.BounceRate*100,
    stats.Deliverability.ComplaintRate*100)
```

`stats.DetailsPruned` indicates per-recipient rows have aged out of retention; aggregate numbers remain accurate.

## Operational guidance

- **Stats is O(1) server-side; ListSends is O(N).** For dashboards and SLA checks, prefer `Stats`.
- **Warm up new sending domains.** Start with small batches (hundreds), grow over days. A first-send blast to 100k from a cold domain will get throttled by Gmail.
- **Split A/B tests as two broadcasts over two segments.** Don't try to overload one broadcast.
- **Never strip `List-Unsubscribe`.** Auto-inserted by the platform; required for Gmail/Outlook bulk-sender compliance.
- **Schedule in UTC.** `SendAt` is RFC3339 with timezone offset; the server converts to UTC internally.
