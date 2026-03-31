# Contacts SDK Reference

## Create a Contact

```typescript
const { data, error } = await kibamail.contacts.create({
  email: "user@example.com",
  firstName: "Jane",
  lastName: "Doe",
  phone: "+15551234567",
  country: "US",
  topics: ["topic_id_1", "topic_id_2"],
});
```

## List Contacts

```typescript
const { data } = await kibamail.contacts.list({ limit: 50 });

for (const contact of data.data) {
  console.log(contact.email, contact.firstName);
}
```

## Get a Contact

```typescript
const { data } = await kibamail.contacts.get("contact_id");
console.log(data.email, data.firstName);
```

## Update a Contact

```typescript
const { data } = await kibamail.contacts.update("contact_id", {
  firstName: "Updated Name",
  phone: "+15559876543",
});
```

## Delete a Contact

```typescript
const { data, error } = await kibamail.contacts.delete("contact_id");
```

## Search Contacts

Search uses filter conditions. Operators: `equals`, `not_equals`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`, `contains`, `not_contains`, `starts_with`, `ends_with`, `in`, `not_in`, `exists`.

```typescript
// Simple field condition
const { data } = await kibamail.contacts.search({
  filters: { field: "email", operator: "contains", value: "example.com" },
});

// Compound conditions
const { data } = await kibamail.contacts.search({
  filters: {
    $and: [
      { field: "firstName", operator: "equals", value: "Jane" },
      { field: "country", operator: "equals", value: "US" },
    ],
  },
});

// Topic subscription
const { data } = await kibamail.contacts.search({
  filters: { subscribedToTopic: "topic_id" },
});
```
