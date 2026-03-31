# API Keys Command Reference

## api-keys list

```bash
kibamail api-keys list --json
```

---

## api-keys create

**Flags:**
- `--name string` — Key name **[REQUIRED]**
- `--scopes strings` — Permission scopes (comma-separated). **Required. At least one scope must be provided.**

Available scopes:

| Category | Scopes |
|---|---|
| API Keys | `read:api-keys`, `write:api-keys`, `delete:api-keys` |
| Contacts | `read:contacts`, `write:contacts`, `update:contacts`, `delete:contacts` |
| Tags | `read:tags`, `write:tags`, `update:tags`, `delete:tags` |
| Topics | `read:topics`, `write:topics`, `update:topics`, `delete:topics` |
| Segments | `read:segments`, `write:segments`, `update:segments`, `delete:segments` |
| Suppression List | `read:suppression-list`, `write:suppression-list`, `update:suppression-list`, `delete:suppression-list` |
| SMTP | `smtp:send` |
| Broadcasts | `read:broadcasts`, `write:broadcasts` |
| Forms | `read:forms`, `write:forms`, `update:forms`, `delete:forms` |
| Sending Domains | `read:domains`, `write:domains`, `update:domains`, `delete:domains` |
| Contact Properties | `read:contact-properties`, `write:contact-properties`, `update:contact-properties`, `delete:contact-properties` |
| Automations | `read:automations`, `write:automations`, `delete:automations` |
| Marketing Emails | `read:emails`, `write:emails` |
| Inbox | `read:inbox`, `write:inbox` |

```bash
kibamail api-keys create --name "CI Key" --json
kibamail api-keys create --name "Read Only" --scopes read:contacts,read:topics --json
```

**Output includes the key value — save it immediately, it is only shown once.**

---

## api-keys delete \<id\>

```bash
kibamail api-keys delete key123 --json
```
