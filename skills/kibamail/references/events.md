# Events Command Reference

Custom events trigger automations that have `triggerType: "EVENT"`. When you fire an event, Kibamail finds all published automations matching the event name and starts them for the specified contact.

## events create

**Flags:**
- `--name string` — Event name **[REQUIRED]** (alphanumeric, underscores, hyphens, dots only)
- `--contact-id string` — Contact ID **[REQUIRED]**
- `--properties string` — Event properties as JSON (optional)

**Examples:**
```bash
kibamail events create --name purchase_completed --contact-id clx123 --json
kibamail events create --name signup --contact-id clx123 --properties '{"plan":"pro","amount":99}' --json
kibamail events create --name page.viewed --contact-id clx123 --properties '{"url":"/pricing"}' --json
```

**Output:**
```json
{"object":"event","id":"evt_abc","eventName":"purchase_completed","contactId":"clx123"}
```

**Notes:**
- The event is processed asynchronously (202 response).
- The event name must match the `eventName` in the automation's trigger config.
- The contact must exist in the workspace.

**Common errors:**
- Status 400: "Contact not found" — The contact ID does not exist.
- Status 422: "eventName is required" — The `--name` flag is missing.
