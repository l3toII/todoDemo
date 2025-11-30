# Testing Guide

## Database Strategy

This project uses **MariaDB 10.11** consistently across all environments:

| Environment | Database Type | Location | Configuration |
|-------------|---------------|----------|---------------|
| **Local Development** | MariaDB 10.11 | Docker container | `infra/docker-compose.yml` |
| **Local Tests** | MariaDB 10.11 | Docker container | `phpunit.xml.dist` |
| **GitHub Actions CI** | MariaDB 10.11 | GitHub service container | `.github/workflows/ci.yml` |
| **Staging (Render)** | MySQL 8.0 | Render managed | `render.yaml` |
| **Production (Render)** | MySQL 8.0 | Render managed | `render.yaml` |

> **Note**: Render uses MySQL 8.0 (compatible with MariaDB) as their managed database service.

## Running Tests Locally

### Prerequisites

1. **Start Docker containers** (includes MariaDB):
   ```bash
   docker-compose -f infra/docker-compose.yml up -d
   ```

2. **Create test database and user** (one-time setup):
   ```bash
   docker exec gtd_db mysql -u root -proot_password -e "CREATE DATABASE IF NOT EXISTS gtd; CREATE DATABASE IF NOT EXISTS gtd_test; GRANT ALL PRIVILEGES ON gtd.* TO 'gtd_test'@'%' IDENTIFIED BY 'gtd_test'; GRANT ALL PRIVILEGES ON gtd_test.* TO 'gtd_test'@'%'; FLUSH PRIVILEGES;"
   ```

   > **Why `gtd` and `gtd_test`?** Doctrine automatically adds `_test` suffix to the database name in test environment (see `config/packages/doctrine.yaml`), so `gtd` becomes `gtd_test`.

3. **Run migrations** on test database:
   ```bash
   DATABASE_URL="mysql://gtd_test:gtd_test@127.0.0.1:3306/gtd?serverVersion=10.11.0-MariaDB" php bin/console doctrine:migrations:migrate --env=test --no-interaction
   ```

   > **Note**: We override DATABASE_URL because the default `.env` uses Docker hostname `db` which won't work from the host machine.

### Running Tests

```bash
# Run all tests
composer test

# Run only unit tests
composer test:unit

# Run only functional tests
composer test:functional

# Run tests with coverage report
composer test:coverage
# Coverage report will be in var/coverage/index.html
```

### Alternative: Direct PHPUnit

```bash
# All tests
./bin/phpunit

# Specific test suite
./bin/phpunit --testsuite="Unit Tests"
./bin/phpunit --testsuite="Functional Tests"

# Specific test file
./bin/phpunit tests/Unit/Entity/UserTest.php

# Specific test method
./bin/phpunit --filter testSave tests/Unit/Repository/UserRepositoryTest.php
```

## Test Database Reset

If you need to reset the test database:

```bash
# Drop and recreate
php bin/console doctrine:schema:drop --env=test --force
php bin/console doctrine:migrations:migrate --env=test --no-interaction
```

## Continuous Integration (GitHub Actions)

Tests run automatically on:
- Push to `main`, `develop`, or `feat/**` branches
- Pull requests to `main` or `develop`

The CI pipeline:
1. Spins up a MariaDB 10.11 service container
2. Creates test database `gtd_test`
3. Runs migrations
4. Executes all PHPUnit tests
5. Generates code coverage report

See `.github/workflows/ci.yml` for full configuration.

## Test Structure

```
tests/
├── Unit/               # Unit tests (isolated, no dependencies)
│   ├── Entity/        # Entity tests
│   ├── Repository/    # Repository tests
│   └── Service/       # Service tests
├── Integration/       # Integration tests (multiple components)
│   └── EmailServiceTest.php
├── Functional/        # Functional tests (full HTTP stack)
│   └── AuthTest.php
└── bootstrap.php      # Test bootstrap
```

## Common Issues

### "No such table" errors
- Make sure Docker is running: `docker-compose -f infra/docker-compose.yml ps`
- Check test database exists: `docker exec gtd_db mysql -u gtd -pgtd_dev -e "SHOW DATABASES;"`
- Run migrations: `php bin/console doctrine:migrations:migrate --env=test --no-interaction`

### "framework.test not set to true"
- Verify `APP_ENV=test` in `phpunit.xml.dist`
- Check `config/packages/test/framework.yaml` exists and contains `test: true`

### MailHog connection warnings
- These are expected when MailHog is not running
- Emails will fail gracefully, but tests will still pass
- To eliminate warnings, ensure MailHog is running: `docker-compose -f infra/docker-compose.yml up -d mailhog`

## Database Configuration Files

- **phpunit.xml.dist**: Test environment configuration (MariaDB @ 127.0.0.1:3306)
- **.env.test**: Overrides for test environment
- **.env**: Local development configuration
- **config/packages/doctrine.yaml**: Doctrine configuration with `_test` suffix for test databases
