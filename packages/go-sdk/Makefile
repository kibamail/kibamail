.PHONY: build test test-watch clean mock-start mock-stop mock-logs

# Build the SDK
build:
	@echo "Building SDK..."
	@go build -v ./...

# Run tests (ensures test SDK infrastructure is running)
test:
	@echo "Running tests..."
	@../../test-sdk-infra/scripts/ensure-test-sdk-infra.sh
	@go test -v ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html

# Watch tests
test-watch:
	@echo "Watching tests..."
	@while true; do \
		inotifywait -e modify,create,delete -r . && \
		clear && \
		go test -v ./...; \
	done

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf coverage.out coverage.html

# Start test SDK infrastructure (uses shared infrastructure at root)
mock-start:
	@echo "Starting test SDK infrastructure..."
	@cd ../.. && make test-sdk-infra-start

# Stop test SDK infrastructure
mock-stop:
	@echo "Stopping test SDK infrastructure..."
	@cd ../.. && make test-sdk-infra-stop

# View test infrastructure logs
mock-logs:
	@cd ../.. && make test-sdk-infra-logs

# Run tests with infrastructure (infrastructure is auto-started by test target)
test-with-mock: test

# Tidy dependencies
tidy:
	@echo "Tidying go.mod..."
	@go mod tidy

# Format code
fmt:
	@echo "Formatting code..."
	@go fmt ./...

# Lint code
lint:
	@echo "Linting code..."
	@golangci-lint run

# Install dependencies
deps:
	@echo "Installing dependencies..."
	@go mod download

# All: tidy, fmt, build, test
all: tidy fmt build test
