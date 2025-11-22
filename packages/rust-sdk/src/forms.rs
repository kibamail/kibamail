use std::sync::Arc;

use reqwest::Method;

use crate::{Config, Result, list_opts::{ListOptions, ListResponse}};
use crate::forms::types::{CreateFormRequest, Form, FormResponse, UpdateFormRequest};

/// Kibamail APIs for `/forms` endpoints.
#[derive(Clone, Debug)]
pub struct FormsSvc(pub(crate) Arc<Config>);

impl FormsSvc {
    /// Create a new form.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn create(&self, params: impl Into<CreateFormRequest>) -> Result<FormResponse> {
        let params = params.into();
        let request = self.0.build(Method::POST, "v1/forms");
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<FormResponse>().await?;

        Ok(content)
    }

    /// List all forms.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn list(&self, params: impl Into<ListOptions>) -> Result<ListResponse<Form>> {
        let params = params.into();
        let request = self.0.build(Method::GET, "v1/forms").query(&params);
        let response = self.0.send(request).await?;
        let content = response.json::<ListResponse<Form>>().await?;

        Ok(content)
    }

    /// Get a specific form by ID.
    #[maybe_async::maybe_async]
    pub async fn get(&self, form_id: &str) -> Result<Form> {
        let path = format!("v1/forms/{form_id}");
        let request = self.0.build(Method::GET, &path);
        let response = self.0.send(request).await?;
        let content = response.json::<Form>().await?;

        Ok(content)
    }

    /// Update a form by ID.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn update(
        &self,
        form_id: &str,
        params: impl Into<UpdateFormRequest>,
    ) -> Result<FormResponse> {
        let params = params.into();
        let path = format!("v1/forms/{form_id}");
        let request = self.0.build(Method::PUT, &path);
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<FormResponse>().await?;

        Ok(content)
    }

    /// Delete a form by ID.
    #[maybe_async::maybe_async]
    pub async fn delete(&self, form_id: &str) -> Result<()> {
        let path = format!("v1/forms/{form_id}");
        let request = self.0.build(Method::DELETE, &path);
        self.0.send(request).await?;

        Ok(())
    }
}

#[allow(unreachable_pub)]
pub mod types {
    use serde::{Deserialize, Serialize};

    crate::define_id_type!(FormId);

    /// Request to create a new form.
    #[must_use]
    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct CreateFormRequest {
        /// Form name.
        pub name: String,
        /// Form description.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,
        /// Form fields configuration.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub fields: Option<serde_json::Value>,
    }

    /// Request to update an existing form.
    #[must_use]
    #[derive(Debug, Clone, Default, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct UpdateFormRequest {
        /// Form name.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub name: Option<String>,
        /// Form description.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,
        /// Form fields configuration.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub fields: Option<serde_json::Value>,
    }

    /// Form object.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Form {
        /// Unique form identifier.
        pub id: FormId,
        /// Form name.
        pub name: String,
        /// Form description.
        #[serde(default)]
        pub description: String,
        /// Form fields configuration.
        #[serde(default)]
        pub fields: serde_json::Value,
        /// Number of submissions.
        #[serde(default)]
        pub submission_count: u32,
        /// Timestamp when form was created.
        pub created_at: String,
        /// Timestamp when form was last updated.
        pub updated_at: String,
    }

    /// Response from creating or updating a form.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    pub struct FormResponse {
        /// The ID of the created/updated form.
        pub id: FormId,
    }
}

#[cfg(test)]
mod test {
    use crate::test::CLIENT;
    use crate::types::{CreateFormRequest, UpdateFormRequest};
    use crate::{Result, list_opts::ListOptions};

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_form() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .forms
            .create(CreateFormRequest {
                name: "Newsletter Signup".to_string(),
                description: Some("Main newsletter form".to_string()),
                fields: Some(serde_json::json!([
                    { "name": "email", "type": "email", "required": true },
                    { "name": "name", "type": "text", "required": false }
                ])),
            })
            .await?;

        assert!(!result.id.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_list_forms() -> Result<()> {
        let client = &*CLIENT;

        let _result = client.forms.list(ListOptions::default()).await?;

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_get_form() -> Result<()> {
        let client = &*CLIENT;

        // Create a form first
        let created = client
            .forms
            .create(CreateFormRequest {
                name: "Get Test Form".to_string(),
                description: Some("Form for get test".to_string()),
                fields: None,
            })
            .await?;

        // Get the form
        let _form = client.forms.get(&created.id).await?;

        // Successfully retrieved form
        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_update_form() -> Result<()> {
        let client = &*CLIENT;

        // Create a form first
        let created = client
            .forms
            .create(CreateFormRequest {
                name: "Original Form".to_string(),
                description: Some("Original description".to_string()),
                fields: None,
            })
            .await?;

        // Update the form
        let updated = client
            .forms
            .update(
                &created.id,
                UpdateFormRequest {
                    name: Some("Updated Form".to_string()),
                    description: Some("Updated description".to_string()),
                    fields: Some(serde_json::json!([
                        { "name": "email", "type": "email", "required": true }
                    ])),
                },
            )
            .await?;

        assert_eq!(updated.id, created.id);

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_delete_form() -> Result<()> {
        let client = &*CLIENT;

        // Create a form first
        let created = client
            .forms
            .create(CreateFormRequest {
                name: "Delete Test Form".to_string(),
                description: Some("Form to be deleted".to_string()),
                fields: None,
            })
            .await?;

        // Delete the form
        client.forms.delete(&created.id).await?;

        Ok(())
    }
}
