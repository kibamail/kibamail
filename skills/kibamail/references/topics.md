# Topics Command Reference

Topics are communication categories that contacts can subscribe to (e.g., "Newsletter", "Product Updates", "Marketing").

## topics list

**Flags:**
- `--limit int` — Maximum results
- `--after string` — Cursor for next page

**Examples:**
```bash
kibamail topics list --json
kibamail topics list --limit 10 --json
```

---

## topics show \<id\>

```bash
kibamail topics show top123 --json
```

---

## topics create

**Flags:**
- `--name string` — Topic name **[REQUIRED]**
- `--description string` — Description
- `--visibility string` — `PUBLIC` or `PRIVATE`
- `--default-opt-in boolean` — Whether new contacts are automatically opted in (default: false)

**Examples:**
```bash
kibamail topics create --name "Newsletter" --json
kibamail topics create --name "Product Updates" --description "Weekly product news" --visibility PUBLIC --json
```

**Common errors:**
- `TOPIC_ALREADY_EXISTS` — A topic with this name exists. Use `topics list` to find it.

---

## topics update \<id\>

**Flags:**
- `--name string` — New name
- `--description string` — New description
- `--visibility string` — `PUBLIC` or `PRIVATE`
- `--default-opt-in boolean` — Whether new contacts are automatically opted in

```bash
kibamail topics update top123 --name "Weekly Newsletter" --json
```

---

## topics delete \<id\>

```bash
kibamail topics delete top123 --json
```
