# KumoMTA Webhook Samples

This folder contains realistic sample webhook payloads from KumoMTA. These samples represent the exact JSON structure sent by KumoMTA to the email-agent webhook endpoint.

## Webhook Types

| Type | Description | File |
|------|-------------|------|
| `Reception` | Message received via SMTP/HTTP | `reception.json` |
| `Delivery` | Successful delivery to recipient | `delivery.json` |
| `Bounce` | Permanent delivery failure (hard bounce) | `bounce.json` |
| `TransientFailure` | Temporary delivery failure (soft bounce) | `transient-failure.json` |
| `Expiration` | Message expired from queue | `expiration.json` |
| `AdminBounce` | Administratively bounced | `admin-bounce.json` |
| `OOB` | Out-of-band bounce (DSN report) | `oob.json` |
| `Feedback` | Feedback loop report (spam complaint) | `feedback.json` |
| `Rejection` | SMTP listener rejected message | `rejection.json` |

## Bounce Classifications

| Classification | Description |
|----------------|-------------|
| `InvalidRecipient` | Recipient address doesn't exist (5.1.1-5.1.4) |
| `BadDomain` | Invalid or non-existing domain (5.1.10) |
| `InactiveMailbox` | Disabled/expired mailbox (5.2.1) |
| `QuotaIssues` | Mailbox full (5.2.2, 5.2.3) |
| `DNSFailure` | DNS lookup failed |
| `SpamBlock` | Blocked as spam source |
| `SpamContent` | Blocked due to spam content |
| `SpamRelated` | General spam rejection |
| `PolicyRelated` | Policy-based rejection |
| `AuthenticationFailed` | SPF/DKIM/DMARC failure |
| `TransientFailure` | Temporary congestion |
| `MessageExpired` | Exceeded queue lifetime |
| `NoAnswerFromHost` | Remote host timeout |
| `BadConnection` | Connection issues |
| `ProtocolErrors` | SMTP protocol errors |
| `ContentRelated` | Content rejected |
| `InvalidSender` | Invalid sender domain |
| `RelayDenied` | Relay not allowed |
| `RoutingErrors` | Mail routing issues |
| `TooManyRecipients` | Recipient limit exceeded |
| `Uncategorized` | Default/unknown |

## Metadata Fields

KumoMTA passes custom metadata through the `meta` field. Kibamail injects:

```json
{
  "meta": {
    "tenant_id": "workspace-abc123",
    "broadcast_id": "broadcast-def456",
    "contact_id": "contact-ghi789",
    "campaign": "weekly-newsletter"
  }
}
```

## Response Structure

```json
{
  "response": {
    "code": 550,
    "enhanced_code": {
      "class": 5,
      "subject": 1,
      "detail": 1
    },
    "content": "5.1.1 The email account does not exist",
    "command": "RCPT TO"
  }
}
```

## Batch Webhooks

KumoMTA sends webhooks in batches to `/webhooks` endpoint. A batch can contain 1-1000+ records of mixed types.

```json
[
  { "type": "Delivery", ... },
  { "type": "Bounce", ... },
  { "type": "TransientFailure", ... }
]
```
