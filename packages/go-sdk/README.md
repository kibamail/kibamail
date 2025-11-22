# Kibamail Go SDK

Official Go SDK for the Kibamail API.

[![Go Reference](https://pkg.go.dev/badge/github.com/kibamail/kibamail/packages/go-sdk.svg)](https://pkg.go.dev/github.com/kibamail/kibamail/packages/go-sdk)
[![Go Report Card](https://goreportcard.com/badge/github.com/kibamail/kibamail/packages/go-sdk)](https://goreportcard.com/report/github.com/kibamail/kibamail/packages/go-sdk)

## Installation

```bash
go get github.com/kibamail/kibamail/packages/go-sdk
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"

    kibamail "github.com/kibamail/kibamail/packages/go-sdk"
)

func main() {
    // Initialize the client with your API key
    client := kibamail.NewClient("sk_your_api_key")

    // Create a contact
    contact, err := client.Contacts.Create(&kibamail.CreateContactRequest{
        Email:     "user@example.com",
        FirstName: "John",
        LastName:  "Doe",
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Contact created: %s\n", contact.ID)

    // List contacts
    contacts, err := client.Contacts.List(nil)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Found %d contacts\n", len(contacts.Data))
}
```

## Resources

The SDK provides access to the following resources:

### Contacts
Manage contact records and subscriptions.

```go
// Create a contact
contact, err := client.Contacts.Create(&kibamail.CreateContactRequest{
    Email:     "user@example.com",
    FirstName: "John",
    LastName:  "Doe",
    Properties: map[string]interface{}{
        "Company": "Acme Inc",
        "Plan":    "Enterprise",
    },
    Topics: []string{"topic_newsletter"},
})

// List contacts
contacts, err := client.Contacts.List(&kibamail.ListOptions{
    Limit: &limit,
})

// Get a contact
contact, err := client.Contacts.Get("contact_123")

// Update a contact
updated, err := client.Contacts.Update("contact_123", &kibamail.UpdateContactRequest{
    FirstName: "Jane",
})

// Delete a contact
err := client.Contacts.Delete("contact_123")

// Search contacts
results, err := client.Contacts.Search(&kibamail.SearchContactRequest{
    Conditions: map[string]interface{}{
        "$and": []map[string]interface{}{
            {"field": "status", "operator": "eq", "value": "SUBSCRIBED"},
        },
    },
})
```

### Topics
Organize email communications by topic.

```go
// Create a topic
topic, err := client.Topics.Create(&kibamail.CreateTopicRequest{
    Name:         "Product Updates",
    Description:  "Latest features and improvements",
    Visibility:   "PUBLIC",
    DefaultOptIn: true,
})

// List topics
topics, err := client.Topics.List(nil)

// Get a topic
topic, err := client.Topics.Get("topic_123")

// Update a topic
updated, err := client.Topics.Update("topic_123", &kibamail.UpdateTopicRequest{
    Name: "Weekly Newsletter",
})

// Delete a topic
err := client.Topics.Delete("topic_123")
```

### Segments
Create dynamic contact groups with filtering.

```go
// Create a segment
segment, err := client.Segments.Create(&kibamail.CreateSegmentRequest{
    Name:        "Enterprise Customers",
    Description: "All contacts on Enterprise plan",
    Conditions: map[string]interface{}{
        "$and": []map[string]interface{}{
            {"field": "Plan", "operator": "eq", "value": "Enterprise"},
            {"field": "status", "operator": "eq", "value": "SUBSCRIBED"},
        },
    },
})

// List segment contacts
contacts, err := client.Segments.ListContacts("segment_123", nil)
```

### Forms
Build and manage signup/contact forms.

```go
// Create a form
form, err := client.Forms.Create(&kibamail.CreateFormRequest{
    Name:        "Newsletter Signup",
    Description: "Subscribe to our weekly newsletter",
})

// List forms
forms, err := client.Forms.List(nil)
```

### API Keys
Manage API keys for workspace access.

```go
// Create an API key
apiKey, err := client.ApiKeys.Create(&kibamail.CreateApiKeyRequest{
    Name:   "Production Server",
    Scopes: []string{"read:contacts", "write:contacts"},
})

// List API keys
apiKeys, err := client.ApiKeys.List(nil)

// Delete an API key
err := client.ApiKeys.Delete("key_123")
```

### Contact Properties
Define custom contact properties.

```go
// Create a contact property
property, err := client.ContactProperties.Create(&kibamail.CreateContactPropertyRequest{
    Name: "Company",
    Type: "TEXT",
})

// List contact properties
properties, err := client.ContactProperties.List(nil)
```

## Context Support

All methods have a `WithContext` variant for context support:

```go
ctx := context.Background()

contact, err := client.Contacts.CreateWithContext(ctx, &kibamail.CreateContactRequest{
    Email: "user@example.com",
})
```

## Error Handling

The SDK provides structured error handling:

```go
contact, err := client.Contacts.Get("invalid_id")
if err != nil {
    // Handle error
    if errors.Is(err, kibamail.ErrRateLimit) {
        // Handle rate limit specifically
    }
    log.Fatal(err)
}
```

## Configuration

You can customize the SDK behavior:

```go
import "net/http"

// Custom HTTP client
httpClient := &http.Client{
    Timeout: 30 * time.Second,
}
client := kibamail.NewCustomClient(httpClient, "your-api-key")

// Custom base URL (for testing)
baseURL, _ := url.Parse("http://localhost:4010")
client.BaseURL = baseURL
```

## Development

### Running Tests

The SDK uses a shared Prism mock server (managed at monorepo root) for integration tests:

```bash
# Run tests (automatically starts test infrastructure if needed)
make test

# Or using go test directly (ensure infrastructure is running first)
go test -v ./...

# Manually manage test infrastructure
make mock-start  # Start test infrastructure
make mock-stop   # Stop test infrastructure
make mock-logs   # View infrastructure logs
```

**From Monorepo Root:**
```bash
# Start test infrastructure for all SDKs
make test-sdk-infra-start

# Run tests for all SDKs
make test-all-sdks

# Stop test infrastructure
make test-sdk-infra-stop
```

### Building

```bash
go build -v ./...
```

## License

MIT
