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

Search uses filter conditions. Operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `not_contains`, `starts_with`, `ends_with`, `in`, `not_in`, `exists`.

```typescript
// Simple field condition
const { data } = await kibamail.contacts.search({
  filters: { field: "email", operator: "contains", value: "example.com" },
});

// Compound conditions
const { data } = await kibamail.contacts.search({
  filters: {
    $and: [
      { field: "firstName", operator: "eq", value: "Jane" },
      { field: "country", operator: "eq", value: "US" },
    ],
  },
});

// Topic subscription
const { data } = await kibamail.contacts.search({
  filters: { subscribedToTopic: "topic_id" },
});
```
