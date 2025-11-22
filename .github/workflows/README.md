# GitHub Actions Workflows

This directory contains CI/CD workflows for testing the Kibamail SDKs.

## Workflows

### Individual SDK Tests

Each SDK has its own workflow that tests across multiple language versions:

#### 1. **test-go-sdk.yml** - Go SDK Testing
- **Versions tested:** Go 1.21, 1.22, 1.23
- **Triggers:**
  - Push to `main` or `develop` branches
  - Pull requests affecting Go SDK, test infrastructure, or OpenAPI spec
- **Features:**
  - Runs tests with race detection
  - Uses Docker Compose for Prism test infrastructure
  - Caches Go modules for faster builds

#### 2. **test-nodejs-sdk.yml** - Node.js SDK Testing
- **Versions tested:** Node.js 18 (LTS), 20 (LTS), 22 (Current)
- **Triggers:**
  - Push to `main` or `develop` branches
  - Pull requests affecting Node.js SDK, test infrastructure, or OpenAPI spec
- **Features:**
  - Uses pnpm for dependency management
  - Caches pnpm dependencies for faster builds
  - Uses Docker Compose for Prism test infrastructure

#### 3. **test-php-sdk.yml** - PHP SDK Testing
- **Versions tested:** PHP 8.1, 8.2, 8.3
- **Triggers:**
  - Push to `main` or `develop` branches
  - Pull requests affecting PHP SDK, test infrastructure, or OpenAPI spec
- **Features:**
  - Uses Composer for dependency management
  - Caches Composer dependencies for faster builds
  - Uses Docker Compose for Prism test infrastructure

## Test Infrastructure

All workflows use the same test infrastructure:

1. **Prism Mock Server** - Started via Docker Compose from `test-sdk-infra/`
2. **OpenAPI Spec** - Uses `apps/web/public/openapi.v1.json`
3. **Health Check** - Waits up to 30 seconds for Prism to be ready
4. **Cleanup** - Stops Docker containers after tests (even on failure)

## Path Filters

Workflows are optimized to only run when relevant files change:
- SDK source code (`packages/{sdk-name}/**`)
- Test infrastructure (`test-sdk-infra/**`)
- OpenAPI specification (`apps/web/public/openapi.v1.json`)
- Workflow file itself

## Running Locally

To run tests locally the same way CI does:

```bash
# Start test infrastructure
cd test-sdk-infra
docker compose up -d

# Run Go SDK tests
cd ../packages/go-sdk
go test -v -race ./...

# Run Node.js SDK tests (from workspace root)
pnpm --filter kibamail test

# Run PHP SDK tests
cd ../packages/php-sdk
composer test

# Stop test infrastructure
cd ../../test-sdk-infra
docker compose down
```

## Troubleshooting

### Tests fail in CI but pass locally
- Ensure you're using the same language version
- Check if test infrastructure (Prism) started correctly
- Review the "start test infrastructure" step logs

### Docker Compose issues
- Ensure Docker service is running in CI
- Check port 4010 is available
- Review `test-sdk-infra/docker-compose.yml` configuration
