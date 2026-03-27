package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/spf13/cobra"
	"github.com/zalando/go-keyring"
)

func init() {
	keyring.MockInit()
}

type mockRoute struct {
	method  string
	path    string
	status  int
	body    interface{}
	handler http.HandlerFunc
}

func newMockAPI(t *testing.T, routes []mockRoute) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()

	for _, r := range routes {
		route := r
		pattern := route.method + " " + route.path
		mux.HandleFunc(pattern, func(w http.ResponseWriter, req *http.Request) {
			if route.handler != nil {
				route.handler(w, req)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(route.status)
			if route.body != nil {
				json.NewEncoder(w).Encode(route.body)
			}
		})
	}

	return httptest.NewServer(mux)
}

func executeCommand(root *cobra.Command, args ...string) (string, string, error) {
	stdout := new(bytes.Buffer)
	stderr := new(bytes.Buffer)

	root.SetOut(stdout)
	root.SetErr(stderr)
	root.SetArgs(args)

	err := root.Execute()

	return stdout.String(), stderr.String(), err
}

func newTestRootCmd(baseURL, apiKey string) *cobra.Command {
	root := NewRootCmd("test", "abc123")
	return withTestArgs(root, baseURL, apiKey)
}

func withTestArgs(root *cobra.Command, baseURL, apiKey string) *cobra.Command {
	// We can't easily inject the base URL via env in parallel tests,
	// so we override by setting the flag defaults
	if apiKey != "" {
		root.PersistentFlags().Set("api-key", apiKey)
	}
	if baseURL != "" {
		root.PersistentFlags().Set("base-url", baseURL)
	}
	return root
}

func jsonResponse(obj interface{}) string {
	b, _ := json.Marshal(obj)
	return string(b)
}

func assertContains(t *testing.T, haystack, needle string) {
	t.Helper()
	if !bytes.Contains([]byte(haystack), []byte(needle)) {
		t.Errorf("expected output to contain %q, got: %s", needle, haystack)
	}
}

func assertJSON(t *testing.T, output string) map[string]interface{} {
	t.Helper()
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(output), &result); err != nil {
		t.Fatalf("expected valid JSON, got error: %v\noutput: %s", err, output)
	}
	return result
}

func makeListResponse(object string, items ...map[string]interface{}) map[string]interface{} {
	return map[string]interface{}{
		"object":      object,
		"data":        items,
		"hasMore":     false,
		"hasPrevious": false,
	}
}

func mustJSON(v interface{}) string {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		panic(fmt.Sprintf("failed to marshal JSON: %v", err))
	}
	return string(b)
}

// apiError returns a structured API error envelope matching the Kibamail API format.
func apiError(code, errType, message, hint string) map[string]interface{} {
	return map[string]interface{}{
		"error": map[string]interface{}{
			"type":      errType,
			"code":      code,
			"message":   message,
			"hint":      hint,
			"requestId": "req_test_123",
		},
	}
}

func apiValidationError(message string, fields []map[string]string) map[string]interface{} {
	return map[string]interface{}{
		"error": map[string]interface{}{
			"type":             "VALIDATION_ERROR",
			"code":             "VALIDATION_FAILED",
			"message":          message,
			"hint":             "Request body failed validation. Check the 'validationErrors' array for field-level details.",
			"requestId":        "req_test_456",
			"validationErrors": fields,
		},
	}
}
