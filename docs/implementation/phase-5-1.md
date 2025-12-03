# Phase 5.1 Implementation: Backend - Project Entity

## Overview

Phase 5.1 completes the Project entity implementation that was stubbed in Phase 2 for the Task→Project relation. This phase adds full GTD project management support with status tracking, outcome definition, and computed properties.

## Current State

The existing Project entity (`api/src/Entity/Project.php`) is a minimal stub with:
- `id`, `user`, `name`, `createdAt`, `updatedAt`

The migration (`api/migrations/Version003CreateProjectsTable.php`) creates only:
- `id`, `user_id`, `name`, `created_at`, `updated_at` columns

## Target State (from specs/data-model.md)

### Project Entity Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier (existing) |
| user_id | UUID | FK → User, NOT NULL | Owner (existing) |
| title | VARCHAR(255) | NOT NULL | Project name (rename from `name`) |
| outcome | TEXT | NULL | Desired outcome description |
| status | ENUM | NOT NULL, DEFAULT 'active' | Project status |
| position | INT | NOT NULL, DEFAULT 0 | Sort order |
| review_date | DATE | NULL | Next review date |
| version | INT | NOT NULL, DEFAULT 1 | Sync version |
| created_at | TIMESTAMP | NOT NULL | Creation date (existing) |
| updated_at | TIMESTAMP | NOT NULL | Last update (existing) |
| completed_at | TIMESTAMP | NULL | Completion date |

### Project Statuses
- `active` - Currently being worked on
- `on_hold` - Paused temporarily
- `completed` - Successfully finished
- `cancelled` - Abandoned

### Computed Properties (not stored, calculated from Tasks)
- `next_action`: First next_action task in this project
- `has_next_action`: Boolean indicating if project has a next action
- `task_count`: Total tasks in project
- `completed_task_count`: Completed tasks in project

### Index
- `idx_project_user_status` on (user_id, status)

### Business Rules
- Title is required, max 255 characters
- Cannot delete project with active tasks (enforced at service level, not entity)

## Tasks

### P5-001: Update Project Doctrine Entity
**File:** `api/src/Entity/Project.php`

Changes:
1. Rename `name` field to `title` for consistency with specs
2. Add `outcome` (TEXT, nullable)
3. Add `status` (STRING, default 'active') with constants
4. Add `position` (INT, default 0)
5. Add `review_date` (DATE, nullable)
6. Add `version` (INT, default 1) with ORM Version annotation
7. Add `completed_at` (TIMESTAMP, nullable)
8. Add `tasks` OneToMany relation for computed properties
9. Add status helper methods: `isActive()`, `isOnHold()`, `isCompleted()`, `isCancelled()`
10. Add status transition methods: `complete()`, `putOnHold()`, `activate()`, `cancel()`
11. Add computed property methods: `getNextAction()`, `hasNextAction()`, `getTaskCount()`, `getCompletedTaskCount()`
12. Add `toArray()` serialization method
13. Link to ProjectRepository

### P5-002: Update Project Unit Tests
**File:** `api/tests/Unit/Entity/ProjectTest.php`

Test coverage:
1. Creation with default values
2. All getters/setters for new fields
3. Status constants and STATUSES array
4. Status helper methods (isActive, isOnHold, isCompleted, isCancelled)
5. Status transition methods with auto-timestamps
6. Position getter/setter
7. Version getter (managed by Doctrine)
8. Review date getter/setter
9. Outcome getter/setter
10. Title getter/setter (renamed from name)
11. toArray() serialization
12. Fluent interface
13. Lifecycle callbacks (onPreUpdate)

### P5-003: Create ProjectRepository
**File:** `api/src/Repository/ProjectRepository.php`

Methods:
1. `save(Project, bool $flush)` - Persist project
2. `remove(Project, bool $flush)` - Remove project
3. `findById(Uuid)` - Find by UUID
4. `findAllByUser(User)` - All user's projects
5. `findActiveByUser(User)` - Active projects only
6. `findByStatus(User, string $status)` - Filter by status
7. `countByUser(User)` - Total projects for user
8. `getMaxPositionByUser(User)` - For position ordering
9. `findWithoutNextAction(User)` - Projects needing attention (FR-018)

### P5-004: Create Database Migration
**File:** `api/migrations/Version20251203AddProjectFields.php`

Since Version003CreateProjectsTable.php already exists and may have been run:
1. Create new migration to ADD columns (not recreate table)
2. Add: outcome, status, position, review_date, version, completed_at
3. Rename: name → title (requires data migration consideration)
4. Add index: idx_project_user_status on (user_id, status)
5. Set default values for existing rows

## Implementation Order (TDD)

1. **P5-002**: Write unit tests first (Red)
2. **P5-001**: Implement entity to pass tests (Green)
3. **P5-003**: Create repository (after entity is complete)
4. **P5-004**: Create migration (last, after entity mapping is finalized)

## Test Commands

```bash
# Run Project entity tests
docker exec -it gtd-todo-api php bin/phpunit tests/Unit/Entity/ProjectTest.php

# Run all unit tests
docker exec -it gtd-todo-api php bin/phpunit tests/Unit/

# Validate Doctrine mapping
docker exec -it gtd-todo-api php bin/console doctrine:schema:validate
```

## Side Effects Analysis

### Affected Files
- `api/src/Entity/Task.php` - Already has `?object $project` relation, may need type update to `?Project`
- `api/tests/Unit/Entity/TaskTest.php` - May need updates if Task→Project relation tests exist

### Database
- Existing `projects` table will gain new columns
- Existing rows need default values (status='active', position=0, version=1)
- Column rename (name → title) requires careful migration

### API (Future Phase 5.2)
- No API changes in this phase
- Prepares entity for CRUD endpoints in Phase 5.2

## Notes

- The `tasks` collection on Project entity uses `fetch: EXTRA_LAZY` to avoid loading all tasks when only counting
- Computed properties (`getNextAction`, etc.) query through the Tasks collection efficiently
- The entity does NOT enforce "cannot delete with active tasks" - that's a service-level concern for Phase 5.2
