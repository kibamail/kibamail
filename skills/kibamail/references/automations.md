# Automations Command Reference

Automations are workflows triggered by events (contact subscribed, form submitted, custom event, etc.) that execute actions (send email, update contact, add to topic, etc.).

## automations list

**Flags:**
- `--limit int` — Maximum number of results
- `--after string` — Cursor for next page
- `--status string` — Filter by status: `published`, `draft`, `archived`

```bash
kibamail automations list --json
kibamail automations list --status published --json
kibamail automations list --limit 10 --json
```

---

## automations show \<id\>

Shows full automation details including trigger type, nodes, edges, and settings.

```bash
kibamail automations show auto123 --json
```

**Output includes:**
- `triggerType` — CONTACT_SUBSCRIBED, FORM_SUBMITTED, API, EVENT, PROPERTY_UPDATED, SEGMENT_ENTRY, SEGMENT_EXIT, EMAIL_ENGAGEMENT
- `nodes` — array of workflow steps
- `edges` — connections between steps
- `status` — DRAFT, PUBLISHED, ARCHIVED

---

## automations create

Create a new automation (created as DRAFT).

**Flags:**
- `--name string` — Automation name **[REQUIRED]**
- `--description string` — Description
- `--trigger-type string` — Trigger type: CONTACT_SUBSCRIBED, FORM_SUBMITTED, API, EVENT, PROPERTY_UPDATED, SEGMENT_ENTRY, SEGMENT_EXIT, EMAIL_ENGAGEMENT
- `--trigger-config string` — Trigger configuration as JSON
- `--nodes string` — Nodes array as JSON
- `--edges string` — Edges array as JSON

```bash
kibamail automations create --name "Welcome Series" --trigger-type CONTACT_SUBSCRIBED --json

# With nodes and edges
kibamail automations create --name "Follow-up" --trigger-type EVENT --trigger-config '{"eventName":"purchase"}' --nodes '[...]' --edges '[...]' --json
```

---

## automations update \<id\>

Update an existing automation.

**Flags:**
- `--name string` — Automation name
- `--description string` — Description
- `--nodes string` — Nodes array as JSON
- `--edges string` — Edges array as JSON

```bash
kibamail automations update auto123 --name "Updated Name" --json
kibamail automations update auto123 --nodes '[...]' --edges '[...]' --json
```

---

## automations delete \<id\>

```bash
kibamail automations delete auto123 --json
```

---

## automations publish \<id\>

Publish a draft automation to make it active.

```bash
kibamail automations publish auto123 --json
```

---

## automations archive \<id\>

Archive a published automation.

```bash
kibamail automations archive auto123 --json
```

---

## automations trigger \<id\>

Trigger an API-type automation for a specific contact. Only works for automations with `triggerType: "API"` that are `PUBLISHED`.

**Flags:**
- `--contact-id string` — Contact to enter the automation **[REQUIRED]**
- `--metadata string` — Optional metadata as JSON

**Examples:**
```bash
kibamail automations trigger auto123 --contact-id clx456 --json
kibamail automations trigger auto123 --contact-id clx456 --metadata '{"source":"cli"}' --json
```

**Output:**
```json
{"object":"automation_run","id":"run_abc","automationId":"auto123","contactId":"clx456","status":"ACTIVE"}
```

**Common errors:**
- `AUTOMATION_NOT_FOUND` — Check the automation ID with `automations list`.
- Status 400: "Only API-type automations can be triggered" — The automation's triggerType is not API.
- Status 400: "Automation must be published" — The automation is DRAFT or ARCHIVED.
- Status 400: "Contact not found" — The contact ID does not exist in this workspace.
- Status 409: "Contact already has an active run" — The contact is already in this automation. Wait for the current run to complete.

---

## automations simulate \<id\>

Simulate an automation for a contact (dry run, no side effects). Shows the path a contact would take through the workflow.

**Flags:**
- `--contact-id string` — Contact ID **[REQUIRED]**
- `--seed int` — Seed for deterministic percentage splits (optional)

```bash
kibamail automations simulate auto123 --contact-id clx456 --json
kibamail automations simulate auto123 --contact-id clx456 --seed 42 --json
```

Response includes `steps` array showing each node visited, the action taken, and which branch was followed.

---

## Building Automations — Nodes, Edges, and Branches

Automations are directed graphs. You define **nodes** (steps) and **edges** (connections between steps). The API creates automations as DRAFT — you must publish them to activate.

### Node Types

**Triggers** (exactly one per automation — the entry point):

| Type ID | Trigger | Required data fields |
|---|---|---|
| `contact-subscribed` | Contact subscribes | none |
| `contact-property-updated` | Property changes | `propertyName` |
| `form-filled` | Form submitted | `formId` |
| `webhook-trigger` | API call | none |
| `event` | Custom event | `eventName` |
| `segment-entry` | Enters segment | `segmentId` |
| `segment-exit` | Exits segment | `segmentId` |
| `email-engagement` | Email open/click/bounce/spam | `emailEngagementType` |

**Actions** (do something):

| Type ID | Action | Required data fields |
|---|---|---|
| `send-email` | Send an email | `subject` or `templateId` |
| `send-webhook` | HTTP request | `url` |
| `update-contact` | Update a field | `fieldId`, `fieldValue` |
| `unsubscribe-contact` | Unsubscribe | none |
| `add-to-topic` | Subscribe to topic | `topicIds` (array) |
| `remove-from-topic` | Unsubscribe from topic | `topicIds` (array) |

**Rules** (control flow — create branches):

| Type ID | Rule | Required data fields |
|---|---|---|
| `if-else` | Branch on condition | `conditions` (same format as segment conditions) |
| `percentage-split` | A/B test | `splits` (array of `{id, name, percentage}`, must total 100%) |
| `time-delay` | Wait | `duration` (number), `unit` ("seconds", "minutes", "hours", "days") |

### Edge Structure

Edges connect nodes. For branching nodes, use `sourceHandle` to specify which branch:

- **if-else**: `sourceHandle: "true"` or `sourceHandle: "false"`
- **percentage-split**: `sourceHandle` matches the split's `id` (e.g. `"branch-a"`, `"branch-b"`)
- **All other nodes**: `sourceHandle` is null (only one outgoing path)

Multiple branches can converge back to a single node by having multiple edges point to the same target.

### Real-World Example: Book Purchase Follow-up

**Scenario:** When a customer buys a book, send a thank you, wait 3 days, check if they're subscribed (branch), then A/B test two recommendation styles.

**Flow:**
```
[EVENT: purchase_completed]
         │
    [SEND_EMAIL: "Thanks for your purchase"]
         │
    [TIME_DELAY: 3 days]
         │
    [IF_ELSE: status == SUBSCRIBED?]
     ├─ true ──> [SEND_EMAIL: "Leave a review"] ──> [ADD_TO_TOPIC: "Reviewers"]  ─┐
     └─ false ─> [SEND_EMAIL: "Subscribe for 10% off"]  ──────────────────────────┤
                                                                                    │
    [TIME_DELAY: 7 days]  <─────────────────── (both branches converge here) ──────┘
         │
    [PERCENTAGE_SPLIT: 70/30]
     ├─ branch-a (70%) ──> [SEND_EMAIL: "New releases this week"]
     └─ branch-b (30%) ──> [SEND_EMAIL: "Staff picks for you"]
```

**Create via CLI:**

The `--nodes` and `--edges` flags accept JSON arrays. For readability, store the JSON in a variable:

```bash
NODES='[{"id":"trigger-1","type":"event","position":{"x":250,"y":0},"data":{"eventName":"purchase_completed"}},{"id":"email-thanks","type":"send-email","position":{"x":250,"y":150},"data":{"subject":"Thanks for your purchase!","templateId":"tpl_purchase_thanks"}},{"id":"delay-3d","type":"time-delay","position":{"x":250,"y":300},"data":{"duration":3,"unit":"days"}},{"id":"check-subscribed","type":"if-else","position":{"x":250,"y":450},"data":{"conditions":{"field":"status","operator":"eq","value":"SUBSCRIBED"}}},{"id":"email-review","type":"send-email","position":{"x":100,"y":600},"data":{"subject":"How was your book? Leave a review!","templateId":"tpl_review_request"}},{"id":"add-reviewers","type":"add-to-topic","position":{"x":100,"y":750},"data":{"topicIds":["REPLACE_WITH_TOPIC_ID"]}},{"id":"email-subscribe-offer","type":"send-email","position":{"x":400,"y":600},"data":{"subject":"Subscribe & get 10% off your next order","templateId":"tpl_subscribe_offer"}},{"id":"delay-7d","type":"time-delay","position":{"x":250,"y":900},"data":{"duration":7,"unit":"days"}},{"id":"ab-split","type":"percentage-split","position":{"x":250,"y":1050},"data":{"splits":[{"id":"branch-a","name":"New Releases","percentage":70},{"id":"branch-b","name":"Staff Picks","percentage":30}]}},{"id":"email-new-releases","type":"send-email","position":{"x":100,"y":1200},"data":{"subject":"New releases this week","templateId":"tpl_new_releases"}},{"id":"email-staff-picks","type":"send-email","position":{"x":400,"y":1200},"data":{"subject":"Our staff picks","templateId":"tpl_staff_picks"}}]'

EDGES='[{"id":"e1","source":"trigger-1","target":"email-thanks"},{"id":"e2","source":"email-thanks","target":"delay-3d"},{"id":"e3","source":"delay-3d","target":"check-subscribed"},{"id":"e4","source":"check-subscribed","target":"email-review","sourceHandle":"true"},{"id":"e5","source":"check-subscribed","target":"email-subscribe-offer","sourceHandle":"false"},{"id":"e6","source":"email-review","target":"add-reviewers"},{"id":"e7","source":"add-reviewers","target":"delay-7d"},{"id":"e8","source":"email-subscribe-offer","target":"delay-7d"},{"id":"e9","source":"delay-7d","target":"ab-split"},{"id":"e10","source":"ab-split","target":"email-new-releases","sourceHandle":"branch-a"},{"id":"e11","source":"ab-split","target":"email-staff-picks","sourceHandle":"branch-b"}]'

kibamail automations create \
  --name "Book Purchase Follow-up" \
  --description "Post-purchase engagement: thank you, review request, and recommendations" \
  --trigger-type EVENT \
  --trigger-config '{"eventName":"purchase_completed"}' \
  --nodes "$NODES" \
  --edges "$EDGES" \
  --json
```

**Key points:**
- **11 nodes**: 1 trigger, 4 send-email, 2 time-delay, 1 if-else, 1 add-to-topic, 1 percentage-split
- **11 edges**: each references node IDs. Branching uses `sourceHandle`
- **3 branches**: if-else (true/false) + percentage-split (branch-a/branch-b)
- **Convergence**: both if-else branches merge back into `delay-7d` via edges e7 and e8
- **Created as DRAFT**: publish with `kibamail automations publish <id>` to activate
- **Node type IDs** must match exactly: `event`, `send-email`, `time-delay`, `if-else`, `add-to-topic`, `percentage-split`
- **Position** is for visual layout only (x, y coordinates) — does not affect execution order

### Publish the automation

After creating, the automation is DRAFT. Publish to activate:

```bash
kibamail automations list --status draft --json
# Get the automation ID from the response, then:
kibamail automations publish <automation-id> --json
```

### Trigger the automation

For EVENT-type automations, fire the event:

```bash
kibamail events create --name purchase_completed --contact-id clx123 --properties '{"bookTitle":"The Great Gatsby","amount":12.99}' --json
```

For API-type automations, trigger directly:

```bash
kibamail automations trigger auto123 --contact-id clx456 --json
```
