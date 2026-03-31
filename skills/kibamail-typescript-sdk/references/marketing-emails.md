# Marketing Emails — TypeScript SDK

**HTML Content Requirement:** All email HTML content MUST be generated using [React Email](https://react.email). Write React Email components and use `render()` from `@react-email/render` to produce the HTML string before passing to the SDK. Never write raw HTML strings for email content.

## Create

```typescript
const { data, error } = await kibamail.marketingEmails.create({
  name: "Welcome Email",
  subject: "Welcome, {{firstName}}!",
  html: "<html><body><h1>Welcome</h1></body></html>",
  type: "AUTOMATION",
});
// data: { object: "marketing_email", id: "..." }
```

**Fields:**
- `name` (required) — Template name (max 255 chars)
- `subject` — Subject line (max 998 chars, supports `{{variables}}`)
- `previewText` — Preview text (max 255 chars)
- `html` — Raw HTML content
- `senderIdentityId` — Sender identity ID
- `replyToIdentityId` — Reply-to identity ID
- `trackClicks` — Enable click tracking (default: true)
- `trackOpens` — Enable open tracking (default: true)
- `type` — `"AUTOMATION"` or `"NOTIFICATION"` (default: `"AUTOMATION"`)

---

## List

```typescript
const { data } = await kibamail.marketingEmails.list({ limit: 20 });

for (const email of data.data) {
  console.log(email.id, email.name, email.subject);
}

if (data.hasMore) {
  const lastId = data.data[data.data.length - 1].id;
  const nextPage = await kibamail.marketingEmails.list({ limit: 20, after: lastId });
}
```

---

## Get

```typescript
const { data } = await kibamail.marketingEmails.get("email_id");
// data includes: id, name, subject, previewText, html, variables,
//   senderIdentityId, replyToIdentityId, trackClicks, trackOpens, type
```

The `variables` field is an array of template variable names extracted from the HTML (e.g., `["firstName", "confirmation_url"]`).

---

## Update

```typescript
const { data } = await kibamail.marketingEmails.update("email_id", {
  subject: "Updated Subject",
  html: "<html><body>New content</body></html>",
});
// data: { object: "marketing_email", id: "..." }
```

All fields optional. Pass `null` to clear nullable fields.

---

## Delete

```typescript
const { data, error } = await kibamail.marketingEmails.delete("email_id");

if (error?.error.code === "RESOURCE_CONFLICT") {
  // Email is used by a form — unlink it first
}
```

---

## Preview

```typescript
const { data } = await kibamail.marketingEmails.preview("email_id");
// data: { html: "<html>...rendered with sample values...</html>", hasContent: true }
```

Returns HTML with template variables replaced by sample values (e.g., `{{firstName}}` → `"John"`).

---

## Stats

```typescript
const { data } = await kibamail.marketingEmails.stats("email_id");
// data: { totalSent, totalDelivered, totalOpened, totalClicked,
//         totalBounced, totalComplained, openRate, clickRate, usedByForms }
```
