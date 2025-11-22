use std::sync::Arc;

use reqwest::Method;

use crate::{Config, Result, list_opts::{ListOptions, ListResponse}};
use crate::contact_properties::types::{ContactProperty, ContactPropertyResponse, CreateContactPropertyRequest, UpdateContactPropertyRequest};

/// Kibamail APIs for `/contact-properties` endpoints.
#[derive(Clone, Debug)]
pub struct ContactPropertiesSvc(pub(crate) Arc<Config>);

impl ContactPropertiesSvc {
    /// Create a new contact property.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn create(
        &self,
        params: impl Into<CreateContactPropertyRequest>,
    ) -> Result<ContactPropertyResponse> {
        let params = params.into();
        let request = self.0.build(Method::POST, "v1/contact-properties");
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<ContactPropertyResponse>().await?;

        Ok(content)
    }

    /// List all contact properties.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn list(
        &self,
        params: impl Into<ListOptions>,
    ) -> Result<ListResponse<ContactProperty>> {
        let params = params.into();
        let request = self.0.build(Method::GET, "v1/contact-properties").query(&params);
        let response = self.0.send(request).await?;
        let content = response.json::<ListResponse<ContactProperty>>().await?;

        Ok(content)
    }

    /// Get a specific contact property by ID.
    #[maybe_async::maybe_async]
    pub async fn get(&self, property_id: &str) -> Result<ContactProperty> {
        let path = format!("v1/contact-properties/{property_id}");
        let request = self.0.build(Method::GET, &path);
        let response = self.0.send(request).await?;
        let content = response.json::<ContactProperty>().await?;

        Ok(content)
    }

    /// Update a contact property by ID.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn update(
        &self,
        property_id: &str,
        params: impl Into<UpdateContactPropertyRequest>,
    ) -> Result<ContactPropertyResponse> {
        let params = params.into();
        let path = format!("v1/contact-properties/{property_id}");
        let request = self.0.build(Method::PUT, &path);
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<ContactPropertyResponse>().await?;

        Ok(content)
    }

    /// Delete a contact property by ID.
    #[maybe_async::maybe_async]
    pub async fn delete(&self, property_id: &str) -> Result<()> {
        let path = format!("v1/contact-properties/{property_id}");
        let request = self.0.build(Method::DELETE, &path);
        self.0.send(request).await?;

        Ok(())
    }
}

#[allow(unreachable_pub)]
pub mod types {
    use serde::{Deserialize, Serialize};

    crate::define_id_type!(ContactPropertyId);

    /// Request to create a new contact property.
    #[must_use]
    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct CreateContactPropertyRequest {
        /// Property name.
        pub name: String,
        /// Property type (TEXT, NUMBER, DATE, BOOLEAN, etc.).
        #[serde(rename = "type")]
        pub property_type: String,
        /// Property description.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,
        /// Default value for the property.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub default_value: Option<serde_json::Value>,
    }

    /// Request to update an existing contact property.
    #[must_use]
    #[derive(Debug, Clone, Default, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct UpdateContactPropertyRequest {
        /// Property name.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub name: Option<String>,
        /// Property description.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,
        /// Default value for the property.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub default_value: Option<serde_json::Value>,
    }

    /// Contact property object.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct ContactProperty {
        /// Unique property identifier.
        pub id: ContactPropertyId,
        /// Property name.
        pub name: String,
        /// Property type.
        #[serde(rename = "type")]
        pub property_type: String,
        /// Property description.
        #[serde(default)]
        pub description: String,
        /// Default value.
        pub default_value: Option<serde_json::Value>,
        /// Timestamp when property was created.
        pub created_at: String,
        /// Timestamp when property was last updated.
        pub updated_at: String,
    }

    /// Response from creating or updating a contact property.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    pub struct ContactPropertyResponse {
        /// The ID of the created/updated contact property.
        pub id: ContactPropertyId,
    }
}

#[cfg(test)]
mod test {
    use crate::test::CLIENT;
    use crate::types::{CreateContactPropertyRequest, UpdateContactPropertyRequest};
    use crate::{Result, list_opts::ListOptions};

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_contact_property() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .contact_properties
            .create(CreateContactPropertyRequest {
                name: "Company".to_string(),
                property_type: "TEXT".to_string(),
                description: Some("Company name".to_string()),
                default_value: None,
            })
            .await?;

        assert!(!result.id.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_contact_property_with_default() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .contact_properties
            .create(CreateContactPropertyRequest {
                name: "Plan".to_string(),
                property_type: "TEXT".to_string(),
                description: Some("Subscription plan".to_string()),
                default_value: Some(serde_json::json!("Free")),
            })
            .await?;

        assert!(!result.id.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_list_contact_properties() -> Result<()> {
        let client = &*CLIENT;

        let _result = client
            .contact_properties
            .list(ListOptions::default())
            .await?;

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_get_contact_property() -> Result<()> {
        let client = &*CLIENT;

        // Create a property first
        let created = client
            .contact_properties
            .create(CreateContactPropertyRequest {
                name: "Department".to_string(),
                property_type: "TEXT".to_string(),
                description: Some("Employee department".to_string()),
                default_value: None,
            })
            .await?;

        // Get the property
        let _property = client.contact_properties.get(&created.id).await?;

        // Successfully retrieved property
        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_update_contact_property() -> Result<()> {
        let client = &*CLIENT;

        // Create a property first
        let created = client
            .contact_properties
            .create(CreateContactPropertyRequest {
                name: "Original Property".to_string(),
                property_type: "TEXT".to_string(),
                description: Some("Original description".to_string()),
                default_value: None,
            })
            .await?;

        // Update the property
        let updated = client
            .contact_properties
            .update(
                &created.id,
                UpdateContactPropertyRequest {
                    name: Some("Updated Property".to_string()),
                    description: Some("Updated description".to_string()),
                    default_value: Some(serde_json::json!("Default Value")),
                },
            )
            .await?;

        assert_eq!(updated.id, created.id);

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_delete_contact_property() -> Result<()> {
        let client = &*CLIENT;

        // Create a property first
        let created = client
            .contact_properties
            .create(CreateContactPropertyRequest {
                name: "Delete Test Property".to_string(),
                property_type: "TEXT".to_string(),
                description: Some("Property to be deleted".to_string()),
                default_value: None,
            })
            .await?;

        // Delete the property
        client.contact_properties.delete(&created.id).await?;

        Ok(())
    }
}
