use std::sync::Arc;

use reqwest::Method;

use crate::{Config, Result, list_opts::{ListOptions, ListResponse}};
use crate::segments::types::{CreateSegmentRequest, Segment, SegmentResponse, UpdateSegmentRequest};

/// Kibamail APIs for `/segments` endpoints.
#[derive(Clone, Debug)]
pub struct SegmentsSvc(pub(crate) Arc<Config>);

impl SegmentsSvc {
    /// Create a new segment.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn create(&self, params: impl Into<CreateSegmentRequest>) -> Result<SegmentResponse> {
        let params = params.into();
        let request = self.0.build(Method::POST, "v1/segments");
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<SegmentResponse>().await?;

        Ok(content)
    }

    /// List all segments.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn list(&self, params: impl Into<ListOptions>) -> Result<ListResponse<Segment>> {
        let params = params.into();
        let request = self.0.build(Method::GET, "v1/segments").query(&params);
        let response = self.0.send(request).await?;
        let content = response.json::<ListResponse<Segment>>().await?;

        Ok(content)
    }

    /// Get a specific segment by ID.
    #[maybe_async::maybe_async]
    pub async fn get(&self, segment_id: &str) -> Result<Segment> {
        let path = format!("v1/segments/{segment_id}");
        let request = self.0.build(Method::GET, &path);
        let response = self.0.send(request).await?;
        let content = response.json::<Segment>().await?;

        Ok(content)
    }

    /// Update a segment by ID.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn update(
        &self,
        segment_id: &str,
        params: impl Into<UpdateSegmentRequest>,
    ) -> Result<SegmentResponse> {
        let params = params.into();
        let path = format!("v1/segments/{segment_id}");
        let request = self.0.build(Method::PUT, &path);
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<SegmentResponse>().await?;

        Ok(content)
    }

    /// Delete a segment by ID.
    #[maybe_async::maybe_async]
    pub async fn delete(&self, segment_id: &str) -> Result<()> {
        let path = format!("v1/segments/{segment_id}");
        let request = self.0.build(Method::DELETE, &path);
        self.0.send(request).await?;

        Ok(())
    }
}

#[allow(unreachable_pub)]
pub mod types {
    use serde::{Deserialize, Serialize};

    crate::define_id_type!(SegmentId);

    /// Request to create a new segment.
    #[must_use]
    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct CreateSegmentRequest {
        /// Segment name.
        pub name: String,
        /// Segment description.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,
        /// Filter conditions for the segment.
        pub conditions: serde_json::Value,
    }

    /// Request to update an existing segment.
    #[must_use]
    #[derive(Debug, Clone, Default, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct UpdateSegmentRequest {
        /// Segment name.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub name: Option<String>,
        /// Segment description.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,
        /// Filter conditions for the segment.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub conditions: Option<serde_json::Value>,
    }

    /// Segment object.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Segment {
        /// Unique segment identifier.
        pub id: SegmentId,
        /// Segment name.
        pub name: String,
        /// Segment description.
        #[serde(default)]
        pub description: String,
        /// Filter conditions.
        pub conditions: serde_json::Value,
        /// Number of contacts in segment.
        #[serde(default)]
        pub contact_count: u32,
        /// Timestamp when segment was created.
        pub created_at: String,
        /// Timestamp when segment was last updated.
        pub updated_at: String,
    }

    /// Response from creating or updating a segment.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    pub struct SegmentResponse {
        /// The ID of the created/updated segment.
        pub id: SegmentId,
    }
}

#[cfg(test)]
mod test {
    use crate::test::CLIENT;
    use crate::types::{CreateSegmentRequest, UpdateSegmentRequest};
    use crate::{Result, list_opts::ListOptions};

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_segment() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .segments
            .create(CreateSegmentRequest {
                name: "Premium Customers".to_string(),
                description: Some("Customers on premium plan".to_string()),
                conditions: serde_json::json!({
                    "AND": [
                        { "field": "Plan", "operator": "equals", "value": "Premium" }
                    ]
                }),
            })
            .await?;

        assert!(!result.id.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_list_segments() -> Result<()> {
        let client = &*CLIENT;

        let _result = client.segments.list(ListOptions::default()).await?;

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_get_segment() -> Result<()> {
        let client = &*CLIENT;

        // Create a segment first
        let created = client
            .segments
            .create(CreateSegmentRequest {
                name: "Get Test Segment".to_string(),
                description: Some("Segment for get test".to_string()),
                conditions: serde_json::json!({
                    "AND": [
                        { "field": "status", "operator": "equals", "value": "SUBSCRIBED" }
                    ]
                }),
            })
            .await?;

        // Get the segment
        let _segment = client.segments.get(&created.id).await?;

        // Successfully retrieved segment
        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_update_segment() -> Result<()> {
        let client = &*CLIENT;

        // Create a segment first
        let created = client
            .segments
            .create(CreateSegmentRequest {
                name: "Original Segment".to_string(),
                description: Some("Original description".to_string()),
                conditions: serde_json::json!({
                    "AND": [
                        { "field": "status", "operator": "equals", "value": "SUBSCRIBED" }
                    ]
                }),
            })
            .await?;

        // Update the segment
        let updated = client
            .segments
            .update(
                &created.id,
                UpdateSegmentRequest {
                    name: Some("Updated Segment".to_string()),
                    description: Some("Updated description".to_string()),
                    conditions: Some(serde_json::json!({
                        "OR": [
                            { "field": "status", "operator": "equals", "value": "SUBSCRIBED" },
                            { "field": "status", "operator": "equals", "value": "UNSUBSCRIBED" }
                        ]
                    })),
                },
            )
            .await?;

        assert_eq!(updated.id, created.id);

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_delete_segment() -> Result<()> {
        let client = &*CLIENT;

        // Create a segment first
        let created = client
            .segments
            .create(CreateSegmentRequest {
                name: "Delete Test Segment".to_string(),
                description: Some("Segment to be deleted".to_string()),
                conditions: serde_json::json!({
                    "AND": [
                        { "field": "status", "operator": "equals", "value": "SUBSCRIBED" }
                    ]
                }),
            })
            .await?;

        // Delete the segment
        client.segments.delete(&created.id).await?;

        Ok(())
    }
}
