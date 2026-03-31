# Sending Domains Reference

Before sending real emails, add and verify a sending domain. This configures DKIM, return path, tracking, and optionally DMARC DNS records.

## domains create

**Flags:**
- `--name string` — Domain name **[REQUIRED]**
- `--dmarc-enabled` — Enable DMARC (bool, optional)

```bash
kibamail domains create --name yourdomain.com --json
kibamail domains create --name yourdomain.com --dmarc-enabled=true --json
```

Response includes DNS records to configure at your DNS provider. You need to add DKIM (TXT), return path (CNAME), and tracking (CNAME) records. DMARC is optional and verified separately.

---

## domains list

**Flags:**
- `--limit int` — Maximum number of results
- `--after string` — Cursor for next page

```bash
kibamail domains list --json
kibamail domains list --limit 10 --json
```

---

## domains show \<id\>

Returns full domain info including DNS records and verification status.

```bash
kibamail domains show dom_abc --json
```

**Response shape:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Domain ID |
| `name` | string | Domain name |
| `dkimVerified` | boolean | Whether DKIM DNS record is verified |
| `returnPathVerified` | boolean | Whether return path DNS record is verified |
| `trackingVerified` | boolean | Whether tracking DNS record is verified |
| `dmarcEnabled` | boolean | Whether DMARC is enabled |
| `dmarcVerified` | boolean | Whether DMARC DNS record is verified |
| `inboxEnabled` | boolean | Whether inbox is enabled |
| `inboxMxVerified` | boolean | Whether inbox MX record is verified |
| `openTrackingEnabled` | boolean | Whether open tracking is enabled |
| `clickTrackingEnabled` | boolean | Whether click tracking is enabled |
| `sslStatus` | string | SSL certificate status: "pending", "in_progress", "completed", "failed", or null |
| `sslError` | string \| null | Error message if SSL issuance failed |
| `dnsRecords` | object | DNS records to configure (see below) |

**dnsRecords structure:**

```
dkim:       { type: "TXT", hostname, value }
returnPath: { type: "CNAME", hostname, value }
tracking:   { type: "CNAME", hostname, value }
dmarc:      { type: "TXT", hostname, value } | null  (included when dmarcEnabled: true)
mx:         { type: "MX", hostname, priority, value }
```

---

## domains verify \<id\>

Checks DNS configuration. Call after adding DNS records.

```bash
kibamail domains verify dom_abc --json
```

Response shows which records are verified (dkim, returnPath, tracking, dmarc, mx). At minimum, DKIM and return path must be verified to send emails. DMARC and MX verification is optional.

**Verification response includes:**
- `dkim`: `{ configured, expected, found }`
- `returnPath`: `{ configured, expected, found }`
- `tracking`: `{ configured, expected, found }`
- `dmarc`: `{ configured, expected, found }`
- `mx`: `{ configured, expected, found }`
- `allVerified`: boolean — true when all enabled checks pass

---

## domains update \<id\>

Toggle open/click tracking. The API also supports a `dmarcEnabled` field (boolean) to enable or disable DMARC for the domain.

**Flags:**
- `--open-tracking` — Enable open tracking (bool)
- `--click-tracking` — Enable click tracking (bool)
- `--inbox-enabled` — Enable inbox (bool)

```bash
kibamail domains update dom_abc --open-tracking=true --click-tracking=true --json
kibamail domains update dom_abc --inbox-enabled=true --json
```

---

## domains delete \<id\>

```bash
kibamail domains delete dom_abc --json
```

---

## Setup Workflow

```bash
# 1. Add domain
kibamail domains create --name yourdomain.com --json
# Note the DNS records from the response

# 2. Add DNS records at your DNS provider (DKIM TXT, return path CNAME, tracking CNAME, optionally DMARC TXT)

# 3. Wait for propagation, then verify
kibamail domains verify dom_abc --json
# Check that dkimVerified and returnPathVerified are true

# 4. Enable tracking (optional)
kibamail domains update dom_abc --open-tracking=true --click-tracking=true --json

# 5. Now you can send emails from this domain
kibamail emails send --from hello@yourdomain.com --to user@example.com --subject "Hello" --html "<p>Hi</p>" --json
```
