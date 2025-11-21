# Test SDK Infrastructure

This document describes the shared test infrastructure used by all Kibamail SDKs.

## Overview

All Kibamail SDKs (Node.js, Go, Python, etc.) share a single test infrastructure to ensure consistency and avoid resource conflicts. The infrastructure uses [Prism](https://stoplight.io/open-source/prism) as a mock API server based on the OpenAPI specification.

## Architecture

```
controlplane.kibamail.com/
├── docker-compose.test-sdk-infra.yml  # Shared test infrastructure
├── scripts/
│   └── ensure-test-sdk-infra.sh       # Helper script to start infrastructure
├── Makefile                            # Root-level infrastructure management
├── apps/
│   └── web/
│       └── public/
│           └── openapi.v1.json         # Source of truth for API spec
└── packages/
    ├── nodejs-sdk/
    ├── go-sdk/
    └── python-sdk/ (future)
```

## Components

### Prism Mock Server
- **Image**: `stoplight/prism:5`
- **Container Name**: `kibamail-test-sdk-prism`
- **Port**: `4010`
- **OpenAPI Spec**: `apps/web/public/openapi.v1.json`
- **Features**:
  - Dynamic response generation
  - CORS enabled for browser testing
  - Health checks for readiness

### Helper Script
`scripts/ensure-test-sdk-infra.sh` is an idempotent script that:
- Checks if test infrastructure is running
- Starts it if not running
- Waits for health checks
- Returns success when ready

## Usage

### From Monorepo Root

```bash
# Start test infrastructure
make test-sdk-infra-start

# Stop test infrastructure
make test-sdk-infra-stop

# Restart test infrastructure
make test-sdk-infra-restart

# View logs
make test-sdk-infra-logs

# Check status
make test-sdk-infra-status

# Run tests for all SDKs
make test-all-sdks

# Clean up (removes volumes)
make clean-test-sdk-infra
```

### From Individual SDK Directories

Each SDK automatically ensures test infrastructure is running:

**Node.js SDK** (`packages/nodejs-sdk/`):
```bash
npm test              # Auto-starts infrastructure if needed
npm run mock:start    # Manually start
npm run mock:stop     # Manually stop
npm run mock:logs     # View logs
```

**Go SDK** (`packages/go-sdk/`):
```bash
make test            # Auto-starts infrastructure if needed
make mock-start      # Manually start
make mock-stop       # Manually stop
make mock-logs       # View logs
```

## How It Works

### 1. Automatic Startup
When running tests from any SDK, the helper script:
```bash
./scripts/ensure-test-sdk-infra.sh
```

This script:
1. Checks if `kibamail-test-sdk-prism` container exists
2. Starts it if not running (using `docker-compose.test-sdk-infra.yml`)
3. Waits up to 30 seconds for health check
4. Returns success when ready

### 2. Shared Container
All SDKs connect to the same Prism instance on `localhost:4010`:
- No port conflicts
- Single source of truth
- Efficient resource usage
- Consistent across all SDKs

### 3. OpenAPI Spec as Source of Truth
The Prism server uses `apps/web/public/openapi.v1.json` to:
- Generate mock responses
- Validate requests
- Ensure API consistency

## Benefits

### For Developers
✅ **No manual setup** - Infrastructure starts automatically
✅ **No port conflicts** - Single shared instance
✅ **Fast tests** - No container recreation between SDKs
✅ **Consistent** - Same mock API across all SDKs

### For CI/CD
✅ **Simple setup** - One command to start infrastructure
✅ **Parallel testing** - All SDKs can test simultaneously
✅ **Efficient** - Single container for all SDKs

## Configuration

### Environment Variables
- `MOCK_API_URL`: Override default URL (default: `http://localhost:4010`)
- Used in SDK test configurations

### Customization
To modify Prism behavior, edit `docker-compose.test-sdk-infra.yml`:

```yaml
services:
  prism:
    environment:
      - PRISM_DYNAMIC=true         # Dynamic response generation
      - PRISM_CORS=true            # Enable CORS
      # Add more Prism options here
```

## Troubleshooting

### Container Won't Start
```bash
# Check if port 4010 is in use
lsof -i :4010

# View container logs
make test-sdk-infra-logs

# Force recreate
docker rm -f kibamail-test-sdk-prism
make test-sdk-infra-start
```

### Health Check Fails
```bash
# Check container status
docker ps -a | grep kibamail-test-sdk-prism

# Inspect health
docker inspect kibamail-test-sdk-prism --format='{{.State.Health.Status}}'

# View logs
docker logs kibamail-test-sdk-prism
```

### Tests Fail with Connection Errors
```bash
# Verify Prism is running
curl http://localhost:4010

# Restart infrastructure
make test-sdk-infra-restart

# Check OpenAPI spec is valid
docker exec kibamail-test-sdk-prism prism --version
```

## Adding New SDKs

When creating a new SDK:

1. **Update SDK test configuration** to use `http://localhost:4010`
2. **Add test command** to call `../../scripts/ensure-test-sdk-infra.sh`
3. **Add SDK to root Makefile** `test-all-sdks` target
4. **Document** in SDK README

Example for Python SDK:
```python
# packages/python-sdk/tests/conftest.py
import os
import subprocess

@pytest.fixture(scope="session", autouse=True)
def ensure_test_infra():
    """Ensure test infrastructure is running"""
    script_path = os.path.join(os.path.dirname(__file__), "../../scripts/ensure-test-sdk-infra.sh")
    subprocess.run([script_path], check=True)
```

## Maintenance

### Updating OpenAPI Spec
After updating `apps/web/public/openapi.v1.json`:
```bash
# Restart Prism to load new spec
make test-sdk-infra-restart

# Verify it loaded correctly
curl http://localhost:4010
```

### Upgrading Prism Version
Edit `docker-compose.test-sdk-infra.yml`:
```yaml
services:
  prism:
    image: stoplight/prism:6  # Update version
```

Then:
```bash
make test-sdk-infra-stop
docker pull stoplight/prism:6
make test-sdk-infra-start
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test All SDKs

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start Test Infrastructure
        run: make test-sdk-infra-start

      - name: Test Node.js SDK
        run: cd packages/nodejs-sdk && npm test

      - name: Test Go SDK
        run: cd packages/go-sdk && make test

      - name: Stop Test Infrastructure
        if: always()
        run: make test-sdk-infra-stop
```

## Related Documentation

- [Node.js SDK Testing](./packages/nodejs-sdk/tests/README.md)
- [Go SDK README](./packages/go-sdk/README.md)
- [Prism Documentation](https://docs.stoplight.io/docs/prism)
- [OpenAPI Specification](./apps/web/public/openapi.v1.json)
