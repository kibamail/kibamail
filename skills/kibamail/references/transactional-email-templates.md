# Transactional Email Templates Reference

HTML-only reusable templates for transactional messages (receipts, OTP, password reset, magic links, order confirmations). These are resolvable by `emails send --template-id <uniqueSlug>` and live under a slug namespace shared with the dashboard.

**API path:** `/v1/transactional-email-templates`
**CLI root:** `kibamail transactional-email-templates` (aliases: `tet`, `transactional-templates`)
**Scopes:** `read:templates`, `manage:templates`
**Compliance:** only `{{business_address}}` is required. Do NOT include `{{unsubscribe_url}}` — transactional mail is exempt.

---

## MANDATORY workflow: build HTML with React Email in a temp folder

**Every transactional email template you upload MUST be authored as a React Email component, rendered to HTML in a throwaway temporary project, and then uploaded with `--html-file`.** Never hand-write raw HTML strings. Never paste HTML inline through `--html`. The multi-client CSS, dark-mode tokens, table-based layouts, and Outlook quirks are solved by `@react-email/components` — re-deriving them by hand will break in real clients.

This workflow is non-negotiable for anything that lives beyond a one-off test.

### Step-by-step procedure

**1. Create a throwaway build project** outside the user's repo (use `/tmp` — agents should never dirty the working tree with build scaffolding):

```bash
WORK=$(mktemp -d -t kbtet-XXXXXX) && cd "$WORK"
pnpm init -y >/dev/null
pnpm add -D react react-dom @react-email/components @react-email/render tsx typescript @types/react @types/node >/dev/null
```

Use `pnpm` first; fall back to `npm install` only if `pnpm` is unavailable.

**2. Write the template as a React Email component** — `email.tsx`:

```tsx
import {
  Html, Head, Preview, Body, Container, Section,
  Text, Heading, Button, Hr,
} from "@react-email/components";

export type Props = {
  firstName?: string;
  orderNumber?: string;
  total?: string;
};

export default function OrderReceipt({
  firstName = "{{firstName}}",
  orderNumber = "{{orderNumber}}",
  total = "{{total}}",
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your receipt for order #{orderNumber}</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "system-ui, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "24px", maxWidth: "560px" }}>
          <Heading as="h1" style={{ fontSize: "20px", margin: 0 }}>
            Hi {firstName},
          </Heading>
          <Text>Thanks for your order. Here's your receipt.</Text>
          <Section>
            <Text><strong>Order:</strong> #{orderNumber}</Text>
            <Text><strong>Total:</strong> {total}</Text>
          </Section>
          <Hr />
          <Text style={{ color: "#8898aa", fontSize: "12px" }}>
            {"{{business_address}}"}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

Key rules for the component:

- Emit Handlebars tokens as **default prop values** wrapped in literal strings: `firstName = "{{firstName}}"`. When `@react-email/render` converts the JSX to HTML, the literal `{{firstName}}` ends up in the output and Kibamail's send-time resolver substitutes it.
- **Always include `{{business_address}}`** somewhere visible (footer `<Text>` is fine). The API rejects uploads missing it.
- Use `@react-email/components` primitives (`Container`, `Section`, `Button`, `Img`, `Link`, `Hr`) rather than raw HTML tags. They produce Outlook/Gmail-safe markup.
- **No `<form>`, no `<script>`, no external CSS links.** Email clients strip them.
- Keep the rendered HTML under ~100 KB; Gmail clips above that.

**3. Render to HTML** — `build.ts`:

```ts
import { render } from "@react-email/render";
import fs from "node:fs";
import Email from "./email";

const html = await render(<Email />, { pretty: false });
fs.writeFileSync("email.html", html);
console.log(`wrote ${html.length} bytes`);
```

```bash
pnpm tsx build.ts
```

If the user provides values, pass them to `<Email firstName="Jane" ... />` **only for preview** — do NOT bake them into the production upload. The uploaded template keeps the `{{...}}` tokens so the send-time variables win.

**4. Upload with `--html-file`**:

```bash
kibamail transactional-email-templates create \
  --name "Order Receipt" \
  --slug order-receipt-v1 \
  --subject "Receipt for order #{{orderNumber}}" \
  --preview-text "Thanks for your order" \
  --html-file "$WORK/email.html" \
  --publish \
  --json
```

**5. Verify in Kibamail's own preview** (server-side render with `SAMPLE_VARIABLES`):

```bash
kibamail transactional-email-templates preview <id> --json \
  | jq -r '.html' > /tmp/server-preview.html
```

Open `/tmp/server-preview.html` in a browser to catch anything that broke in transit.

**6. Clean up**:

```bash
cd - >/dev/null && rm -rf "$WORK"
```

### Why a temp folder specifically

- User's repo stays clean (no `node_modules`, no `email.tsx` drift).
- Rebuilding is idempotent and isolated — no version conflicts with the user's own toolchain.
- Works identically in CI, on a developer laptop, and inside an LLM agent sandbox.

If the user explicitly asks for the React Email source to be committed to their project (e.g. they want versioned templates), follow their convention instead — but still render to HTML and upload with `--html-file`; never paste HTML through `--html`.

---

## Commands

| Command | Description |
|---|---|
| `transactional-email-templates create --slug SLUG --name N --subject S --html-file F` | Create a template (add `--publish` for one-shot publish) |
| `transactional-email-templates list` | List templates (supports `--limit`, `--after`, `--status`) |
| `transactional-email-templates show <id>` | Show a template |
| `transactional-email-templates update <id> --html-file F` | Update a DRAFT |
| `transactional-email-templates delete <id>` | Delete a DRAFT |
| `transactional-email-templates publish <id>` | Publish a DRAFT |
| `transactional-email-templates preview <id>` | Server-side rendered preview with sample variables |
| `transactional-email-templates create-version <id>` | Fork a new DRAFT from a published template |
| `transactional-email-templates list-versions <id>` | List every version of a template family |

Aliases `tet` and `transactional-templates` work everywhere.

**Always prefer `--html-file` over `--html`.** `--html` breaks on Handlebars `{{ }}`, inline CSS braces, backticks, and multi-line bodies. They're mutually exclusive.

---

## Editing a published template

Published templates are immutable. The flow is:

```bash
# 1. Fork a new DRAFT from the published one
NEW_ID=$(kibamail transactional-email-templates create-version tpl_abc --json | jq -r '.id')

# 2. Rebuild HTML in temp folder via React Email (same procedure as above)
#    → produces $WORK/email.html with the new design

# 3. Update the DRAFT
kibamail transactional-email-templates update "$NEW_ID" \
  --html-file "$WORK/email.html" \
  --json

# 4. Publish (atomically archives the old one)
kibamail transactional-email-templates publish "$NEW_ID" --json
```

Sends referencing the original `--template-id <slug>` resolve to the newly published version. No code change on the send side.

---

## Sending via template

Once published, a template is sendable by slug:

```bash
kibamail emails send \
  --from noreply@yourdomain.com \
  --to customer@example.com \
  --template-id order-receipt-v1 \
  --template-variables '{"firstName":"Alex","orderNumber":"A-1138","total":"$42.00"}' \
  --json
```

The CLI's `--template-id` expects the **uniqueSlug** (not the internal `tpl_*` id). Slug is what you set with `--slug` on create.

---

## Compliance

- `{{business_address}}` — REQUIRED. API rejects uploads missing it with 400 `VALIDATION_FAILED`.
- `{{unsubscribe_url}}`, `{{terms_url}}`, `{{privacy_url}}` — do NOT include. These are marketing-only variables. Including them in transactional mail confuses recipients and regulators.
- `{{business_address}}` is resolved at send time from the workspace's compliance settings — you do not pass it per-send.

---

## Errors

| Exit | Code | Meaning | Recovery |
|---|---|---|---|
| 6 | `VALIDATION_FAILED` | HTML missing `{{business_address}}` or malformed | Add compliance footer in the React component, re-render, re-upload |
| 5 | `RESOURCE_ALREADY_EXISTS` | Duplicate `--slug` | Use a different slug or update the existing template |
| 3 | `RESOURCE_NOT_FOUND` | Unknown `<id>` or slug | Run `transactional-email-templates list` |
| 2 | `INVALID_PARAMETER` | Called `update`/`delete` on a PUBLISHED template | Run `create-version` first to fork a DRAFT |

---

## When to use this vs. inline HTML on `emails send`

| Situation | Use |
|---|---|
| One-off ad-hoc test | `emails send --subject ... --html-file ...` with React Email output |
| Template fired from more than one place | `transactional-email-templates` + `--template-id <slug>` |
| Versioned / reviewable rollouts | `transactional-email-templates` + `create-version` → `publish` |
| Non-engineer needs to edit later | Upload once, then they edit in the dashboard; sends still resolve the same slug |
