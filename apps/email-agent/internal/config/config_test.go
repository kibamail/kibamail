package config

import (
	"os"
	"testing"
	"time"
)

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()

	if cfg.Agent.LogLevel != "info" {
		t.Errorf("expected log_level 'info', got '%s'", cfg.Agent.LogLevel)
	}

	if cfg.Agent.LogFormat != "json" {
		t.Errorf("expected log_format 'json', got '%s'", cfg.Agent.LogFormat)
	}

	if cfg.HTTP.Port != 8080 {
		t.Errorf("expected HTTP port 8080, got %d", cfg.HTTP.Port)
	}

	if cfg.HTTP.Host != "127.0.0.1" {
		t.Errorf("expected HTTP host '127.0.0.1', got '%s'", cfg.HTTP.Host)
	}

	if cfg.Worker.FetchBatch != 100 {
		t.Errorf("expected fetch_batch 100, got %d", cfg.Worker.FetchBatch)
	}

	if cfg.Worker.FetchWorkers != 30 {
		t.Errorf("expected fetch_workers 30, got %d", cfg.Worker.FetchWorkers)
	}

	if cfg.NATS.MaxReconnects != -1 {
		t.Errorf("expected max_reconnects -1 (infinite), got %d", cfg.NATS.MaxReconnects)
	}

	if cfg.NATS.ReconnectWait != 2*time.Second {
		t.Errorf("expected reconnect_wait 2s, got %s", cfg.NATS.ReconnectWait)
	}
}

func TestValidate_MissingNATSURLs(t *testing.T) {
	cfg := DefaultConfig()
	cfg.NATS.URLs = []string{}
	cfg.ControlAPI.BaseURL = "https://api.example.com"
	cfg.ControlAPI.APIKey = "test-key"
	cfg.S3.Endpoint = "https://s3.example.com"
	cfg.S3.Bucket = "test-bucket"

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for missing NATS URLs")
	}
}

func TestValidate_MissingControlAPIBaseURL(t *testing.T) {
	cfg := DefaultConfig()
	cfg.ControlAPI.BaseURL = ""
	cfg.ControlAPI.APIKey = "test-key"
	cfg.S3.Endpoint = "https://s3.example.com"
	cfg.S3.Bucket = "test-bucket"

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for missing control_api.base_url")
	}
}

func TestValidate_MissingControlAPIKey(t *testing.T) {
	cfg := DefaultConfig()
	cfg.ControlAPI.BaseURL = "https://api.example.com"
	cfg.ControlAPI.APIKey = ""
	cfg.S3.Endpoint = "https://s3.example.com"
	cfg.S3.Bucket = "test-bucket"

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for missing control_api.api_key")
	}
}

func TestValidate_MissingS3Endpoint(t *testing.T) {
	cfg := DefaultConfig()
	cfg.ControlAPI.BaseURL = "https://api.example.com"
	cfg.ControlAPI.APIKey = "test-key"
	cfg.S3.Endpoint = ""
	cfg.S3.Bucket = "test-bucket"

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for missing s3.endpoint")
	}
}

func TestValidate_MissingS3Bucket(t *testing.T) {
	cfg := DefaultConfig()
	cfg.ControlAPI.BaseURL = "https://api.example.com"
	cfg.ControlAPI.APIKey = "test-key"
	cfg.S3.Endpoint = "https://s3.example.com"
	cfg.S3.Bucket = ""

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for missing s3.bucket")
	}
}

func TestValidate_InvalidFetchBatch(t *testing.T) {
	cfg := validConfig()
	cfg.Worker.FetchBatch = 0

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for invalid fetch_batch")
	}

	cfg.Worker.FetchBatch = 501
	err = cfg.Validate()
	if err == nil {
		t.Error("expected error for fetch_batch > 500")
	}
}

func TestValidate_InvalidFetchWorkers(t *testing.T) {
	cfg := validConfig()
	cfg.Worker.FetchWorkers = 0

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for invalid fetch_workers")
	}

	cfg.Worker.FetchWorkers = 51
	err = cfg.Validate()
	if err == nil {
		t.Error("expected error for fetch_workers > 50")
	}
}

func TestValidate_InvalidHTTPPort(t *testing.T) {
	cfg := validConfig()
	cfg.HTTP.Port = 0

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for invalid HTTP port")
	}

	cfg.HTTP.Port = 70000
	err = cfg.Validate()
	if err == nil {
		t.Error("expected error for HTTP port > 65535")
	}
}

func TestValidate_MissingStreamName(t *testing.T) {
	cfg := validConfig()
	cfg.Worker.StreamName = ""

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for missing stream_name")
	}
}

func TestValidate_MissingConsumerName(t *testing.T) {
	cfg := validConfig()
	cfg.Worker.ConsumerName = ""

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for missing consumer_name")
	}
}

func TestValidate_TLSRequiresCACert(t *testing.T) {
	cfg := validConfig()
	cfg.NATS.TLSEnabled = true
	cfg.NATS.TLSCACert = ""

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for TLS enabled without CA cert")
	}
}

func TestValidate_NKeyFileNotFound(t *testing.T) {
	cfg := validConfig()
	cfg.NATS.NKeyFile = "/nonexistent/path/to/nkey"

	err := cfg.Validate()
	if err == nil {
		t.Error("expected error for nonexistent NKey file")
	}
}

func TestValidate_ValidConfig(t *testing.T) {
	cfg := validConfig()

	err := cfg.Validate()
	if err != nil {
		t.Errorf("expected no error for valid config, got: %v", err)
	}
}

func TestIsProduction(t *testing.T) {
	cfg := validConfig()

	// Not production without TLS
	cfg.NATS.TLSEnabled = false
	if cfg.IsProduction() {
		t.Error("expected IsProduction to return false without TLS")
	}

	// Not production without NKey
	cfg.NATS.TLSEnabled = true
	cfg.NATS.NKeyFile = ""
	if cfg.IsProduction() {
		t.Error("expected IsProduction to return false without NKey")
	}

	// Create temp NKey file for test
	tmpFile, err := os.CreateTemp("", "test-nkey-*.nkeys")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	// Production with TLS and NKey
	cfg.NATS.TLSEnabled = true
	cfg.NATS.NKeyFile = tmpFile.Name()
	if !cfg.IsProduction() {
		t.Error("expected IsProduction to return true with TLS and NKey")
	}
}

// validConfig returns a valid configuration for testing
func validConfig() *Config {
	cfg := DefaultConfig()
	cfg.ControlAPI.BaseURL = "https://api.example.com"
	cfg.ControlAPI.APIKey = "test-api-key"
	cfg.S3.Endpoint = "https://s3.example.com"
	cfg.S3.Bucket = "test-bucket"
	return cfg
}
