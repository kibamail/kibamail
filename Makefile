.PHONY: test-sdk-infra-start test-sdk-infra-stop test-sdk-infra-restart test-sdk-infra-logs test-sdk-infra-status test-all-sdks

# Start test SDK infrastructure (Prism mock server)
test-sdk-infra-start:
	@echo "🚀 Starting test SDK infrastructure..."
	@docker compose -f test-sdk-infra/docker-compose.yml up -d
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 3
	@echo "✅ Test SDK infrastructure ready at http://localhost:4010"

# Stop test SDK infrastructure
test-sdk-infra-stop:
	@echo "🛑 Stopping test SDK infrastructure..."
	@docker compose -f test-sdk-infra/docker-compose.yml down

# Restart test SDK infrastructure
test-sdk-infra-restart: test-sdk-infra-stop test-sdk-infra-start

# View logs from test SDK infrastructure
test-sdk-infra-logs:
	@docker compose -f test-sdk-infra/docker-compose.yml logs -f

# Check status of test SDK infrastructure
test-sdk-infra-status:
	@docker compose -f test-sdk-infra/docker-compose.yml ps

# Run tests for all SDKs
test-all-sdks:
	@echo "🧪 Running tests for all SDKs..."
	@./test-sdk-infra/scripts/ensure-test-sdk-infra.sh
	@echo ""
	@echo "📦 Testing Node.js SDK..."
	@cd packages/nodejs-sdk && pnpm test
	@echo ""
	@echo "📦 Testing Go SDK..."
	@cd packages/go-sdk && go test -v ./...
	@echo ""
	@echo "✅ All SDK tests completed!"

# Clean up everything
clean-test-sdk-infra:
	@echo "🧹 Cleaning up test SDK infrastructure..."
	@docker compose -f test-sdk-infra/docker-compose.yml down -v
	@echo "✅ Cleanup complete"
