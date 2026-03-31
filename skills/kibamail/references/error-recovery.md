# Error Recovery Reference

Every Kibamail API error code with its meaning and the exact CLI command to recover.

---

## Authentication Errors (exit code 4)

### INVALID_API_KEY
Your API key is invalid or expired.
```bash
# Set a valid key via environment variable
export KIBAMAIL_API_KEY=<valid-key>
```

### MISSING_API_KEY
No API key provided.
```bash
# Set the KIBAMAIL_API_KEY environment variable
export KIBAMAIL_API_KEY=<key>
```

### MISSING_AUTHORIZATION_HEADER
Authorization header is missing.
```bash
# Set the KIBAMAIL_API_KEY environment variable
export KIBAMAIL_API_KEY=<key>
kibamail contacts list --json
```

### INVALID_AUTHORIZATION_HEADER
Authorization header format is wrong.

### INSUFFICIENT_SCOPE
Your API key lacks the required scope for this operation.
```bash
# Create a new key with needed scopes
kibamail api-keys create --name "full-access" --scopes read:contacts,write:contacts,read:topics,write:topics --json
```

### INSUFFICIENT_PERMISSIONS
Your API key doesn't have permission for this operation.

### API_KEY_EXPIRED
This API key has expired. Generate a new one.
```bash
kibamail api-keys create --name "new-key" --json
# Save the key from the output, then set it as env var:
export KIBAMAIL_API_KEY=<new-key>
```

### ACCESS_DENIED
Access denied. Verify your API key has the required permissions.

### AUTHENTICATION_REQUIRED
Authentication is required. Provide a valid API key.
```bash
export KIBAMAIL_API_KEY=<key>
```

---

## Contact Errors

### CONTACT_NOT_FOUND (exit code 3)
The contact ID does not exist.
```bash
# List contacts to find valid IDs
kibamail contacts list --json
# Or search by email
kibamail contacts search --conditions '{"field":"email","operator":"contains","value":"@example.com"}' --json
```

### CONTACT_ALREADY_EXISTS (exit code 5)
A contact with this email already exists.
```bash
# Find the existing contact
kibamail contacts search --conditions '{"field":"email","operator":"eq","value":"alice@example.com"}' --json
# Update it instead
kibamail contacts update <id> --first-name NewName --json
```

### EMAIL_ALREADY_EXISTS (exit code 5)
Same as CONTACT_ALREADY_EXISTS.

---

## Topic Errors

### TOPIC_NOT_FOUND (exit code 3)
```bash
kibamail topics list --json
```

### TOPIC_ALREADY_EXISTS (exit code 5)
A topic with this name exists. Use `topics list` to find it.

---

## Segment Errors

### SEGMENT_NOT_FOUND (exit code 3)
```bash
kibamail segments list --json
```

---

## Automation Errors

### AUTOMATION_NOT_FOUND (exit code 3)
```bash
kibamail automations list --json
```

### AUTOMATION_VALIDATION_FAILED (exit code 1)
The automation flow has configuration errors. Check the `details.errors` array in the error response for specific node issues.

---

## Form Errors

### FORM_NOT_FOUND (exit code 3)
```bash
kibamail forms list --json
```

### FORM_NOT_EDITABLE
Only DRAFT forms can be edited. Create a new version to modify a published form.

### FORM_ALREADY_PUBLISHED
This form is already published. Archive it first or create a new version.

### FORM_NOT_DELETABLE
Cannot delete in current state. Archive it first.

### FORM_HAS_DRAFT_VERSION
A draft version already exists. Edit the existing draft instead.

### FORM_NO_FIELDS
Add at least one field before publishing.

### FORM_MISSING_EMAIL_FIELD
Sign-up forms require an email field.

### FORM_UNMAPPED_FIELDS
Map all form fields to contact properties before publishing.

### FORM_SLUG_CONFLICT
This URL slug is already taken. Choose a different slug.

### FORM_VALIDATION_ERROR
Form HTML/field mapping validation failed. Check that HTML has exactly one form element and all field names match the fieldMapping.

---

## Broadcast Errors

### BROADCAST_NOT_FOUND (exit code 3)
Broadcast doesn't exist or belongs to another workspace.
```bash
kibamail broadcasts list --json
```

### BROADCAST_NOT_EDITABLE
Broadcast is not in an editable state. Only draft broadcasts can be modified.

### BROADCAST_DETAILS_PRUNED
Send-level details have been pruned for this broadcast. Summary stats may still be available.
```bash
kibamail broadcasts stats <broadcast-id> --json
```

### BROADCAST_INVALID_FROM_DOMAIN
Sender domain is not verified. Verify the domain before sending.
```bash
kibamail domains list --json
kibamail domains verify <domain-id> --json
```

---

## Sending Domain Errors

### SENDING_DOMAIN_NOT_FOUND (exit code 3)
Sending domain not found.
```bash
kibamail domains list --json
```

### SENDING_DOMAIN_NOT_VERIFIED
Sending domain DNS records have not been verified. Configure DNS and verify.
```bash
kibamail domains verify <domain-id> --json
```

### SENDING_DOMAIN_ALREADY_EXISTS (exit code 5)
A domain with this name already exists.
```bash
# List existing domains to find the duplicate
kibamail domains list --json
```

---

## Template Errors

### TEMPLATE_NOT_FOUND (exit code 3)
Template not found.

### TEMPLATE_NOT_EDITABLE
Only draft templates can be edited. Create a new draft version to modify a published template.

### TEMPLATE_NOT_PUBLISHED
Template is not published. Publish it before using it.

### TEMPLATE_ALREADY_PUBLISHED
Template is already published.

### TEMPLATE_HAS_DRAFT_VERSION
A draft version already exists. Edit the existing draft instead.

### TEMPLATE_NO_CONTENT
Template has no content. Add content before publishing.

---

## Conversation Errors

### CONVERSATION_NOT_FOUND (exit code 3)
Conversation not found.

---

## Contact Property Errors

### CONTACT_PROPERTY_NOT_FOUND (exit code 3)
```bash
kibamail contact-properties list --json
```

### CONTACT_PROPERTY_ALREADY_EXISTS (exit code 5)
Use a different name.

### CONTACT_PROPERTY_LIMIT_REACHED
Maximum custom properties reached for this workspace.

---

## Validation Errors (exit code 6)

### VALIDATION_FAILED
Check the `validation_errors` array in the error response. Each entry has `field`, `code`, and `message`.

**Missing compliance variables:** If the error mentions `business_address`, `unsubscribe_url`, `terms_url`, or `privacy_url`, add the missing `{{variable}}` placeholders to your email HTML. All marketing emails, broadcast HTML, automation send-email templates, and double opt-in emails must include `{{business_address}}`, `{{unsubscribe_url}}`, `{{terms_url}}`, and `{{privacy_url}}`. Raw HTML transactional sends are exempt.

### INVALID_EMAIL_FORMAT
Use standard email format: `user@example.com`

### MISSING_REQUIRED_FIELD
A required field is missing. Check command help: `kibamail <resource> <verb> --help`

### INVALID_FIELD_VALUE
The value doesn't match the expected type.

### FIELD_TOO_LONG / FIELD_TOO_SHORT
Value exceeds length limits.

### INVALID_JSON
The JSON string is malformed. Validate your JSON before passing it.

### INVALID_FIELD_TYPE
Use one of the allowed types (text, number, date for properties).

### INVALID_PARAMETER
A parameter value is invalid. Check the error response for details on which parameter and what values are allowed.

### MISSING_PARAMETER
A required parameter is missing. Check command help: `kibamail <resource> <verb> --help`

### INVALID_ATTACHMENT_FORMAT
Attachment format is not supported. Use a supported file type.

### ATTACHMENT_TOO_LARGE
Attachment exceeds the maximum allowed size limit.

### SLUG_ALREADY_EXISTS
The URL slug is already in use. Choose a different slug.

---

## Rate Limiting (exit code 7)

### RATE_LIMIT_EXCEEDED
Too many requests. The error response includes retry timing. Wait and retry.

---

## Resource Errors

### RESOURCE_NOT_FOUND (exit code 3)
Generic not-found. Verify the ID.

### RESOURCE_ALREADY_EXISTS (exit code 5)
A record with these unique fields already exists.

### RESOURCE_CONFLICT (exit code 5)
Operation conflicts with current resource state.

---

## Server Errors (exit code 1)

### INTERNAL_SERVER_ERROR / DATABASE_ERROR / UNEXPECTED_ERROR
Server-side issue. Retry after a short delay. If persistent, contact support.

### SERVICE_UNAVAILABLE
Temporary outage. Retry after a short delay.
