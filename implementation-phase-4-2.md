# Implementation: Phase 4.2 - Backend Context Endpoints

## Overview
- **Parent**: P4: Organize with Contextual Lists (FR-013 to FR-016)
- **User Story**: As a user, I want to organize my actions in lists based on context so that I can quickly see what I can do in my current situation.
- **Branch**: feat/phase-4-2-backend-context-endpoints

## Specs Analysis

### Relevant Requirements (from spec.md)
- **FR-013**: System MUST provide default contexts: @Office, @Home, @Phone, @Errands, @Computer, @Waiting
- **FR-014**: System MUST allow creation of custom contexts
- **FR-015**: System MUST allow filtering actions by context

### Data Model (from data-model.md)
- **Context Entity**: Already implemented in Phase 4.1
  - Fields: id, user_id (NULL for defaults), name, icon, color, is_default, status, position, created_at, updated_at
  - Statuses: active, archived
  - Validation: Name starts with "@", max 50 chars, unique per user

### Existing Code Analysis
- **ContextRepository**: Already complete with all necessary methods:
  - `findAllForUser()` - Gets user's contexts + defaults
  - `findDefaults()` - Gets system defaults only
  - `findCustomByUser()` - Gets user's custom contexts only
  - `findByNameForUser()` - Finds context by name
  - `isNameAvailable()` - Checks name uniqueness
  - `getMaxPositionByUser()` - For positioning new contexts
- **TaskController**: Reference pattern for controller structure

### API Endpoints to Implement
Based on TaskController patterns and REST conventions:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/contexts | List all contexts for user (defaults + custom) |
| GET | /api/v1/contexts/defaults | List default contexts only |
| GET | /api/v1/contexts/{id} | Get single context |
| POST | /api/v1/contexts | Create custom context |
| PATCH | /api/v1/contexts/{id} | Update context |
| DELETE | /api/v1/contexts/{id} | Archive (soft delete) custom context |
| POST | /api/v1/contexts/{id}/restore | Restore archived context |

## Test Plan

### Unit Tests
N/A - Entity tests already done in Phase 4.1

### Functional Tests (`api/tests/Functional/Context/ContextTest.php`)
Following TDD approach - tests first, then implementation:

1. **List Contexts**
   - `testListContextsReturnsDefaultsAndCustom()`
   - `testListContextsRequiresAuthentication()`
   - `testListContextsOnlyShowsActiveContexts()`

2. **Get Single Context**
   - `testGetContextById()`
   - `testGetContextNotFoundReturns404()`
   - `testCannotGetOtherUserContext()`

3. **Create Context**
   - `testCreateContextWithValidData()`
   - `testCreateContextRequiresName()`
   - `testCreateContextNameMustStartWithAt()`
   - `testCreateContextDuplicateNameFails()`
   - `testCreateContextWithOptionalFields()`

4. **Update Context**
   - `testUpdateContextName()`
   - `testUpdateContextIcon()`
   - `testUpdateContextColor()`
   - `testCannotUpdateDefaultContext()`
   - `testCannotUpdateOtherUserContext()`

5. **Delete Context**
   - `testDeleteContextArchivesIt()`
   - `testCannotDeleteDefaultContext()`
   - `testCannotDeleteOtherUserContext()`

6. **Restore Context**
   - `testRestoreArchivedContext()`
   - `testRestoreNonArchivedContextFails()`

7. **Seed Command Tests** (separate test file or within functional)
   - `testSeedCommandCreatesDefaultContexts()`
   - `testSeedCommandIsIdempotent()`

## Implementation Tasks

| Task ID | Description | File | Status |
|---------|-------------|------|--------|
| P4-006 | Create seed command for default contexts | `api/src/Command/SeedContextsCommand.php` | completed |
| P4-007 | Create ContextController with CRUD endpoints | `api/src/Controller/ContextController.php` | completed |
| P4-008 | Write functional tests for context endpoints | `api/tests/Functional/Context/ContextTest.php` | completed |

## Implementation Order (TDD)

1. **P4-008 (Tests First)**: Write functional tests
2. **P4-006 (Seed Command)**: Create seed command (needed for test fixtures)
3. **P4-007 (Controller)**: Implement ContextController
4. Run tests and iterate

## Side Effects Analysis

### Potential Impact
1. **Task Entity**: May need to add context relationship methods in future (Phase 4.3+)
2. **Database**: Seed command will insert default contexts - must be idempotent
3. **Security**: Controller must verify user ownership for custom contexts

### Dependencies
- Context entity (P4-001) - Done
- TaskContext entity (P4-003) - Done
- Migrations (P4-004, P4-005) - Done
- ContextRepository - Already exists

### Breaking Changes
- None - this is a new feature

## Pre-PR Checklist
- [x] All tests written and passing
- [x] Code follows clean code principles
- [x] No side effects unaddressed
- [x] Documentation updated if needed
- [x] Seed command tested manually

## Review Notes

### Review Cycle 1 (2025-12-03)
- **Reviewer**: Claude Code
- **Tests**: 27 context tests passing (428 total tests passing)
- **Findings**: None - implementation follows existing patterns from TaskController
- **Security**: Authorization checks implemented correctly via `getAuthenticatedUserAndContext()`
- **Code Quality**: Clean, follows established patterns
- **Status**: APPROVED
