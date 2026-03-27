# Forms Reference

Forms are fully customizable HTML landing pages that collect contact information. You provide your own HTML, CSS, JS, and assets — Kibamail handles validation, submission processing, and contact creation.

## End-to-End Workflow

```bash
# 1. Create form with field mapping
kibamail forms create --name "Newsletter Signup" \
  --field-mapping '{"email":{"contactPropertyId":"email","contactPropertyType":"standard","fieldType":"string"},"first_name":{"contactPropertyId":"firstName","contactPropertyType":"standard","fieldType":"string"}}' --json

# 2. Deploy site bundle from a folder
kibamail forms deploy <form-id> --path ./my-form --json

# 3. Preview (no view tracking)
# https://app.kibamail.com/p/forms/<form-id>/preview

# 4. Publish
kibamail forms publish <form-id> --json

# 5. Share live URL
# https://app.kibamail.com/p/forms/<form-id>
```

## Create a Form

```bash
kibamail forms create --name "Newsletter Signup" \
  --field-mapping '{"email":{"contactPropertyId":"email","contactPropertyType":"standard","fieldType":"string"},"first_name":{"contactPropertyId":"firstName","contactPropertyType":"standard","fieldType":"string"}}' --json
```

**Fields:**
- `name` — form name (required)
- `type` — `SIGN_UP` (creates contacts) or `SURVEY` (stores submissions). Default: `SIGN_UP`
- `fieldMapping` — maps HTML input `name` attributes to contact properties (required)

**Field mapping rules:**
- `email` field mapped to the `email` standard contact property is required for SIGN_UP forms
- Every input in your HTML `<form>` must have a corresponding fieldMapping entry
- Every fieldMapping entry must match an input in your HTML

**Standard contact properties:** `email`, `firstName`, `lastName`, `phone`, `country`, `timezone`, `city`

For custom properties, use `contactPropertyType: "custom"` with the property ID.

---

## Deploy Site Bundle

Upload your HTML file and assets from a folder. The CLI validates locally (file types, sizes, one HTML file) before uploading. Kibamail processes the HTML (sets form action, rewrites asset paths to CDN URLs, validates against fieldMapping).

```bash
kibamail forms deploy <form-id> --path ./my-form --json
```

**Requirements:**
- Exactly one `.html` file
- HTML must contain exactly one `<form>` element
- Every `<input>`, `<select>`, `<textarea>` with a `name` attribute inside the form must match a fieldMapping entry (except `type="submit"`, `type="button"`, `type="reset"`)
- Max individual file: 10MB
- Max total upload: 50MB
- Only DRAFT forms can be deployed

**Allowed file types:** `.html`, `.css`, `.js`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`, `.mp4`, `.webm`, `.woff`, `.woff2`, `.ttf`, `.otf`, `.pdf`, `.ico`

**What Kibamail does automatically:**
- Sets `action` and `method="post"` on the `<form>` element
- Rewrites relative paths (`href="styles.css"`) to absolute CDN URLs
- Injects SEO meta tags if configured

---

## HTML Conventions (data-kibamail-* attributes)

Forms submit via standard POST (no JavaScript required). After submission, Kibamail redirects back to the form page and renders state into the HTML using `data-kibamail-*` attributes.

### Per-field errors

```html
<input type="email" name="email" required />
<span data-kibamail-error="email" hidden></span>
```

On validation error, Kibamail sets the element's text to the error message and removes `hidden`.

### Success state

```html
<div data-kibamail-success hidden>
  <h2>Thank you!</h2>
</div>
```

On success, the `<form>` gets `hidden` and this element becomes visible.

### Server error summary

```html
<div data-kibamail-error-summary hidden>
  <p>Something went wrong. <span data-kibamail-error-message></span></p>
</div>
```

Shown on non-validation errors. `data-kibamail-error-message` gets the error text.

### Field value preservation

On validation error, Kibamail repopulates input `value` attributes so users don't lose their input.

All `data-kibamail-*` attributes are optional. If omitted, the form still works — it just won't show inline errors or success messages.

---

## Minimal Working Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscribe</title>
</head>
<body>
  <form>
    <label for="email">Email</label>
    <input type="email" name="email" id="email" required />
    <span data-kibamail-error="email" hidden></span>

    <label for="first_name">Name</label>
    <input type="text" name="first_name" id="first_name" />
    <span data-kibamail-error="first_name" hidden></span>

    <div data-kibamail-error-summary hidden>
      <p>Error: <span data-kibamail-error-message></span></p>
    </div>

    <button type="submit">Subscribe</button>
  </form>

  <div data-kibamail-success hidden>
    <h2>Thanks for subscribing!</h2>
  </div>
</body>
</html>
```

Deploy this with the fieldMapping:
```json
{
  "email": { "contactPropertyId": "email", "contactPropertyType": "standard", "fieldType": "string" },
  "first_name": { "contactPropertyId": "firstName", "contactPropertyType": "standard", "fieldType": "string" }
}
```

---

## Preview and Live URLs

- **Preview** (no view tracking): `https://app.kibamail.com/p/forms/{formId}/preview`
- **Live** (tracks views, used for production): `https://app.kibamail.com/p/forms/{formId}`

If a slug is configured, the live URL is also available at `https://app.kibamail.com/p/forms/{slug}`.

---

## Publish a Form

```bash
kibamail forms publish <form-id> --json
```

Requires deployed content and valid fieldMapping. The form becomes live at its public URL.

---

## Update a Form

```bash
kibamail forms update <form-id> --name "Updated Name" --json

kibamail forms update <form-id> --field-mapping '{"email":{"contactPropertyId":"email","contactPropertyType":"standard","fieldType":"string"},"company":{"contactPropertyId":"company","contactPropertyType":"custom","fieldType":"string"}}' --json
```

Only DRAFT forms can be updated. If fieldMapping changes and the form has deployed HTML, validation runs automatically.

---

## Versioning

To update a published form without downtime:

```bash
# Create a new version (inherits content from parent)
# (use API — CLI version command coming soon)

# Deploy new content to the version
kibamail forms deploy <version-id> --path ./updated-form --json

# Publish the version (archives the previous)
kibamail forms publish <version-id> --json
```

The live URL stays the same. Previous version is automatically archived. You can roll back by publishing an archived version.

---

## List Forms

```bash
kibamail forms list --json
kibamail forms list --limit 50 --json
```

---

## Get Form Details

```bash
kibamail forms show <form-id> --json
```

Returns: name, status, html, deployId, deployedFiles, fieldMapping, settings, SEO fields, timestamps.

---

## Delete a Form

```bash
kibamail forms delete <form-id> --json
```

Only DRAFT forms can be deleted. Deleting a root form removes all versions.

---

## Common Errors

| Code | Meaning |
|------|---------|
| `FORM_NOT_FOUND` | Form doesn't exist or belongs to another workspace |
| `FORM_NOT_EDITABLE` | Only DRAFT forms can be edited or deployed |
| `FORM_NOT_DELETABLE` | Only DRAFT forms can be deleted |
| `FORM_ALREADY_PUBLISHED` | Form is already published |
| `FORM_NO_FIELDS` | Missing fieldMapping or deployed content |
| `FORM_VALIDATION_ERROR` | HTML/fieldMapping validation failed (mismatched fields, missing email mapping) |
| `FORM_HAS_DRAFT_VERSION` | A draft version already exists — publish or delete it first |
| `FORM_SLUG_CONFLICT` | Another form already uses this slug |
