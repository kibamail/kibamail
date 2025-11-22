use serde::{Deserialize, Serialize};

/// Pagination options for list methods.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ListOptions {
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

impl ListOptions {
    /// Creates a new [`ListOptions`] with default values.
    #[inline]
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Sets the limit.
    #[inline]
    #[must_use]
    pub fn with_limit(mut self, limit: u32) -> Self {
        self.limit = Some(limit);
        self
    }

    /// Sets the after cursor.
    #[inline]
    #[must_use]
    pub fn with_after(mut self, after: impl Into<String>) -> Self {
        self.after = Some(after.into());
        self
    }

    /// Sets the before cursor.
    #[inline]
    #[must_use]
    pub fn with_before(mut self, before: impl Into<String>) -> Self {
        self.before = Some(before.into());
        self
    }
}

/// Standard paginated list response.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListResponse<T> {
    /// The list of items.
    pub data: Vec<T>,
    /// Whether there are more items after this page.
    #[serde(default)]
    pub has_more: bool,
    /// Whether there are items before this page.
    #[serde(default)]
    pub has_previous: bool,
}
