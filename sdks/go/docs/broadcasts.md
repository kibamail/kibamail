# Broadcasts

Broadcasts are one-time sends to a topic, a segment, or an explicit list of contacts.

## Two ways to send

### Option A — draft, review, then send

```go
bc, _ := kb.Broadcasts.Create(&kibamail.CreateBroadcastRequest{
    Name:      "April product update",
    From:      "Product <updates@yourdomain.com>",
    ReplyTo:   "hello@yourdomain.com",
    TopicId:   "topic_product_updates",     // or SegmentId
    EmailContent: &kibamail.BroadcastEmailContent{
        Subject:     "What's new in April",
        PreviewText: "New flows, new reports, and one breaking change.",
        Html:        htmlBody,
        Text:        plainTextFallback,
    },
})

// ...optional review cycle...
kb.Broadcasts.Update(bc.ID, &kibamail.UpdateBroadcastRequest{
    EmailContent: &kibamail.BroadcastEmailContent{Subject: "April product update — revised"},
})

// ship
kb.Broadcasts.Send(bc.ID)
```

The returned `Broadcast` carries `Status` (`draft` | `scheduled` | `sending` | `sent` | `failed`), `SendAt`, `CreatedAt`, and the flattened `EmailContent` echo back from the API.

### Option B — fire-and-forget

```go
res, _ := kb.Broadcasts.CreateAndSend(&kibamail.CreateAndSendBroadcastRequest{
    Name:    "Black Friday",
    From:    "Deals <deals@yourdomain.com>",
    ReplyTo: "support@yourdomain.com",
    EmailContent: &kibamail.BroadcastEmailContent{
        Subject: "48h only",
        Html:    htmlBody,
    },
    Recipients: &kibamail.BroadcastRecipients{
        Topic: "topic_buyers",
        // or Segment: "seg_high_intent"
        // or Contacts: []string{"ct_1","ct_2"}
        // or Emails: []string{"a@x.com","b@x.com"} for ad-hoc sends
    },
    SendAt: "2026-11-28T14:00:00Z", // RFC3339 UTC; use past/now for immediate
})
// res.ID — broadcast id
```

## Scheduling

`SendAt` is RFC 3339 UTC. To send immediately, use the current time (or a few seconds in the past) — the API treats any past `SendAt` as "send now". To cancel a scheduled send that hasn't started, delete the broadcast.

## Recipients — precedence

Use exactly one of: `TopicId`, `SegmentId`, `Recipients.Contacts`, `Recipients.Emails`. Specifying multiple is rejected (`validation_failed`). For `Recipients.Emails`, non-existing contacts are auto-created as `SUBSCRIBED` — use with care.

## Observing a send

### Per-recipient sends

```go
limit := 100
status := "bounced"
page, _ := kb.Broadcasts.ListSends(bc.ID, &kibamail.ListBroadcastSendsOptions{
    Limit:  &limit,
    Status: &status, // queued|sent|delivered|bounced|complained|failed|unsubscribed
})
for _, s := range page.Data {
    fmt.Println(s.Email, s.Status, s.LastResponseCode, s.LastResponseMessage, s.BounceClassification)
}
// cursor pagination: page.HasMore + last s.ID → next After
```

### Aggregate stats

```go
stats, _ := kb.Broadcasts.Stats(bc.ID)
fmt.Printf("delivered %d/%d  open %.1f%%  click %.1f%%  bounce %.1f%%\n",
    int(stats.Recipients.Delivered), int(stats.Recipients.Total),
    stats.Engagement.OpenRate*100, stats.Engagement.ClickRate*100,
    stats.Deliverability.BounceRate*100)
```

Note `stats.DetailsPruned` — once a broadcast ages out (configurable retention), per-recipient details are pruned but aggregate stats remain.

## Operational tips

- **Always warm up.** A brand-new sending domain should ramp volume across multiple small broadcasts before running a list-wide blast, or Gmail will throttle you.
- **A/B with segments.** Use two segments + two broadcasts rather than overloading one broadcast.
- **Respect unsubscribes.** Every broadcast auto-appends a `List-Unsubscribe` header; don't strip it.
- **Backfill state from stats, not ListSends.** Polling `ListSends` across thousands of recipients is O(N); `Stats` is O(1) server-side.
