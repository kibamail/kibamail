package cmd

import (
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

func TestTopicsList(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "GET", path: "/v1/topics", status: 200, body: makeListResponse("topic_list",
			map[string]interface{}{"id": "t1", "name": "Newsletter"},
		)},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "topics", "list", "--json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var result []map[string]interface{}
	json.Unmarshal([]byte(stdout), &result)
	if len(result) != 1 {
		t.Errorf("expected 1 topic, got %d", len(result))
	}
}

func TestTopicsCreate(t *testing.T) {
	var receivedBody map[string]interface{}
	server := newMockAPI(t, []mockRoute{
		{method: "POST", path: "/v1/topics", handler: func(w http.ResponseWriter, r *http.Request) {
			body, _ := io.ReadAll(r.Body)
			json.Unmarshal(body, &receivedBody)
			w.WriteHeader(201)
			json.NewEncoder(w).Encode(map[string]string{"id": "t-new"})
		}},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "topics", "create", "--name", "Marketing", "--visibility", "public")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertContains(t, stdout, "t-new")

	if receivedBody["name"] != "Marketing" {
		t.Errorf("expected name=Marketing, got %v", receivedBody["name"])
	}
}

func TestTopicsDelete(t *testing.T) {
	server := newMockAPI(t, []mockRoute{
		{method: "DELETE", path: "/v1/topics/t1", status: 200},
	})
	defer server.Close()

	root := newTestRootCmd(server.URL, "sk-test")
	stdout, _, err := executeCommand(root, "topics", "delete", "t1", "--json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	result := assertJSON(t, stdout)
	if result["deleted"] != true {
		t.Error("expected deleted=true")
	}
}
