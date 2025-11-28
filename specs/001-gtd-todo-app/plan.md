# Implementation Plan: GTD Todo App

**Branch**: `001-gtd-todo-app` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-gtd-todo-app/spec.md`

## Summary

A GTD (Getting Things Done) productivity application with web and iOS clients. The system enables users to capture, clarify, organize, and review tasks following the GTD methodology. Key features include inbox capture, contextual task organization, project management, weekly reviews, and cross-device synchronization.

**Technical Approach**: React/Redux frontend with Tailwind CSS for web, Symfony API backend with MariaDB for persistence. iOS app will consume the same API. Real-time sync via polling or WebSockets for small scale deployment.

## Technical Context

**Language/Version**:
- Backend: PHP 8.2+ (Symfony 7.x)
- Frontend Web: TypeScript 5.x (React 18.x)
- iOS: Swift 5.9+

**Primary Dependencies**:
- Backend: Symfony 7, Doctrine ORM, LexikJWTAuthenticationBundle, NelmioCorsBundle
- Frontend: React 18, Redux Toolkit, React Router, Tailwind CSS 3.x, Axios
- iOS: SwiftUI, Combine, KeychainAccess

**Storage**: MariaDB 10.11+ (relational database for ACID compliance and GTD entity relationships)

**Testing**:
- Backend: PHPUnit, Symfony Test Framework
- Frontend: Jest, React Testing Library, Cypress (E2E)
- iOS: XCTest, XCUITest

**Target Platform**:
- Web: Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS: iOS 15+
- Backend: Linux server (containerized)

**Project Type**: Web + Mobile (API-first architecture)

**Performance Goals**:
- API p95 < 200ms, p99 < 500ms
- Sync completion < 5 seconds
- Capture action < 5 seconds
- LCP < 2.5s, FID < 100ms, CLS < 0.1

**Constraints**:
- Small scale: < 1,000 users, < 10,000 tasks
- Offline-capable (local storage with sync)
- GDPR compliant (immediate data deletion)
- Bundle size < 200KB gzipped

**Scale/Scope**:
- 1,000 concurrent users maximum
- 10,000 total tasks maximum
- 7 user stories (P1-P7)
- 28 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | Linters (ESLint, PHPStan) + formatters (Prettier, PHP-CS-Fixer) planned |
| II. Testing Standards | ✅ PASS | Unit (PHPUnit, Jest), Integration, E2E (Cypress, XCUITest) planned |
| III. User Experience | ✅ PASS | Mobile-first design, Tailwind for responsive, WCAG 2.1 AA target |
| IV. Performance | ✅ PASS | Targets defined, monitoring planned |
| V. Git Flow Discipline | ✅ PASS | Branch naming follows convention |
| VI. CI/CD Pipeline | ⚠️ PENDING | Must be set up before feature work (Infrastructure-First) |
| VII. Atomic Commits | ✅ PASS | Conventional commits enforced |
| VIII. Sprint & Task Organization | ✅ PASS | User stories prioritized P1-P7, tasks will be generated |
| IX. Documentation as Code | ✅ PASS | spec.md, plan.md, tasks.md in Git |
| X. Security by Design | ✅ PASS | JWT auth, input validation, env secrets |
| XI. Observability | ✅ PASS | Structured logging (Monolog JSON), metrics planned |
| XII. Dependency Management | ✅ PASS | composer.lock, package-lock.json |
| XIII. Feature Flags | ✅ PASS | Will implement for progressive rollout |
| XIV. API Versioning | ✅ PASS | URL path versioning: /api/v1/* |
| XV. Infrastructure-First | ⚠️ BLOCKING | CI/CD MUST be operational before feature development |

**BLOCKING ITEMS**:
- Infrastructure setup (CI/CD pipeline, staging/production environments) MUST be completed as Phase 0 prerequisite per Constitution XV.

## Project Structure

### Documentation (this feature)

```text
specs/001-gtd-todo-app/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
│   └── openapi.yaml
├── checklists/          # Quality checklists
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# API Backend (Symfony)
api/
├── src/
│   ├── Controller/      # API controllers
│   ├── Entity/          # Doctrine entities
│   ├── Repository/      # Data access layer
│   ├── Service/         # Business logic
│   ├── EventSubscriber/ # Event handlers
│   └── Security/        # Auth voters, JWT handlers
├── config/              # Symfony configuration
├── migrations/          # Database migrations
└── tests/
    ├── Unit/
    ├── Integration/
    └── Functional/

# Web Frontend (React)
web/
├── src/
│   ├── components/      # Reusable UI components
│   ├── features/        # Feature-based modules (Redux slices)
│   │   ├── auth/
│   │   ├── inbox/
│   │   ├── tasks/
│   │   ├── projects/
│   │   ├── contexts/
│   │   ├── review/
│   │   └── calendar/
│   ├── pages/           # Route pages
│   ├── services/        # API client
│   ├── store/           # Redux store config
│   └── utils/           # Helpers
├── public/
└── tests/
    ├── unit/
    └── e2e/

# iOS App (Swift)
ios/
├── GTDApp/
│   ├── Features/        # Feature modules
│   │   ├── Auth/
│   │   ├── Inbox/
│   │   ├── Tasks/
│   │   ├── Projects/
│   │   ├── Contexts/
│   │   ├── Review/
│   │   └── Calendar/
│   ├── Core/            # Shared services
│   │   ├── Networking/
│   │   ├── Storage/
│   │   └── Sync/
│   ├── UI/              # Shared UI components
│   └── Resources/
└── GTDAppTests/
    ├── Unit/
    └── UI/

# Infrastructure
infra/
├── docker/              # Docker configurations
│   ├── api/
│   ├── web/
│   └── db/
└── docker-compose.yml   # Local development

# CI/CD (repository root)
.github/
└── workflows/           # GitHub Actions pipelines
    ├── ci.yml
    └── cd.yml
```

**Structure Decision**: Web + Mobile (Option 3) with API-first architecture. Three main components: `api/` (Symfony backend), `web/` (React frontend), `ios/` (Swift app). All share the same API contracts defined in `specs/001-gtd-todo-app/contracts/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 3 projects (api, web, ios) | Multi-platform requirement (web + iOS) from spec | Single project cannot serve both web and native iOS |
| Redux for state | Offline sync + complex GTD state transitions | Local state insufficient for offline-first sync |
| JWT authentication | Stateless API for mobile + web clients | Session-based would require sticky sessions |
