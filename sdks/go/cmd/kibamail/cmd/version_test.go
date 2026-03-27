package cmd

import "testing"

func TestVersion(t *testing.T) {
	root := NewRootCmd("1.0.0", "abc123")
	stdout, _, err := executeCommand(root, "version")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertContains(t, stdout, "1.0.0")
	assertContains(t, stdout, "abc123")
}

func TestVersion_JSON(t *testing.T) {
	root := NewRootCmd("1.0.0", "abc123")
	stdout, _, err := executeCommand(root, "version", "--json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	result := assertJSON(t, stdout)
	if result["version"] != "1.0.0" {
		t.Errorf("expected version=1.0.0, got %v", result["version"])
	}
}
