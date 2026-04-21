# Marketing emails

Reusable marketing email templates. Used by:

- **Broadcasts** — pick a template, merge variables, send to a list.
- **Automations** — `send email` action references a marketing email ID.
- **Forms** — `doubleOptInEmailId` on a form points at one of these.

## Create

```go
trackOpens := true
trackClicks := true

res, _ := kb.MarketingEmails.Create(&kibamail.CreateMarketingEmailRequest{
    Name:              "Welcome email v3",
    Subject:           "Welcome to {{ company }}, {{ firstName }}",
    PreviewText:       "Quick 3-step setup inside.",
    Html:              htmlWithHandlebars,
    SenderIdentityId:  "si_team_hello",     // must be a verified sender identity
    ReplyToIdentityId: "si_support_inbox",  // optional; falls back to sender
    TrackOpens:        &trackOpens,
    TrackClicks:       &trackClicks,
    Type:              "TRANSACTIONAL_TEMPLATE", // or MARKETING
})
// res.ID
```

`Html` supports Handlebars-style `{{ variable }}` tokens. The API parses them on save and exposes the set as `MarketingEmail.Variables` on `Get`. Any variable referenced but not provided at send time is rendered as empty string — there is no strict mode.

## Read / list / update / delete

```go
tmpl, _ := kb.MarketingEmails.Get(res.ID)
// tmpl.Variables = []string{"company","firstName",...}

kb.MarketingEmails.List(&kibamail.ListOptions{Limit: ptr(50)})

kb.MarketingEmails.Update(res.ID, &kibamail.UpdateMarketingEmailRequest{
    Subject: "Welcome to Kibamail, {{ firstName }}",
})

kb.MarketingEmails.Delete(res.ID) // fails if referenced by a form/automation/scheduled broadcast
```

## Preview (rendered HTML)

```go
p, _ := kb.MarketingEmails.Preview(res.ID)
// p.Html   — fully rendered HTML with placeholder sample data
// p.HasContent — false if template body is empty/whitespace
```

Use this to sanity-check rendering in CI before publishing template changes.

## Stats

```go
s, _ := kb.MarketingEmails.Stats(res.ID)
fmt.Printf("sent=%d delivered=%d opens=%d clicks=%d  OR=%.1f%% CTR=%.1f%%\n",
    s.TotalSent, s.TotalDelivered, s.TotalOpened, s.TotalClicked,
    s.OpenRate*100, s.ClickRate*100)

for _, f := range s.UsedByForms {
    fmt.Printf("referenced by form %s (%s)\n", f.ID, f.Name)
}
```

`UsedByForms` is handy before deleting — it tells you which forms currently point at this template as their double-opt-in email.
