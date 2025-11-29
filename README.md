# GTD Todo App

A modern Getting Things Done (GTD) application with multi-platform support (Web, iOS) and robust authentication system.

## Features

- User account management with email/password authentication
- Apple Sign-In integration
- JWT authentication with refresh token rotation
- Email verification and password reset flows
- GDPR-compliant account deletion
- Session timeout protection
- Feature flags for progressive rollout
- Real-time sync between platforms (< 5s delay)

## Tech Stack

### Backend (API)
- **PHP 8.2** with Symfony 7
- **Doctrine ORM** for database management
- **LexikJWTAuthenticationBundle** for JWT authentication
- **MariaDB 10.11** database
- **PHPUnit 10** for testing

### Frontend (Web)
- **React 18** with Vite
- **Redux Toolkit** for state management
- **React Router** for navigation

### Infrastructure
- **Docker** & Docker Compose for local development
- **GitHub Actions** for CI/CD
- **Nginx** as reverse proxy
- **MailHog** for email testing

## Prerequisites

- Docker Engine 24.0+ and Docker Compose 2.20+
- Git
- Make (optional, for convenience commands)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/l3toII/todoDemo.git
cd todoDemo
```

### 2. Configure Environment Variables

#### API Configuration

```bash
cd api
cp .env.example .env
```

Edit `api/.env` and configure:
- `APP_SECRET`: Generate with `php -r 'echo bin2hex(random_bytes(32));'`
- `DATABASE_URL`: Default should work for Docker setup
- `JWT_PASSPHRASE`: Generate with `openssl rand -base64 32`

#### Web Configuration

```bash
cd ../web
cp .env.example .env
```

Edit `web/.env` and configure:
- `VITE_API_URL`: Default `http://localhost:8000/api/v1` for local development
- `VITE_APPLE_CLIENT_ID`: Your Apple Sign-In client ID (if using Apple Sign-In)

### 3. Generate JWT Keys

The application uses RSA keys for JWT token signing. Generate them with:

```bash
cd api

# Create JWT directory
mkdir -p config/jwt

# Generate private key
openssl genpkey -algorithm RSA -out config/jwt/private.pem -pkeyopt rsa_keygen_bits:4096

# Generate public key
openssl rsa -pubout -in config/jwt/private.pem -out config/jwt/public.pem

# Set proper permissions (important for security)
chmod 600 config/jwt/private.pem
chmod 644 config/jwt/public.pem
```

### 4. Build and Start Docker Containers

From the project root:

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

This will start:
- **API** on http://localhost:8000
- **Web** on http://localhost:3000
- **MariaDB** on localhost:3306
- **MailHog UI** on http://localhost:8025

### 5. Install Dependencies

#### API Dependencies

```bash
docker compose -f infra/docker-compose.yml exec api composer install
```

#### Web Dependencies

```bash
docker compose -f infra/docker-compose.yml exec web npm install
```

### 6. Run Database Migrations

```bash
docker compose -f infra/docker-compose.yml exec api php bin/console doctrine:migrations:migrate --no-interaction
```

### 7. Verify Installation

Check that all services are healthy:

```bash
docker compose -f infra/docker-compose.yml ps
```

Test the API health endpoint:

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-28T12:00:00+00:00",
  "environment": "dev"
}
```

## Usage

### Starting the Application

```bash
# Start all services
docker compose -f infra/docker-compose.yml up -d

# View logs
docker compose -f infra/docker-compose.yml logs -f

# View specific service logs
docker compose -f infra/docker-compose.yml logs -f api
docker compose -f infra/docker-compose.yml logs -f web
```

### Stopping the Application

```bash
# Stop all services
docker compose -f infra/docker-compose.yml down

# Stop and remove volumes (WARNING: deletes database data)
docker compose -f infra/docker-compose.yml down -v
```

### Running Tests

#### API Tests

```bash
# Run all tests
docker compose -f infra/docker-compose.yml exec api composer test

# Run with coverage
docker compose -f infra/docker-compose.yml exec api vendor/bin/phpunit --coverage-html coverage

# Run specific test
docker compose -f infra/docker-compose.yml exec api vendor/bin/phpunit tests/Unit/Entity/UserTest.php
```

#### Web Tests

```bash
# Run all tests
docker compose -f infra/docker-compose.yml exec web npm test

# Run with coverage
docker compose -f infra/docker-compose.yml exec web npm run test:coverage

# Run in watch mode
docker compose -f infra/docker-compose.yml exec web npm run test:watch
```

### Code Quality

#### API Code Quality

```bash
# PHP-CS-Fixer (code style)
docker compose -f infra/docker-compose.yml exec api vendor/bin/php-cs-fixer fix --dry-run

# PHPStan (static analysis)
docker compose -f infra/docker-compose.yml exec api vendor/bin/phpstan analyse src

# Security audit
docker compose -f infra/docker-compose.yml exec api composer audit
```

#### Web Code Quality

```bash
# ESLint
docker compose -f infra/docker-compose.yml exec web npm run lint

# Prettier check
docker compose -f infra/docker-compose.yml exec web npm run format:check

# Fix formatting
docker compose -f infra/docker-compose.yml exec web npm run format
```

### Database Management

```bash
# Create a new migration
docker compose -f infra/docker-compose.yml exec api php bin/console doctrine:migrations:generate

# Run migrations
docker compose -f infra/docker-compose.yml exec api php bin/console doctrine:migrations:migrate

# Rollback last migration
docker compose -f infra/docker-compose.yml exec api php bin/console doctrine:migrations:migrate prev

# Check migration status
docker compose -f infra/docker-compose.yml exec api php bin/console doctrine:migrations:status

# Access database CLI
docker compose -f infra/docker-compose.yml exec db mysql -u gtd -pgtd_dev gtd_app
```

## Project Structure

```
todoDemo/
├── .github/
│   └── workflows/           # CI/CD pipelines
│       ├── ci.yml          # Continuous Integration
│       └── cd.yml          # Continuous Deployment
├── api/                    # Symfony API
│   ├── config/            # Configuration files
│   ├── migrations/        # Database migrations
│   ├── public/            # Web root (index.php)
│   ├── src/
│   │   ├── Controller/    # API controllers
│   │   ├── Entity/        # Doctrine entities
│   │   ├── Repository/    # Data repositories
│   │   ├── Service/       # Business logic services
│   │   └── EventSubscriber/ # Event listeners
│   └── tests/
│       ├── Unit/          # Unit tests
│       └── Functional/    # Functional tests
├── web/                   # React frontend
│   ├── public/           # Static assets
│   └── src/
│       ├── components/   # React components
│       ├── pages/        # Page components
│       ├── store/        # Redux store
│       └── services/     # API services
├── infra/
│   ├── docker/           # Dockerfiles
│   │   ├── api/         # API container config
│   │   └── web/         # Web container config
│   └── docker-compose.yml
├── docs/                 # Documentation
│   └── deployment.md    # Deployment procedures
└── specs/               # Feature specifications
    └── 001-gtd-todo-app/
```

## API Endpoints

All API endpoints are prefixed with `/api/v1`:

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - Email/password login
- `POST /auth/apple` - Apple Sign-In
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and revoke token
- `GET /auth/me` - Get current user info

### Email Verification
- `POST /auth/verify-email` - Verify email with token
- `POST /auth/resend-verification` - Resend verification email

### Password Management
- `POST /auth/password/forgot` - Request password reset
- `POST /auth/password/reset` - Reset password with token

### Account Management
- `GET /account` - Get account details
- `PATCH /account` - Update account settings
- `DELETE /account` - Delete account (GDPR)

### Health Check
- `GET /health` - API health status

## Email Testing

MailHog captures all emails sent by the application in development:

1. Open http://localhost:8025 in your browser
2. Register a new user in the app
3. Check MailHog for the verification email
4. Click the verification link or copy the token

## Apple Sign-In Configuration

To enable Apple Sign-In:

1. **Create an Apple Developer Account** and register your app
2. **Generate a Service ID** and private key
3. **Configure the API** with your credentials in `api/.env`:
   ```
   APPLE_CLIENT_ID=com.example.gtd
   APPLE_TEAM_ID=YOUR_TEAM_ID
   APPLE_KEY_ID=YOUR_KEY_ID
   APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_KEYID.p8
   ```
4. **Configure the Web app** in `web/.env`:
   ```
   VITE_APPLE_CLIENT_ID=com.example.gtd
   ```

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker compose -f infra/docker-compose.yml logs

# Rebuild containers
docker compose -f infra/docker-compose.yml down
docker compose -f infra/docker-compose.yml build --no-cache
docker compose -f infra/docker-compose.yml up -d
```

### Database connection errors

```bash
# Check database is running
docker compose -f infra/docker-compose.yml ps db

# Restart database
docker compose -f infra/docker-compose.yml restart db

# Check database logs
docker compose -f infra/docker-compose.yml logs db
```

### JWT authentication fails

```bash
# Verify JWT keys exist
ls -la api/config/jwt/

# Regenerate keys if needed (see Installation step 3)

# Check JWT_PASSPHRASE in api/.env matches
```

### Permission errors

```bash
# Fix permissions on JWT keys
chmod 600 api/config/jwt/private.pem
chmod 644 api/config/jwt/public.pem

# Fix permissions on var directory
docker compose -f infra/docker-compose.yml exec api chown -R www-data:www-data var/
```

### Tests failing

```bash
# Make sure test database is configured
# Check api/.env.test or api/phpunit.xml

# Clear test cache
docker compose -f infra/docker-compose.yml exec api php bin/console cache:clear --env=test

# Run migrations for test environment
docker compose -f infra/docker-compose.yml exec api php bin/console doctrine:migrations:migrate --no-interaction --env=test
```

## Development Workflow

### Making Changes

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run tests: `composer test` and `npm test`
4. Run code quality checks (see Code Quality section)
5. Commit your changes following conventional commits
6. Push and create a Pull Request

### Git Commit Convention

```
feat(scope): Add new feature
fix(scope): Fix a bug
docs(scope): Update documentation
test(scope): Add or update tests
refactor(scope): Refactor code
chore(scope): Maintenance tasks
```

Examples:
- `feat(auth): Add password reset functionality`
- `fix(api): Resolve JWT token expiration issue`
- `docs(readme): Update installation instructions`

## Deployment URLs

### Production
- **Web App**: https://gtd-web-prod.onrender.com
- **API**: https://gtd-api-prod.onrender.com
- **Health Check**: https://gtd-api-prod.onrender.com/api/health

### Staging
- **Web App**: https://gtd-web-staging.onrender.com
- **API**: https://gtd-api-staging.onrender.com
- **Health Check**: https://gtd-api-staging.onrender.com/api/health

## CI/CD

### Continuous Integration

Every push and pull request triggers:
- **API**: PHP lint, PHPStan, PHPUnit, security audit
- **Web**: ESLint, Prettier, Jest, build check, security audit
- **Coverage**: Reports sent to Codecov
- **SonarCloud**: Code quality and security analysis

### Continuous Deployment (Render)

- **Staging**: Automatically deploys from `001-gtd-todo-app` branch
- **Production**: Deploys from `main` branch or version tags (e.g., `v1.0.0`)

### Required GitHub Secrets

For Render deployment, configure these secrets in your repository:
- `SONAR_TOKEN`: SonarCloud authentication token
- `RENDER_API_KEY`: Render API key for deployments
- `RENDER_SERVICE_ID_API_PROD`: Render service ID for production API
- `RENDER_SERVICE_ID_API_STAGING`: Render service ID for staging API
- `RENDER_SERVICE_ID_WEB_PROD`: Render service ID for production Web
- `RENDER_SERVICE_ID_WEB_STAGING`: Render service ID for staging Web

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

Please ensure:
- All tests pass
- Code follows project conventions
- Commit messages follow conventional commits
- PR description clearly explains the changes

## License

Proprietary - All rights reserved

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation in `/docs`
- Review the specs in `/specs/001-gtd-todo-app`

## Roadmap

- [x] **Sprint 0**: Infrastructure setup (CI/CD, Docker, Render deployment)
- [x] **P1**: User Account Management (Backend + Frontend)
- [ ] **P2**: Capture Ideas and Tasks (Inbox)
- [ ] **P3**: Clarify and Process Tasks
- [ ] **P4**: Organize with Contextual Lists
- [ ] **P5**: Project Management
- [ ] **P6**: Weekly Review
- [ ] **P7**: Calendar and Deadlines
