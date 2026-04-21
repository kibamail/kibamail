# Marketing Emails — Go SDK Reference

Service: `kb.MarketingEmails`. Source: `sdks/go/marketing_emails.go`. Reusable templates consumed by:

- `kb.Emails.Send` with `Template` field — transactional send with variable injection.
- `kb.Broadcasts.Create` — one-off marketing campaigns.
- `kb.Automations` send nodes — automated flows.
- `kb.Forms` `doubleOptInEmailId` — DOI confirmation.

## Create

```go
trackOpens := true
trackClicks := true

res, err := kb.MarketingEmails.CreateWithContext(ctx, &kibamail.CreateMarketingEmailRequest{
    Name:              "Welcome email v3",
    Subject:           "Welcome to {{ company }}, {{ firstName }}",
    PreviewText:       "Quick 3-step setup inside.",
    Html:              htmlWithHandlebars, // see Compliance Variables below
    SenderIdentityId:  "si_team_hello",
    ReplyToIdentityId: "si_support_inbox", // optional
    TrackOpens:        &trackOpens,
    TrackClicks:       &trackClicks,
    Type:              "TRANSACTIONAL_TEMPLATE", // or MARKETING
})
// res.ID
```

## Compliance variables (marketing templates)

Templates used for marketing sends must include these Handlebars tokens in the HTML body — the API validates on save:

- `{{business_address}}`
- `{{unsubscribe_url}}`
- `{{terms_url}}`
- `{{privacy_url}}`

`TRANSACTIONAL_TEMPLATE` type is exempt from this requirement.

## Get

```go
tmpl, err := kb.MarketingEmails.GetWithContext(ctx, templateID)
// tmpl.Variables = []string{"company","firstName",...} parsed from Html
// tmpl.TrackOpens, tmpl.TrackClicks, tmpl.CreatedAt, tmpl.UpdatedAt
```

## List

```go
list, err := kb.MarketingEmails.ListWithContext(ctx, &kibamail.ListOptions{Limit: ptr(50)})
for _, t := range list.Data {
    fmt.Println(t.ID, t.Name, t.Subject)
}
```

## Update

```go
kb.MarketingEmails.UpdateWithContext(ctx, templateID, &kibamail.UpdateMarketingEmailRequest{
    Subject: "Welcome to Kibamail, {{ firstName }}",
    Html:    updatedHTML,
})
```

## Delete

```go
kb.MarketingEmails.DeleteWithContext(ctx, templateID)
```

Fails if the template is currently referenced by a form (double-opt-in), an automation node, or a scheduled broadcast. Check `Stats.UsedByForms` first.

## Preview (rendered HTML)

```go
p, err := kb.MarketingEmails.PreviewWithContext(ctx, templateID)
// p.Html        — fully rendered with placeholder sample data
// p.HasContent  — false for empty/whitespace templates
```

Useful in CI: snapshot-test rendered output before allowing a PR to merge template changes.

## Stats

```go
s, err := kb.MarketingEmails.StatsWithContext(ctx, templateID)
fmt.Printf("sent=%d delivered=%d opens=%d clicks=%d OR=%.1f%% CTR=%.1f%%\n",
    s.TotalSent, s.TotalDelivered, s.TotalOpened, s.TotalClicked,
    s.OpenRate*100, s.ClickRate*100)

for _, f := range s.UsedByForms {
    fmt.Printf("referenced by form %s (%s)\n", f.ID, f.Name)
}
```

## Handlebars variable merging

At send time, `SendEmailTemplate.Variables` or automation context variables are merged into the HTML. Variables referenced in the template but missing at send time render as empty strings — there is no strict mode. Guard critical values in your own code before calling Send.
