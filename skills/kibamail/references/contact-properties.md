# Contact Properties Command Reference

Contact properties are custom fields you define for contacts (e.g., "plan", "company", "signup_date").

## contact-properties list

```bash
kibamail contact-properties list --json
```

---

## contact-properties show \<id\>

```bash
kibamail contact-properties show prop123 --json
```

---

## contact-properties create

**Flags:**
- `--name string` — Property name **[REQUIRED]**
- `--type string` — Property type **[REQUIRED]**: `STRING`, `NUMBER`, `DATE`

```bash
kibamail contact-properties create --name "plan" --type STRING --json
kibamail contact-properties create --name "signup_date" --type DATE --json
kibamail contact-properties create --name "lifetime_value" --type NUMBER --json
```

**Common errors:**
- `CONTACT_PROPERTY_ALREADY_EXISTS` — A property with this name already exists.
- `CONTACT_PROPERTY_LIMIT_REACHED` — Maximum custom properties reached.

---

## contact-properties update \<id\>

**Flags:**
- `--name string` — New name

```bash
kibamail contact-properties update prop123 --name "subscription_plan" --json
```

---

## contact-properties delete \<id\>

```bash
kibamail contact-properties delete prop123 --json
```
