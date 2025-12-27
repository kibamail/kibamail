#!/bin/bash
set -e

echo "Creating databases..."

# Create logto database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE logto;
    GRANT ALL PRIVILEGES ON DATABASE logto TO postgres;
EOSQL

echo "Created database: logto"

# Create kibamail_dev database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE kibamail_dev;
    GRANT ALL PRIVILEGES ON DATABASE kibamail_dev TO postgres;
EOSQL

echo "Created database: kibamail_dev"

# Create kibamail_test database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE kibamail_test;
    GRANT ALL PRIVILEGES ON DATABASE kibamail_test TO postgres;
EOSQL

echo "Created database: kibamail_test"

# Create outpost user and database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER outpost WITH PASSWORD 'outpost';
    CREATE DATABASE outpost OWNER outpost;
    GRANT ALL PRIVILEGES ON DATABASE outpost TO outpost;
EOSQL

echo "Created user and database: outpost"

echo "All databases created successfully!"
