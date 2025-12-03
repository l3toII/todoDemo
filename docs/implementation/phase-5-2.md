# Phase 5.2: Backend - Project Endpoints

**Feature**: 001-gtd-todo-app
**Phase**: 5.2 Backend - Project Endpoints
**Date**: 2025-12-03
**Status**: Implementation

## Overview

This phase implements the backend service layer and REST API endpoints for Project management, following GTD methodology requirements (FR-017, FR-018, FR-019).

## Tasks

| Task ID | Description | File |
|---------|-------------|------|
| P5-005 | Create ProjectService with next action logic | `api/src/Service/ProjectService.php` |
| P5-006 | Write unit tests for next action computation | `api/tests/Unit/Service/ProjectServiceTest.php` |
| P5-007 | Create ProjectController with CRUD endpoints | `api/src/Controller/ProjectController.php` |
| P5-008 | Write functional tests for project endpoints | `api/tests/Functional/Project/ProjectTest.php` |

## Requirements Addressed

- **FR-017**: System MUST automatically identify the next action of a project
- **FR-018**: System MUST flag projects without a defined next action
- **FR-019**: System MUST allow defining an expected outcome for each project

## Implementation Plan

### 1. ProjectService (P5-005)

**File**: `api/src/Service/ProjectService.php`

The service will handle business logic for projects, following the pattern established by `TaskService.php`.

**Methods**:
```php
class ProjectService
{
    // Status transitions (similar to TaskService)
    private const STATUS_TRANSITIONS = [
        Project::STATUS_ACTIVE => [
            Project::STATUS_ON_HOLD,
            Project::STATUS_COMPLETED,
            Project::STATUS_CANCELLED,
        ],
        Project::STATUS_ON_HOLD => [
            Project::STATUS_ACTIVE,
            Project::STATUS_CANCELLED,
        ],
        Project::STATUS_COMPLETED => [
            Project::STATUS_ACTIVE, // Can reopen
        ],
        Project::STATUS_CANCELLED => [
            Project::STATUS_ACTIVE, // Can reopen
        ],
    ];

    // Transition validation
    public function isValidTransition(string $from, string $to): bool;
    public function getAllowedTransitions(string $from): array;

    // Project operations
    public function create(User $user, string $title, ?string $outcome = null): Project;
    public function updateStatus(Project $project, string $status): Project;
    public function complete(Project $project): Project;
    public function putOnHold(Project $project): Project;
    public function activate(Project $project): Project;
    public function cancel(Project $project): Project;

    // Next Action Logic (FR-017)
    public function getNextAction(Project $project): ?Task;
    public function hasNextAction(Project $project): bool;

    // Review Logic (FR-018)
    public function needsReview(Project $project): bool;
    public function getProjectsNeedingAttention(User $user): array;
}
```

**Next Action Logic (FR-017)**:
- A project's "next action" is the first task with `status = 'next_action'` ordered by position
- When a next action is completed, the system should not auto-promote another task (user decides what's next)
- The `getNextAction()` method queries tasks where `project_id = ?` AND `status = 'next_action'` ORDER BY `position ASC` LIMIT 1

**Projects Needing Attention (FR-018)**:
- Active projects without any `next_action` task need attention
- Uses `ProjectRepository::findWithoutNextAction()` already implemented in Phase 5.1

### 2. ProjectServiceTest (P5-006)

**File**: `api/tests/Unit/Service/ProjectServiceTest.php`

**Test Cases**:
```php
// Status transition tests
testValidStatusTransitions()
testInvalidStatusTransitions()
testTransitionFromActiveToOnHold()
testTransitionFromActiveToCompleted()
testTransitionFromCompletedToActive()

// Project creation tests
testCreateProject()
testCreateProjectWithOutcome()
testCreateProjectSetsInitialPosition()

// Status update tests
testCompleteProject()
testPutProjectOnHold()
testActivateProject()
testCancelProject()

// Next action tests (FR-017)
testGetNextActionReturnsFirstNextActionTask()
testGetNextActionReturnsNullWhenNoNextActionTasks()
testGetNextActionIgnoresCompletedTasks()
testGetNextActionRespectsPositionOrder()
testHasNextActionReturnsTrueWhenNextActionExists()
testHasNextActionReturnsFalseWhenNoNextAction()

// Review tests (FR-018)
testNeedsReviewWhenNoNextAction()
testNeedsReviewWhenReviewDatePassed()
testDoesNotNeedReviewWhenHasNextAction()
testGetProjectsNeedingAttention()
```

### 3. ProjectController (P5-007)

**File**: `api/src/Controller/ProjectController.php`

Following the pattern from `ContextController.php`:

**Endpoints**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects` | List all projects for user |
| GET | `/api/v1/projects/{id}` | Get single project with tasks |
| POST | `/api/v1/projects` | Create new project |
| PATCH | `/api/v1/projects/{id}` | Update project |
| DELETE | `/api/v1/projects/{id}` | Delete (soft) project |
| POST | `/api/v1/projects/{id}/complete` | Mark project as completed |
| POST | `/api/v1/projects/{id}/hold` | Put project on hold |
| POST | `/api/v1/projects/{id}/activate` | Activate project |
| GET | `/api/v1/projects/needing-attention` | Get projects without next action (FR-018) |
| GET | `/api/v1/projects/due-for-review` | Get projects due for review |

**Request/Response Formats**:

**List Projects (GET /api/v1/projects)**:
Query params: `?status=active` (optional filter)
```json
{
  "projects": [
    {
      "id": "uuid",
      "title": "Project Title",
      "outcome": "Expected outcome",
      "status": "active",
      "position": 0,
      "review_date": "2025-12-10",
      "version": 1,
      "created_at": "2025-12-03T10:00:00+00:00",
      "updated_at": "2025-12-03T10:00:00+00:00",
      "completed_at": null,
      "task_count": 5,
      "next_action_count": 2,
      "has_next_action": true
    }
  ],
  "count": 1
}
```

**Get Project (GET /api/v1/projects/{id})**:
```json
{
  "project": {
    "id": "uuid",
    "title": "Project Title",
    "outcome": "Expected outcome",
    "status": "active",
    "position": 0,
    "review_date": "2025-12-10",
    "version": 1,
    "created_at": "...",
    "updated_at": "...",
    "completed_at": null,
    "next_action": {
      "id": "task-uuid",
      "title": "Next task to do"
    },
    "tasks": [
      { "id": "...", "title": "...", "status": "next_action" },
      { "id": "...", "title": "...", "status": "waiting_for" }
    ]
  }
}
```

**Create Project (POST /api/v1/projects)**:
```json
{
  "title": "New Project",
  "outcome": "What success looks like (FR-019)"
}
```

**Update Project (PATCH /api/v1/projects/{id})**:
```json
{
  "title": "Updated Title",
  "outcome": "Updated outcome",
  "position": 2,
  "review_date": "2025-12-15"
}
```

**Error Codes**:
- `NOT_AUTHENTICATED` (401): Missing or invalid token
- `NOT_FOUND` (404): Project not found or not owned by user
- `VALIDATION_ERROR` (400): Invalid input data
- `INVALID_TRANSITION` (400): Invalid status transition
- `MISSING_TITLE` (400): Title is required

### 4. ProjectTest (P5-008)

**File**: `api/tests/Functional/Project/ProjectTest.php`

Following the pattern from `ContextTest.php`:

**Test Cases**:
```php
// List tests
testListProjectsReturnsUserProjects()
testListProjectsRequiresAuthentication()
testListProjectsExcludesOtherUsers()
testListProjectsFilterByStatus()
testListProjectsOrdersByPosition()

// Get single project tests
testGetProjectById()
testGetProjectReturnsTasksList()
testGetProjectReturnsNextAction()
testGetProjectNotFound()
testCannotGetOtherUserProject()

// Create tests
testCreateProject()
testCreateProjectWithOutcome()
testCreateProjectRequiresTitle()
testCreateProjectRequiresAuthentication()
testCreateProjectSetsDefaultPosition()

// Update tests
testUpdateProjectTitle()
testUpdateProjectOutcome()
testUpdateProjectPosition()
testUpdateProjectReviewDate()
testCannotUpdateOtherUserProject()

// Delete tests
testDeleteProjectSoftDeletes()
testCannotDeleteOtherUserProject()

// Status transition tests
testCompleteProject()
testPutProjectOnHold()
testActivateProjectFromHold()
testCannotCompleteAlreadyCompletedProject()

// GTD-specific tests (FR-017, FR-018)
testGetProjectsNeedingAttention()
testGetProjectsDueForReview()
testProjectWithNextActionNotInNeedingAttention()
```

## Implementation Order (TDD)

1. **P5-006**: Write unit tests for ProjectService (RED)
2. **P5-005**: Implement ProjectService to pass tests (GREEN)
3. **P5-008**: Write functional tests for ProjectController (RED)
4. **P5-007**: Implement ProjectController to pass tests (GREEN)
5. Run full test suite
6. Check code coverage

## Dependencies

- Phase 5.1 completed (Project entity, ProjectRepository)
- TaskRepository for next action queries
- User authentication system

## Test Commands

```bash
# Run unit tests
docker exec gtd-api-1 php bin/phpunit tests/Unit/Service/ProjectServiceTest.php

# Run functional tests
docker exec gtd-api-1 php bin/phpunit tests/Functional/Project/ProjectTest.php

# Run all Phase 5 tests
docker exec gtd-api-1 php bin/phpunit tests/Unit/Entity/ProjectTest.php tests/Unit/Repository/ProjectRepositoryTest.php tests/Unit/Service/ProjectServiceTest.php tests/Functional/Project/ProjectTest.php

# Code coverage
docker exec gtd-api-1 php bin/phpunit --coverage-text
```

## Acceptance Criteria

- [ ] All unit tests pass for ProjectService
- [ ] All functional tests pass for ProjectController
- [ ] API endpoints follow REST conventions
- [ ] FR-017: Next action is correctly identified per project
- [ ] FR-018: Projects without next action are flagged
- [ ] FR-019: Outcome can be defined and retrieved
- [ ] Code coverage >= 80%
- [ ] CI pipeline passes
