use std::sync::Arc;
use std::{env, fmt};

#[cfg(not(feature = "blocking"))]
use reqwest::Client as ReqwestClient;
#[cfg(feature = "blocking")]
use reqwest::blocking::Client as ReqwestClient;

use crate::config::Config;
use crate::services::{
    ApiKeysSvc, ContactPropertiesSvc, ContactsSvc, FormsSvc, SegmentsSvc, TopicsSvc,
};

#[cfg(doc)]
use crate::ConfigBuilder;

/// The Kibamail client.
#[must_use]
#[derive(Clone)]
pub struct Kibamail {
    /// Kibamail APIs for `/contacts` endpoints.
    pub contacts: ContactsSvc,
    /// Kibamail APIs for `/topics` endpoints.
    pub topics: TopicsSvc,
    /// Kibamail APIs for `/segments` endpoints.
    pub segments: SegmentsSvc,
    /// Kibamail APIs for `/forms` endpoints.
    pub forms: FormsSvc,
    /// Kibamail APIs for `/api-keys` endpoints.
    pub api_keys: ApiKeysSvc,
    /// Kibamail APIs for `/contact-properties` endpoints.
    pub contact_properties: ContactPropertiesSvc,
}

impl Kibamail {
    /// Creates a new [`Kibamail`] client.
    ///
    /// ### Panics
    ///
    /// - Panics if the environment variable `KIBAMAIL_BASE_URL` is set but is not a valid `URL`.
    pub fn new(api_key: &str) -> Self {
        Self::with_client(api_key, ReqwestClient::default())
    }

    /// Creates a new [`Kibamail`] client with a provided [`reqwest::Client`].
    ///
    /// ### Panics
    ///
    /// - Panics if the environment variable `KIBAMAIL_BASE_URL` is set but is not a valid `URL`.
    ///
    /// [`reqwest::Client`]: ReqwestClient
    pub fn with_client(api_key: &str, client: ReqwestClient) -> Self {
        let config = Config::new(api_key.to_owned(), client, None);
        Self::with_config(config)
    }

    /// Creates a new [`Kibamail`] client with a provided [`Config`].
    ///
    /// Use [`ConfigBuilder::new`] to construct a [`Config`] instance.
    ///
    /// ### Panics
    ///
    /// - Panics if the base url has not been set with [`ConfigBuilder::base_url`]
    ///   and the environment variable `KIBAMAIL_BASE_URL` _is_ set but is not a valid `URL`.
    ///
    /// [`reqwest::Client`]: ReqwestClient
    pub fn with_config(config: Config) -> Self {
        let inner = Arc::new(config);
        Self {
            contacts: ContactsSvc(Arc::clone(&inner)),
            topics: TopicsSvc(Arc::clone(&inner)),
            segments: SegmentsSvc(Arc::clone(&inner)),
            forms: FormsSvc(Arc::clone(&inner)),
            api_keys: ApiKeysSvc(Arc::clone(&inner)),
            contact_properties: ContactPropertiesSvc(Arc::clone(&inner)),
        }
    }

    /// Returns the reference to the used `User-Agent` header value.
    #[inline]
    #[must_use]
    pub fn user_agent(&self) -> &str {
        self.config().user_agent.as_str()
    }

    /// Returns the reference to the provided `API key`.
    #[inline]
    #[must_use]
    pub fn api_key(&self) -> &str {
        self.config().api_key.as_ref()
    }

    /// Returns the reference to the used `base URL`.
    #[inline]
    #[must_use]
    pub fn base_url(&self) -> &str {
        self.config().base_url.as_str()
    }

    /// Returns the underlying [`reqwest::Client`].
    ///
    /// [`reqwest::Client`]: ReqwestClient
    #[inline]
    #[must_use]
    pub fn client(&self) -> ReqwestClient {
        self.config().client.clone()
    }

    #[allow(clippy::missing_const_for_fn)]
    /// Returns the reference to the inner [`Config`].
    #[inline]
    fn config(&self) -> &Config {
        &self.contacts.0
    }
}

impl Default for Kibamail {
    /// Creates a new [`Kibamail`] client from the `KIBAMAIL_API_KEY` environment variable.
    ///
    /// ### Panics
    ///
    /// - Panics if the environment variable `KIBAMAIL_API_KEY` is not set.
    /// - Panics if the environment variable `KIBAMAIL_BASE_URL` is set but is not a valid `URL`.
    fn default() -> Self {
        let api_key = env::var("KIBAMAIL_API_KEY")
            .expect("env variable `KIBAMAIL_API_KEY` should be a valid API key");

        Self::new(api_key.as_str())
    }
}

impl fmt::Debug for Kibamail {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::Debug::fmt(&self.contacts, f)
    }
}
