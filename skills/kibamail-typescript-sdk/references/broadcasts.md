# Broadcasts SDK Reference

**HTML Content Requirement:** All email HTML content MUST be generated using [React Email](https://react.email). Write React Email components and use `render()` from `@react-email/render` to produce the HTML string before passing to the SDK. Never write raw HTML strings for email content.

## Create a Broadcast

```typescript
const { data } = await kibamail.broadcasts.create({
  name: "March Newsletter",
  emailContent: {
    subject: "March Newsletter",
    html: "<h1>Hello {{firstName}}</h1><p>Here is your monthly update.</p>",
    previewText: "Your monthly update is here",
  },
  segmentId: "segment_id",
});
```

## Create and Send in One Call

```typescript
const { data } = await kibamail.broadcasts.createAndSend({
  name: "Flash Sale",
  emailContent: {
    subject: "Flash Sale - 50% Off",
    html: "<h1>50% off everything!</h1>",
  },
  recipients: {
    emails: [
      { email: "user@example.com", variables: { discount: "50" } },
    ],
  },
  sendAt: "2026-04-01T10:00:00Z",
});
```

## List Broadcasts

```typescript
const { data } = await kibamail.broadcasts.list({ limit: 20 });
```

## Get Broadcast Details

```typescript
const { data } = await kibamail.broadcasts.get("broadcast_id");
```

## Update a Broadcast

```typescript
const { data } = await kibamail.broadcasts.update("broadcast_id", {
  name: "Updated Newsletter",
});
```

## Send a Draft Broadcast

```typescript
const { data } = await kibamail.broadcasts.send("broadcast_id");
```

## Get Broadcast Stats

```typescript
const { data } = await kibamail.broadcasts.stats.get("broadcast_id");
console.log(data.recipients.delivered);
console.log(data.engagement.openRate);
console.log(data.deliverability.bounceRate);
```

## List Individual Sends

```typescript
const { data } = await kibamail.broadcasts.sends.list("broadcast_id", { limit: 50 });
```

## Delete a Broadcast

```typescript
await kibamail.broadcasts.delete("broadcast_id");
```
