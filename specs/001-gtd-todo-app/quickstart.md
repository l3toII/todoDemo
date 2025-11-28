# Quickstart Guide: GTD Todo App

**Feature**: 001-gtd-todo-app
**Date**: 2025-11-28

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 24.0+ | Container runtime |
| Docker Compose | 2.20+ | Multi-container orchestration |
| Node.js | 20.x LTS | Frontend build tools |
| PHP | 8.2+ | Backend development (optional, for IDE) |
| Composer | 2.x | PHP dependency management |
| Xcode | 15+ | iOS development |

### Recommended IDE Extensions

**VS Code**:
- PHP Intelephense
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Docker

**Xcode**:
- SwiftLint (via Homebrew)

## Quick Start (5 minutes)

### 1. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd todoDemo

# Copy environment files
cp api/.env.example api/.env
cp web/.env.example web/.env

# Start all services
docker-compose up -d
```

### 2. Initialize Database

```bash
# Run migrations
docker-compose exec api php bin/console doctrine:migrations:migrate --no-interaction

# Seed default contexts
docker-compose exec api php bin/console app:seed:contexts
```

### 3. Access Applications

| Service | URL | Description |
|---------|-----|-------------|
| Web App | http://localhost:3000 | React frontend |
| API | http://localhost:8000/api/v1 | Symfony API |
| API Docs | http://localhost:8000/api/doc | OpenAPI documentation |
| MariaDB | localhost:3306 | Database (user: gtd, pass: gtd_dev) |
| Mailhog | http://localhost:8025 | Email testing |

## Project Structure

```
todoDemo/
├── api/                    # Symfony backend
│   ├── src/
│   │   ├── Controller/     # API endpoints
│   │   ├── Entity/         # Doctrine entities
│   │   ├── Repository/     # Data access
│   │   └── Service/        # Business logic
│   ├── config/
│   ├── migrations/
│   └── tests/
├── web/                    # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── features/       # Redux slices
│   │   ├── pages/          # Route pages
│   │   └── services/       # API client
│   └── tests/
├── ios/                    # iOS app
│   ├── GTDApp/
│   └── GTDAppTests/
├── infra/                  # Infrastructure
│   └── docker/
├── specs/                  # Feature specifications
│   └── 001-gtd-todo-app/
└── docker-compose.yml
```

## Development Workflows

### Backend Development (Symfony)

```bash
# Start services
docker-compose up -d api db

# Watch logs
docker-compose logs -f api

# Run PHP commands
docker-compose exec api php bin/console <command>

# Run tests
docker-compose exec api php bin/phpunit

# Run linter
docker-compose exec api vendor/bin/phpstan analyse

# Fix code style
docker-compose exec api vendor/bin/php-cs-fixer fix
```

### Frontend Development (React)

```bash
# Start with hot reload
cd web
npm install
npm run dev

# Or via Docker
docker-compose up -d web

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

### iOS Development

```bash
# Open in Xcode
open ios/GTDApp.xcodeproj

# Or via command line
cd ios
xcodebuild -scheme GTDApp -destination 'platform=iOS Simulator,name=iPhone 15' build

# Run tests
xcodebuild test -scheme GTDApp -destination 'platform=iOS Simulator,name=iPhone 15'
```

## Environment Configuration

### API (.env)

```env
# Database
DATABASE_URL=mysql://gtd:gtd_dev@db:3306/gtd_app?serverVersion=10.11.0-MariaDB

# JWT
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=your-passphrase

# Mail
MAILER_DSN=smtp://mailhog:1025

# Apple Sign-In
APPLE_CLIENT_ID=com.example.gtd
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
```

### Web (.env)

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APPLE_CLIENT_ID=com.example.gtd
```

## Common Tasks

### Create a New Migration

```bash
docker-compose exec api php bin/console make:migration
docker-compose exec api php bin/console doctrine:migrations:migrate
```

### Add a New API Endpoint

1. Create Controller in `api/src/Controller/`
2. Define route with attributes
3. Add request/response DTOs
4. Update OpenAPI spec in `specs/001-gtd-todo-app/contracts/openapi.yaml`
5. Write tests in `api/tests/Functional/`

### Add a New Redux Feature

1. Create feature folder in `web/src/features/<name>/`
2. Add slice with `createSlice`
3. Add to store in `web/src/store/index.ts`
4. Create components in feature folder
5. Write tests

### Generate JWT Keys

```bash
docker-compose exec api php bin/console lexik:jwt:generate-keypair
```

## Testing

### Run All Tests

```bash
# Backend
docker-compose exec api php bin/phpunit

# Frontend unit tests
cd web && npm test

# Frontend E2E
cd web && npm run test:e2e

# iOS
cd ios && xcodebuild test -scheme GTDApp -destination 'platform=iOS Simulator,name=iPhone 15'
```

### Test Coverage

```bash
# Backend
docker-compose exec api php bin/phpunit --coverage-html coverage/

# Frontend
cd web && npm run test:coverage
```

## Debugging

### API Logs

```bash
docker-compose logs -f api
```

### Database Access

```bash
docker-compose exec db mysql -u gtd -pgtd_dev gtd_app
```

### React DevTools

Install [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension.

### Redux DevTools

Install [Redux DevTools](https://github.com/reduxjs/redux-devtools) browser extension.

## Deployment

### Build Docker Images

```bash
# API
docker build -t gtd-api:latest -f infra/docker/api/Dockerfile .

# Web
docker build -t gtd-web:latest -f infra/docker/web/Dockerfile .
```

### CI/CD

See `.github/workflows/` for GitHub Actions pipelines:
- `ci.yml`: Runs on every push (lint, test, build)
- `cd.yml`: Deploys on merge to 001-gtd-todo-app/main

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Restart database
docker-compose restart db

# Check database logs
docker-compose logs db
```

### Clear Caches

```bash
# Symfony cache
docker-compose exec api php bin/console cache:clear

# Node modules
cd web && rm -rf node_modules && npm install
```

## Resources

- [Symfony Documentation](https://symfony.com/doc/current/index.html)
- [React Documentation](https://react.dev/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui)
- [GTD Methodology](https://gettingthingsdone.com/)
