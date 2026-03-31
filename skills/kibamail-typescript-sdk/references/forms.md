# Forms SDK Reference

Forms use a deploy-based workflow: create → deploy HTML → publish.

## Create a Form

```typescript
const { data } = await kibamail.forms.create({
  name: "Newsletter Signup",
  fieldMapping: {
    email: { contactPropertyId: "email", contactPropertyType: "standard", fieldType: "string" },
    first_name: { contactPropertyId: "firstName", contactPropertyType: "standard", fieldType: "string" },
  },
});

const formId = data.id;
```

## Deploy (not available via SDK — use fetch)

The deploy endpoint accepts multipart file uploads. The SDK doesn't have a deploy method — use fetch directly:

```typescript
const formData = new FormData();
formData.append("files", new Blob([htmlContent], { type: "text/html" }), "index.html");
formData.append("files", new Blob([cssContent], { type: "text/css" }), "styles.css");

const response = await fetch(`https://api.kibamail.com/v1/forms/${formId}/deploy`, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: formData,
});

const { deployId, files } = await response.json();
```

## Publish a Form

```typescript
const { data } = await kibamail.forms.publish(formId);
```

After publishing, the form is live at `https://app.kibamail.com/p/forms/{formId}`.
Preview URL (no tracking): `https://app.kibamail.com/p/forms/{formId}/preview`.

## Update a Form

```typescript
const { data } = await kibamail.forms.update(formId, {
  name: "Updated Form",
  fieldMapping: {
    email: { contactPropertyId: "email", contactPropertyType: "standard", fieldType: "string" },
  },
  settings: {
    successAction: { type: "redirect", url: "https://example.com/thanks" },
  },
});
```

## List Forms

```typescript
const { data } = await kibamail.forms.list({ limit: 20 });
```

## Get Form Details

```typescript
const { data } = await kibamail.forms.get(formId);
console.log(data.html);         // deployed HTML
console.log(data.deployId);     // deploy identifier
console.log(data.fieldMapping); // field-to-property mapping
```

## Versioning

```typescript
// Create a new version (inherits from parent)
const { data: version } = await kibamail.forms.createVersion(formId);

// Deploy to the version, then publish
await kibamail.forms.publish(version.id);

// List all versions
const { data: versions } = await kibamail.forms.listVersions(formId);
```

## Submit a Form

```typescript
const { data, error } = await kibamail.forms.submit("form_id", {
  email: "user@example.com",
  first_name: "Jane",
});
// data: { object: "form_submission", id: "..." }
```

## Delete a Form

```typescript
await kibamail.forms.delete(formId); // Only DRAFT forms
```
