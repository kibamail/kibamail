#![forbid(unsafe_code)]
//! # Kibamail Rust SDK
//!
//! Official Rust SDK for the Kibamail API.
//!
//! ## Features
//!
//! - Full async/blocking support via feature flags
//! - Type-safe API with comprehensive error handling
//! - Resource-based API organization
//! - Built-in authentication
//!
//! ## Example
//!
//! ```no_run
//! use kibamail::{Kibamail, Result};
//! use kibamail::types::CreateContactRequest;
//!
//! #[tokio::main]
//! async fn main() -> Result<()> {
//!     let kibamail = Kibamail::new("kb_test_...");
//!
//!     // Create a contact
//!     let contact = kibamail.contacts.create(CreateContactRequest {
//!         email: "user@example.com".to_string(),
//!         first_name: Some("John".to_string()),
//!         last_name: Some("Doe".to_string()),
//!         ..Default::default()
//!     }).await?;
//!
//!     println!("Created contact: {}", contact.id);
//!
//!     Ok(())
//! }
//! ```

pub use client::Kibamail;
pub use config::{Config, ConfigBuilder};

mod api_keys;
mod client;
mod config;
mod contact_properties;
mod contacts;
mod error;
mod forms;
mod list_opts;
mod segments;
mod topics;

pub mod services {
    //! Kibamail API services.

    pub use super::api_keys::ApiKeysSvc;
    pub use super::contact_properties::ContactPropertiesSvc;
    pub use super::contacts::ContactsSvc;
    pub use super::forms::FormsSvc;
    pub use super::segments::SegmentsSvc;
    pub use super::topics::TopicsSvc;
}

pub mod types {
    //! Request and response types.

    pub use super::api_keys::types::*;
    pub use super::contact_properties::types::*;
    pub use super::contacts::types::*;
    pub use super::error::types::*;
    pub use super::forms::types::*;
    pub use super::list_opts::*;
    pub use super::segments::types::*;
    pub use super::topics::types::*;
}

/// Error type for Kibamail API operations.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// HTTP request/response errors.
    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),

    /// API errors returned by Kibamail.
    #[error("kibamail error: {0}")]
    Kibamail(#[from] types::ErrorResponse),

    /// Failed to parse API response.
    #[error("Failed to parse Kibamail API response. Received: \n{0}")]
    Parse(String),

    /// Rate limit exceeded error with metadata.
    #[error("Too many requests. Limit is {limit:?} per window. Remaining: {remaining:?}. Resets in {reset:?}s. Retry after: {retry_after:?}s")]
    RateLimit {
        limit: Option<String>,
        remaining: Option<String>,
        reset: Option<String>,
        retry_after: Option<String>,
    },
}

/// Specialized [`Result`] type for Kibamail operations.
pub type Result<T, E = Error> = std::result::Result<T, E>;

macro_rules! define_id_type {
    ($name:ident) => {
        /// Unique identifier.
        #[derive(Debug, Clone, serde::Deserialize, serde::Serialize, PartialEq, Eq)]
        pub struct $name(String);

        impl $name {
            /// Creates a new ID.
            #[inline]
            #[must_use]
            pub fn new(id: impl Into<String>) -> Self {
                Self(id.into())
            }
        }

        impl std::ops::Deref for $name {
            type Target = str;

            #[inline]
            fn deref(&self) -> &Self::Target {
                self.as_ref()
            }
        }

        impl AsRef<str> for $name {
            #[inline]
            fn as_ref(&self) -> &str {
                &self.0
            }
        }

        impl std::fmt::Display for $name {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                std::fmt::Display::fmt(&self.0, f)
            }
        }
    };
}

pub(crate) use define_id_type;

#[cfg(test)]
mod test {
    use std::sync::LazyLock;

    use crate::Kibamail;

    /// Shared test client - use this in all tests to ensure consistency.
    pub(crate) static CLIENT: LazyLock<Kibamail> = LazyLock::new(|| {
        let api_key = "kb_test_mock_api_key_12345";
        let base_url = std::env::var("MOCK_API_URL").unwrap_or_else(|_| "http://localhost:4010".to_string());

        Kibamail::with_config(
            crate::ConfigBuilder::new(api_key)
                .base_url(base_url.parse().expect("Valid base URL"))
                .build()
        )
    });
}
