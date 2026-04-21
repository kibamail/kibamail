# Contacts

Manage subscribers via `client.Contacts`. Every contact is keyed by `email` within a workspace.

## Create

```go
res, err := kb.Contacts.Create(&kibamail.CreateContactRequest{
    Email:     "alex@example.com",
    FirstName: "Alex",
    LastName:  "Chen",
    Phone:     "+14155550123",
    Country:   "US",
    City:      "San Francisco",
    Timezone:  "America/Los_Angeles",
    Properties: map[string]interface{}{
        "plan":        "enterprise",
        "signed_up_at": "2026-04-21T00:00:00Z",
        "lifetime_value": 1248.50,
    },
    Topics: []string{"topic_newsletter", "topic_product_updates"},
})
// res.ID → contact id
```

`Properties` keys must exist as a [Contact Property](#contact-properties) definition in the workspace — undefined keys are rejected with `validation_failed`.

`Topics` accepts topic IDs (from `client.Topics.List`).

## Get / Update / Delete

```go
c, _ := kb.Contacts.Get(contactID)
// c.Status, c.Email, c.Properties, c.Topics, c.CreatedAt, c.UpdatedAt

kb.Contacts.Update(contactID, &kibamail.UpdateContactRequest{
    FirstName: "Alexis",
    Properties: map[string]interface{}{
        "plan": "scale", // existing keys merge-updated
    },
})

kb.Contacts.Delete(contactID)
```

**Update semantics:** properties **merge** — only keys you send are touched. To unset, send `nil`:

```go
Properties: map[string]interface{}{"plan": nil},
```

## List (paginated)

```go
limit := 100
page, _ := kb.Contacts.List(&kibamail.ListOptions{Limit: &limit})

for page.HasMore {
    cursor := page.Data[len(page.Data)-1].ID
    page, _ = kb.Contacts.List(&kibamail.ListOptions{Limit: &limit, After: &cursor})
    // ... process page.Data
}
```

## Search (filter DSL)

The filter DSL supports boolean composition and per-field operators:

```go
res, _ := kb.Contacts.Search(&kibamail.SearchContactRequest{
    Filters: map[string]interface{}{
        "$and": []map[string]interface{}{
            {"field": "status",        "operator": "eq", "value": "SUBSCRIBED"},
            {"field": "properties.plan", "operator": "eq", "value": "enterprise"},
            {"$or": []map[string]interface{}{
                {"field": "country", "operator": "eq", "value": "US"},
                {"field": "country", "operator": "eq", "value": "CA"},
            }},
        },
    },
})
```

**Operators:** `eq`, `neq`, `in`, `nin`, `contains`, `starts_with`, `gt`, `gte`, `lt`, `lte`, `exists`.

**Addressable fields:** top-level (`email`, `status`, `country`, `createdAt`, ...) and any custom `properties.<key>`.

## Upsert pattern

The API has no dedicated upsert. Do it in application code:

```go
func upsert(ctx context.Context, kb *kibamail.Client, req *kibamail.CreateContactRequest) (string, error) {
    res, err := kb.Contacts.CreateWithContext(ctx, req)
    if err == nil {
        return res.ID, nil
    }
    var apiErr *kibamail.APIError
    if errors.As(err, &apiErr) && apiErr.Code == "contact_already_exists" {
        // Search by email, then update
        results, _ := kb.Contacts.SearchWithContext(ctx, &kibamail.SearchContactRequest{
            Filters: map[string]interface{}{"field": "email", "operator": "eq", "value": req.Email},
        })
        if len(results.Data) > 0 {
            id := results.Data[0].ID
            _, err = kb.Contacts.UpdateWithContext(ctx, id, &kibamail.UpdateContactRequest{
                FirstName: req.FirstName, LastName: req.LastName,
                Properties: req.Properties, Topics: req.Topics,
            })
            return id, err
        }
    }
    return "", err
}
```

## Subscription status

`Contact.Status` is one of:

| Value | Meaning |
|---|---|
| `SUBSCRIBED` | Actively receiving mail |
| `UNSUBSCRIBED` | Unsubscribed (manually or via one-click) |
| `UNCONFIRMED` | Double-opt-in pending |
| `COMPLAINED` | Hard complaint — do not send |
| `BOUNCED` | Permanent bounce — do not send |

Broadcasts and automations only target `SUBSCRIBED`. You cannot re-subscribe a `COMPLAINED`/`BOUNCED` contact via the API without a support ticket.

## Contact properties (custom fields)

Define the schema before creating contacts with custom keys:

```go
kb.ContactProperties.Create(&kibamail.CreateContactPropertyRequest{
    Name: "plan",
    Type: "TEXT", // TEXT | NUMBER | BOOLEAN | DATE | JSON
})
```

List with `kb.ContactProperties.List(nil)`. They're workspace-global.

## Performance tips

- **Bulk imports** (>1000): use the dashboard's CSV import or the `contact-imports` API (not yet in this SDK) — don't fan out `Create` calls.
- **Read-heavy workloads:** `Search` hits a dedicated index and is cheaper than paginating `List` + filtering client-side.
- **Avoid `Get` loops.** If you have a list of IDs, use `Search` with `{"field":"id","operator":"in","value":[...]}`.
