package kibamail

import (
	"net/http"
	"net/url"
	"os"
)

// Test configuration constants
var (
	// MockAPIURL is the URL of the Prism mock server
	MockAPIURL = getEnv("MOCK_API_URL", "http://localhost:4010")
	// MockAPIKey is the test API key
	MockAPIKey = "kb_test_mock_api_key_12345"
)

// newTestClient creates a new Kibamail client configured for testing
func newTestClient() *Client {
	client := NewClient(MockAPIKey)
	baseURL, _ := url.Parse(MockAPIURL)
	client.BaseURL = baseURL
	return client
}

// setupTest initializes test environment
func setupTest() *Client {
	// Set environment variable for tests
	os.Setenv("KIBAMAIL_BASE_URL", MockAPIURL)

	return newTestClient()
}

// Helper to create custom client with different settings if needed
func newCustomTestClient(httpClient *http.Client) *Client {
	client := NewCustomClient(httpClient, MockAPIKey)
	baseURL, _ := url.Parse(MockAPIURL)
	client.BaseURL = baseURL
	return client
}
