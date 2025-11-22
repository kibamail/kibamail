#[cfg(feature = "blocking")]
use reqwest::blocking::{Client, RequestBuilder, Response};
#[cfg(not(feature = "blocking"))]
use reqwest::{Client, RequestBuilder, Response};
use reqwest::{Method, StatusCode, Url, header::USER_AGENT};
use std::fmt;

use crate::{Error, Result, error::types::ErrorResponse};

#[cfg(doc)]
use crate::Kibamail;

/// Convenience builder for [`Config`].
#[derive(Debug, Clone)]
#[non_exhaustive]
pub struct ConfigBuilder {
    api_key: String,
    base_url: Option<Url>,
    client: Option<Client>,
}

impl ConfigBuilder {
    /// Create new [`ConfigBuilder`] with `api_key` set.
    pub fn new<S>(api_key: S) -> Self
    where
        S: Into<String>,
    {
        Self {
            api_key: api_key.into(),
            base_url: None,
            client: None,
        }
    }

    /// Set a custom Kibamail base URL.
    ///
    /// This can be your proxy's URL or a test server URL.
    #[must_use]
    pub fn base_url(mut self, url: Url) -> Self {
        self.base_url = Some(url);
        self
    }

    /// Set custom HTTP client.
    #[must_use]
    pub fn client(mut self, client: Client) -> Self {
        self.client = Some(client);
        self
    }

    /// Builder's terminal method producing [`Config`].
    pub fn build(self) -> Config {
        Config::new(self.api_key, self.client.unwrap_or_default(), self.base_url)
    }
}

/// Configuration for Kibamail client.
#[non_exhaustive]
#[derive(Clone)]
pub struct Config {
    pub(crate) user_agent: String,
    pub(crate) api_key: String,
    pub(crate) base_url: Url,
    pub(crate) client: Client,
}

impl Config {
    /// Create new [`ConfigBuilder`] with `api_key` set.
    pub fn builder<S>(api_key: S) -> ConfigBuilder
    where
        S: Into<String>,
    {
        ConfigBuilder::new(api_key.into())
    }

    /// Creates a new [`Config`].
    #[must_use]
    pub(crate) fn new(api_key: String, client: Client, base_url: Option<Url>) -> Self {
        let env_base_url = base_url.unwrap_or_else(|| {
            std::env::var("KIBAMAIL_BASE_URL")
                .map_or_else(
                    |_| Url::parse("https://api.kibamail.com"),
                    |env_var| Url::parse(env_var.as_str()),
                )
                .expect("env variable `KIBAMAIL_BASE_URL` should be a valid URL")
        });

        let env_user_agent = format!("{}/{}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"));

        Self {
            user_agent: env_user_agent,
            api_key,
            base_url: env_base_url,
            client,
        }
    }

    /// Constructs a new [`RequestBuilder`].
    pub(crate) fn build(&self, method: Method, path: &str) -> RequestBuilder {
        let path = self
            .base_url
            .join(path)
            .expect("should be a valid API endpoint");

        self.client
            .request(method, path)
            .bearer_auth(self.api_key.as_str())
            .header(USER_AGENT, self.user_agent.as_str())
    }

    /// Send an HTTP request and handle the response.
    #[allow(unreachable_pub)]
    #[maybe_async::maybe_async]
    pub async fn send(&self, request: RequestBuilder) -> Result<Response> {
        let request = request.build()?;
        let response = self.client.execute(request).await?;

        match response.status() {
            StatusCode::TOO_MANY_REQUESTS => {
                let headers = response.headers();

                let limit = headers
                    .get("ratelimit-limit")
                    .and_then(|v| v.to_str().ok())
                    .map(String::from);
                let remaining = headers
                    .get("ratelimit-remaining")
                    .and_then(|v| v.to_str().ok())
                    .map(String::from);
                let reset = headers
                    .get("ratelimit-reset")
                    .and_then(|v| v.to_str().ok())
                    .map(String::from);
                let retry_after = headers
                    .get("retry-after")
                    .and_then(|v| v.to_str().ok())
                    .map(String::from);

                Err(Error::RateLimit {
                    limit,
                    remaining,
                    reset,
                    retry_after,
                })
            }
            x if x.is_client_error() || x.is_server_error() => {
                let content_type_is_html = response
                    .headers()
                    .get("content-type")
                    .and_then(|el| el.to_str().ok())
                    .is_some_and(|content_type| content_type.contains("html"));

                if content_type_is_html {
                    return Err(Error::Parse(response.text().await?));
                }

                let error = response.json::<ErrorResponse>().await?;
                Err(Error::Kibamail(error))
            }
            _ => Ok(response),
        }
    }
}

impl fmt::Debug for Config {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Config")
            .field("api_key", &"kb_***********")
            .field("user_agent", &self.user_agent.as_str())
            .field("base_url", &self.base_url.as_str())
            .finish_non_exhaustive()
    }
}
