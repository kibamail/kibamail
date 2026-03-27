package cmd

import (
	"testing"

	"github.com/zalando/go-keyring"
)

func TestAuthLogin_WithFlag(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/api-keys", status: 200, body: makeListResponse("api_key_list")},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "")
	stdout, _, err := executeCommand(root, "auth", "login", "--api-key", "sk-test-key", "--base-url", server.URL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertContains(t, stdout, "keyring")

	stored, storeErr := keyring.Get("kibamail", "api-key")
	if storeErr != nil {
		t.Fatalf("key not stored in keyring: %v", storeErr)
	}
	if stored != "sk-test-key" {
		t.Errorf("expected stored key 'sk-test-key', got '%s'", stored)
	}
}

func TestAuthLogin_InvalidKey(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/api-keys", status: 401, body: apiError(
			"INVALID_API_KEY", "AUTHENTICATION_ERROR",
			"Invalid API key",
			"Check that your API key is correct.",
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "")
	_, stderr, _ := executeCommand(root, "auth", "login", "--api-key", "bad-key", "--base-url", server.URL)
	assertContains(t, stderr, "INVALID_API_KEY")
	assertContains(t, stderr, "Check that your API key is correct")
}

func TestAuthLogin_NoKeyProvided(t *testing.T) {
	root := newTestRootCmd("", "")
	_, stderr, _ := executeCommand(root, "auth", "login")
	assertContains(t, stderr, "provide API key")
}

func TestAuthLogout(t *testing.T) {
	keyring.Set("kibamail", "api-key", "sk-to-remove")

	root := newTestRootCmd("", "")
	stdout, _, err := executeCommand(root, "auth", "logout")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// In non-TTY (test buffer), auto-JSON kicks in
	assertContains(t, stdout, `"stored":false`)

	_, getErr := keyring.Get("kibamail", "api-key")
	if getErr == nil {
		t.Error("expected key to be deleted from keyring")
	}
}

func TestAuthStatus_Authenticated(t *testing.T) {
	keyring.Set("kibamail", "api-key", "sk-stored-key")

	root := newTestRootCmd("", "")
	stdout, _, err := executeCommand(root, "auth", "status")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	result := assertJSON(t, stdout)
	if result["authenticated"] != true {
		t.Error("expected authenticated=true")
	}
	if result["source"] != "keyring" {
		t.Errorf("expected source=keyring, got %v", result["source"])
	}
}

func TestAuthStatus_NotAuthenticated(t *testing.T) {
	keyring.Delete("kibamail", "api-key")

	root := newTestRootCmd("", "")
	stdout, _, err := executeCommand(root, "auth", "status")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	result := assertJSON(t, stdout)
	if result["authenticated"] != false {
		t.Error("expected authenticated=false")
	}
}

func TestAuthStatus_FlagOverridesKeyring(t *testing.T) {
	keyring.Set("kibamail", "api-key", "sk-keyring-key")

	root := newTestRootCmd("", "")
	stdout, _, err := executeCommand(root, "auth", "status", "--api-key", "sk-flag-key")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	result := assertJSON(t, stdout)
	if result["source"] != "flag" {
		t.Errorf("expected source=flag, got %v", result["source"])
	}
}
