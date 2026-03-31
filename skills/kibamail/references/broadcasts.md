# Broadcasts (Campaigns) Reference

Broadcasts send email campaigns to contacts, segments, or topics. They support scheduling, per-recipient variables, and delivery/engagement tracking.

**HTML Content Requirement:** All email HTML content MUST be generated using [React Email](https://react.email). Write React Email components and render them to HTML before passing to the API. Never write raw HTML strings for email content.

## Required Compliance Variables

All broadcast HTML **must** include these 4 template variables: `{{business_address}}`, `{{unsubscribe_url}}`, `{{terms_url}}`, `{{privacy_url}}`. Broadcast readiness checks will fail and block send scheduling if any are missing. See the marketing emails reference for details on each variable.

## broadcasts create

**Flags:**
- `--name string` — Campaign name **[REQUIRED]**
- `--subject string` — Email subject
- `--html string` — HTML body
- `--from string` — Sender email
- `--reply-to string` — Reply-to email
- `--text string` — Plain text email body
- `--preview-text string` — Preview text shown in email clients (max 255 chars)
- `--topic-id string` — Send to contacts subscribed to this topic
- `--segment-id string` — Send to contacts in this segment

```bash
kibamail broadcasts create --name "March Newsletter" --subject "March Newsletter" --html "<h1>Hello</h1>" --segment-id seg_abc --json
```

---

## broadcasts create-and-send

Create and schedule a broadcast in one command.

**Flags:**
- `--name string` — Campaign name **[REQUIRED]**
- `--subject string` — Email subject **[REQUIRED]**
- `--html string` — HTML body **[REQUIRED]**
- `--from string` — Sender email address
- `--reply-to string` — Reply-to email address
- `--send-at string` — Scheduled send time (ISO 8601) **[REQUIRED]**
- `--segment string` — Segment ID for recipients
- `--topic string` — Topic ID for recipients
- `--contacts string` — Comma-separated contact IDs
- `--emails string` — Recipient emails as JSON

```bash
# Send to a segment
kibamail broadcasts create-and-send --name "Flash Sale" --subject "50% Off" --html "<h1>Sale!</h1>" --segment seg_abc --send-at 2026-03-28T10:00:00Z --json

# Send to specific contacts
kibamail broadcasts create-and-send --name "VIP Offer" --subject "Exclusive" --html "<p>Hi</p>" --contacts clx1,clx2,clx3 --send-at 2026-03-28T10:00:00Z --json

# Send to email addresses with variables
kibamail broadcasts create-and-send --name "Personalized" --subject "Hi {{name}}" --html "<p>Hello {{name}}</p>" --emails '[{"email":"a@test.com","variables":{"name":"Alice"}},{"email":"b@test.com","variables":{"name":"Bob"}}]' --send-at 2026-03-28T10:00:00Z --json
```

---

## broadcasts list

**Flags:**
- `--limit int` — Maximum number of results
- `--after string` — Cursor for next page

```bash
kibamail broadcasts list --json
kibamail broadcasts list --limit 10 --json
```

---

## broadcasts show \<id\>

```bash
kibamail broadcasts show brd_abc --json
```

---

## broadcasts update \<id\>

Only DRAFT broadcasts can be updated.

**Flags:**
- `--name string` — New name
- `--subject string` — New subject
- `--html string` — New HTML
- `--from string` — Sender email address
- `--reply-to string` — Reply-to email address
- `--text string` — Plain text email body
- `--preview-text string` — Preview text (max 255 chars)
- `--topic-id string` — Topic ID (pass null to clear)
- `--segment-id string` — Segment ID (pass null to clear)
- `--track-opens boolean` — Enable/disable open tracking
- `--track-clicks boolean` — Enable/disable click tracking
- `--send-at string` — New send time (ISO 8601)

```bash
kibamail broadcasts update brd_abc --name "Updated Campaign" --send-at 2026-04-01T09:00:00Z --json
```

---

## broadcasts delete \<id\>

```bash
kibamail broadcasts delete brd_abc --json
```

---

## broadcasts send \<id\>

Schedule an existing broadcast for sending.

> **Note:** The broadcast must already have `sendAt` set (via `broadcasts create` or `broadcasts update`) before calling send.

```bash
kibamail broadcasts send brd_abc --json
```

---

## broadcasts stats \<id\>

Get delivery and engagement statistics.

```bash
kibamail broadcasts stats brd_abc --json
```

Returns `recipients.total`, `recipients.queued`, `recipients.sent`, `recipients.delivered`, `recipients.bounced`, `recipients.complained`, `recipients.failed`, `recipients.unsubscribed`, `engagement.opened`, `engagement.clicked`, `engagement.openRate`, `engagement.clickRate`, `engagement.clickToOpenRate`, `deliverability.deliveryRate`, `deliverability.bounceRate`, `deliverability.complaintRate`, and `detailsPruned` (boolean).

---

## broadcasts sends \<id\>

List per-recipient send results.

**Flags:**
- `--limit int` — Max results
- `--after string` — Cursor
- `--status string` — Filter: QUEUED, SENDING, SENT, DELIVERED, BOUNCED, COMPLAINED, FAILED

Each send result includes per-recipient fields: `id`, `email`, `contactId`, `status`, `queuedAt`, `sentAt`, `deliveredAt`, `firstOpenedAt`, `firstClickedAt`, `bouncedAt`, `complainedAt`, `bounceClassification`, `lastResponseCode`, `lastResponseMessage`, `openCount`, `clickCount`, `uniqueLinksClicked`.

```bash
kibamail broadcasts sends brd_abc --json
kibamail broadcasts sends brd_abc --status BOUNCED --json
```
