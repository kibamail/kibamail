# Forms Reference

Forms are fully customizable HTML landing pages that collect contact information. You provide your own HTML, CSS, JS, and assets — Kibamail handles validation, submission processing, and contact creation. Forms can also be used without HTML (API-only) for headless submission via the API.

## End-to-End Workflow

### With HTML (hosted form)

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

### Without HTML (API-only form)

```bash
# 1. Create form with field mapping
kibamail forms create --name "API Signup" \
  --field-mapping '{"email":{"contactPropertyId":"email","contactPropertyType":"standard","fieldType":"string"}}' --json

# 2. Publish directly (no deploy needed)
kibamail forms publish <form-id> --json

# 3. Submit via API
curl -X POST https://api.kibamail.com/v1/forms/<form-id>/submissions \
  -H "Authorization: Bearer $KIBAMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

Forms can be published without deploying HTML. The only requirement is a valid `fieldMapping` with at least one field. This is useful for headless forms that collect submissions via the API only.

---

## Create a Form

```bash
kibamail forms create --name "Newsletter Signup" \
  --field-mapping '{"email":{"contactPropertyId":"email","contactPropertyType":"standard","fieldType":"string"},"first_name":{"contactPropertyId":"firstName","contactPropertyType":"standard","fieldType":"string"}}' --json
```

**Fields:**
- `name` — form name (required, max 200 chars)
- `description` — optional description (max 1000 chars)
- `type` — `SIGN_UP` (creates contacts) or `SURVEY` (stores submissions only). Default: `SIGN_UP`
- `fieldMapping` — maps HTML input `name` attributes (or API submission keys) to contact properties (required)
- `settings` — optional settings object (see [Form Settings](#form-settings))

**Field mapping rules:**
- `email` field mapped to the `email` standard contact property is required for SIGN_UP forms
- For hosted forms: every input in your HTML `<form>` must have a corresponding fieldMapping entry, and vice versa
- For API-only forms: fieldMapping defines the accepted submission keys

**Standard contact properties:** `email`, `firstName`, `lastName`, `phone`, `country`, `timezone`, `city`

For custom properties, use `contactPropertyType: "custom"` with the property ID.

---

## Form Settings

Settings control post-submission behavior and double opt-in. Pass as JSON via the `--settings` flag on create or update.

```bash
kibamail forms create --name "Signup" \
  --field-mapping '...' \
  --settings '{"successAction":{"type":"message","message":"Thanks for signing up!"}}' --json
```

**Settings fields:**

| Field | Type | Description |
|---|---|---|
| `successAction.type` | `"message"` or `"redirect"` | What happens after successful submission |
| `successAction.message` | string | Message shown on success (when type is `"message"`) |
| `successAction.url` | string | URL to redirect to (when type is `"redirect"`, must be valid URL) |
| `successAction.openInNewTab` | boolean | Open redirect in new tab (default: `false`) |
| `doubleOptIn.enabled` | boolean | Enable double opt-in confirmation email |

---

## Double Opt-In

When enabled, contacts created from SIGN_UP form submissions are marked `UNCONFIRMED` until they click a confirmation link in an email.

### Setup

1. Create or choose an existing marketing email to use as the confirmation email. It must have a subject line and HTML content.
2. Enable double opt-in in form settings and link the email:

```bash
# Enable double opt-in
kibamail forms update <form-id> \
  --settings '{"doubleOptIn":{"enabled":true}}' \
  --double-opt-in-email-id <email-id> --json
```

3. Publish the form. Publishing validates that the linked email exists, has a subject, has content, and includes compliance variables (`{{business_address}}`, `{{unsubscribe_url}}`, `{{terms_url}}`, `{{privacy_url}}`). Returns `FORM_VALIDATION_ERROR` (400) if the linked email is missing any of them.

### Flow

1. User submits form
2. Contact created with status `UNCONFIRMED`
3. Confirmation email sent to the contact
4. Contact clicks confirmation link
5. Contact status changes to `SUBSCRIBED`

If the contact already exists and is already confirmed, the confirmation email is not re-sent.

---

## SEO Fields

Configure Open Graph tags, favicon, and URL slug for hosted forms. Set via the update command:

```bash
kibamail forms update <form-id> \
  --seo-title "Join our newsletter" \
  --seo-description "Get weekly updates on..." \
  --seo-image-url "https://example.com/og.png" \
  --seo-favicon-url "https://example.com/favicon.ico" \
  --slug "newsletter-signup" --json
```

| Field | Max Length | Notes |
|---|---|---|
| `seoTitle` | 200 chars | Page `<title>` and `og:title` |
| `seoDescription` | 500 chars | `og:description` meta tag |
| `seoImageUrl` | 2000 chars | `og:image` (must be valid URL) |
| `seoFaviconUrl` | 2000 chars | Favicon (must be valid URL) |
| `slug` | 100 chars | Lowercase alphanumeric + hyphens only (`/^[a-z0-9-]+$/`), unique per workspace |

When a slug is set, the form is accessible at `https://app.kibamail.com/p/forms/{slug}` in addition to the ID-based URL.

All SEO fields are nullable — pass `null` to clear.

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

## Form Submissions via API

Published forms accept submissions via the API. This works for both hosted and API-only forms.

```bash
# Submit to a form
curl -X POST https://api.kibamail.com/v1/forms/<form-id>/submissions \
  -H "Authorization: Bearer $KIBAMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","first_name":"Jane"}'
```

**Request body:** JSON object where keys match the form's `fieldMapping` keys.

**Response (201):**
```json
{
  "object": "form_submission",
  "id": "submission_id"
}
```

### Behavior by form type

| Aspect | SIGN_UP | SURVEY |
|---|---|---|
| Contact creation | Creates or updates a contact | Does not create/update contacts |
| Required fields | Must include `email` | No required fields |
| Double opt-in | Sends confirmation email if enabled | Not applicable |

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

**Requirements:**
- Form must have a valid `fieldMapping` with at least one field
- If double opt-in is enabled, a linked email with subject and content is required
- Deployed HTML is **not required** — forms can be published without it for API-only use

The form becomes live at its public URL (if HTML is deployed) and accepts API submissions.

---

## Update a Form

```bash
kibamail forms update <form-id> --name "Updated Name" --json

kibamail forms update <form-id> --field-mapping '{"email":{"contactPropertyId":"email","contactPropertyType":"standard","fieldType":"string"},"company":{"contactPropertyId":"company","contactPropertyType":"custom","fieldType":"string"}}' --json

# Update settings
kibamail forms update <form-id> --settings '{"successAction":{"type":"redirect","url":"https://example.com/thanks"}}' --json

# Update SEO
kibamail forms update <form-id> --seo-title "Subscribe" --slug "subscribe" --json

# Link double opt-in email
kibamail forms update <form-id> --double-opt-in-email-id <email-id> --json
```

Only DRAFT forms can be updated. If fieldMapping changes and the form has deployed HTML, validation runs automatically.

---

## Versioning

To update a published form without downtime, create a new version:

```bash
# List existing versions
# API: GET /v1/forms/<form-id>/versions

# Create a new version (inherits content and settings from parent)
# API: POST /v1/forms/<form-id>/versions
# Body is optional — accepts same fields as update to override inherited values

# Deploy new content to the version
kibamail forms deploy <version-id> --path ./updated-form --json

# Publish the version (archives the previous)
kibamail forms publish <version-id> --json
```

**Rules:**
- Only one DRAFT version per form at a time (error: `FORM_HAS_DRAFT_VERSION`)
- New versions inherit the parent's HTML, assets, SEO fields, and settings
- The live URL stays the same after publishing a new version
- Previous version is automatically archived
- You can roll back by publishing an archived version

---

## Form Analytics

Form analytics (views, submissions, conversion rate) are available in the dashboard. Stats are tracked per root form, aggregated across all versions.

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

Returns: name, description, status, type, html, deployId, deployedFiles, fieldMapping, settings, SEO fields, doubleOptInEmailId, timestamps.

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
| `FORM_NO_FIELDS` | Missing fieldMapping |
| `FORM_VALIDATION_ERROR` | HTML/fieldMapping validation failed (mismatched fields, missing email mapping, or double opt-in email missing/invalid) |
| `FORM_HAS_DRAFT_VERSION` | A draft version already exists — publish or delete it first |
| `FORM_SLUG_CONFLICT` | Another form already uses this slug |
