use std::sync::Arc;

use reqwest::Method;

use crate::{Config, Result, list_opts::{ListOptions, ListResponse}};
use crate::topics::types::{CreateTopicRequest, Topic, TopicResponse, UpdateTopicRequest};

/// Kibamail APIs for `/topics` endpoints.
#[derive(Clone, Debug)]
pub struct TopicsSvc(pub(crate) Arc<Config>);

impl TopicsSvc {
    /// Create a new topic.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn create(&self, params: impl Into<CreateTopicRequest>) -> Result<TopicResponse> {
        let params = params.into();
        let request = self.0.build(Method::POST, "v1/topics");
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<TopicResponse>().await?;

        Ok(content)
    }

    /// List all topics.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn list(&self, params: impl Into<ListOptions>) -> Result<ListResponse<Topic>> {
        let params = params.into();
        let request = self.0.build(Method::GET, "v1/topics").query(&params);
        let response = self.0.send(request).await?;
        let content = response.json::<ListResponse<Topic>>().await?;

        Ok(content)
    }

    /// Get a specific topic by ID.
    #[maybe_async::maybe_async]
    pub async fn get(&self, topic_id: &str) -> Result<Topic> {
        let path = format!("v1/topics/{topic_id}");
        let request = self.0.build(Method::GET, &path);
        let response = self.0.send(request).await?;
        let content = response.json::<Topic>().await?;

        Ok(content)
    }

    /// Update a topic by ID.
    #[maybe_async::maybe_async]
    #[allow(clippy::needless_pass_by_value)]
    pub async fn update(
        &self,
        topic_id: &str,
        params: impl Into<UpdateTopicRequest>,
    ) -> Result<TopicResponse> {
        let params = params.into();
        let path = format!("v1/topics/{topic_id}");
        let request = self.0.build(Method::PUT, &path);
        let response = self.0.send(request.json(&params)).await?;
        let content = response.json::<TopicResponse>().await?;

        Ok(content)
    }

    /// Delete a topic by ID.
    #[maybe_async::maybe_async]
    pub async fn delete(&self, topic_id: &str) -> Result<()> {
        let path = format!("v1/topics/{topic_id}");
        let request = self.0.build(Method::DELETE, &path);
        self.0.send(request).await?;

        Ok(())
    }
}

#[allow(unreachable_pub)]
pub mod types {
    use serde::{Deserialize, Serialize};

    crate::define_id_type!(TopicId);

    /// Request to create a new topic.
    #[must_use]
    #[derive(Debug, Clone, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct CreateTopicRequest {
        /// Topic name.
        pub name: String,
        /// Topic description.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,
        /// Topic visibility (PUBLIC or PRIVATE).
        #[serde(skip_serializing_if = "Option::is_none")]
        pub visibility: Option<String>,
    }

    /// Request to update an existing topic.
    #[must_use]
    #[derive(Debug, Clone, Default, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct UpdateTopicRequest {
        /// Topic name.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub name: Option<String>,
        /// Topic description.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub description: Option<String>,
        /// Topic visibility.
        #[serde(skip_serializing_if = "Option::is_none")]
        pub visibility: Option<String>,
    }

    /// Topic object.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Topic {
        /// Unique topic identifier.
        pub id: TopicId,
        /// Topic name.
        pub name: String,
        /// Topic description.
        #[serde(default)]
        pub description: String,
        /// Topic visibility.
        pub visibility: String,
        /// Number of subscribers.
        #[serde(default)]
        pub subscriber_count: u32,
        /// Timestamp when topic was created.
        pub created_at: String,
        /// Timestamp when topic was last updated.
        pub updated_at: String,
    }

    /// Response from creating or updating a topic.
    #[must_use]
    #[derive(Debug, Clone, Deserialize, Serialize)]
    pub struct TopicResponse {
        /// The ID of the created/updated topic.
        pub id: TopicId,
    }
}

#[cfg(test)]
mod test {
    use crate::test::CLIENT;
    use crate::types::{CreateTopicRequest, UpdateTopicRequest};
    use crate::{Result, list_opts::ListOptions};

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_topic() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .topics
            .create(CreateTopicRequest {
                name: "Newsletter".to_string(),
                description: Some("Weekly newsletter".to_string()),
                visibility: Some("PUBLIC".to_string()),
            })
            .await?;

        assert!(!result.id.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_create_topic_minimal() -> Result<()> {
        let client = &*CLIENT;

        let result = client
            .topics
            .create(CreateTopicRequest {
                name: "Product Updates".to_string(),
                description: None,
                visibility: None,
            })
            .await?;

        assert!(!result.id.is_empty());

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_list_topics() -> Result<()> {
        let client = &*CLIENT;

        let _result = client.topics.list(ListOptions::default()).await?;

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_list_topics_with_pagination() -> Result<()> {
        let client = &*CLIENT;

        let _result = client
            .topics
            .list(ListOptions::new().with_limit(5))
            .await?;

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_get_topic() -> Result<()> {
        let client = &*CLIENT;

        // Create a topic first
        let created = client
            .topics
            .create(CreateTopicRequest {
                name: "Get Test Topic".to_string(),
                description: Some("Topic for get test".to_string()),
                visibility: Some("PUBLIC".to_string()),
            })
            .await?;

        // Get the topic
        let _topic = client.topics.get(&created.id).await?;

        // Successfully retrieved topic
        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_update_topic() -> Result<()> {
        let client = &*CLIENT;

        // Create a topic first
        let created = client
            .topics
            .create(CreateTopicRequest {
                name: "Original Topic Name".to_string(),
                description: Some("Original description".to_string()),
                visibility: Some("PUBLIC".to_string()),
            })
            .await?;

        // Update the topic
        let updated = client
            .topics
            .update(
                &created.id,
                UpdateTopicRequest {
                    name: Some("Updated Topic Name".to_string()),
                    description: Some("Updated description".to_string()),
                    visibility: Some("PRIVATE".to_string()),
                },
            )
            .await?;

        assert_eq!(updated.id, created.id);

        Ok(())
    }

    #[tokio::test]
    #[cfg(not(feature = "blocking"))]
    async fn test_delete_topic() -> Result<()> {
        let client = &*CLIENT;

        // Create a topic first
        let created = client
            .topics
            .create(CreateTopicRequest {
                name: "Delete Test Topic".to_string(),
                description: Some("Topic to be deleted".to_string()),
                visibility: Some("PUBLIC".to_string()),
            })
            .await?;

        // Delete the topic
        client.topics.delete(&created.id).await?;

        Ok(())
    }
}
