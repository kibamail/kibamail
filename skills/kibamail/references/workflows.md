# Common Workflows

Multi-step task recipes for common Kibamail operations.

---

## Set up transactional email from scratch

```bash
# 1. Add your sending domain
kibamail domains create --name yourdomain.com --json
# Note the DNS records from the response

# 2. Configure DNS at your provider (DKIM TXT, return path CNAME, tracking CNAME)
# Wait for propagation...

# 3. Verify DNS
kibamail domains verify <domain-id> --json

# 4. Send your first email
kibamail emails send --from noreply@yourdomain.com --to user@example.com --subject "Welcome" --html "<h1>Welcome!</h1>" --json

# 5. Check delivery status
kibamail emails list --to user@example.com --json
```

---

## Send a broadcast campaign

```bash
# 1. Create a segment of target recipients
kibamail segments create --name "Active US" --conditions '{"$and":[{"field":"status","operator":"eq","value":"SUBSCRIBED"},{"field":"country","operator":"eq","value":"US"}]}' --json

# 2. Create and send the broadcast
kibamail broadcasts create-and-send --name "March Newsletter" --subject "Monthly Update" --html "<h1>Hello!</h1>" --segment <segment-id> --send-at 2026-03-28T10:00:00Z --json

# 3. Check campaign stats
kibamail broadcasts stats <broadcast-id> --json

# 4. Check individual sends
kibamail broadcasts sends <broadcast-id> --status BOUNCED --json
```

---

## Test transactional email in sandbox

```bash
# No domain verification needed for @kibamail.dev addresses
kibamail emails send --from test@example.com --to delivered@kibamail.dev --subject "Test" --html "<p>Test</p>" --json
kibamail emails send --from test@example.com --to bounced@kibamail.dev --subject "Test bounce" --html "<p>Test</p>" --json

# Check the results
kibamail emails list --json
```

---

## Create a contact and subscribe to topics

```bash
# 1. Create a topic (if it doesn't exist)
kibamail topics create --name "Newsletter" --json
# Response: {"id":"top_abc"}

# 2. Create the contact with topic subscription
kibamail contacts create --email alice@example.com --first-name Alice --topics top_abc --json
```

---

## Import multiple contacts

There is no bulk import CLI command. Create contacts one at a time:

```bash
kibamail contacts create --email user1@example.com --first-name User1 --json
kibamail contacts create --email user2@example.com --first-name User2 --json
kibamail contacts create --email user3@example.com --first-name User3 --json
```

For large imports, use the Kibamail API directly or the web dashboard.

---

## Paginate through all contacts

```bash
# First page
kibamail contacts list --limit 50 --json
# Check "hasMore" in the response

# If hasMore is true, use the last contact's ID as cursor
kibamail contacts list --limit 50 --after <last-id> --json

# Repeat until hasMore is false
```

To get all IDs quickly:
```bash
kibamail contacts list --quiet
```

---

## Find a contact by email

```bash
kibamail contacts search --conditions '{"field":"email","operator":"eq","value":"alice@example.com"}' --json
```

---

## Create a segment of active subscribers

```bash
kibamail segments create \
  --name "Active Subscribers" \
  --conditions '{"field":"status","operator":"eq","value":"SUBSCRIBED"}' \
  --json
```

---

## Create a segment with multiple conditions

```bash
kibamail segments create \
  --name "US Subscribers" \
  --conditions '{"$and":[{"field":"status","operator":"eq","value":"SUBSCRIBED"},{"field":"country","operator":"eq","value":"US"}]}' \
  --json
```

---

## Trigger an automation for a contact

```bash
# 1. Find a published API-type automation
kibamail automations list --status published --json
# Look for one with triggerType "API"

# 2. Ensure the contact exists
kibamail contacts create --email user@example.com --json
# Response: {"id":"clx_123"}

# 3. Trigger the automation
kibamail automations trigger <automation-id> --contact-id clx_123 --json
```

---

## Fire a custom event

```bash
# This triggers any published automation with triggerType "EVENT"
# and matching eventName in its trigger config
kibamail events create --name purchase_completed --contact-id clx_123 --json

# With properties
kibamail events create --name purchase_completed --contact-id clx_123 \
  --properties '{"amount":99,"plan":"pro"}' --json
```

---

## Set up custom contact properties

```bash
# 1. Create the property
kibamail contact-properties create --name "company" --type text --json
kibamail contact-properties create --name "plan" --type text --json
kibamail contact-properties create --name "mrr" --type number --json

# 2. Properties are set when creating/updating contacts via the API
# (the CLI contacts create command supports standard fields;
#  custom properties require the API directly)
```

---

## Rotate an API key

```bash
# 1. Create a new key
kibamail api-keys create --name "new-production-key" --json
# SAVE THE KEY from the output — it's only shown once

# 2. Set the new key as env var
export KIBAMAIL_API_KEY=<new-key>

# 3. Delete the old key
kibamail api-keys delete <old-key-id> --json
```

---

## Check if authenticated

```bash
kibamail auth status --json
# Returns: {"authenticated":true,"source":"keyring","key_preview":"sk-****xxxx"}
# Or: {"authenticated":false}
```
