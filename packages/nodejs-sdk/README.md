# Kibamail Node.js SDK

Official Node.js SDK for the [Kibamail API](https://kibamail.com).

## Installation

```bash
npm install kibamail
# or
yarn add kibamail
# or
pnpm add kibamail
# or
bun add kibamail
```

## Usage

### Initialize the client

```typescript
import { Kibamail } from 'kibamail';

const kibamail = new Kibamail('sk_your_api_key_here');
```

### Custom configuration

```typescript
const kibamail = new Kibamail('sk_your_api_key_here', {
  baseURL: 'https://api.kibamail.com', // Optional: override API base URL
});
```

### List contacts

```typescript
const { data, error } = await kibamail.contacts.list();

if (error) {
  console.error('Error:', error);
  return;
}

console.log('Contacts:', data);
```

## API Reference

Full API documentation is available at [https://docs.kibamail.com](https://docs.kibamail.com).

### Authentication

All API requests require authentication using an API key. You can create API keys in your [Kibamail dashboard](https://app.kibamail.com).

Pass your API key when initializing the client:

```typescript
const kibamail = new Kibamail('sk_your_api_key_here');
```

### Error Handling

The SDK uses the standard error format returned by the Kibamail API:

```typescript
const { data, error } = await kibamail.contacts.list();

if (error) {
  // Error structure:
  // {
  //   error: {
  //     type: 'authentication_error' | 'invalid_request_error' | 'validation_error' | 'rate_limit_error' | 'api_error',
  //     code: 'INVALID_API_KEY' | 'RESOURCE_NOT_FOUND' | ...,
  //     message: 'Human-readable error message',
  //     requestId: 'req_...',
  //     validationErrors?: [...], // For validation errors
  //   }
  // }
  console.error(`[${error.code}] ${error.message}`);
}
```

## TypeScript Support

The SDK is written in TypeScript and includes comprehensive type definitions generated from the OpenAPI specification. All API responses, request parameters, and error types are fully typed.

```typescript
import type { paths } from 'kibamail/schema';

// All types from the API are available
type Contact = paths['/v1/contacts']['get']['responses']['200']['content']['application/json']['data'][0];
```

## Requirements

- Node.js 18 or higher
- TypeScript 5 or higher (for TypeScript projects)

## Development

This package is part of the Kibamail monorepo. For contributors and developers:

### Monorepo Setup

From the monorepo root:

```bash
pnpm install
```

### Testing

See [tests/README.md](./tests/README.md) for detailed testing documentation.

```bash
# Start mock API server
pnpm --filter kibamail mock:start

# Run tests
pnpm --filter kibamail test

# Stop mock server
pnpm --filter kibamail mock:stop
```

### Type Generation

Generate TypeScript types from the OpenAPI spec:

```bash
pnpm --filter kibamail schema:generate
```

### Building

```bash
pnpm --filter kibamail build
```

### Publishing

```bash
pnpm --filter kibamail publish:alpha
```

## Support

- **Documentation:** [https://docs.kibamail.com](https://docs.kibamail.com)
- **API Reference:** [https://api-docs.kibamail.com](https://api-docs.kibamail.com)
- **Issues:** [GitHub Issues](https://github.com/kibamail/kibamail-nodejs/issues)
- **Email:** support@kibamail.com

## License

MIT
