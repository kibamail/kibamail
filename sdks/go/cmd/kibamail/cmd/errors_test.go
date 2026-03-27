package cmd

import (
	"encoding/json"
	"testing"
)

func TestError_NotFound_IncludesHint(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/contacts/nonexistent", status: 404, body: apiError(
			"CONTACT_NOT_FOUND", "INVALID_REQUEST_ERROR",
			"Contact 'nonexistent' not found in this workspace",
			"The contact ID does not exist. List contacts with GET /v1/contacts.",
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	_, stderr, _ := executeCommand(root, "contacts", "show", "nonexistent", "--json")

	var envelope map[string]interface{}
	if err := json.Unmarshal([]byte(stderr), &envelope); err != nil {
		t.Fatalf("expected JSON error on stderr, got: %s", stderr)
	}

	errObj := envelope["error"].(map[string]interface{})
	if errObj["code"] != "CONTACT_NOT_FOUND" {
		t.Errorf("expected code CONTACT_NOT_FOUND, got %v", errObj["code"])
	}
	if errObj["hint"] != "The contact ID does not exist. List contacts with GET /v1/contacts." {
		t.Errorf("expected hint about listing contacts, got %v", errObj["hint"])
	}
	if errObj["exit_code"] != float64(3) {
		t.Errorf("expected exit_code 3, got %v", errObj["exit_code"])
	}
	if errObj["retryable"] != false {
		t.Error("expected retryable=false")
	}
}

func TestError_Unauthorized_IncludesHint(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/contacts", status: 401, body: apiError(
			"INVALID_API_KEY", "AUTHENTICATION_ERROR",
			"Invalid API key",
			"Check that your API key is correct. Generate a new key at the dashboard.",
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-bad")
	_, stderr, _ := executeCommand(root, "contacts", "list", "--json")

	var envelope map[string]interface{}
	json.Unmarshal([]byte(stderr), &envelope)
	errObj := envelope["error"].(map[string]interface{})

	if errObj["code"] != "INVALID_API_KEY" {
		t.Errorf("expected code INVALID_API_KEY, got %v", errObj["code"])
	}
	if errObj["exit_code"] != float64(4) {
		t.Errorf("expected exit_code 4, got %v", errObj["exit_code"])
	}
	assertContains(t, errObj["hint"].(string), "Generate a new key")
}

func TestError_Conflict_IncludesHint(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "POST", path: "/v1/contacts", status: 409, body: apiError(
			"CONTACT_ALREADY_EXISTS", "INVALID_REQUEST_ERROR",
			"A contact with email 'alice@test.com' already exists",
			"Use PUT /v1/contacts/{id} to update it.",
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	_, stderr, _ := executeCommand(root, "contacts", "create", "--email", "alice@test.com", "--json")

	var envelope map[string]interface{}
	json.Unmarshal([]byte(stderr), &envelope)
	errObj := envelope["error"].(map[string]interface{})

	if errObj["code"] != "CONTACT_ALREADY_EXISTS" {
		t.Errorf("expected code CONTACT_ALREADY_EXISTS, got %v", errObj["code"])
	}
	if errObj["exit_code"] != float64(5) {
		t.Errorf("expected exit_code 5, got %v", errObj["exit_code"])
	}
}

func TestError_Validation_IncludesFieldErrors(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "POST", path: "/v1/contacts", status: 422, body: apiValidationError(
			"Validation failed",
			[]map[string]string{
				{"field": "email", "code": "INVALID_EMAIL_FORMAT", "message": "Invalid email format"},
			},
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	_, stderr, _ := executeCommand(root, "contacts", "create", "--email", "not-an-email", "--json")

	var envelope map[string]interface{}
	json.Unmarshal([]byte(stderr), &envelope)
	errObj := envelope["error"].(map[string]interface{})

	if errObj["code"] != "VALIDATION_FAILED" {
		t.Errorf("expected code VALIDATION_FAILED, got %v", errObj["code"])
	}
	if errObj["exit_code"] != float64(6) {
		t.Errorf("expected exit_code 6, got %v", errObj["exit_code"])
	}

	valErrs := errObj["validation_errors"].([]interface{})
	if len(valErrs) != 1 {
		t.Fatalf("expected 1 validation error, got %d", len(valErrs))
	}
	firstErr := valErrs[0].(map[string]interface{})
	if firstErr["field"] != "email" {
		t.Errorf("expected field 'email', got %v", firstErr["field"])
	}
}

func TestError_RequestID_Preserved(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/contacts/xyz", status: 404, body: apiError(
			"CONTACT_NOT_FOUND", "INVALID_REQUEST_ERROR",
			"Contact not found",
			"List contacts with GET /v1/contacts.",
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	_, stderr, _ := executeCommand(root, "contacts", "show", "xyz", "--json")

	var envelope map[string]interface{}
	json.Unmarshal([]byte(stderr), &envelope)
	errObj := envelope["error"].(map[string]interface{})

	if errObj["request_id"] != "req_test_123" {
		t.Errorf("expected request_id 'req_test_123', got %v", errObj["request_id"])
	}
}

func TestError_TextMode_ShowsHint(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/contacts/xyz", status: 404, body: apiError(
			"CONTACT_NOT_FOUND", "INVALID_REQUEST_ERROR",
			"Contact 'xyz' not found",
			"The contact ID does not exist. List contacts with GET /v1/contacts.",
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	// Force table output to test text mode
	_, stderr, _ := executeCommand(root, "contacts", "show", "xyz", "--output", "table")

	assertContains(t, stderr, "Error: Contact 'xyz' not found")
	assertContains(t, stderr, "Hint:")
	assertContains(t, stderr, "List contacts with GET /v1/contacts")
}
