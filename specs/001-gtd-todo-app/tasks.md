# Tasks: GTD Todo App

**Feature**: 001-gtd-todo-app
**Date**: 2025-11-28
**Status**: Ready for Development
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Overview

Total tasks: 203
- Sprint 0 (Infrastructure + GitHub Issues): 35 tasks ✅ COMPLETE
- P1 User Account Management: 56 tasks (52 complete, 4 remaining) - 93% complete
- P2 Capture Ideas and Tasks: 14 tasks
- P3 Clarify and Process: 12 tasks
- P4 Organize with Contexts: 18 tasks
- P5 Project Management: 14 tasks
- P6 Weekly Review: 12 tasks
- P7 Calendar and Deadlines: 12 tasks
- Cross-Cutting (Sync & Offline): 5 tasks
- Integration Tests: 6 tasks (1 complete)
- Edge Cases: 5 tasks
- Polish & Finalization: 9 tasks

> **Micro-Organization**: Each feature follows the pattern: Backend first → Frontend second → Tests → Next task.

> **Note**: iOS app (FR-027) is descoped to Phase 2. Web MVP delivers all P1-P7 features first. iOS tasks will be added in a separate planning cycle after web MVP completion.

> **Terminology**: This project uses "Task" as the canonical entity name. The terms "action" and "task" in GTD literature are equivalent and both refer to the `Task` entity in our data model.

---

## Sprint 0: Infrastructure Setup (Constitution XV & XVI - BLOCKING)

**Status**: ✅ COMPLETE (35/35 tasks)

**BLOCKING**: No `feat/*` branches until ALL Sprint 0 tasks complete.

### Phase 0.0: GitHub Issues Setup (Constitution XVI)

Per Constitution XVI, all features MUST be tracked as GitHub issues BEFORE implementation begins.

- [X] [S0-016] Create GitHub issue for P1: User Account Management (FR-001 to FR-006b)
- [X] [S0-017] Create GitHub issue for P2: Capture Ideas and Tasks (FR-007 to FR-009)
- [X] [S0-018] Create GitHub issue for P3: Clarify and Process Tasks (FR-010 to FR-012)
- [X] [S0-019] Create GitHub issue for P4: Organize with Contextual Lists (FR-013 to FR-016)
- [X] [S0-020] Create GitHub issue for P5: Project Management (FR-017 to FR-019)
- [X] [S0-021] Create GitHub issue for P6: Weekly Review (FR-020 to FR-022)
- [X] [S0-022] Create GitHub issue for P7: Calendar and Deadlines (FR-023 to FR-025)
- [X] [S0-023] Create GitHub issue for Cross-Cutting: Sync & Offline (FR-026 to FR-028)

> **Note**: After issues are created, all `feat/*` branches MUST follow naming convention: `feat/<issue-id>-<description>`
> Example: `feat/42-user-account-management`

### Phase 0.1: Development Environment

- [X] [S0-001] Setup Docker Compose configuration for local development `infra/docker-compose.yml`
- [X] [S0-002] Create API Dockerfile with PHP 8.2-FPM and Nginx `infra/docker/api/Dockerfile`
- [X] [S0-003] Create Web Dockerfile for React development `infra/docker/web/Dockerfile`
- [X] [S0-004] Create MariaDB Docker configuration with initialization scripts `infra/docker/db/`
- [X] [S0-005] Create environment template files `api/.env.example`, `web/.env.example`
- [X] [S0-005b] Create FeatureFlag entity and migration `api/src/Entity/FeatureFlag.php`, `api/migrations/Version009CreateFeatureFlagsTable.php`

### Phase 0.2: CI Pipeline

- [X] [S0-006] Create GitHub Actions CI workflow for API (PHP lint, PHPStan, PHPUnit) `.github/workflows/ci.yml`
- [X] [S0-007] Add CI steps for Web (ESLint, Prettier, Jest, build) `.github/workflows/ci.yml`
- [X] [S0-008] Add security scanning (composer audit, npm audit) `.github/workflows/ci.yml`
- [X] [S0-008b] **Configure SonarQube/SonarCloud analysis in CI pipeline (Constitution VI)** `.github/workflows/ci.yml`
- [X] [S0-009] Configure code coverage reporting (Codecov or similar) `.github/workflows/ci.yml`
- [X] [S0-010] Add branch protection rules for main and 001-gtd-todo-app `Repository Settings`

### Phase 0.3: CD Pipeline

- [X] [S0-011] Create GitHub Actions CD workflow for staging deployment `.github/workflows/cd.yml`
- [X] [S0-012] Create GitHub Actions CD workflow for production deployment `.github/workflows/cd.yml`
- [X] [S0-013] Configure health check endpoints and monitoring `/api/health`
- [X] [S0-014] Document rollback procedures `docs/deployment.md`
- [X] [S0-015] Verify complete infrastructure checklist passes (Constitution XV)

### Phase 0.4: Render Deployment (Constitution XV - REQUIRED)

> Constitution XV mandates Render as the hosting platform for production and staging.

- [X] [S0-024] Create Render account and project setup `render.yaml`
- [X] [S0-025] Configure Render Web Service for API (production) with accessible URL
- [X] [S0-026] Configure Render Web Service for API (staging) with accessible URL
- [X] [S0-027] Configure Render Static Site for Web frontend (production)
- [X] [S0-028] Configure Render Static Site for Web frontend (staging)
- [X] [S0-029] Configure Render PostgreSQL/MariaDB database (or use external)
- [X] [S0-030] Update CD pipeline to deploy to Render on merge `.github/workflows/cd.yml`
- [X] [S0-031] Verify production URL accessible and health check passes
- [X] [S0-032] Verify staging URL accessible and health check passes
- [X] [S0-033] Document Render deployment URLs in README.md

---

## P1: User Account Management (FR-001 to FR-006b)

**User Story**: As a user, I want to create an account, log in securely, and manage my preferences so that I can access my data across all my devices.

**Status**: In Progress (52/56 tasks complete - 93%)

### Phase 1.1: Backend - User Entity & Repository ✅

- [X] [P1-001] [Story-1] Create User Doctrine entity with all fields from data-model.md `api/src/Entity/User.php`
- [X] [P1-002] [Story-1] Create User repository with CRUD operations `api/src/Repository/UserRepository.php`
- [X] [P1-003] [Story-1] Create database migration for users table `api/migrations/Version001CreateUsersTable.php`
- [X] [P1-004] [Story-1] Write unit tests for User entity validation `api/tests/Unit/Entity/UserTest.php`

### Phase 1.2: Backend - Authentication ✅

- [X] [P1-005] [Story-1] Configure LexikJWTAuthenticationBundle with key generation `api/config/packages/lexik_jwt_authentication.yaml`
- [X] [P1-006] [Story-1] Create AuthController with login endpoint `api/src/Controller/AuthController.php`
- [X] [P1-007] [Story-1] Implement refresh token rotation with RefreshToken entity `api/src/Entity/RefreshToken.php`
- [X] [P1-007b] [Story-1] Create database migration for refresh_tokens table `api/migrations/Version008CreateRefreshTokensTable.php`
- [X] [P1-008] [Story-1] Implement Apple Sign-In verification service `api/src/Service/AppleSignInService.php`
- [X] [P1-009] [Story-1] Create registration endpoint with email verification `api/src/Controller/RegistrationController.php`
- [X] [P1-010] [Story-1] Create password reset flow with secure tokens `api/src/Controller/PasswordResetController.php`
- [X] [P1-011] [Story-1] Write functional tests for all auth endpoints `api/tests/Functional/AuthTest.php`

### Phase 1.2b: Backend - Session & Account Management (FR-006, FR-006b) ✅

- [X] [P1-018] [Story-1] Implement session timeout with auto-logout after inactivity `api/src/EventSubscriber/SessionTimeoutSubscriber.php`
- [X] [P1-019] [Story-1] Create account deletion endpoint with cascade delete (GDPR) `api/src/Controller/AccountController.php`
- [X] [P1-020] [Story-1] Implement hard delete service for all user data `api/src/Service/AccountDeletionService.php`

### Phase 1.3: Frontend - Auth Pages ✅

- [X] [P1-012] [Story-1] Create auth Redux slice with login/logout/register actions `web/src/features/auth/authSlice.js`
- [X] [P1-013] [Story-1] Create LoginPage component with form validation `web/src/pages/LoginPage.jsx`
- [X] [P1-014] [Story-1] Create RegisterPage component with email verification flow `web/src/pages/RegisterPage.jsx`
- [X] [P1-014b] [Story-1] Create VerifyEmailPage component for email verification link `web/src/pages/VerifyEmailPage.jsx`
- [X] [P1-014c] [Story-1] Add /verify-email route to App router `web/src/App.jsx`
- [X] [P1-015] [Story-1] Implement Apple Sign-In button for web `web/src/components/AppleSignInButton.jsx`
- [X] [P1-016] [Story-1] Create protected route wrapper with auth guard `web/src/components/ProtectedRoute.jsx`
- [X] [P1-017] [Story-1] Write E2E tests for auth flows `web/src/tests/e2e/auth.spec.jsx`
- [X] [P1-017b] [Story-1] Write E2E tests for email verification flow `web/src/tests/e2e/auth.spec.jsx:439-606`

### Phase 1.4: Critical Fixes & Missing Features ⚠️ HIGH PRIORITY

**Email Service Integration** ✅ COMPLETE
- [X] [P1-021] [Story-1] Install and configure Symfony Mailer `api/config/packages/mailer.yaml`
- [X] [P1-022] [Story-1] Create email templates (verification, password reset) `api/templates/email/`
- [X] [P1-023] [Story-1] Implement email sending in RegistrationController `api/src/Controller/RegistrationController.php:112-113`
- [X] [P1-024] [Story-1] Implement email sending in PasswordResetController `api/src/Controller/PasswordResetController.php:69-70, 228-229`
- [X] [P1-025] [Story-1] Write integration tests for email sending `api/tests/Integration/EmailServiceTest.php`

**Apple Sign-In Completion** ✅ COMPLETE
- [X] [P1-026] [Story-1] Install firebase/php-jwt package `composer.json`
- [X] [P1-027] [Story-1] Complete JWK to PEM conversion in AppleSignInService `api/src/Service/AppleSignInService.php`
- [X] [P1-028] [Story-1] Add error handling for Apple Sign-In failures `api/src/Service/AppleSignInService.php`
- [X] [P1-029] [Story-1] Write unit tests for Apple Sign-In service `api/tests/Unit/Service/AppleSignInServiceTest.php`

**Preference Management Fix** ✅ COMPLETE
- [X] [P1-030] [Story-1] Fix preference update to persist to database `api/src/Controller/AccountController.php:168`
- [X] [P1-031] [Story-1] Add validation for timezone values `api/src/Controller/AccountController.php:184-186`
- [X] [P1-032] [Story-1] Write unit tests for preference updates `api/tests/Unit/Controller/AccountControllerTest.php`

### Phase 1.5: Frontend - Account Management Pages

**Account Settings Page**
- [X] [P1-033] [Story-1] Create AccountSettingsPage component `web/src/pages/AccountSettingsPage.jsx`
- [X] [P1-034] [Story-1] Add profile information display (email, dates) `web/src/pages/AccountSettingsPage.jsx`
- [X] [P1-035] [Story-1] Create timezone update form `web/src/components/TimezoneSelector.jsx`
- [X] [P1-036] [Story-1] Create notification preferences form `web/src/components/NotificationPreferences.jsx`
- [X] [P1-037] [Story-1] Add route /account/settings with auth guard `web/src/App.jsx`
- [X] [P1-038] [Story-1] Write unit tests for AccountSettingsPage `web/tests/unit/pages/AccountSettingsPage.test.jsx`

**Account Deletion Page**
- [X] [P1-039] [Story-1] Create AccountDeletionPage component `web/src/pages/AccountDeletionPage.jsx`
- [X] [P1-040] [Story-1] Display deletion warning and data impact `web/src/pages/AccountDeletionPage.jsx`
- [X] [P1-041] [Story-1] Create deletion confirmation form (password + "DELETE" text) `web/src/components/AccountDeletionForm.jsx`
- [X] [P1-042] [Story-1] Add GDPR compliance notices `web/src/pages/AccountDeletionPage.jsx`
- [X] [P1-043] [Story-1] Implement post-deletion redirect to login `web/src/pages/AccountDeletionPage.jsx`
- [X] [P1-044] [Story-1] Add route /account/delete with auth guard `web/src/App.jsx`
- [X] [P1-045] [Story-1] Write unit tests for AccountDeletionPage `web/tests/unit/pages/AccountDeletionPage.test.jsx`

**Navigation Updates**
- [X] [P1-046] [Story-1] Add user menu with Settings and Logout `web/src/components/Navigation.jsx`
- [X] [P1-047] [Story-1] Add link to account settings in navigation `web/src/components/Navigation.jsx`

### Phase 1.6: End-to-End Testing ✅

**Email Flow Tests**
- [X] [P1-048] [Story-1] E2E test for complete registration with email verification `web/src/tests/e2e/registration-email.spec.jsx`
- [X] [P1-049] [Story-1] E2E test for password reset with email `web/src/tests/e2e/password-reset-email.spec.jsx`

**Account Management Tests**
- [X] [P1-050] [Story-1] E2E test for updating preferences from UI `web/src/tests/e2e/account-preferences.spec.jsx`
- [X] [P1-051] [Story-1] E2E test for account deletion flow `web/src/tests/e2e/account-deletion.spec.jsx`
- [X] [P1-052] [Story-1] E2E test for verifying data persistence after logout/login `web/src/tests/e2e/data-persistence.spec.jsx`

### Phase 1.7: UX Polish ✅ COMPLETE

**Loading States & Feedback**
- [X] [P1-053] [Story-1] Add loading spinners to all action buttons `web/src/pages/*`
- [X] [P1-054] [Story-1] Improve form validation messages `web/src/pages/*`

---

## P2: Capture Ideas and Tasks (FR-007 to FR-009)

**User Story**: As a user, I want to quickly capture all my ideas, tasks, and information into a centralized "inbox" so that I can free my mind and not forget anything.

### Phase 2.1: Backend - Task Entity

- [ ] [P2-001] [Story-2] Create Task Doctrine entity with all GTD statuses `api/src/Entity/Task.php`
- [ ] [P2-002] [Story-2] Write unit tests for Task entity `api/tests/Unit/Entity/TaskTest.php`
- [ ] [P2-003] [Story-2] Create Task repository with inbox queries `api/src/Repository/TaskRepository.php`
- [ ] [P2-004] [Story-2] Create database migration for tasks table `api/migrations/Version004CreateTasksTable.php`

### Phase 2.2: Backend - Capture Endpoint

- [ ] [P2-005] [Story-2] Create TaskController with POST /api/tasks endpoint `api/src/Controller/TaskController.php`
- [ ] [P2-006] [Story-2] Create GET /api/tasks/inbox endpoint `api/src/Controller/TaskController.php`
- [ ] [P2-007] [Story-2] Write functional tests for capture/inbox endpoints `api/tests/Functional/Task/InboxTest.php`

### Phase 2.3: Frontend - Inbox Module

- [ ] [P2-008] [Story-2] Create inbox Redux slice with optimistic updates `web/src/features/inbox/inboxSlice.ts`
- [ ] [P2-009] [Story-2] Replace InboxPage placeholder with full implementation `web/src/pages/InboxPage.tsx`
- [ ] [P2-010] [Story-2] Write unit tests for InboxPage `web/tests/unit/pages/InboxPage.test.tsx`
- [ ] [P2-011] [Story-2] Create QuickCaptureInput component (< 3 interactions) `web/src/components/QuickCaptureInput.tsx`
- [ ] [P2-012] [Story-2] Write unit tests for QuickCaptureInput `web/tests/unit/components/QuickCaptureInput.test.tsx`
- [ ] [P2-013] [Story-2] Add keyboard shortcut for quick capture (Ctrl+N) `web/src/hooks/useKeyboardShortcuts.ts`
- [ ] [P2-014] [Story-2] Write E2E tests for inbox capture flow `web/tests/e2e/inbox.spec.ts`

---

## P3: Clarify and Process Tasks (FR-010 to FR-012)

**User Story**: As a user, I want to process each item in my inbox by deciding if it's actionable, and if so, define the concrete next action to take.

### Phase 3.1: Backend - Clarification Logic

- [ ] [P3-001] [Story-3] Create TaskService with clarification workflow `api/src/Service/TaskService.php`
- [ ] [P3-002] [Story-3] Write unit tests for TaskService status transitions `api/tests/Unit/Service/TaskServiceTest.php`
- [ ] [P3-003] [Story-3] Add task status transition validation subscriber `api/src/EventSubscriber/TaskStatusSubscriber.php`
- [ ] [P3-004] [Story-3] Create PATCH /api/tasks/{id}/clarify endpoint `api/src/Controller/TaskController.php`
- [ ] [P3-005] [Story-3] Write functional tests for clarification endpoint `api/tests/Functional/Task/ClarifyTest.php`

### Phase 3.2: Frontend - Clarification UI

- [ ] [P3-006] [Story-3] Create tasks Redux slice with clarification actions `web/src/features/tasks/tasksSlice.ts`
- [ ] [P3-007] [Story-3] Replace ClarifyPage placeholder with full implementation `web/src/pages/ClarifyPage.tsx`
- [ ] [P3-008] [Story-3] Write unit tests for ClarifyPage `web/tests/unit/pages/ClarifyPage.test.tsx`
- [ ] [P3-009] [Story-3] Create ClarifyTaskModal with decision flow `web/src/components/ClarifyTaskModal.tsx`
- [ ] [P3-010] [Story-3] Create TwoMinuteTimer component `web/src/components/TwoMinuteTimer.tsx`
- [ ] [P3-011] [Story-3] Create ClarifyWizard with guided steps `web/src/features/tasks/ClarifyWizard.tsx`
- [ ] [P3-012] [Story-3] Write E2E tests for clarification flow `web/tests/e2e/clarify.spec.ts`

---

## P4: Organize with Contextual Lists (FR-013 to FR-016)

**User Story**: As a user, I want to organize my actions in lists based on context so that I can quickly see what I can do in my current situation.

### Phase 4.1: Backend - Context Entity

- [ ] [P4-001] [Story-4] Create Context Doctrine entity `api/src/Entity/Context.php`
- [ ] [P4-002] [Story-4] Write unit tests for Context entity `api/tests/Unit/Entity/ContextTest.php`
- [ ] [P4-003] [Story-4] Create TaskContext join entity for M:N relationship `api/src/Entity/TaskContext.php`
- [ ] [P4-004] [Story-4] Create database migration for contexts table `api/migrations/Version002CreateContextsTable.php`
- [ ] [P4-005] [Story-4] Create database migration for task_contexts join table `api/migrations/Version005CreateTaskContextsTable.php`

### Phase 4.2: Backend - Context Endpoints

- [ ] [P4-006] [Story-4] Create seed command for default contexts `api/src/Command/SeedContextsCommand.php`
- [ ] [P4-007] [Story-4] Create ContextController with CRUD endpoints `api/src/Controller/ContextController.php`
- [ ] [P4-008] [Story-4] Write functional tests for context endpoints `api/tests/Functional/Context/ContextTest.php`

### Phase 4.3: Frontend - Context Module

- [ ] [P4-009] [Story-4] Create contexts Redux slice `web/src/features/contexts/contextsSlice.ts`
- [ ] [P4-010] [Story-4] Replace ContextsPage placeholder with full implementation `web/src/pages/ContextsPage.tsx`
- [ ] [P4-011] [Story-4] Write unit tests for ContextsPage `web/tests/unit/pages/ContextsPage.test.tsx`
- [ ] [P4-012] [Story-4] Create ContextFilterSidebar component `web/src/components/ContextFilterSidebar.tsx`
- [ ] [P4-013] [Story-4] Write unit tests for ContextFilterSidebar `web/tests/unit/components/ContextFilterSidebar.test.tsx`

### Phase 4.4: Frontend - GTD List Views (FR-016)

- [ ] [P4-014] [Story-4] Create NextActionsPage with filtered task list `web/src/pages/NextActionsPage.tsx`
- [ ] [P4-015] [Story-4] Create WaitingForPage with delegated/blocked tasks `web/src/pages/WaitingForPage.tsx`
- [ ] [P4-016] [Story-4] Create SomedayMaybePage with deferred tasks `web/src/pages/SomedayMaybePage.tsx`
- [ ] [P4-017] [Story-4] Create ReferencePage for non-actionable items `web/src/pages/ReferencePage.tsx`
- [ ] [P4-018] [Story-4] Write E2E tests for context filtering and GTD lists `web/tests/e2e/contexts.spec.ts`

---

## P5: Project Management (FR-017 to FR-019)

**User Story**: As a user, I want to manage projects with their next actions so that I can keep an overview while focusing on the next step.

### Phase 5.1: Backend - Project Entity

- [ ] [P5-001] [Story-5] Create Project Doctrine entity `api/src/Entity/Project.php`
- [ ] [P5-002] [Story-5] Write unit tests for Project entity `api/tests/Unit/Entity/ProjectTest.php`
- [ ] [P5-003] [Story-5] Create Project repository with computed properties `api/src/Repository/ProjectRepository.php`
- [ ] [P5-004] [Story-5] Create database migration for projects table `api/migrations/Version003CreateProjectsTable.php`

### Phase 5.2: Backend - Project Endpoints

- [ ] [P5-005] [Story-5] Create ProjectService with next action logic `api/src/Service/ProjectService.php`
- [ ] [P5-006] [Story-5] Write unit tests for next action computation `api/tests/Unit/Service/ProjectServiceTest.php`
- [ ] [P5-007] [Story-5] Create ProjectController with CRUD endpoints `api/src/Controller/ProjectController.php`
- [ ] [P5-008] [Story-5] Write functional tests for project endpoints `api/tests/Functional/Project/ProjectTest.php`

### Phase 5.3: Frontend - Projects Module

- [ ] [P5-009] [Story-5] Create projects Redux slice `web/src/features/projects/projectsSlice.ts`
- [ ] [P5-010] [Story-5] Replace ProjectsPage placeholder with full implementation `web/src/pages/ProjectsPage.tsx`
- [ ] [P5-011] [Story-5] Write unit tests for ProjectsPage `web/tests/unit/pages/ProjectsPage.test.tsx`
- [ ] [P5-012] [Story-5] Create ProjectDetailPage with task list `web/src/pages/ProjectDetailPage.tsx`
- [ ] [P5-013] [Story-5] Create ProjectCard component `web/src/components/ProjectCard.tsx`
- [ ] [P5-014] [Story-5] Write E2E tests for project management `web/tests/e2e/projects.spec.ts`

---

## P6: Weekly Review (FR-020 to FR-022)

**User Story**: As a user, I want to perform a guided weekly review so that I maintain trust in my system.

### Phase 6.1: Backend - Review Entity

- [ ] [P6-001] [Story-6] Create Review Doctrine entity `api/src/Entity/Review.php`
- [ ] [P6-002] [Story-6] Write unit tests for Review entity `api/tests/Unit/Entity/ReviewTest.php`
- [ ] [P6-003] [Story-6] Create Review repository `api/src/Repository/ReviewRepository.php`
- [ ] [P6-004] [Story-6] Create database migration for reviews table `api/migrations/Version006CreateReviewsTable.php`

### Phase 6.2: Backend - Review Endpoints

- [ ] [P6-005] [Story-6] Create ReviewController with start/complete endpoints `api/src/Controller/ReviewController.php`
- [ ] [P6-006] [Story-6] Create review reminder notification service `api/src/Service/ReviewReminderService.php`
- [ ] [P6-007] [Story-6] Write functional tests for review endpoints `api/tests/Functional/Review/ReviewTest.php`

### Phase 6.3: Frontend - Review Module

- [ ] [P6-008] [Story-6] Create review Redux slice `web/src/features/review/reviewSlice.ts`
- [ ] [P6-009] [Story-6] Replace ReviewPage placeholder with ReviewWizard `web/src/pages/ReviewWizard.tsx`
- [ ] [P6-010] [Story-6] Write unit tests for ReviewWizard `web/tests/unit/pages/ReviewWizard.test.tsx`
- [ ] [P6-011] [Story-6] Create ReviewStepCard component `web/src/components/ReviewStepCard.tsx`
- [ ] [P6-012] [Story-6] Write E2E tests for weekly review flow `web/tests/e2e/review.spec.ts`

---

## P7: Calendar and Deadlines (FR-023 to FR-025)

**User Story**: As a user, I want to see my fixed-date commitments and set deadlines so that I never miss an appointment.

### Phase 7.1: Backend - Calendar Entity

- [ ] [P7-001] [Story-7] Create CalendarEvent Doctrine entity `api/src/Entity/CalendarEvent.php`
- [ ] [P7-002] [Story-7] Write unit tests for CalendarEvent entity `api/tests/Unit/Entity/CalendarEventTest.php`
- [ ] [P7-003] [Story-7] Create CalendarEvent repository `api/src/Repository/CalendarEventRepository.php`
- [ ] [P7-004] [Story-7] Create database migration for calendar_events table `api/migrations/Version007CreateCalendarEventsTable.php`

### Phase 7.2: Backend - Calendar Endpoints

- [ ] [P7-005] [Story-7] Create CalendarController with CRUD endpoints `api/src/Controller/CalendarController.php`
- [ ] [P7-006] [Story-7] Create deadline reminder notification service `api/src/Service/DeadlineReminderService.php`
- [ ] [P7-007] [Story-7] Write functional tests for calendar endpoints `api/tests/Functional/Calendar/CalendarTest.php`

### Phase 7.3: Frontend - Calendar Module

- [ ] [P7-008] [Story-7] Create calendar Redux slice `web/src/features/calendar/calendarSlice.ts`
- [ ] [P7-009] [Story-7] Replace CalendarPage placeholder with full implementation `web/src/pages/CalendarPage.tsx`
- [ ] [P7-010] [Story-7] Write unit tests for CalendarPage `web/tests/unit/pages/CalendarPage.test.tsx`
- [ ] [P7-011] [Story-7] Create CalendarView component (month/week views) `web/src/components/CalendarView.tsx`
- [ ] [P7-012] [Story-7] Write E2E tests for calendar features `web/tests/e2e/calendar.spec.ts`

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

- [X] [INT-001] Write integration tests for Auth module (login, register, refresh, Apple Sign-In) `api/tests/Integration/AuthIntegrationTest.php`
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
Sprint 0 Phase 0.0 (S0-016 to S0-023) ──BLOCKING──> All feat/* branches
Sprint 0 (S0-*) ──BLOCKING──> All P1-P7 tasks

P1-001 → P1-002 → P1-003 (User entity chain)
P1-005 → P1-006 → P1-007 → P1-007b (Auth backend chain)
P1-018 → P1-019 → P1-020 (Session/GDPR chain, after P1-001)
P1-012 → P1-013 → P1-014 → P1-017 (Auth frontend chain)

P2-001 → P2-002 → P2-003 → P2-004 (Task entity chain)
P2-006 → P2-007 → P2-010 (Inbox frontend chain)

P4-001 → P4-002 → P4-003 → P4-004 → P4-005 (Context entity chain)
P4-005 depends on P2-004 (tasks table must exist for join table)
P4-014 → P4-015 → P4-016 → P4-017 → P4-018 (GTD list views, after P4-006)

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
- [X] All GitHub issues created for P1-P7 features (Constitution XVI)
- [X] All Docker containers start successfully
- [X] CI pipeline passes on test PR
- [X] CD pipeline deploys to staging
- [X] Health checks return 200 OK
- [X] Branch protection rules enforced

Before marking each User Story complete:
- [ ] All unit tests pass (> 80% coverage)
- [ ] All E2E tests for the story pass
- [ ] API endpoints match OpenAPI spec
- [ ] Code review approved
- [ ] Documentation updated

### User Story 1 (P1) Verification (Partial)
- [X] Backend unit tests pass (> 80% coverage)
- [X] Backend E2E tests pass
- [X] API endpoints match OpenAPI spec
- [ ] Frontend unit tests pass (new pages pending)
- [ ] Navigation E2E tests pass
- [ ] Code review approved (new tasks)
- [ ] Documentation updated
