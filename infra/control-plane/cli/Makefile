# Build variables
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
GIT_COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

# Go build flags
LDFLAGS := -X github.com/kibamail/infra/control-plane/cli/cmd.Version=$(VERSION) \
           -X github.com/kibamail/infra/control-plane/cli/cmd.GitCommit=$(GIT_COMMIT) \
           -X github.com/kibamail/infra/control-plane/cli/cmd.BuildDate=$(BUILD_DATE)

# Binary name
BINARY := kbctl

# Build directory
BUILD_DIR := ./bin

.PHONY: all build build-linux build-darwin clean deps test lint fmt help

all: build

## build: Build the binary for the current platform
build: deps
	@echo "Building $(BINARY)..."
	@mkdir -p $(BUILD_DIR)
	go build -ldflags "$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY) .
	@echo "Binary built: $(BUILD_DIR)/$(BINARY)"

## build-linux: Build the binary for Linux
build-linux: deps
	@echo "Building $(BINARY) for Linux..."
	@mkdir -p $(BUILD_DIR)
	GOOS=linux GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY)-linux-amd64 .
	GOOS=linux GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY)-linux-arm64 .

## build-darwin: Build the binary for macOS
build-darwin: deps
	@echo "Building $(BINARY) for macOS..."
	@mkdir -p $(BUILD_DIR)
	GOOS=darwin GOARCH=amd64 go build -ldflags "$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY)-darwin-amd64 .
	GOOS=darwin GOARCH=arm64 go build -ldflags "$(LDFLAGS)" -o $(BUILD_DIR)/$(BINARY)-darwin-arm64 .

## build-all: Build for all platforms
build-all: build-linux build-darwin

## deps: Download dependencies
deps:
	@echo "Downloading dependencies..."
	go mod download
	go mod tidy

## test: Run tests
test:
	@echo "Running tests..."
	go test -v ./...

## lint: Run linter
lint:
	@echo "Running linter..."
	golangci-lint run ./...

## fmt: Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...

## clean: Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf $(BUILD_DIR)
	go clean

## install: Install the binary to $GOPATH/bin
install: build
	@echo "Installing $(BINARY)..."
	cp $(BUILD_DIR)/$(BINARY) $(GOPATH)/bin/$(BINARY)

## run: Build and run the binary
run: build
	$(BUILD_DIR)/$(BINARY)

## help: Show this help message
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed 's/^/ /'
