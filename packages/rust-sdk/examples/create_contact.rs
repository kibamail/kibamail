use kibamail::{Kibamail, Result};
use kibamail::types::CreateContactRequest;
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize the Kibamail client
    // Uses KIBAMAIL_API_KEY environment variable or pass API key directly
    let kibamail = Kibamail::new("kb_test_...");

    // Create a contact with basic information
    let contact = kibamail
        .contacts
        .create(CreateContactRequest {
            email: "john.doe@example.com".to_string(),
            first_name: Some("John".to_string()),
            last_name: Some("Doe".to_string()),
            phone: Some("+1234567890".to_string()),
            country: Some("US".to_string()),
            city: Some("New York".to_string()),
            timezone: Some("America/New_York".to_string()),
            properties: Some(HashMap::from([
                ("Company".to_string(), serde_json::json!("Acme Inc")),
                ("Plan".to_string(), serde_json::json!("Enterprise")),
                ("MRR".to_string(), serde_json::json!(1000)),
            ])),
            topics: Some(vec!["topic_newsletter".to_string(), "topic_updates".to_string()]),
        })
        .await?;

    println!("✓ Contact created successfully!");
    println!("  ID: {}", contact.id);

    Ok(())
}
