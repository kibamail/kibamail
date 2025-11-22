use std::sync::Arc;

use reqwest::Method;

use crate::{Config, Result, list_opts::{ListOptions, ListResponse}};
use crate::api_keys::types::{ApiKey, ApiKeyResponse, CreateApiKeyRequest};

/// Kibamail APIs for `/api-keys` endpoints.
#[derive(Clone, Debug)]
pub struct ApiKeysSvc(pub(crate) Arc<Config>);

impl ApiKeysSvc {
    /// Create a new API key.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn create(&self, params: impl Into<CreateApiKeyRequest>) -> Result<ApiKeyResponse> {
        let params = params.into();
        let request = self.0.build(Method::POST, "v1/api-keys");
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<ApiKeyResponse>().await?;

        Ok(content)
    }

    /// List all API keys.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn list(&self, params: impl Into<ListOptions>) -> Result<ListResponse<ApiKey>> {
        let params = params.into();
        let request = self.0.build(Method::GET, "v1/api-keys").query(&params);
        let response = self.0.send(request).await?;
        let content = response.json::<ListResponse<ApiKey>>().await?;

        Ok(content)
    }

    /// Delete an API key by ID.
    #[maybe_async::maybe_async]
    pub async fn delete(&self, api_key_id: &str) -> Result<()> {
        let path = format!("v1/api-keys/{api_key_id}");
        let request = self.0.build(Method::DELETE, &path);
        self.0.send(request).await?;

        Ok(())
    }
}

#[allow(unreachable_pub)]
pub mod types {
    use serde::{Deserialize, Serialize};

    crate::define_id_type!(ApiKeyId);

    /// Request to create a new API key.
    #[must_use]
    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct CreateApiKeyRequest {
        /// API key name.
        pub name: String,
        /// API key scopes/permissions.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub scopes: Option<Vec<String>>,
    }

    /// API key object.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct ApiKey {
        /// Unique API key identifier.
        pub id: ApiKeyId,
        /// API key name.
        pub name: String,
        /// Partial key (for display only). Not included in list responses.
        #[serde(default)]
        pub key: String,
        /// API key scopes/permissions.
        #[serde(default)]
        pub scopes: Vec<String>,
        /// Timestamp when API key was created.
        pub created_at: String,
        /// Timestamp when API key was last used.
        pub last_used_at: Option<String>,
    }

    /// Response from creating an API key.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    pub struct ApiKeyResponse {
        /// The ID of the created API key.
        pub id: ApiKeyId,
        /// The full API key (only returned on creation).
        pub key: String,
    }
}

#[cfg(test)]
mod test {
    use crate::test::CLIENT;
    use crate::types::CreateApiKeyRequest;
    use crate::{Result, list_opts::ListOptions};

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_api_key() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .api_keys
            .create(CreateApiKeyRequest {
                name: "Test API Key".to_string(),
                scopes: Some(vec![
                    "read:contacts".to_string(),
                    "write:contacts".to_string(),
                ]),
            })
            .await?;

        assert!(!result.id.is_empty());
        assert!(!result.key.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_api_key_without_scopes() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .api_keys
            .create(CreateApiKeyRequest {
                name: "Full Access Key".to_string(),
                scopes: None,
            })
            .await?;

        assert!(!result.id.is_empty());
        assert!(!result.key.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_list_api_keys() -> Result<()> {
        let client = &*CLIENT;

        let _result = client.api_keys.list(ListOptions::default()).await?;

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_list_api_keys_with_pagination() -> Result<()> {
        let client = &*CLIENT;

        let _result = client
            .api_keys
            .list(ListOptions::new().with_limit(10))
            .await?;

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_delete_api_key() -> Result<()> {
        let client = &*CLIENT;

        // Create an API key first
        let created = client
            .api_keys
            .create(CreateApiKeyRequest {
                name: "Delete Test Key".to_string(),
                scopes: None,
            })
            .await?;

        // Delete the API key
        client.api_keys.delete(&created.id).await?;

        Ok(())
    }
}
