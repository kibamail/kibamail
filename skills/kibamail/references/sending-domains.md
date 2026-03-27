# Sending Domains Reference

Before sending real emails, add and verify a sending domain. This configures DKIM, return path, tracking, and optionally DMARC DNS records.

## domains create

**Flags:**
- `--name string` — Domain name **[REQUIRED]**

```bash
kibamail domains create --name yourdomain.com --json
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

---

## domains verify \<id\>

Checks DNS configuration. Call after adding DNS records.

```bash
kibamail domains verify dom_abc --json
```

Response shows which records are verified (dkim, returnPath, tracking, dmarc). At minimum, DKIM and return path must be verified to send emails. DMARC verification is optional.

---

## domains update \<id\>

Toggle open/click tracking. The API also supports a `dmarcEnabled` field (boolean) to enable or disable DMARC for the domain.

**Flags:**
- `--open-tracking` — Enable open tracking (bool)
- `--click-tracking` — Enable click tracking (bool)

```bash
kibamail domains update dom_abc --open-tracking=true --click-tracking=true --json
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
