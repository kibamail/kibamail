# Forms — Go SDK Reference

Service: `kb.Forms`. Source: `sdks/go/forms.go`. Forms collect subscriber data into your workspace. Each form has a `fieldMapping` (public name → contact field/property/topic) and optional SEO + double-opt-in + slug config.

## Create

```go
doiEmailID := "me_welcome_doi"

form, err := kb.Forms.CreateWithContext(ctx, &kibamail.CreateFormRequest{
    Name:        "Newsletter signup",
    Description: "Top-of-funnel lead magnet",
    Type:        "inline", // inline | popup | modal | standalone
    FieldMapping: map[string]interface{}{
        "email":      map[string]interface{}{"type": "system",   "target": "email", "required": true},
        "first_name": map[string]interface{}{"type": "system",   "target": "firstName"},
        "plan":       map[string]interface{}{"type": "property", "target": "plan"},
        "topics":     map[string]interface{}{"type": "topics",   "target": []string{"topic_newsletter"}},
    },
    DoubleOptInEmailId: &doiEmailID, // omit for single opt-in
})
// form.ID
```

## Get

```go
f, err := kb.Forms.GetWithContext(ctx, formID)
// f.Status, f.HTML, f.DeployId, f.DeployedFiles (CDN URLs),
// f.FieldMapping, f.Settings, f.Slug,
// f.SeoTitle, f.SeoDescription, f.SeoImageUrl, f.SeoFaviconUrl,
// f.DoubleOptInEmailId, f.CreatedAt, f.UpdatedAt
```

## Update

```go
slug := "weekly"
seoTitle := "Weekly product digest"

kb.Forms.UpdateWithContext(ctx, formID, &kibamail.UpdateFormRequest{
    Slug:     &slug,
    SeoTitle: &seoTitle,
    Settings: map[string]interface{}{
        "submitButtonText": "Subscribe",
        "successMessage":   "Check your inbox!",
    },
})
```

## Delete

```go
kb.Forms.DeleteWithContext(ctx, formID)
```

## List

```go
list, err := kb.Forms.ListWithContext(ctx, &kibamail.ListOptions{Limit: ptr(50)})
```

## Deploy static assets

Upload CSS/JS/images to Kibamail's CDN (multipart). Returns CDN URLs to reference in your form HTML:

```go
deploy, err := kb.Forms.DeployWithContext(ctx, formID, []kibamail.FileUpload{
    {Name: "style.css", Content: cssBytes, ContentType: "text/css"},
    {Name: "logo.png",  Content: pngBytes, ContentType: "image/png"},
})
// deploy.DeployId
// deploy.Files[].URL  → e.g. https://cdn.kibamail.com/forms/<id>/<deploy>/logo.png
```

## Publish (snapshot current draft as live)

Forms are drafts until published. A publish snapshots the current `fieldMapping`, `html`, and deployed assets as the live version.

```go
kb.Forms.PublishWithContext(ctx, formID)
```

## Versioning

Create a new version rather than mutating a live form in place. In-flight submissions keep resolving against the version they started on:

```go
kb.Forms.CreateVersionWithContext(ctx, formID, &kibamail.CreateFormVersionRequest{
    Name:         "v2 — added plan dropdown",
    FieldMapping: updatedMapping,
})

versions, _ := kb.Forms.ListVersionsWithContext(ctx, formID)
// versions.Data[i].Version is monotonically increasing int
```

## Server-side submit

For submissions made from your own backend (e.g. proxying a custom-designed form):

```go
res, err := kb.Forms.SubmitWithContext(ctx, formID, map[string]interface{}{
    "email":      "new@example.com",
    "first_name": "Sam",
    "plan":       "starter",
})
// res.ID — submission id
```

Submit honors the form's `fieldMapping`, rejects unknown keys, and triggers the double-opt-in email if configured. The resulting contact is `SUBSCRIBED` for single-opt-in forms and `UNCONFIRMED` for DOI forms until the confirmation link is clicked.

## Double opt-in

1. Create a marketing email template containing the confirmation link (see `marketing-emails.md`).
2. Pass its ID as `DoubleOptInEmailId` on form create/update.
3. Submitted contacts become `UNCONFIRMED`; they're auto-promoted to `SUBSCRIBED` after the click.

To switch back to single-opt-in, set `DoubleOptInEmailId: ptr("")`.

## Field mapping reference

```go
map[string]interface{}{
    "<public_name>": map[string]interface{}{
        "type":     "system" | "property" | "topics",
        "target":   "<contact field | property key | []string of topic IDs>",
        "required": true,  // optional
    },
}
```

System targets: `email`, `firstName`, `lastName`, `phone`, `country`, `city`, `timezone`.

Property targets: any key defined in `ContactProperties`.

Topics target: an array of topic IDs — contact is subscribed to all of them on submit.
