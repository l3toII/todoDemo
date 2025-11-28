# Tasks: GTD Todo App

**Feature**: 001-gtd-todo-app
**Date**: 2025-11-28
**Status**: Ready for Development
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Overview

Total tasks: 119
- Sprint 0 (Infrastructure): 16 tasks
- P1 User Account Management: 21 tasks
- P2 Capture Ideas and Tasks: 10 tasks
- P3 Clarify and Process: 8 tasks
- P4 Organize with Contexts: 13 tasks
- P5 Project Management: 10 tasks
- P6 Weekly Review: 8 tasks
- P7 Calendar and Deadlines: 8 tasks
- Cross-Cutting (Sync & Offline): 5 tasks
- Integration Tests: 6 tasks
- Edge Cases: 5 tasks
- Polish & Finalization: 9 tasks

> **Note**: iOS app (FR-027) is descoped to Phase 2. Web MVP delivers all P1-P7 features first. iOS tasks will be added in a separate planning cycle after web MVP completion.

---

## Sprint 0: Infrastructure Setup (Constitution XV - BLOCKING)

**BLOCKING**: No `feat/*` branches until ALL Sprint 0 tasks complete.

### Phase 0.1: Development Environment

- [ ] [S0-001] Setup Docker Compose configuration for local development `infra/docker-compose.yml`
- [ ] [S0-002] Create API Dockerfile with PHP 8.2-FPM and Nginx `infra/docker/api/Dockerfile`
- [ ] [S0-003] Create Web Dockerfile for React development `infra/docker/web/Dockerfile`
- [ ] [S0-004] Create MariaDB Docker configuration with initialization scripts `infra/docker/db/`
- [ ] [S0-005] Create environment template files `api/.env.example`, `web/.env.example`
- [ ] [S0-005b] Create FeatureFlag entity and migration `api/src/Entity/FeatureFlag.php`, `api/migrations/Version009CreateFeatureFlagsTable.php`

### Phase 0.2: CI Pipeline

- [ ] [S0-006] Create GitHub Actions CI workflow for API (PHP lint, PHPStan, PHPUnit) `.github/workflows/ci.yml`
- [ ] [S0-007] Add CI steps for Web (ESLint, Prettier, Jest, build) `.github/workflows/ci.yml`
- [ ] [S0-008] Add security scanning (composer audit, npm audit) `.github/workflows/ci.yml`
- [ ] [S0-009] Configure code coverage reporting (Codecov or similar) `.github/workflows/ci.yml`
- [ ] [S0-010] Add branch protection rules for main and develop `Repository Settings`

### Phase 0.3: CD Pipeline

- [ ] [S0-011] Create GitHub Actions CD workflow for staging deployment `.github/workflows/cd.yml`
- [ ] [S0-012] Create GitHub Actions CD workflow for production deployment `.github/workflows/cd.yml`
- [ ] [S0-013] Configure health check endpoints and monitoring `/api/health`
- [ ] [S0-014] Document rollback procedures `docs/deployment.md`
- [ ] [S0-015] Verify complete infrastructure checklist passes (Constitution XV)

---

## P1: User Account Management (FR-001 to FR-006b)

**User Story**: As a user, I want to create an account, log in securely, and manage my preferences so that I can access my data across all my devices.

### Phase 1.1: Backend - User Entity & Repository

- [ ] [P1-001] [P1] [Story-1] Create User Doctrine entity with all fields from data-model.md `api/src/Entity/User.php`
- [ ] [P1-002] [P1] [Story-1] Create User repository with CRUD operations `api/src/Repository/UserRepository.php`
- [ ] [P1-003] [P1] [Story-1] Create database migration for users table `api/migrations/Version001CreateUsersTable.php`
- [ ] [P1-004] [P1] [Story-1] Write unit tests for User entity validation `api/tests/Unit/Entity/UserTest.php`

### Phase 1.2: Backend - Authentication

- [ ] [P1-005] [P1] [Story-1] Configure LexikJWTAuthenticationBundle with key generation `api/config/packages/lexik_jwt_authentication.yaml`
- [ ] [P1-006] [P1] [Story-1] Create AuthController with login endpoint `api/src/Controller/AuthController.php`
- [ ] [P1-007] [P1] [Story-1] Implement refresh token rotation with RefreshToken entity `api/src/Entity/RefreshToken.php`
- [ ] [P1-007b] [P1] [Story-1] Create database migration for refresh_tokens table `api/migrations/Version008CreateRefreshTokensTable.php`
- [ ] [P1-008] [P1] [Story-1] Implement Apple Sign-In verification service `api/src/Service/AppleSignInService.php`
- [ ] [P1-009] [P1] [Story-1] Create registration endpoint with email verification `api/src/Controller/RegistrationController.php`
- [ ] [P1-010] [P1] [Story-1] Create password reset flow with secure tokens `api/src/Controller/PasswordResetController.php`
- [ ] [P1-011] [P1] [Story-1] Write functional tests for all auth endpoints `api/tests/Functional/AuthTest.php`

### Phase 1.2b: Backend - Session & Account Management (FR-006, FR-006b)

- [ ] [P1-018] [P1] [Story-1] Implement session timeout with auto-logout after inactivity `api/src/EventSubscriber/SessionTimeoutSubscriber.php`
- [ ] [P1-019] [P1] [Story-1] Create account deletion endpoint with cascade delete (GDPR) `api/src/Controller/AccountController.php`
- [ ] [P1-020] [P1] [Story-1] Implement hard delete service for all user data `api/src/Service/AccountDeletionService.php`

### Phase 1.3: Frontend - Auth Module

- [ ] [P1-012] [P1] [Story-1] Create auth Redux slice with login/logout/register actions `web/src/features/auth/authSlice.ts`
- [ ] [P1-013] [P1] [Story-1] Create LoginPage component with form validation `web/src/pages/LoginPage.tsx`
- [ ] [P1-014] [P1] [Story-1] Create RegisterPage component with email verification flow `web/src/pages/RegisterPage.tsx`
- [ ] [P1-015] [P1] [Story-1] Implement Apple Sign-In button for web `web/src/components/AppleSignInButton.tsx`
- [ ] [P1-016] [P1] [Story-1] Create protected route wrapper with auth guard `web/src/components/ProtectedRoute.tsx`
- [ ] [P1-017] [P1] [Story-1] Write E2E tests for auth flows `web/tests/e2e/auth.spec.ts`

---

## P2: Capture Ideas and Tasks (FR-007 to FR-009)

**User Story**: As a user, I want to quickly capture all my ideas, tasks, and information into a centralized "inbox" so that I can free my mind and not forget anything.

### Phase 2.1: Backend - Task Entity & Inbox

- [ ] [P2-001] [P2] [Story-2] Create Task Doctrine entity with all GTD statuses `api/src/Entity/Task.php`
- [ ] [P2-002] [P2] [Story-2] Create Task repository with inbox queries `api/src/Repository/TaskRepository.php`
- [ ] [P2-003] [P2] [Story-2] Create database migration for tasks table `api/migrations/Version004CreateTasksTable.php`
- [ ] [P2-004] [P2] [Story-2] Create TaskController with capture endpoint (POST /tasks) `api/src/Controller/TaskController.php`
- [ ] [P2-005] [P2] [Story-2] Write unit tests for Task entity and status transitions `api/tests/Unit/Entity/TaskTest.php`

### Phase 2.2: Frontend - Inbox Module

- [ ] [P2-006] [P2] [Story-2] Create inbox Redux slice with optimistic updates `web/src/features/inbox/inboxSlice.ts`
- [ ] [P2-007] [P2] [Story-2] Create InboxPage with task list and quick capture `web/src/pages/InboxPage.tsx`
- [ ] [P2-008] [P2] [Story-2] Create QuickCaptureInput component (< 3 interactions) `web/src/components/QuickCaptureInput.tsx`
- [ ] [P2-009] [P2] [Story-2] Add keyboard shortcut for quick capture (Ctrl+N) `web/src/hooks/useKeyboardShortcuts.ts`
- [ ] [P2-010] [P2] [Story-2] Write E2E tests for inbox capture flow `web/tests/e2e/inbox.spec.ts`

---

## P3: Clarify and Process Tasks (FR-010 to FR-012)

**User Story**: As a user, I want to process each item in my inbox by deciding if it's actionable, and if so, define the concrete next action to take.

### Phase 3.1: Backend - Clarification Logic

- [ ] [P3-001] [P3] [Story-3] Create TaskService with clarification workflow `api/src/Service/TaskService.php`
- [ ] [P3-002] [P3] [Story-3] Add task status transition validation `api/src/EventSubscriber/TaskStatusSubscriber.php`
- [ ] [P3-003] [P3] [Story-3] Create PATCH endpoint for task clarification `api/src/Controller/TaskController.php`
- [ ] [P3-004] [P3] [Story-3] Write unit tests for status transitions `api/tests/Unit/Service/TaskServiceTest.php`

### Phase 3.2: Frontend - Clarification UI

- [ ] [P3-005] [P3] [Story-3] Create ClarifyTaskModal with decision flow `web/src/components/ClarifyTaskModal.tsx`
- [ ] [P3-006] [P3] [Story-3] Add 2-minute rule timer component `web/src/components/TwoMinuteTimer.tsx`
- [ ] [P3-007] [P3] [Story-3] Create task clarification wizard steps `web/src/features/tasks/ClarifyWizard.tsx`
- [ ] [P3-008] [P3] [Story-3] Write E2E tests for clarification flow `web/tests/e2e/clarify.spec.ts`

---

## P4: Organize with Contextual Lists (FR-013 to FR-016)

**User Story**: As a user, I want to organize my actions in lists based on context so that I can quickly see what I can do in my current situation.

### Phase 4.1: Backend - Context Entity

- [ ] [P4-001] [P4] [Story-4] Create Context Doctrine entity `api/src/Entity/Context.php`
- [ ] [P4-002] [P4] [Story-4] Create TaskContext join entity for M:N relationship `api/src/Entity/TaskContext.php`
- [ ] [P4-003] [P4] [Story-4] Create database migration for contexts table `api/migrations/Version002CreateContextsTable.php`
- [ ] [P4-003b] [P4] [Story-4] Create database migration for task_contexts join table `api/migrations/Version005CreateTaskContextsTable.php`
- [ ] [P4-004] [P4] [Story-4] Create seed command for default contexts `api/src/Command/SeedContextsCommand.php`
- [ ] [P4-005] [P4] [Story-4] Create ContextController with CRUD endpoints `api/src/Controller/ContextController.php`

### Phase 4.2: Frontend - Context Filtering

- [ ] [P4-006] [P4] [Story-4] Create contexts Redux slice `web/src/features/contexts/contextsSlice.ts`
- [ ] [P4-007] [P4] [Story-4] Create ContextFilterSidebar component `web/src/components/ContextFilterSidebar.tsx`
- [ ] [P4-008] [P4] [Story-4] Write E2E tests for context filtering `web/tests/e2e/contexts.spec.ts`

### Phase 4.3: Frontend - GTD List Views (FR-016)

- [ ] [P4-009] [P4] [Story-4] Create NextActionsPage with filtered task list `web/src/pages/NextActionsPage.tsx`
- [ ] [P4-010] [P4] [Story-4] Create WaitingForPage with delegated/blocked tasks `web/src/pages/WaitingForPage.tsx`
- [ ] [P4-011] [P4] [Story-4] Create SomedayMaybePage with deferred tasks `web/src/pages/SomedayMaybePage.tsx`
- [ ] [P4-012] [P4] [Story-4] Create ReferencePage for non-actionable items `web/src/pages/ReferencePage.tsx`

---

## P5: Project Management (FR-017 to FR-019)

**User Story**: As a user, I want to manage projects with their next actions so that I can keep an overview while focusing on the next step.

### Phase 5.1: Backend - Project Entity

- [ ] [P5-001] [P5] [Story-5] Create Project Doctrine entity `api/src/Entity/Project.php`
- [ ] [P5-002] [P5] [Story-5] Create Project repository with computed properties `api/src/Repository/ProjectRepository.php`
- [ ] [P5-003] [P5] [Story-5] Create database migration for projects table `api/migrations/Version003CreateProjectsTable.php`
- [ ] [P5-004] [P5] [Story-5] Create ProjectService with next action logic `api/src/Service/ProjectService.php`
- [ ] [P5-005] [P5] [Story-5] Create ProjectController with CRUD endpoints `api/src/Controller/ProjectController.php`
- [ ] [P5-006] [P5] [Story-5] Write unit tests for next action computation `api/tests/Unit/Service/ProjectServiceTest.php`

### Phase 5.2: Frontend - Projects Module

- [ ] [P5-007] [P5] [Story-5] Create projects Redux slice `web/src/features/projects/projectsSlice.ts`
- [ ] [P5-008] [P5] [Story-5] Create ProjectsPage with project list `web/src/pages/ProjectsPage.tsx`
- [ ] [P5-009] [P5] [Story-5] Create ProjectDetailPage with task list `web/src/pages/ProjectDetailPage.tsx`
- [ ] [P5-010] [P5] [Story-5] Write E2E tests for project management `web/tests/e2e/projects.spec.ts`

---

## P6: Weekly Review (FR-020 to FR-022)

**User Story**: As a user, I want to perform a guided weekly review so that I maintain trust in my system.

### Phase 6.1: Backend - Review Entity

- [ ] [P6-001] [P6] [Story-6] Create Review Doctrine entity `api/src/Entity/Review.php`
- [ ] [P6-002] [P6] [Story-6] Create Review repository `api/src/Repository/ReviewRepository.php`
- [ ] [P6-003] [P6] [Story-6] Create database migration for reviews table `api/migrations/Version006CreateReviewsTable.php`
- [ ] [P6-004] [P6] [Story-6] Create ReviewController with start/complete endpoints `api/src/Controller/ReviewController.php`
- [ ] [P6-005] [P6] [Story-6] Create review reminder notification service `api/src/Service/ReviewReminderService.php`

### Phase 6.2: Frontend - Review Module

- [ ] [P6-006] [P6] [Story-6] Create review Redux slice `web/src/features/review/reviewSlice.ts`
- [ ] [P6-007] [P6] [Story-6] Create ReviewWizard with guided steps `web/src/pages/ReviewWizard.tsx`
- [ ] [P6-008] [P6] [Story-6] Write E2E tests for weekly review flow `web/tests/e2e/review.spec.ts`

---

## P7: Calendar and Deadlines (FR-023 to FR-025)

**User Story**: As a user, I want to see my fixed-date commitments and set deadlines so that I never miss an appointment.

### Phase 7.1: Backend - Calendar Entity

- [ ] [P7-001] [P7] [Story-7] Create CalendarEvent Doctrine entity `api/src/Entity/CalendarEvent.php`
- [ ] [P7-002] [P7] [Story-7] Create CalendarEvent repository `api/src/Repository/CalendarEventRepository.php`
- [ ] [P7-003] [P7] [Story-7] Create database migration for calendar_events table `api/migrations/Version007CreateCalendarEventsTable.php`
- [ ] [P7-004] [P7] [Story-7] Create CalendarController with CRUD endpoints `api/src/Controller/CalendarController.php`
- [ ] [P7-005] [P7] [Story-7] Create deadline reminder notification service `api/src/Service/DeadlineReminderService.php`

### Phase 7.2: Frontend - Calendar Module

- [ ] [P7-006] [P7] [Story-7] Create calendar Redux slice `web/src/features/calendar/calendarSlice.ts`
- [ ] [P7-007] [P7] [Story-7] Create CalendarPage with month/week views `web/src/pages/CalendarPage.tsx`
- [ ] [P7-008] [P7] [Story-7] Write E2E tests for calendar features `web/tests/e2e/calendar.spec.ts`

---

## Cross-Cutting: Sync & Offline (FR-026 to FR-028)

### Sync Infrastructure

- [ ] [SYNC-001] [P2] Create SyncController with delta sync endpoint `api/src/Controller/SyncController.php`
- [ ] [SYNC-002] [P2] Implement version-based conflict detection `api/src/Service/SyncService.php`
- [ ] [SYNC-003] [P2] Configure IndexedDB with Dexie.js for web offline storage `web/src/services/offlineStorage.ts`
- [ ] [SYNC-004] [P2] Create sync Redux middleware for background sync `web/src/store/syncMiddleware.ts`
- [ ] [SYNC-005] [P2] Write integration tests for sync scenarios `api/tests/Integration/SyncTest.php`

---

## Integration Tests (Constitution II)

Per Constitution II, each component MUST have integration tests.

- [ ] [INT-001] Write integration tests for Auth module (login, register, refresh, Apple Sign-In) `api/tests/Integration/AuthIntegrationTest.php`
- [ ] [INT-002] Write integration tests for Task module (CRUD, status transitions) `api/tests/Integration/TaskIntegrationTest.php`
- [ ] [INT-003] Write integration tests for Project module (CRUD, next action logic) `api/tests/Integration/ProjectIntegrationTest.php`
- [ ] [INT-004] Write integration tests for Context module (CRUD, task associations) `api/tests/Integration/ContextIntegrationTest.php`
- [ ] [INT-005] Write integration tests for Review module (start, complete, reminders) `api/tests/Integration/ReviewIntegrationTest.php`
- [ ] [INT-006] Write integration tests for Calendar module (events, reminders) `api/tests/Integration/CalendarIntegrationTest.php`

---

## Edge Cases (from spec.md)

- [ ] [EDGE-001] Implement orphan task handling on project deletion (move to inbox) `api/src/EventSubscriber/ProjectDeleteSubscriber.php`
- [ ] [EDGE-002] Add inbox overflow alert when >100 unprocessed items `web/src/components/InboxOverflowAlert.tsx`
- [ ] [EDGE-003] Implement draft auto-save on session expiry `web/src/hooks/useDraftAutoSave.ts`
- [ ] [EDGE-004] Add unsaved changes warning before logout/navigation `web/src/components/UnsavedChangesGuard.tsx`
- [ ] [EDGE-005] Write E2E tests for edge case scenarios `web/tests/e2e/edge-cases.spec.ts`

---

## Polish & Finalization

### Documentation & Quality (Constitution IX)

- [ ] [POL-001] Generate OpenAPI documentation from API `api/src/OpenApi/`
- [ ] [POL-002] Update quickstart.md with final setup instructions `specs/001-gtd-todo-app/quickstart.md`
- [ ] [POL-003] Create CHANGELOG.md with version history `CHANGELOG.md`
- [ ] [POL-003b] Create README.md with project overview and quick start `README.md`
- [ ] [POL-004] Ensure 80% code coverage across all modules

### Performance & Accessibility

- [ ] [POL-005] Run Lighthouse audit and fix issues (LCP < 2.5s, FID < 100ms)
- [ ] [POL-006] Verify WCAG 2.1 AA compliance with aXe audit
- [ ] [POL-007] Optimize bundle size (< 200KB gzipped)
- [ ] [POL-008] Final E2E test suite execution and verification

---

## Post-MVP: Analytics & Metrics (SC-003, SC-005, SC-008, SC-009)

> **Note**: The following success criteria require analytics infrastructure not included in MVP:
> - SC-003: 80% of users empty inbox weekly (requires usage tracking)
> - SC-005: 70% users complete weekly review (requires usage tracking)
> - SC-008: 30-day retention rate >60% (requires cohort analytics)
> - SC-009: 40% stress reduction (requires user surveys)
>
> These will be addressed in Phase 2 with analytics integration (Mixpanel/Amplitude or similar).

---

## Task Dependencies

```
Sprint 0 (S0-*) ──BLOCKING──> All P1-P7 tasks

P1-001 → P1-002 → P1-003 (User entity chain)
P1-005 → P1-006 → P1-007 → P1-007b (Auth backend chain)
P1-018 → P1-019 → P1-020 (Session/GDPR chain, after P1-001)
P1-012 → P1-013 → P1-014 → P1-017 (Auth frontend chain)

P2-001 → P2-002 → P2-003 → P2-004 (Task entity chain)
P2-006 → P2-007 → P2-010 (Inbox frontend chain)

P4-001 → P4-002 → P4-003 → P4-003b (Context entity chain)
P4-003b depends on P2-003 (tasks table must exist for join table)
P4-009 → P4-010 → P4-011 → P4-012 (GTD list views, after P4-006)

P5-001 → P5-002 → P5-003 → P5-004 (Project entity chain)
EDGE-001 depends on P5-005 (project controller must exist)

P6-001 → P6-002 → P6-003 (Review entity chain)
P7-001 → P7-002 → P7-003 (Calendar entity chain)

SYNC-* depends on P2-* (Task entity must exist)
INT-* runs after corresponding feature tasks complete
EDGE-* runs after core features complete
POL-* runs after all feature tasks complete
```

---

## Verification Checklist

Before marking Sprint 0 complete:
- [ ] All Docker containers start successfully
- [ ] CI pipeline passes on test PR
- [ ] CD pipeline deploys to staging
- [ ] Health checks return 200 OK
- [ ] Branch protection rules enforced

Before marking each User Story complete:
- [ ] All unit tests pass (> 80% coverage)
- [ ] All E2E tests for the story pass
- [ ] API endpoints match OpenAPI spec
- [ ] Code review approved
- [ ] Documentation updated
