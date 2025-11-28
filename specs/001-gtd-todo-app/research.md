# Research: GTD Todo App

**Feature**: 001-gtd-todo-app
**Date**: 2025-11-28
**Status**: Complete

## Technology Stack Decisions

### 1. Backend Framework: Symfony 7

**Decision**: Use Symfony 7.x with PHP 8.2+

**Rationale**:
- Mature, well-documented framework with strong ecosystem
- Doctrine ORM provides excellent MariaDB integration
- Built-in security component for authentication/authorization
- API Platform compatible for rapid API development
- Strong typing with PHP 8.2 attributes

**Alternatives Considered**:
- Laravel: More opinionated, less suitable for API-first architecture
- API Platform standalone: Considered, but Symfony provides more flexibility
- Node.js/Express: Team expertise is PHP-based

**Key Packages**:
- `symfony/framework-bundle`: Core framework
- `doctrine/orm`: Database abstraction
- `lexik/jwt-authentication-bundle`: JWT token management
- `nelmio/cors-bundle`: CORS handling for mobile/web clients
- `symfony/validator`: Input validation
- `symfony/serializer`: JSON serialization

### 2. Frontend Framework: React 18 + Redux Toolkit

**Decision**: React 18 with Redux Toolkit for state management

**Rationale**:
- React 18 concurrent features for better UX
- Redux Toolkit simplifies Redux boilerplate
- RTK Query for API caching and sync
- Excellent TypeScript support
- Large ecosystem for GTD-specific UI patterns

**Alternatives Considered**:
- Vue 3: Valid choice, but React has broader ecosystem
- Svelte: Less mature for complex state management
- Angular: Heavier framework than needed for this scale

**Key Packages**:
- `@reduxjs/toolkit`: State management
- `react-router-dom`: Routing
- `axios`: HTTP client (with interceptors for JWT)
- `@tanstack/react-query`: Server state management (alternative to RTK Query)
- `tailwindcss`: Utility-first CSS
- `@headlessui/react`: Accessible UI components

### 3. Database: MariaDB 10.11+

**Decision**: MariaDB for relational data storage

**Rationale**:
- GTD entities have clear relationships (User → Tasks → Projects)
- ACID compliance for data integrity
- Doctrine ORM has excellent MariaDB support
- Small scale (< 10k tasks) doesn't require NoSQL flexibility
- Open source, MySQL-compatible

**Alternatives Considered**:
- PostgreSQL: Excellent choice, but MariaDB was specified
- MongoDB: Overkill for structured GTD data
- SQLite: Not suitable for multi-user concurrent access

**Schema Considerations**:
- Use UUIDs for primary keys (offline-first sync compatibility)
- Soft deletes for audit trail (except for GDPR deletion requests)
- Timestamps for all entities (created_at, updated_at)
- JSON columns for flexible metadata (task notes, review notes)

### 4. Authentication: JWT + Apple Sign-In

**Decision**: JWT tokens with email/password and Apple Sign-In

**Rationale**:
- Stateless authentication works across web and iOS
- Apple Sign-In required for iOS App Store
- JWT allows offline token validation
- Refresh token rotation for security

**Implementation Details**:
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry, rotated on use
- Apple Sign-In: Use Sign In with Apple JS for web, native for iOS
- Store refresh token securely (HttpOnly cookie web, Keychain iOS)

**Packages**:
- Backend: `lexik/jwt-authentication-bundle`
- Web: Custom auth context with Axios interceptors
- iOS: `AuthenticationServices` framework, `KeychainAccess`

### 5. Offline Support Strategy

**Decision**: Local-first with background sync

**Rationale**:
- GTD capture must work instantly, even offline
- Spec requires 24h offline operation
- Small data volume allows full local cache

**Implementation**:
- **Web**: IndexedDB via Dexie.js for local storage
- **iOS**: Core Data with CloudKit-style sync
- **Sync Protocol**:
  1. Each entity has `version` (incremented on change) and `updated_at`
  2. Client sends local changes with version numbers
  3. Server returns conflicts if version mismatch
  4. Last-write-wins with version history for recovery
  5. Deleted items marked with `deleted_at`, purged after sync confirmation

### 6. Real-time Sync Approach

**Decision**: Polling with exponential backoff (MVP), WebSocket upgrade path

**Rationale**:
- Small scale (< 1,000 users) doesn't require WebSocket complexity initially
- Polling every 30s when app is active
- WebSocket can be added later for < 5s sync requirement
- Simpler infrastructure (no WebSocket server needed)

**Implementation**:
- Poll `/api/v1/sync/changes?since={timestamp}` endpoint
- Exponential backoff on errors (1s, 2s, 4s, 8s, max 60s)
- Immediate sync on user action (capture, complete task)
- Background sync for iOS using BGTaskScheduler

### 7. iOS Architecture

**Decision**: SwiftUI + Combine with feature modules

**Rationale**:
- SwiftUI for modern, declarative UI
- Combine for reactive data flow (mirrors Redux patterns)
- Feature-based modules for code organization
- Shared networking and storage layers

**Key Frameworks**:
- SwiftUI: UI layer
- Combine: Reactive programming
- Core Data: Local persistence
- URLSession: Networking
- BackgroundTasks: Background sync

### 8. CI/CD Pipeline (Infrastructure-First)

**Decision**: GitHub Actions for CI/CD

**Rationale**:
- Native GitHub integration
- Free tier sufficient for small scale
- Matrix builds for PHP + Node + Swift
- Environment secrets management

**Pipeline Stages**:

**CI (on every push)**:
1. PHP: `composer install`, PHPStan, PHP-CS-Fixer, PHPUnit
2. Node: `npm ci`, ESLint, Prettier, Jest, build
3. iOS: `xcodebuild test` (on macOS runner)
4. Security: `composer audit`, `npm audit`

**CD (on merge to 001-gtd-todo-app/main)**:
1. Build Docker images (api, web)
2. Push to container registry
3. Deploy to staging (001-gtd-todo-app) / production (main)
4. Run E2E tests against staging
5. Health check verification
6. Rollback on failure

### 9. Hosting & Infrastructure

**Decision**: Docker-based deployment (platform-agnostic)

**Rationale**:
- Containerization for consistency
- Easy local development with docker-compose
- Platform-agnostic (can deploy to any Docker host)
- Small scale doesn't require Kubernetes

**Components**:
- API: PHP-FPM container + Nginx
- Web: Static files served via CDN/Nginx
- DB: MariaDB container (or managed service)
- iOS: App Store distribution

**Environment Strategy**:
- Local: docker-compose with hot reload
- Staging: Deployed on 001-gtd-todo-app merge
- Production: Manual trigger on main merge

### 10. Feature Flags Implementation

**Decision**: Simple database-backed feature flags

**Rationale**:
- Small scale doesn't require dedicated feature flag service
- Database table for flags with user/percentage targeting
- Admin API for flag management

**Schema**:
```sql
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type ENUM('release', 'experiment', 'ops', 'permission'),
    enabled BOOLEAN DEFAULT FALSE,
    percentage INT DEFAULT 0,
    user_ids JSON,
    created_at TIMESTAMP,
    expires_at TIMESTAMP
);
```

## Best Practices Research

### Symfony API Best Practices

1. **Use DTOs** for request/response instead of exposing entities
2. **Validation groups** for different operations (create, update)
3. **API versioning** via URL path (/api/v1/*)
4. **Error responses** follow RFC 7807 Problem Details format
5. **Pagination** using cursor-based pagination for sync efficiency
6. **Rate limiting** via Symfony RateLimiter component

### React/Redux Best Practices

1. **Feature-based folder structure** (not type-based)
2. **RTK createSlice** for reducers and actions
3. **Normalized state** with entity adapters
4. **Optimistic updates** for capture actions
5. **Error boundaries** for graceful degradation
6. **Code splitting** by route for bundle size

### GTD-Specific Patterns

1. **Inbox zero** encouragement via badge counts
2. **Quick capture** always accessible (FAB, keyboard shortcut)
3. **Context filtering** as primary navigation
4. **2-minute rule** timer integration
5. **Weekly review** wizard with progress tracking
6. **Next action** automatic promotion on task completion

## Unresolved Items

None - all technical decisions made based on spec clarifications and user input.
