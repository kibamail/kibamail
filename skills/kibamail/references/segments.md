# Segments Command Reference

Segments are dynamic groups of contacts defined by conditions. Contacts matching the conditions are automatically included.

## segments list

**Flags:**
- `--limit int` — Maximum results
- `--after string` — Cursor for next page

```bash
kibamail segments list --json
```

---

## segments show \<id\>

```bash
kibamail segments show seg123 --json
```

---

## segments create

**Flags:**
- `--name string` — Segment name **[REQUIRED]**
- `--description string` — Description
- `--conditions string` — Conditions as JSON **[REQUIRED]**

**Conditions format:** Same as `contacts search` conditions — field conditions, topic conditions, and logical operators ($and, $or, $not).

**Examples:**
```bash
# All subscribed contacts
kibamail segments create --name "Active Subscribers" --conditions '{"field":"status","operator":"eq","value":"SUBSCRIBED"}' --json

# US subscribers
kibamail segments create --name "US Subscribers" --conditions '{"$and":[{"field":"status","operator":"eq","value":"SUBSCRIBED"},{"field":"country","operator":"eq","value":"US"}]}' --json
```

---

## segments update \<id\>

**Flags:**
- `--name string` — New name
- `--conditions string` — New conditions as JSON

```bash
kibamail segments update seg123 --name "Active US Subscribers" --json
```

---

## segments delete \<id\>

```bash
kibamail segments delete seg123 --json
```

---

## segments contacts \<id\>

List contacts that match a segment's conditions.

**Flags:**
- `--limit int` — Maximum results

```bash
kibamail segments contacts seg123 --json
kibamail segments contacts seg123 --limit 50 --json
```
