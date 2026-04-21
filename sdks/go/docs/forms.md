# Forms

Forms collect subscriber data into your workspace. Under the hood each form has a `fieldMapping` (public field name → contact property/topic/system field) and optional SEO, double-opt-in, and slug configuration.

## Create

```go
trueVal := true
doiEmailID := "mkt_email_123" // optional confirmation email

form, _ := kb.Forms.Create(&kibamail.CreateFormRequest{
    Name:        "Newsletter signup",
    Description: "Top of funnel",
    Type:        "inline", // inline | popup | modal | standalone
    FieldMapping: map[string]interface{}{
        "email":      map[string]interface{}{"type": "system", "target": "email",     "required": true},
        "first_name": map[string]interface{}{"type": "system", "target": "firstName"},
        "plan":       map[string]interface{}{"type": "property", "target": "plan"},
        "topics":     map[string]interface{}{"type": "topics",   "target": []string{"topic_abc"}},
    },
    DoubleOptInEmailId: &doiEmailID, // omit for single-opt-in
})
```

## Get / Update / Delete / List

```go
f, _ := kb.Forms.Get(formID)             // full struct with html, deployedFiles, seo*, settings
kb.Forms.Update(formID, &kibamail.UpdateFormRequest{Slug: ptr("weekly")})
kb.Forms.Delete(formID)

list, _ := kb.Forms.List(&kibamail.ListOptions{Limit: ptr(50)})
```

Returned `Form` includes: `Status`, `HTML`, `DeployId`, `DeployedFiles`, `Settings`, `SeoTitle`, `SeoDescription`, `SeoImageUrl`, `SeoFaviconUrl`, `Slug`, `DoubleOptInEmailId`, `CreatedAt`, `UpdatedAt`. See `sdks/go/forms.go:31-51`.

## Publish workflow

Forms are draft until published. Typical flow:

```go
// 1. Deploy static assets (CSS/JS/images) as multipart upload
deploy, _ := kb.Forms.Deploy(formID, []kibamail.FileUpload{
    {Name: "style.css", Content: cssBytes, ContentType: "text/css"},
    {Name: "logo.png",  Content: pngBytes, ContentType: "image/png"},
})
// deploy.DeployId and deploy.Files[].URL — the CDN URLs to reference in HTML

// 2. Publish snapshots the current draft as the live version
kb.Forms.Publish(formID)
```

## Versioning

Each significant edit should create a new version, so in-flight submissions keep resolving against the version they started on:

```go
kb.Forms.CreateVersion(formID, &kibamail.CreateFormVersionRequest{
    Name: "v2 — added plan dropdown",
    FieldMapping: updatedMapping,
})

versions, _ := kb.Forms.ListVersions(formID)
// versions.Data[i].Version is monotonically increasing int
```

## Submit (server-side)

For server-side submissions (e.g. your own backend proxying user data):

```go
res, err := kb.Forms.Submit(formID, map[string]interface{}{
    "email":      "new@example.com",
    "first_name": "Sam",
    "plan":       "starter",
})
// res.ID → submission id; triggers DOI email if configured
```

The Submit endpoint honors the form's `fieldMapping` and rejects unknown keys.

## Double opt-in

1. Create a marketing email with the confirmation template (see `marketing-emails.md`).
2. Pass its id as `DoubleOptInEmailId` on create or update.
3. On submit, the contact is created with `status=UNCONFIRMED`; they move to `SUBSCRIBED` only after clicking the confirmation link in that email.

Clearing it (`DoubleOptInEmailId: ptr("")`) switches the form back to single-opt-in.

---

_`ptr[T any](v T) *T` helper — define once in your code: `func ptr[T any](v T) *T { return &v }`_
