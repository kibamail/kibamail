# Other Resources — Go SDK Reference

Quick reference for resources without dedicated docs.

## Domains — `kb.Domains`

Sending-domain setup: add a domain, publish DNS records, verify, enable tracking.

```go
// Create (dmarc optional)
d, _ := kb.Domains.CreateWithContext(ctx, &kibamail.CreateDomainRequest{
    Name:         "mail.acme.com",
    DmarcEnabled: true,
})
// d.DnsRecords.Dkim / ReturnPath / Tracking — publish these to your DNS provider.
//   Each has Type (TXT/CNAME), Hostname, Value.

// List & get
list, _ := kb.Domains.ListWithContext(ctx, nil)
d, _ = kb.Domains.GetWithContext(ctx, d.ID)
// d.DkimVerified, d.ReturnPathVerified, d.TrackingVerified,
// d.OpenTrackingEnabled, d.ClickTrackingEnabled, d.SslStatus, d.SslError

// Update tracking flags
kb.Domains.UpdateWithContext(ctx, d.ID, &kibamail.UpdateDomainRequest{
    OpenTrackingEnabled:  ptr(true),
    ClickTrackingEnabled: ptr(true),
})

// Verify (actively re-checks DNS)
v, _ := kb.Domains.VerifyWithContext(ctx, d.ID)
if v.Verification.AllVerified { /* ready to send */ }
// Otherwise inspect v.Verification.Dkim/ReturnPath/Tracking/Dmarc:
//   .Configured, .Expected, .Found (actual records seen)

// Delete
kb.Domains.DeleteWithContext(ctx, d.ID)
```

**Typical flow:** Create → publish DNS records from `DnsRecords` → poll `Verify` until `AllVerified: true` → start sending.

## Topics — `kb.Topics`

Interest lists a contact can subscribe/unsubscribe from. Powers broadcast recipient targeting and one-click unsubscribe.

```go
t, _ := kb.Topics.CreateWithContext(ctx, &kibamail.CreateTopicRequest{
    Name:        "Product updates",
    Description: "Monthly roundup of new features",
})
list, _  := kb.Topics.ListWithContext(ctx, nil)
t, _      = kb.Topics.GetWithContext(ctx, t.ID)
kb.Topics.UpdateWithContext(ctx, t.ID, &kibamail.UpdateTopicRequest{Name: "Monthly updates"})
kb.Topics.DeleteWithContext(ctx, t.ID)

// List contacts subscribed to a topic
contacts, _ := kb.Topics.ListContactsWithContext(ctx, t.ID, nil)
```

## Segments — `kb.Segments`

Dynamic contact groups defined by a filter expression.

```go
seg, _ := kb.Segments.CreateWithContext(ctx, &kibamail.CreateSegmentRequest{
    Name: "Engaged US enterprise",
    Filters: map[string]interface{}{
        "$and": []map[string]interface{}{
            {"field": "country",              "operator": "equals",       "value": "US"},
            {"field": "properties.plan",      "operator": "equals",       "value": "enterprise"},
            {"field": "lastOpenedAt",         "operator": "greater_than", "value": "2026-01-01"},
        },
    },
})

kb.Segments.ListWithContext(ctx, nil)
kb.Segments.GetWithContext(ctx, seg.ID)
kb.Segments.UpdateWithContext(ctx, seg.ID, &kibamail.UpdateSegmentRequest{Name: "Updated"})
kb.Segments.DeleteWithContext(ctx, seg.ID)
```

Segments are evaluated at send time for broadcasts and on contact changes for automations (`segment.entered` / `segment.exited` triggers).

## Contact Properties — `kb.ContactProperties`

Workspace-wide custom field definitions. Contacts can only set properties whose keys are defined here.

```go
kb.ContactProperties.CreateWithContext(ctx, &kibamail.CreateContactPropertyRequest{
    Name: "plan",
    Type: "TEXT", // TEXT | NUMBER | BOOLEAN | DATE | JSON
})

kb.ContactProperties.ListWithContext(ctx, nil)
kb.ContactProperties.GetWithContext(ctx, propID)
kb.ContactProperties.UpdateWithContext(ctx, propID, &kibamail.UpdateContactPropertyRequest{Name: "subscription_plan"})
kb.ContactProperties.DeleteWithContext(ctx, propID) // removes key from all contacts
```

Define all properties up front. Adding a property after contacts exist doesn't retro-fill them — the value is `nil` until set.

## Events — `kb.Events`

Custom analytics events attached to a contact. Used as automation triggers and for behavior-based segmentation.

```go
kb.Events.CreateWithContext(ctx, &kibamail.CreateEventRequest{
    ContactId: "ct_abc",
    Name:      "purchase.completed",
    Properties: map[string]interface{}{
        "orderId": "ord_1234",
        "total":   149.00,
        "currency": "USD",
    },
})
```

Events are append-only (no list/update/delete via SDK). Query them indirectly via segments (`event.occurred` filter) and automations (`event.occurred` trigger).

## Inbox — `kb.Inbox`

Inbound mail handling: incoming emails to your sending domain become conversations.

```go
convs, _ := kb.Inbox.ListConversationsWithContext(ctx, nil)

c, _ := kb.Inbox.GetConversationWithContext(ctx, convID)
// c.Status, c.Subject, c.From, c.Messages[]

kb.Inbox.UpdateConversationWithContext(ctx, convID, &kibamail.UpdateConversationRequest{
    Status: ptr("resolved"), // open | resolved | archived
})

kb.Inbox.ReplyWithContext(ctx, convID, &kibamail.InboxReplyRequest{
    Html: "<p>Thanks for reaching out.</p>",
    Text: "Thanks for reaching out.",
})

stats, _ := kb.Inbox.StatsWithContext(ctx, nil)
```

Use the Inbox API to build a support/helpdesk integration on top of transactional reply handling.

## API Keys — `kb.ApiKeys`

Admin-scope operation: provisioning keys for other services. Requires a key with `admin` scope — not for end-user-facing code paths.

```go
key, _ := kb.ApiKeys.CreateWithContext(ctx, &kibamail.CreateApiKeyRequest{
    Name:   "worker-prod",
    Scopes: []string{"write:emails", "read:emails", "read:contacts"},
})
// key.Token — the raw value. Shown ONCE, store immediately.

kb.ApiKeys.ListWithContext(ctx, nil) // token is never returned on list
kb.ApiKeys.DeleteWithContext(ctx, key.ID)
```

Rotate keys on a cadence; never commit them; scope each key to the minimum required permissions.
