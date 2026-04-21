# Contacts — Go SDK Reference

Service: `kb.Contacts`. Source: `sdks/go/contacts.go`. Each contact is keyed by `email` within a workspace.

## Create

```go
res, err := kb.Contacts.CreateWithContext(ctx, &kibamail.CreateContactRequest{
    Email:     "user@example.com",
    FirstName: "Jane",
    LastName:  "Doe",
    Phone:     "+15551234567",
    Country:   "US",
    City:      "San Francisco",
    Timezone:  "America/Los_Angeles",
    Properties: map[string]interface{}{
        "plan":           "enterprise",
        "signed_up_at":   "2026-04-21T00:00:00Z",
        "lifetime_value": 1248.50,
    },
    Topics: []string{"topic_newsletter", "topic_product_updates"},
})
// res.ID
```

**Property keys** must already exist as a ContactProperty definition in the workspace — unknown keys are rejected as `validation_failed`. See `references/other-resources.md`.

**Topics** accepts topic IDs from `kb.Topics.List`.

## Get

```go
c, err := kb.Contacts.GetWithContext(ctx, contactID)
// c.Email, c.Status, c.FirstName, c.LastName, c.Properties, c.Topics,
// c.CreatedAt, c.UpdatedAt
```

Status values: `SUBSCRIBED`, `UNSUBSCRIBED`, `UNCONFIRMED` (double-opt-in pending), `COMPLAINED`, `BOUNCED`.

## Update (merge semantics)

```go
kb.Contacts.UpdateWithContext(ctx, contactID, &kibamail.UpdateContactRequest{
    FirstName: "Janet",
    Properties: map[string]interface{}{
        "plan": "scale", // merges with existing properties
    },
})
```

Only keys you send are touched. To unset a property, pass `nil`:

```go
Properties: map[string]interface{}{"plan": nil}
```

## Delete

```go
if err := kb.Contacts.DeleteWithContext(ctx, contactID); err != nil { /* ... */ }
```

## List (cursor pagination)

```go
limit := 100
page, err := kb.Contacts.ListWithContext(ctx, &kibamail.ListOptions{Limit: &limit})

for page.HasMore {
    last := page.Data[len(page.Data)-1].ID
    page, err = kb.Contacts.ListWithContext(ctx, &kibamail.ListOptions{
        Limit: &limit,
        After: &last,
    })
    // ...
}
```

## Search (filter DSL)

```go
res, err := kb.Contacts.SearchWithContext(ctx, &kibamail.SearchContactRequest{
    Filters: map[string]interface{}{
        "$and": []map[string]interface{}{
            {"field": "status",             "operator": "equals",   "value": "SUBSCRIBED"},
            {"field": "properties.plan",    "operator": "equals",   "value": "enterprise"},
            {"$or": []map[string]interface{}{
                {"field": "country", "operator": "equals", "value": "US"},
                {"field": "country", "operator": "equals", "value": "CA"},
            }},
        },
    },
})
```

**Operators:** `equals`, `not_equals`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`, `contains`, `not_contains`, `starts_with`, `ends_with`, `in`, `not_in`, `exists`.

**Addressable fields:** `email`, `status`, `country`, `city`, `timezone`, `createdAt`, `updatedAt`, and any custom `properties.<key>`.

**Topic shortcut:**

```go
Filters: map[string]interface{}{"subscribedToTopic": "topic_id"}
```

## Upsert pattern (no dedicated endpoint)

```go
func upsertContact(ctx context.Context, kb *kibamail.Client, req *kibamail.CreateContactRequest) (string, error) {
    res, err := kb.Contacts.CreateWithContext(ctx, req)
    if err == nil {
        return res.ID, nil
    }

    var apiErr *kibamail.APIError
    if errors.As(err, &apiErr) && apiErr.StatusCode == 409 {
        // already exists — look up by email, then update
        found, serr := kb.Contacts.SearchWithContext(ctx, &kibamail.SearchContactRequest{
            Filters: map[string]interface{}{
                "field": "email", "operator": "equals", "value": req.Email,
            },
        })
        if serr != nil || len(found.Data) == 0 {
            return "", serr
        }
        id := found.Data[0].ID
        _, uerr := kb.Contacts.UpdateWithContext(ctx, id, &kibamail.UpdateContactRequest{
            FirstName:  req.FirstName,
            LastName:   req.LastName,
            Phone:      req.Phone,
            Properties: req.Properties,
            Topics:     req.Topics,
        })
        return id, uerr
    }
    return "", err
}
```

## Topics subscription workflow

Attach contacts to topics at create time via the `Topics` field, or afterwards with `Update`:

```go
kb.Contacts.UpdateWithContext(ctx, contactID, &kibamail.UpdateContactRequest{
    Topics: []string{"topic_newsletter"}, // replaces existing topic set
})
```

The `Topics` field is a **full replacement**, not an append. To add without replacing, fetch current topics first:

```go
c, _ := kb.Contacts.GetWithContext(ctx, contactID)
topics := append(c.Topics, "topic_new")
kb.Contacts.UpdateWithContext(ctx, contactID, &kibamail.UpdateContactRequest{Topics: topics})
```

## Status lifecycle rules

- Broadcasts and automations only target `SUBSCRIBED` contacts.
- `COMPLAINED` and `BOUNCED` contacts cannot be re-subscribed via the API — this is a deliverability safeguard. Require a new explicit opt-in.
- Double-opt-in forms create contacts as `UNCONFIRMED`; they move to `SUBSCRIBED` only after clicking the confirmation link.
