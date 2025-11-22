# Kibamail Rust SDK

[![Build Status][action-badge]][action-url]
[![Crate Docs][docs-badge]][docs-url]
[![Crate Version][crates-badge]][crates-url]

Official Rust SDK for the [Kibamail](https://kibamail.com) API.

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
kibamail = "0.0.1-alpha.0"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

## Features

- **Full async/blocking support** - Choose between async (default) or blocking via feature flags
- **Type-safe API** - Comprehensive type definitions with Serde support
- **Resource-based organization** - Intuitive API structure mirroring REST endpoints
- **Comprehensive error handling** - Detailed error types including rate limit handling
- **Flexible configuration** - Multiple initialization patterns including environment variables

### Available Features

- `blocking` - Enable the blocking client (default is async)
- `native-tls` - Use system-native TLS (**enabled by default**)
- `rustls-tls` - Use TLS backed by `rustls`

## Quick Start

### Async (default)

```rust
use kibamail::{Kibamail, Result};
use kibamail::types::CreateContactRequest;

#[tokio::main]
async fn main() -> Result<()> {
    let kibamail = Kibamail::new("kb_test_...");

    // Create a contact
    let contact = kibamail.contacts.create(CreateContactRequest {
        email: "user@example.com".to_string(),
        first_name: Some("John".to_string()),
        last_name: Some("Doe".to_string()),
        ..Default::default()
    }).await?;

    println!("Created contact: {}", contact.id);

    Ok(())
}
```

### Blocking

Enable the `blocking` feature in your `Cargo.toml`:

```toml
[dependencies]
kibamail = { version = "0.0.1-alpha.0", features = ["blocking"] }
```

Then use the SDK without async/await:

```rust
use kibamail::{Kibamail, Result};
use kibamail::types::CreateContactRequest;

fn main() -> Result<()> {
    let kibamail = Kibamail::new("kb_test_...");

    let contact = kibamail.contacts.create(CreateContactRequest {
        email: "user@example.com".to_string(),
        first_name: Some("John".to_string()),
        last_name: Some("Doe".to_string()),
        ..Default::default()
    })?;

    println!("Created contact: {}", contact.id);

    Ok(())
}
```

## Resources

The SDK provides access to the following Kibamail resources:

### Contacts

Manage contact records and subscriptions.

```rust
// Create a contact
let contact = kibamail.contacts.create(CreateContactRequest {
    email: "user@example.com".to_string(),
    first_name: Some("Jane".to_string()),
    properties: Some(HashMap::from([
        ("Company".to_string(), serde_json::json!("Acme Inc")),
        ("Plan".to_string(), serde_json::json!("Enterprise")),
    ])),
    topics: Some(vec!["topic_newsletter".to_string()]),
    ..Default::default()
}).await?;

// List contacts with pagination
let contacts = kibamail.contacts.list(
    ListOptions::new()
        .with_limit(50)
        .with_after("cursor_123")
).await?;

// Get a contact by ID
let contact = kibamail.contacts.get("contact_123").await?;

// Update a contact
let updated = kibamail.contacts.update("contact_123", UpdateContactRequest {
    first_name: Some("Jane".to_string()),
    ..Default::default()
}).await?;

// Search contacts with conditions
let results = kibamail.contacts.search(SearchContactRequest {
    conditions: serde_json::json!({
        "AND": [
            { "field": "status", "operator": "equals", "value": "SUBSCRIBED" }
        ]
    }),
    limit: Some(50),
    after: None,
    before: None,
}).await?;

// Delete a contact
kibamail.contacts.delete("contact_123").await?;
```

### Topics

Organize email communications by topic.

```rust
use kibamail::types::CreateTopicRequest;

// Create a topic
let topic = kibamail.topics.create(CreateTopicRequest {
    name: "Product Updates".to_string(),
    description: Some("Updates about our products".to_string()),
    visibility: Some("PUBLIC".to_string()),
}).await?;

// List topics
let topics = kibamail.topics.list(Default::default()).await?;

// Get a topic
let topic = kibamail.topics.get("topic_123").await?;

// Update a topic
let updated = kibamail.topics.update("topic_123", UpdateTopicRequest {
    name: Some("Product News".to_string()),
    ..Default::default()
}).await?;

// Delete a topic
kibamail.topics.delete("topic_123").await?;
```

### Segments

Create dynamic contact groups with filtering.

```rust
use kibamail::types::CreateSegmentRequest;

// Create a segment
let segment = kibamail.segments.create(CreateSegmentRequest {
    name: "Premium Customers".to_string(),
    description: Some("Customers on premium plan".to_string()),
    conditions: serde_json::json!({
        "AND": [
            { "field": "Plan", "operator": "equals", "value": "Premium" }
        ]
    }),
}).await?;

// List segments
let segments = kibamail.segments.list(Default::default()).await?;

// Get a segment
let segment = kibamail.segments.get("segment_123").await?;

// Update a segment
let updated = kibamail.segments.update("segment_123", UpdateSegmentRequest {
    name: Some("VIP Customers".to_string()),
    ..Default::default()
}).await?;

// Delete a segment
kibamail.segments.delete("segment_123").await?;
```

### Forms

Build and manage signup and contact forms.

```rust
use kibamail::types::CreateFormRequest;

// Create a form
let form = kibamail.forms.create(CreateFormRequest {
    name: "Newsletter Signup".to_string(),
    description: Some("Main newsletter form".to_string()),
    fields: Some(serde_json::json!([
        { "name": "email", "type": "email", "required": true }
    ])),
}).await?;

// List, get, update, delete forms
let forms = kibamail.forms.list(Default::default()).await?;
```

### API Keys

Manage API keys for workspace access.

```rust
use kibamail::types::CreateApiKeyRequest;

// Create an API key
let api_key = kibamail.api_keys.create(CreateApiKeyRequest {
    name: "Production Server".to_string(),
    scopes: Some(vec!["read:contacts".to_string(), "write:contacts".to_string()]),
}).await?;

println!("API Key: {}", api_key.key); // Only shown on creation

// List API keys
let keys = kibamail.api_keys.list(Default::default()).await?;

// Delete an API key
kibamail.api_keys.delete("api_key_123").await?;
```

### Contact Properties

Define custom contact fields.

```rust
use kibamail::types::CreateContactPropertyRequest;

// Create a contact property
let property = kibamail.contact_properties.create(CreateContactPropertyRequest {
    name: "Company".to_string(),
    property_type: "TEXT".to_string(),
    description: Some("Company name".to_string()),
    default_value: None,
}).await?;

// List, get, update, delete contact properties
let properties = kibamail.contact_properties.list(Default::default()).await?;
```

## Configuration

### Environment Variables

- `KIBAMAIL_API_KEY` - API key for default client initialization
- `KIBAMAIL_BASE_URL` - Custom base URL (defaults to `https://api.kibamail.com`)

### Initialization Options

```rust
use kibamail::{Kibamail, ConfigBuilder};

// From environment variable
let kibamail = Kibamail::default();

// Direct initialization
let kibamail = Kibamail::new("kb_test_...");

// With custom base URL (e.g., for testing)
let kibamail = Kibamail::with_config(
    ConfigBuilder::new("kb_test_...")
        .base_url("http://localhost:4010".parse()?)
        .build()
);

// With custom HTTP client
let custom_client = reqwest::Client::builder()
    .timeout(std::time::Duration::from_secs(30))
    .build()?;

let kibamail = Kibamail::with_client("kb_test_...", custom_client);
```

## Error Handling

The SDK provides comprehensive error handling:

```rust
use kibamail::Error;

match kibamail.contacts.create(request).await {
    Ok(contact) => println!("Created: {}", contact.id),
    Err(Error::RateLimit { limit, remaining, reset, retry_after }) => {
        eprintln!("Rate limit exceeded. Retry after: {:?}s", retry_after);
    }
    Err(Error::Kibamail(err)) => {
        eprintln!("API error: {}", err.message);
    }
    Err(Error::Http(err)) => {
        eprintln!("HTTP error: {}", err);
    }
    Err(err) => {
        eprintln!("Other error: {}", err);
    }
}
```

## Testing

The SDK includes comprehensive tests. To run them against a mock API server:

```bash
# Make sure the mock API server is running on localhost:4010
cargo test
```

## Documentation

- [API Reference](https://docs.rs/kibamail)
- [Kibamail Documentation](https://kibamail.com/docs)
- [GitHub Repository](https://github.com/kibamail/kibamail-rust)

## Examples

Check the `examples/` directory for more usage examples:

```bash
cargo run --example create_contact
cargo run --example list_contacts
cargo run --example manage_topics
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

[action-badge]: https://img.shields.io/github/actions/workflow/status/kibamail/kibamail-rust/ci.yml
[action-url]: https://github.com/kibamail/kibamail-rust/actions/workflows/ci.yml
[crates-badge]: https://img.shields.io/crates/v/kibamail
[crates-url]: https://crates.io/crates/kibamail
[docs-badge]: https://img.shields.io/docsrs/kibamail
[docs-url]: https://docs.rs/kibamail
