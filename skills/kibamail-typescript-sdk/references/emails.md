# Transactional Emails SDK Reference

**HTML Content Requirement:** All email HTML content MUST be generated using [React Email](https://react.email). Write React Email components and use `render()` from `@react-email/render` to produce the HTML string before passing to the SDK. Never write raw HTML strings for email content.

**Compliance Variables (template sends only):** When sending via a marketing email template, the template HTML must include `{{business_address}}`, `{{unsubscribe_url}}`, `{{terms_url}}`, and `{{privacy_url}}`. Raw HTML sends (using the `html` field directly) are exempt from this requirement.

## Send an Email

```typescript
const { data } = await kibamail.emails.send({
  from: "noreply@yourdomain.com",
  to: "customer@example.com",
  subject: "Order Confirmation #1234",
  html: "<h1>Thank you for your order!</h1><p>Order #1234 has been confirmed.</p>",
  text: "Thank you for your order! Order #1234 has been confirmed.",
});

console.log(data.id); // transactional email ID
```

## Send with Reply-To

```typescript
const { data } = await kibamail.emails.send({
  from: "support@yourdomain.com",
  to: "customer@example.com",
  subject: "Your support ticket",
  html: "<p>We received your request.</p>",
  replyToEmail: "support@yourdomain.com",
  replyToName: "Support Team",
});
```

## List Sent Emails

```typescript
const { data } = await kibamail.emails.list({
  limit: 20,
  status: "DELIVERED",
  to: "customer@example.com",
});
```

## Get Email Details

```typescript
const { data } = await kibamail.emails.get("email_id");
console.log(data.status);    // DELIVERED, BOUNCED, etc.
console.log(data.openCount); // number of opens
console.log(data.clickCount);
```

## Get Email Events

```typescript
const { data } = await kibamail.emails.events("email_id");
// Returns timeline: Queued → Delivered → Opened → Clicked
```

## Get Email Content

```typescript
const { data } = await kibamail.emails.content("email_id");
console.log(data.html);
console.log(data.text);
```
