# Kibamail SDK Tests

This directory contains integration tests for the Kibamail Node.js SDK using Prism as a mock API server.

## Overview

The test suite uses:
- **Vitest** - Fast unit test framework with TypeScript support
- **Prism** - OpenAPI mock server for realistic API responses
- **Docker Compose** - Container orchestration for running Prism

## Setup

### Prerequisites

- Docker and Docker Compose installed
- Node.js >= 18.0.0
- pnpm >= 9.0.0

### Installation

From the monorepo root:

```bash
pnpm install
```

## Running Tests

### 1. Start the Mock API Server

Start the Prism mock server using Docker Compose:

```bash
pnpm --filter kibamail mock:start
```

Or from within the SDK directory:

```bash
pnpm mock:start
```

This will:
- Start Prism on port 4010
- Mount the OpenAPI spec from `../../apps/web/public/openapi.v1.json`
- Generate dynamic responses based on the spec

Verify Prism is running:

```bash
curl http://localhost:4010/v1/contacts
```

### 2. Run Tests

Run all tests from monorepo root:

```bash
pnpm --filter kibamail test
```

Or use Turbo to run all package tests:

```bash
pnpm test
```

Run tests in watch mode (re-runs on file changes):

```bash
pnpm --filter kibamail test:watch
```

Run tests with UI (interactive test viewer):

```bash
pnpm --filter kibamail test:ui
```

Run tests with coverage:

```bash
pnpm --filter kibamail test:coverage
```

### 3. Stop the Mock Server

When done testing:

```bash
pnpm --filter kibamail mock:stop
```

## Test Structure

```
tests/
├── setup.ts              # Test configuration and setup
├── contacts.test.ts      # Contacts resource tests
├── topics.test.ts        # Topics resource tests
├── segments.test.ts      # Segments resource tests
├── forms.test.ts         # Forms resource tests
└── README.md            # This file
```

## Writing Tests

Each test file follows this structure:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { Kibamail } from "../kibamail";
import { MOCK_API_URL, MOCK_API_KEY } from "./setup";

describe("Resource Name", () => {
  let kibamail: Kibamail;

  beforeEach(() => {
    kibamail = new Kibamail(MOCK_API_KEY, {
      baseURL: MOCK_API_URL,
    });
  });

  describe("methodName", () => {
    it("should do something", async () => {
      const result = await kibamail.resource.method();

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.response.status).toBe(200);
    });
  });
});
```

## Environment Variables

You can customize the mock API URL:

```bash
MOCK_API_URL=http://localhost:4010 pnpm test
```

## Viewing Prism Logs

To see Prism's request/response logs:

```bash
pnpm mock:logs
```

## How Prism Works

Prism reads the OpenAPI spec and:
1. Validates requests against the schema
2. Returns example responses from the spec
3. Generates dynamic data based on the schema types
4. Simulates error responses for invalid requests

This means:
- Tests validate against the actual API contract
- No need to manually mock responses
- Changes to the OpenAPI spec automatically update test behavior
- Tests catch SDK/API mismatches early

## Troubleshooting

### Prism won't start

```bash
# Check if port 4010 is already in use
lsof -i :4010

# View detailed logs
docker-compose logs prism
```

### Tests are failing

1. Ensure Prism is running: `curl http://localhost:4010/v1/contacts`
2. Check Prism logs: `pnpm mock:logs`
3. Verify the OpenAPI spec is valid
4. Check that test assertions match the spec responses

### Connection errors

Make sure the mock server is running and accessible:

```bash
# Restart the mock server
pnpm mock:stop
pnpm mock:start
```

## CI/CD Integration

To run tests in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Install pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 9

- name: Install dependencies
  run: pnpm install

- name: Start Prism
  run: docker compose up -d
  working-directory: packages/nodejs-sdk

- name: Wait for Prism
  run: |
    timeout 30 sh -c 'until curl -f http://localhost:4010; do sleep 1; done'

- name: Run tests
  run: pnpm --filter kibamail test

- name: Stop Prism
  run: docker compose down
  working-directory: packages/nodejs-sdk
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Prism Documentation](https://stoplight.io/open-source/prism)
- [OpenAPI Specification](https://swagger.io/specification/)
