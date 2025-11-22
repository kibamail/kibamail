#[allow(unreachable_pub)]
pub mod types {
    use serde::Deserialize;

    /// Error response from the Kibamail API.
    #[derive(Debug, Clone, Deserialize, thiserror::Error)]
    #[error("{message}")]
    pub struct ErrorResponse {
        pub message: String,
        #[serde(default)]
        pub code: Option<String>,
    }
}
