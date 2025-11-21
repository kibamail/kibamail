# Kibamail Monorepo

This is a monorepo for the Kibamail platform, containing the web application and Node.js SDK.

## Structure

```
.
├── apps/
│   └── web/              # Next.js web application
├── packages/
│   └── nodejs-sdk/       # Official Kibamail Node.js SDK
├── pnpm-workspace.yaml   # pnpm workspace configuration
├── turbo.json            # Turborepo configuration
└── package.json          # Root package.json
```

## Tech Stack

- **Package Manager**: pnpm 9.15.4+
- **Build System**: Turborepo
- **Monorepo**: pnpm workspaces

## Prerequisites

- Node.js 18+
- pnpm 9+

## Getting Started

### Installation

```bash
# Install dependencies for all workspaces
pnpm install
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run specific workspace
pnpm --filter @repo/web dev
pnpm --filter kibamail dev
```

### Building

```bash
# Build all packages and apps
pnpm build

# Build specific workspace
pnpm --filter @repo/web build
pnpm --filter kibamail build
```

### Other Commands

```bash
# Run linting across all workspaces
pnpm lint

# Run type checking
pnpm type-check

# Clean all build artifacts
pnpm clean
```

## Workspaces

### Apps

#### @repo/web (apps/web)
The main Kibamail control plane Next.js application.

- **Port**: 18092
- **Tech**: Next.js 16, React 19, TypeScript, Prisma, PostgreSQL
- **Services**: Docker Compose with Postgres, Redis, RabbitMQ, Logto, Outpost, Garage S3

See [apps/web/README.md](apps/web/README.md) for more details.

### Packages

#### kibamail (packages/nodejs-sdk)
Official Node.js SDK for the Kibamail API.

- **Package**: `kibamail` on npm
- **Version**: 0.0.1-alpha.0
- **Build**: tsup (ESM + CJS)

See [packages/nodejs-sdk/README.md](packages/nodejs-sdk/README.md) for more details.

## Turborepo

This monorepo uses [Turborepo](https://turbo.build) for intelligent task orchestration and caching.

### Pipeline Tasks

- `build` - Build all packages and apps
- `dev` - Run development servers
- `lint` - Lint code
- `test` - Run tests
- `type-check` - TypeScript type checking

### Remote Caching

To enable remote caching, authenticate with Vercel:

```bash
pnpm dlx turbo login
pnpm dlx turbo link
```

## Migration from Bun

This project was migrated from Bun to pnpm/Node.js to better support the monorepo architecture with Turborepo.

Key changes:
- `bun` → `pnpm` for package management
- `bun run` → `pnpm` or `tsx` for running scripts
- Unified build system with Turborepo
- Workspace protocol for inter-package dependencies

## License

MIT
