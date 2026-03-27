# Other Resources SDK Reference

## Topics

```typescript
// Create
const { data } = await kibamail.topics.create({
  name: "Product Updates",
  description: "Weekly product news",
});

// List
const { data } = await kibamail.topics.list();

// Get
const { data } = await kibamail.topics.get("topic_id");

// Update
const { data } = await kibamail.topics.update("topic_id", {
  name: "Updated Topic Name",
});

// Delete
await kibamail.topics.delete("topic_id");
```

## Segments

Conditions use the same format as contact search filters.

```typescript
// Create with conditions
const { data } = await kibamail.segments.create({
  name: "Active Subscribers",
  conditions: { field: "email", operator: "contains", value: "@company.com" },
});

// List
const { data } = await kibamail.segments.list();

// Get
const { data } = await kibamail.segments.get("segment_id");

// Update
const { data } = await kibamail.segments.update("segment_id", {
  name: "Updated Segment",
  conditions: { field: "country", operator: "eq", value: "US" },
});

// Delete
await kibamail.segments.delete("segment_id");
```

## API Keys

```typescript
// Create (returns the key value — shown only once)
const { data } = await kibamail.apiKeys.create({
  name: "Production Server",
  scopes: ["read:contacts", "write:contacts", "smtp:send"],
});
console.log(data.key); // kb_...

// List
const { data } = await kibamail.apiKeys.list();

// Delete
await kibamail.apiKeys.delete("api_key_id");
```

## Contact Properties

```typescript
// Create (types: STRING, NUMBER, DATE)
const { data } = await kibamail.contactProperties.create({
  name: "Company",
  type: "STRING",
});

// List
const { data } = await kibamail.contactProperties.list();

// Get
const { data } = await kibamail.contactProperties.get("property_id");

// Update
const { data } = await kibamail.contactProperties.update("property_id", {
  name: "Company Name",
});

// Delete
await kibamail.contactProperties.delete("property_id");
```
