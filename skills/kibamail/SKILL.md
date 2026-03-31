---
name: kibamail
description: >
  Send transactional emails, manage email marketing campaigns, contacts, topics,
  segments, forms, automations, sending domains, and API keys using the Kibamail
  CLI and API. Use this skill whenever the user mentions transactional email,
  email marketing, mailing lists, contacts, subscribers, newsletters, opt-in
  forms, email automations, drip campaigns, sending domains, broadcast campaigns,
  email templates, DKIM, email infrastructure — even if they don't explicitly
  say "kibamail".
---

# Kibamail CLI & API

Kibamail is an email platform for both **transactional email** (password resets, receipts, notifications) and **email marketing** (newsletters, campaigns, automations). The `kibamail` CLI and REST API manage the full stack. The CLI is 100% non-interactive — designed for you.

**Two product areas:**
- **Transactional email** — send individual emails via API, track delivery/opens/clicks, manage sending domains
- **Email marketing** — contacts, topics, segments, broadcasts (campaigns), automations, forms

## Command Pattern

```
kibamail [resource] [verb] [flags]
```

Resources: `emails`, `domains`, `broadcasts`, `contacts`, `topics`, `segments`, `forms`, `automations`, `api-keys`, `marketing-emails`, `contact-properties`, `events`, `inbox`

## Authentication

Two methods, checked in this order:

1. **Env var**: Set the `KIBAMAIL_API_KEY` environment variable (recommended)
2. **System keyring**: stored via `kibamail auth login`

```bash
# Check auth state
kibamail auth status --json

# Store key in system keyring
kibamail auth login

# Remove stored key
kibamail auth logout
```

**Important:** Never pass API keys as command-line arguments or hardcode them in code. Always use the `KIBAMAIL_API_KEY` environment variable.

## Global Flags

Available on every command:

| Flag | Purpose |
|---|---|
| `--api-key` | API key (prefer `KIBAMAIL_API_KEY` env var instead) |
| `--json` | Force JSON output |
| `--output string` | Output format: `auto`, `json`, `table` |
| `--fields strings` | Comma-separated fields to include in JSON output |
| `--quiet` | Output only IDs, one per line |
| `--base-url string` | Override API base URL |

## Output Behavior

- **TTY** (terminal): table format
- **Piped** (non-TTY): auto-switches to JSON — agents get JSON by default
- **`--json`**: forces JSON regardless of TTY
- **`--quiet`**: outputs only IDs, one per line — useful for scripting
- **`--fields`**: filters JSON output to specific fields — protects context window

Always use `--json` when parsing output programmatically.

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | General error |
| 2 | Usage error (bad flags or arguments) |
| 3 | Resource not found (404) |
| 4 | Authentication failure (401/403) |
| 5 | Conflict (409) |
| 6 | Validation error (422) |
| 7 | Rate limited (429) |

## Command Quick Reference

### Auth
| Command | Description |
|---|---|
| `auth login` | Store API key in system keyring |
| `auth logout` | Remove stored key |
| `auth status` | Show auth state |

### Contacts
| Command | Description |
|---|---|
| `contacts list` | List contacts (supports `--limit`, `--after`) |
| `contacts show <id>` | Show a contact |
| `contacts create --email EMAIL` | Create a contact |
| `contacts update <id>` | Update a contact |
| `contacts delete <id>` | Delete a contact |
| `contacts search --conditions JSON` | Search by conditions |

### Topics
| Command | Description |
|---|---|
| `topics list` | List topics |
| `topics show <id>` | Show a topic |
| `topics create --name NAME` | Create a topic |
| `topics update <id>` | Update a topic |
| `topics delete <id>` | Delete a topic |
| `topics contacts <id>` | List contacts subscribed to a topic |

### Segments
| Command | Description |
|---|---|
| `segments list` | List segments |
| `segments show <id>` | Show a segment |
| `segments create --name NAME --conditions JSON` | Create a segment |
| `segments update <id>` | Update a segment |
| `segments delete <id>` | Delete a segment |
| `segments contacts <id>` | List contacts in a segment |

### Forms
| Command / Endpoint | Description |
|---|---|
| `forms list` | List forms |
| `forms show <id>` | Show a form |
| `forms create --name NAME` | Create a form |
| `forms update <id>` | Update a form |
| `forms delete <id>` | Delete a form |
| `forms submit <id> --data JSON` | Submit data to a published form |
| `POST /v1/forms/{id}/deploy` | Deploy HTML site bundle (multipart upload) |
| `POST /v1/forms/{id}/publish` | Publish a form (make it live) |
| `POST /v1/forms/{id}/versions` | Create a new version |
| Preview URL | `https://app.kibamail.com/p/forms/{id}/preview` |
| Live URL | `https://app.kibamail.com/p/forms/{id}` |

### Automations
| Command | Description |
|---|---|
| `automations list` | List automations (supports `--status`) |
| `automations show <id>` | Show an automation |
| `automations create --name NAME` | Create an automation |
| `automations update <id>` | Update an automation |
| `automations delete <id>` | Delete an automation |
| `automations publish <id>` | Publish an automation |
| `automations archive <id>` | Archive an automation |
| `automations trigger <id> --contact-id ID` | Trigger an API-type automation |

### Events
| Command | Description |
|---|---|
| `events create --event-name NAME --contact-id ID` | Fire a custom event |

### API Keys
| Command | Description |
|---|---|
| `api-keys list` | List API keys |
| `api-keys create --name NAME` | Create an API key |
| `api-keys delete <id>` | Delete an API key |

### Marketing Emails
| Command | Description |
|---|---|
| `marketing-emails list` | List marketing emails |
| `marketing-emails show <id>` | Show a marketing email |
| `marketing-emails create --subject SUBJECT` | Create a marketing email |
| `marketing-emails update <id>` | Update a marketing email |
| `marketing-emails delete <id>` | Delete a marketing email |

### Inbox
| Command | Description |
|---|---|
| `inbox conversations list` | List inbox conversations |
| `inbox conversations show <id>` | Show a conversation |
| `inbox conversations reply <id>` | Reply to a conversation |
| `inbox stats` | Get inbox statistics |

### Contact Properties
| Command | Description |
|---|---|
| `contact-properties list` | List custom properties |
| `contact-properties show <id>` | Show a property |
| `contact-properties create --name NAME --type TYPE` | Create a property (type: STRING, NUMBER, DATE) |
| `contact-properties update <id>` | Update a property |
| `contact-properties delete <id>` | Delete a property |

### Transactional Email
| Command | Description |
|---|---|
| `emails send --from EMAIL --to EMAIL --subject SUBJ --html HTML` | Send a transactional email |
| `emails list` | List sent emails (supports `--status`, `--to`, `--subject`, `--from-date`, `--to-date`) |
| `emails show <id>` | Get email details (status, opens, clicks) |
| `emails events <id>` | Get email event timeline |
| `emails content <id>` | Get email HTML/text content |

### Sending Domains
| Command | Description |
|---|---|
| `domains create --name DOMAIN` | Add a sending domain |
| `domains list` | List domains |
| `domains show <id>` | Get domain with DNS records |
| `domains update <id>` | Update settings (`--open-tracking`, `--click-tracking`, `--dmarc-enabled`, `--inbox-enabled`) |
| `domains delete <id>` | Remove a domain |
| `domains verify <id>` | Verify DNS configuration |

### Broadcasts / Campaigns
| Command | Description |
|---|---|
| `broadcasts create --name NAME` | Create a broadcast |
| `broadcasts list` | List broadcasts |
| `broadcasts show <id>` | Get broadcast details |
| `broadcasts update <id>` | Update a broadcast |
| `broadcasts delete <id>` | Delete a broadcast |
| `broadcasts send <id>` | Schedule broadcast for sending |
| `broadcasts create-and-send --name N --subject S --html H --send-at T` | Create and send in one call |
| `broadcasts sends <id>` | List individual send results |
| `broadcasts stats <id>` | Get broadcast statistics |

## Error Handling

All errors return structured JSON on stderr (when using `--json`):

```json
{
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "Contact 'xyz' not found in this workspace",
    "hint": "The contact ID does not exist. List contacts with GET /v1/contacts.",
    "request_id": "req_abc123",
    "retryable": false,
    "exit_code": 3
  }
}
```

Key fields:
- **code**: machine-readable error code (stable across versions)
- **hint**: actionable recovery suggestion
- **retryable**: whether retrying might succeed
- **exit_code**: the process exit code

For the full list of every error code and its recovery action, read `references/error-recovery.md`.

## Reference Files

Read these on demand when you need detailed information:

| File | When to read |
|---|---|
| `references/transactional-email.md` | Sending transactional emails, checking delivery status, sandbox testing |
| `references/sending-domains.md` | Adding and verifying sending domains, DNS setup |
| `references/broadcasts.md` | Creating and sending email campaigns |
| `references/contacts.md` | Contact management — CRUD, search, conditions format |
| `references/topics.md` | Communication topics |
| `references/segments.md` | Dynamic contact segments — includes conditions JSON format |
| `references/forms.md` | Signup and survey forms |
| `references/automations.md` | Automation workflows — includes trigger details |
| `references/marketing-emails.md` | Marketing email templates — CRUD, preview, stats, template variables |
| `references/api-keys.md` | API key management |
| `references/contact-properties.md` | Custom contact properties |
| `references/events.md` | Custom events for automation triggers |
| `references/error-recovery.md` | Every error code with recovery commands |
| `references/workflows.md` | Multi-step task recipes |

## TypeScript SDK

For integrating Kibamail into TypeScript/Node.js applications, see the **kibamail-typescript-sdk** skill. It covers the `kibamail` npm package with typed methods for all resources.

```typescript
import { Kibamail } from "kibamail";
const kibamail = new Kibamail(process.env.KIBAMAIL_API_KEY!);
```
