# Docker Setup

This directory contains Docker configuration for local development.

## PostgreSQL Database

The `docker-compose.yml` file sets up a PostgreSQL 18 database with four databases:

- `logto` - Logto authentication database
- `dev` - Application development database
- `test` - Application testing database
- `test-e2e` - End-to-end testing database

### Usage

**Start the database:**
```bash
docker compose up -d
```

**Stop the database:**
```bash
docker compose down
```

**Stop and remove volumes (deletes all data):**
```bash
docker compose down -v
```

**View logs:**
```bash
docker compose logs -f postgres
```

**Access PostgreSQL CLI:**
```bash
docker compose exec postgres psql -U postgres -d dev
```

### Database Connection Strings

After starting the container, you can connect to the databases using:

- **Logto**: `postgresql://postgres:postgres@localhost:15432/logto`
- **Dev**: `postgresql://postgres:postgres@localhost:15432/dev`
- **Test**: `postgresql://postgres:postgres@localhost:15432/test`
- **Test E2E**: `postgresql://postgres:postgres@localhost:15432/test-e2e`

### Credentials

- **Username**: `postgres`
- **Password**: `postgres`
- **Port**: `5432`

⚠️ **Note**: These are default credentials for local development only. Never use these in production!
