package cmd

import (
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

func TestContactsList(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/contacts", status: 200, body: makeListResponse("contact_list",
			map[string]interface{}{"id": "c1", "email": "alice@test.com", "status": "SUBSCRIBED"},
			map[string]interface{}{"id": "c2", "email": "bob@test.com", "status": "SUBSCRIBED"},
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "contacts", "list", "--json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result []map[string]interface{}
	if jsonErr := json.Unmarshal([]byte(stdout), &result); jsonErr != nil {
		t.Fatalf("expected JSON array, got: %s", stdout)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 contacts, got %d", len(result))
	}
}

func TestContactsShow(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/contacts/c1", status: 200, body: map[string]interface{}{
			"id": "c1", "email": "alice@test.com", "status": "SUBSCRIBED",
		}},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "contacts", "show", "c1", "--json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertContains(t, stdout, "alice@test.com")
	assertContains(t, stdout, "c1")
}

func TestContactsCreate(t *testing.T) {
	var receivedBody map[string]interface{}
	server := newMockAPI(t, []mockRoute{
		{method: "POST", path: "/v1/contacts", handler: func(w http.ResponseWriter, r *http.Request) {
			body, _ := io.ReadAll(r.Body)
			json.Unmarshal(body, &receivedBody)
			w.WriteHeader(201)
			json.NewEncoder(w).Encode(map[string]string{"id": "c-new"})
		}},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "contacts", "create", "--email", "new@test.com", "--first-name", "New")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertContains(t, stdout, "c-new")

	if receivedBody["email"] != "new@test.com" {
		t.Errorf("expected email new@test.com in request, got %v", receivedBody["email"])
	}
}

func TestContactsCreate_MissingEmail(t *testing.T) {
	root := newTestRootCmd("", "sk-test")
	_, stderr, err := executeCommand(root, "contacts", "create")
	if err == nil {
		t.Error("expected error for missing required flag")
	}
	_ = stderr // Cobra prints usage error
}

func TestContactsUpdate(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "PUT", path: "/v1/contacts/c1", status: 200, body: map[string]string{"id": "c1"}},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "contacts", "update", "c1", "--first-name", "Updated")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertContains(t, stdout, "c1")
}

func TestContactsDelete(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "DELETE", path: "/v1/contacts/c1", status: 200, body: nil},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "contacts", "delete", "c1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// In non-TTY (test buffer), auto-JSON output
	assertContains(t, stdout, `"deleted":true`)
	assertContains(t, stdout, "c1")
}

func TestContactsDelete_JSON(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "DELETE", path: "/v1/contacts/c1", status: 200, body: nil},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "contacts", "delete", "c1", "--json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	result := assertJSON(t, stdout)
	if result["deleted"] != true {
		t.Error("expected deleted=true")
	}
}

func TestContactsList_FieldFilter(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/contacts", status: 200, body: makeListResponse("contact_list",
			map[string]interface{}{"id": "c1", "email": "alice@test.com", "status": "SUBSCRIBED", "firstName": "Alice"},
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "contacts", "list", "--json", "--fields", "id,email")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result []map[string]interface{}
	json.Unmarshal([]byte(stdout), &result)
	if len(result) != 1 {
		t.Fatalf("expected 1 contact, got %d", len(result))
	}
	if _, hasFirstName := result[0]["firstName"]; hasFirstName {
		t.Error("expected firstName to be filtered out")
	}
	if _, hasEmail := result[0]["email"]; !hasEmail {
		t.Error("expected email to be present")
	}
}

func TestContactsList_Quiet(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/contacts", status: 200, body: makeListResponse("contact_list",
			map[string]interface{}{"id": "c1", "email": "alice@test.com"},
			map[string]interface{}{"id": "c2", "email": "bob@test.com"},
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "contacts", "list", "--quiet")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertContains(t, stdout, "c1")
	assertContains(t, stdout, "c2")
}
