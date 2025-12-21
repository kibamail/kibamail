.PHONY: build test lint clean run dev test-integration test-infra-up test-infra-down

# Build variables
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_TIME := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS := -ldflags "-X main.version=$(VERSION) -X main.buildTime=$(BUILD_TIME)"

# Binary output
BINARY := email-agent
BUILD_DIR := bin

build:
	@mkdir -p $(BUILD_DIR)
	go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY) ./cmd/email-agent

build-linux:
	@mkdir -p $(BUILD_DIR)
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY)-linux-amd64 ./cmd/email-agent

run:
	go run ./cmd/email-agent --config cmd/email-agent/config.dev.yaml

dev:
	go run ./cmd/email-agent --config cmd/email-agent/config.dev.yaml

test:
	go test -v -race -cover ./...

test-short:
	go test -v -short ./...

lint:
	golangci-lint run ./...

fmt:
	gofumpt -w .
	goimports -w .

tidy:
	go mod tidy

clean:
	rm -rf $(BUILD_DIR)

deps:
	go mod download
	go mod verify

# Development helpers
.PHONY: generate
generate:
	go generate ./...

# Integration testing
test-infra-up:
	docker-compose -f docker-compose.test.yaml up -d
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@echo "Test infrastructure is ready"

test-infra-down:
	docker-compose -f docker-compose.test.yaml down -v

test-integration: test-infra-up
	@echo "Running integration tests..."
	go test -tags=integration -v -timeout 120s ./internal/integration/...
	@echo "Integration tests completed"

test-all: test test-integration
	@echo "All tests completed"
