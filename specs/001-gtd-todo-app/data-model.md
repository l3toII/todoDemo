# Data Model: GTD Todo App

**Feature**: 001-gtd-todo-app
**Date**: 2025-11-28
**Database**: MariaDB 10.11+

## Entity Overview

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │───1:N─│    Task     │───N:1─│   Project   │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │                     │
       │                     │N:M                  │
       │              ┌──────┴──────┐              │
       │              │             │              │
       │         ┌────┴────┐  ┌─────┴─────┐       │
       │         │ Context │  │TaskContext│       │
       │         └─────────┘  └───────────┘       │
       │
       ├──────1:N──────┐
       │               │
┌──────┴──────┐  ┌─────┴─────┐
│   Review    │  │CalendarEvt│
└─────────────┘  └───────────┘
```

## Entities

### User

Represents a system user with authentication credentials and preferences.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password_hash | VARCHAR(255) | NULL | Hashed password (null for Apple Sign-In only users) |
| apple_id | VARCHAR(255) | UNIQUE, NULL | Apple Sign-In identifier |
| status | ENUM | NOT NULL, DEFAULT 'pending_verification' | Account status |
| notification_preferences | JSON | NOT NULL, DEFAULT '{}' | Notification settings |
| timezone | VARCHAR(50) | NOT NULL, DEFAULT 'UTC' | User timezone |
| created_at | TIMESTAMP | NOT NULL | Account creation date |
| updated_at | TIMESTAMP | NOT NULL | Last update date |
| verified_at | TIMESTAMP | NULL | Email verification date |
| last_login_at | TIMESTAMP | NULL | Last login timestamp |

**Statuses**: `pending_verification`, `active`, `suspended`, `deleted`

**Validation Rules**:
- Email must be valid format and unique
- Password minimum 8 characters, 1 uppercase, 1 number (when set)
- Status transitions: pending_verification → active → suspended/deleted

**Indexes**:
- `idx_user_email` on (email)
- `idx_user_apple_id` on (apple_id)
- `idx_user_status` on (status)

---

### Task

Core GTD unit representing any captured item flowing through the workflow.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → User, NOT NULL | Owner |
| project_id | UUID | FK → Project, NULL | Parent project (if any) |
| title | VARCHAR(500) | NOT NULL | Task title |
| notes | TEXT | NULL | Additional notes/details |
| status | ENUM | NOT NULL, DEFAULT 'inbox' | GTD workflow status |
| energy_level | ENUM | NULL | Required energy (low, medium, high) |
| time_estimate | INT | NULL | Estimated minutes |
| due_date | DATE | NULL | Optional deadline |
| due_time | TIME | NULL | Optional deadline time |
| position | INT | NOT NULL, DEFAULT 0 | Sort order within list |
| version | INT | NOT NULL, DEFAULT 1 | Optimistic locking / sync version |
| created_at | TIMESTAMP | NOT NULL | Capture timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last modification |
| completed_at | TIMESTAMP | NULL | Completion timestamp |
| deleted_at | TIMESTAMP | NULL | Soft delete timestamp |

**Statuses**: `inbox`, `clarified`, `next_action`, `waiting_for`, `someday_maybe`, `reference`, `completed`, `deleted`

**Validation Rules**:
- Title required, max 500 characters
- Status must follow GTD workflow transitions
- Due date cannot be in the past (on creation)
- If project_id set, project must belong to same user

**State Transitions**:
```
inbox → clarified → next_action → completed
                 → waiting_for → next_action
                 → someday_maybe → next_action
                 → reference
                 → deleted (from any state)
```

**Indexes**:
- `idx_task_user_status` on (user_id, status)
- `idx_task_user_due` on (user_id, due_date)
- `idx_task_project` on (project_id)
- `idx_task_updated` on (updated_at) -- for sync

---

### Project

A desired outcome requiring multiple tasks to complete.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → User, NOT NULL | Owner |
| title | VARCHAR(255) | NOT NULL | Project name |
| outcome | TEXT | NULL | Desired outcome description |
| status | ENUM | NOT NULL, DEFAULT 'active' | Project status |
| position | INT | NOT NULL, DEFAULT 0 | Sort order |
| review_date | DATE | NULL | Next review date |
| version | INT | NOT NULL, DEFAULT 1 | Sync version |
| created_at | TIMESTAMP | NOT NULL | Creation date |
| updated_at | TIMESTAMP | NOT NULL | Last update |
| completed_at | TIMESTAMP | NULL | Completion date |

**Statuses**: `active`, `on_hold`, `completed`, `cancelled`

**Validation Rules**:
- Title required, max 255 characters
- Project belongs to user
- Cannot delete project with active tasks (must reassign first)

**Computed Properties** (not stored):
- `next_action`: First task with status `next_action` ordered by position
- `has_next_action`: Boolean indicating if next action is defined
- `task_count`: Count of non-deleted tasks
- `completed_task_count`: Count of completed tasks

**Indexes**:
- `idx_project_user_status` on (user_id, status)

---

### Context

Label for filtering tasks by situation (predefined or custom).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → User, NULL | Owner (NULL = system default) |
| name | VARCHAR(50) | NOT NULL | Context name (e.g., "@Office") |
| icon | VARCHAR(50) | NULL | Icon identifier |
| color | VARCHAR(7) | NULL | Hex color code |
| is_default | BOOLEAN | NOT NULL, DEFAULT FALSE | System-provided context |
| status | ENUM | NOT NULL, DEFAULT 'active' | Context status |
| position | INT | NOT NULL, DEFAULT 0 | Sort order |
| created_at | TIMESTAMP | NOT NULL | Creation date |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Statuses**: `active`, `archived`

**Default Contexts** (seeded, user_id = NULL):
- @Office, @Home, @Phone, @Errands, @Computer, @Waiting

**Validation Rules**:
- Name required, max 50 characters, starts with "@"
- Name unique per user (including defaults)
- Cannot delete default contexts

**Indexes**:
- `idx_context_user` on (user_id)
- `idx_context_name` on (user_id, name) UNIQUE

---

### TaskContext (Join Table)

Many-to-many relationship between tasks and contexts.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| task_id | UUID | PK, FK → Task | Task reference |
| context_id | UUID | PK, FK → Context | Context reference |
| created_at | TIMESTAMP | NOT NULL | Association date |

**Validation Rules**:
- Task and context must belong to same user (or context is default)
- No duplicate associations

---

### Review

Record of a weekly review session.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → User, NOT NULL | Owner |
| status | ENUM | NOT NULL, DEFAULT 'in_progress' | Review status |
| started_at | TIMESTAMP | NOT NULL | Review start time |
| completed_at | TIMESTAMP | NULL | Review completion time |
| notes | TEXT | NULL | Review notes |
| inbox_count | INT | NOT NULL, DEFAULT 0 | Inbox items at start |
| projects_reviewed | INT | NOT NULL, DEFAULT 0 | Projects reviewed count |
| actions_created | INT | NOT NULL, DEFAULT 0 | New actions created |

**Statuses**: `in_progress`, `completed`, `skipped`

**Validation Rules**:
- Only one review can be in_progress per user
- completed_at required when status = completed

**Indexes**:
- `idx_review_user_date` on (user_id, started_at)

---

### CalendarEvent

Fixed date/time commitment distinct from flexible actions.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → User, NOT NULL | Owner |
| title | VARCHAR(255) | NOT NULL | Event title |
| description | TEXT | NULL | Event description |
| start_date | DATE | NOT NULL | Event date |
| start_time | TIME | NULL | Event start time |
| end_time | TIME | NULL | Event end time |
| all_day | BOOLEAN | NOT NULL, DEFAULT FALSE | All-day event |
| status | ENUM | NOT NULL, DEFAULT 'scheduled' | Event status |
| reminder_minutes | INT | NULL | Reminder before event (minutes) |
| recurrence_rule | VARCHAR(255) | NULL | iCal RRULE format |
| version | INT | NOT NULL, DEFAULT 1 | Sync version |
| created_at | TIMESTAMP | NOT NULL | Creation date |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Statuses**: `scheduled`, `completed`, `cancelled`

**Validation Rules**:
- Title required, max 255 characters
- start_date required
- end_time must be after start_time (if both set)

**Indexes**:
- `idx_calendar_user_date` on (user_id, start_date)

---

### RefreshToken

JWT refresh token storage for token rotation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → User, NOT NULL | Token owner |
| token_hash | VARCHAR(255) | NOT NULL | Hashed refresh token |
| device_info | VARCHAR(255) | NULL | Device identifier |
| expires_at | TIMESTAMP | NOT NULL | Token expiration |
| created_at | TIMESTAMP | NOT NULL | Token creation |
| revoked_at | TIMESTAMP | NULL | Revocation timestamp |

**Indexes**:
- `idx_refresh_token_user` on (user_id)
- `idx_refresh_token_hash` on (token_hash)

---

### FeatureFlag

Simple feature flag storage.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Flag identifier |
| type | ENUM | NOT NULL | Flag type |
| enabled | BOOLEAN | NOT NULL, DEFAULT FALSE | Global enable |
| percentage | INT | NOT NULL, DEFAULT 0 | Percentage rollout (0-100) |
| user_ids | JSON | NULL | Specific user IDs |
| description | TEXT | NULL | Flag description |
| expires_at | TIMESTAMP | NULL | Auto-disable date |
| created_at | TIMESTAMP | NOT NULL | Creation date |
| updated_at | TIMESTAMP | NOT NULL | Last update |

**Types**: `release`, `experiment`, `ops`, `permission`

---

## Database Migrations Order

1. `001_create_users_table`
2. `002_create_contexts_table` (seed defaults)
3. `003_create_projects_table`
4. `004_create_tasks_table`
5. `005_create_task_contexts_table`
6. `006_create_reviews_table`
7. `007_create_calendar_events_table`
8. `008_create_refresh_tokens_table`
9. `009_create_feature_flags_table`

## Sync Considerations

All syncable entities (Task, Project, Context, CalendarEvent) include:
- `version`: Incremented on every update, used for conflict detection
- `updated_at`: Timestamp for delta sync queries
- `deleted_at`: Soft delete for sync propagation

**Sync Query Pattern**:
```sql
SELECT * FROM tasks
WHERE user_id = ?
  AND updated_at > ?
ORDER BY updated_at ASC
LIMIT 100;
```

**Conflict Resolution**: Last-write-wins based on `updated_at`, with `version` mismatch triggering client refresh.
