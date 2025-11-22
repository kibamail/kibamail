use std::sync::Arc;

use reqwest::Method;

use crate::{Config, Result, list_opts::{ListOptions, ListResponse}};
use crate::contacts::types::{Contact, ContactResponse, CreateContactRequest, SearchContactRequest, UpdateContactRequest};

/// Kibamail APIs for `/contacts` endpoints.
#[derive(Clone, Debug)]
pub struct ContactsSvc(pub(crate) Arc<Config>);

impl ContactsSvc {
    /// Create a new contact in your workspace.
    ///
    /// <https://kibamail.com/docs/api-reference/contacts/create-contact>
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn create(
        &self,
        params: impl Into<CreateContactRequest>,
    ) -> Result<ContactResponse> {
        let params = params.into();
        let request = self.0.build(Method::POST, "v1/contacts");
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<ContactResponse>().await?;

        Ok(content)
    }

    /// Retrieve a paginated list of all contacts in your workspace.
    ///
    /// <https://kibamail.com/docs/api-reference/contacts/list-contacts>
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn list(&self, params: impl Into<ListOptions>) -> Result<ListResponse<Contact>> {
        let params = params.into();
        let request = self.0.build(Method::GET, "v1/contacts").query(&params);
        let response = self.0.send(request).await?;
        let content = response.json::<ListResponse<Contact>>().await?;

        Ok(content)
    }

    /// Retrieve a specific contact by ID.
    ///
    /// <https://kibamail.com/docs/api-reference/contacts/get-contact>
    #[maybe_async::maybe_async]
    pub async fn get(&self, contact_id: &str) -> Result<Contact> {
        let path = format!("v1/contacts/{contact_id}");
        let request = self.0.build(Method::GET, &path);
        let response = self.0.send(request).await?;
        let content = response.json::<Contact>().await?;

        Ok(content)
    }

    /// Update an existing contact by ID.
    ///
    /// <https://kibamail.com/docs/api-reference/contacts/update-contact>
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn update(
        &self,
        contact_id: &str,
        params: impl Into<UpdateContactRequest>,
    ) -> Result<ContactResponse> {
        let params = params.into();
        let path = format!("v1/contacts/{contact_id}");
        let request = self.0.build(Method::PUT, &path);
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<ContactResponse>().await?;

        Ok(content)
    }

    /// Delete a contact by ID.
    ///
    /// <https://kibamail.com/docs/api-reference/contacts/delete-contact>
    #[maybe_async::maybe_async]
    pub async fn delete(&self, contact_id: &str) -> Result<()> {
        let path = format!("v1/contacts/{contact_id}");
        let request = self.0.build(Method::DELETE, &path);
        self.0.send(request).await?;

        Ok(())
    }

    /// Search contacts using advanced filtering conditions.
    ///
    /// <https://kibamail.com/docs/api-reference/contacts/search-contacts>
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn search(
        &self,
        params: impl Into<SearchContactRequest>,
    ) -> Result<ListResponse<Contact>> {
        let params = params.into();
        let request = self.0.build(Method::POST, "v1/contacts/search");
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<ListResponse<Contact>>().await?;

        Ok(content)
    }
}

#[allow(unreachable_pub)]
pub mod types {
    use std::collections::HashMap;

    use serde::{Deserialize, Serialize};

    crate::define_id_type!(ContactId);

    /// Request to create a new contact.
    #[must_use]
    #[derive(Debug, Clone, Default, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct CreateContactRequest {
        /// Contact email address (required).
        pub email: String,
        /// Contact first name.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub first_name: Option<String>,
        /// Contact last name.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub last_name: Option<String>,
        /// Contact phone number.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub phone: Option<String>,
        /// Contact country.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub country: Option<String>,
        /// Contact city.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub city: Option<String>,
        /// Contact timezone.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub timezone: Option<String>,
        /// Custom properties for the contact.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub properties: Option<HashMap<String, serde_json::Value>>,
        /// Topic IDs to subscribe the contact to.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub topics: Option<Vec<String>>,
    }

    /// Request to update an existing contact.
    #[must_use]
    #[derive(Debug, Clone, Default, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct UpdateContactRequest {
        /// Contact email address.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub email: Option<String>,
        /// Contact first name.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub first_name: Option<String>,
        /// Contact last name.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub last_name: Option<String>,
        /// Contact phone number.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub phone: Option<String>,
        /// Contact country.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub country: Option<String>,
        /// Contact city.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub city: Option<String>,
        /// Contact timezone.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub timezone: Option<String>,
        /// Custom properties for the contact.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub properties: Option<HashMap<String, serde_json::Value>>,
        /// Topic IDs to subscribe the contact to.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub topics: Option<Vec<String>>,
    }

    /// Request to search contacts with filtering conditions.
    #[must_use]
    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct SearchContactRequest {
        /// Search conditions (can be complex nested conditions).
        pub conditions: serde_json::Value,
        /// Maximum number of items to return.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub limit: Option<u32>,
        /// Cursor for fetching items after this cursor.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub after: Option<String>,
        /// Cursor for fetching items before this cursor.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub before: Option<String>,
    }

    /// Contact object.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Contact {
        /// Unique contact identifier.
        pub id: ContactId,
        /// Contact email address.
        pub email: String,
        /// Contact first name.
        #[serde(default)]
        pub first_name: String,
        /// Contact last name.
        #[serde(default)]
        pub last_name: String,
        /// Contact phone number.
        #[serde(default)]
        pub phone: String,
        /// Contact country.
        #[serde(default)]
        pub country: String,
        /// Contact city.
        #[serde(default)]
        pub city: String,
        /// Contact timezone.
        #[serde(default)]
        pub timezone: String,
        /// Contact subscription status.
        pub status: String,
        /// Custom properties.
        #[serde(default)]
        pub properties: HashMap<String, serde_json::Value>,
        /// Subscribed topic IDs.
        #[serde(default)]
        pub topics: Vec<String>,
        /// Timestamp when contact was created.
        #[serde(default)]
        pub created_at: String,
        /// Timestamp when contact was last updated.
        #[serde(default)]
        pub updated_at: String,
    }

    /// Response from creating or updating a contact.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    pub struct ContactResponse {
        /// The ID of the created/updated contact.
        pub id: ContactId,
    }
}

#[cfg(test)]
mod test {
    use crate::test::CLIENT;
    use crate::types::{CreateContactRequest, UpdateContactRequest, SearchContactRequest};
    use crate::{Result, list_opts::ListOptions};
    use std::collections::HashMap;

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_contact() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .contacts
            .create(CreateContactRequest {
                email: "john.doe@example.com".to_string(),
                first_name: Some("John".to_string()),
                last_name: Some("Doe".to_string()),
                ..Default::default()
            })
            .await?;

        assert!(!result.id.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_contact_with_properties() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .contacts
            .create(CreateContactRequest {
                email: "jane.smith@example.com".to_string(),
                first_name: Some("Jane".to_string()),
                last_name: Some("Smith".to_string()),
                properties: Some(HashMap::from([
                    ("Company".to_string(), serde_json::json!("Acme Inc")),
                    ("Plan".to_string(), serde_json::json!("Enterprise")),
                ])),
                ..Default::default()
            })
            .await?;

        assert!(!result.id.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_contact_with_topics() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .contacts
            .create(CreateContactRequest {
                email: "subscriber@example.com".to_string(),
                first_name: Some("New".to_string()),
                last_name: Some("Subscriber".to_string()),
                topics: Some(vec!["topic_newsletter".to_string(), "topic_updates".to_string()]),
                ..Default::default()
            })
            .await?;

        assert!(!result.id.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_list_contacts() -> Result<()> {
        let client = &*CLIENT;

        let _result = client.contacts.list(ListOptions::default()).await?;

        // Successfully listed contacts (may be empty)
        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_list_contacts_with_pagination() -> Result<()> {
        let client = &*CLIENT;

        let _result = client
            .contacts
            .list(ListOptions::new().with_limit(10))
            .await?;

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_get_contact() -> Result<()> {
        let client = &*CLIENT;

        // Create a contact first
        let created = client
            .contacts
            .create(CreateContactRequest {
                email: "get.test@example.com".to_string(),
                first_name: Some("Get".to_string()),
                last_name: Some("Test".to_string()),
                ..Default::default()
            })
            .await?;

        // Get the contact
        let _contact = client.contacts.get(&created.id).await?;

        // Successfully retrieved contact
        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_update_contact() -> Result<()> {
        let client = &*CLIENT;

        // Create a contact first
        let created = client
            .contacts
            .create(CreateContactRequest {
                email: "update.test@example.com".to_string(),
                first_name: Some("Update".to_string()),
                last_name: Some("Test".to_string()),
                ..Default::default()
            })
            .await?;

        // Update the contact
        let updated = client
            .contacts
            .update(
                &created.id,
                UpdateContactRequest {
                    first_name: Some("Updated".to_string()),
                    last_name: Some("Name".to_string()),
                    ..Default::default()
                },
            )
            .await?;

        assert_eq!(updated.id, created.id);

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_delete_contact() -> Result<()> {
        let client = &*CLIENT;

        // Create a contact first
        let created = client
            .contacts
            .create(CreateContactRequest {
                email: "delete.test@example.com".to_string(),
                first_name: Some("Delete".to_string()),
                last_name: Some("Test".to_string()),
                ..Default::default()
            })
            .await?;

        // Delete the contact
        client.contacts.delete(&created.id).await?;

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_search_contacts() -> Result<()> {
        let client = &*CLIENT;

        let _result = client
            .contacts
            .search(SearchContactRequest {
                conditions: serde_json::json!({
                    "AND": [
                        { "field": "status", "operator": "equals", "value": "SUBSCRIBED" }
                    ]
                }),
                limit: Some(50),
                after: None,
                before: None,
            })
            .await?;

        Ok(())
    }
}
