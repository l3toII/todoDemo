# Feature Specification: GTD Todo App

**Feature Branch**: `001-gtd-todo-app`
**Created**: 2025-11-28
**Status**: Draft
**Input**: User description: "Todo app with web and iOS versions, following GTD (Getting Things Done) methodology, with user management"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Account Management (Priority: P1)

As a user, I want to create an account, log in securely, and manage my preferences so that I can access my data across all my devices.

**Why this priority**: User management is the foundation for all other features. Without authentication and user accounts, no data can be persisted or synchronized across platforms.

**Independent Test**: Can be fully tested by creating an account, logging in on web and iOS, modifying preferences, and verifying data persistence.

**Acceptance Scenarios**:

1. **Given** I am a new user, **When** I sign up with my email, **Then** I receive a verification email and can access the application after confirming
2. **Given** I have an account, **When** I log in on a new device, **Then** all my data is synchronized
3. **Given** I want to change my password, **When** I use the reset function, **Then** I receive a secure link to modify it
4. **Given** I am logged in, **When** I update my notification preferences, **Then** the changes are saved and applied immediately

---

### User Story 2 - Capture Ideas and Tasks (Priority: P2)

As a user, I want to quickly capture all my ideas, tasks, and information into a centralized "inbox" so that I can free my mind and not forget anything.

**Why this priority**: Capture is the first fundamental step of GTD. Without it, no other functionality makes sense. It's the entry point for all productivity.

**Independent Test**: Can be fully tested by adding multiple items to the inbox from web and iOS, and verifying their synchronization.

**Acceptance Scenarios**:

1. **Given** I am logged into the application, **When** I type text and press "Capture", **Then** the item is added to my inbox with creation date/time
2. **Given** I captured an item on web, **When** I open the iOS app, **Then** I see the same item in my inbox
3. **Given** I am on the home screen, **When** I use a quick shortcut (iOS widget or web keyboard shortcut), **Then** I can capture an idea in less than 5 seconds

---

### User Story 3 - Clarify and Process Tasks (Priority: P3)

As a user, I want to process each item in my inbox by deciding if it's actionable, and if so, define the concrete next action to take.

**Why this priority**: Clarification transforms chaos into concrete actions. It's the step that gives meaning to captured items.

**Independent Test**: Can be fully tested by processing inbox items, applying the 2-minute rule, and verifying proper categorization.

**Acceptance Scenarios**:

1. **Given** I have an item in my inbox, **When** I process it, **Then** I can choose: actionable (define next action) or non-actionable (delete, reference, or defer)
2. **Given** I identify an action doable in less than 2 minutes, **When** I mark it as "do now", **Then** the system prompts me to complete it immediately
3. **Given** a task requires multiple actions, **When** I convert it to a project, **Then** it appears in my projects list with its first next action

---

### User Story 4 - Organize with Contextual Lists (Priority: P4)

As a user, I want to organize my actions in lists based on context (location, tool, energy) so that I can quickly see what I can do in my current situation.

**Why this priority**: Contextual organization is what makes GTD powerful for execution - seeing only relevant tasks for the present moment.

**Independent Test**: Can be fully tested by creating custom contexts, assigning tasks, and filtering by context.

**Acceptance Scenarios**:

1. **Given** I have defined actions, **When** I assign them a context (@office, @home, @phone, @errands), **Then** I can filter my actions by context
2. **Given** I am in a specific context, **When** I view the corresponding list, **Then** I see only actions achievable in that context
3. **Given** I create a custom context, **When** I use it, **Then** it appears in my filters and I can assign it to my actions

---

### User Story 5 - Project Management (Priority: P5)

As a user, I want to manage projects (outcomes requiring more than one action) with their next actions so that I can keep an overview while focusing on the next step.

**Why this priority**: Projects structure complex work but depend on capture and clarification features being in place.

**Independent Test**: Can be fully tested by creating a project, adding actions, and verifying the next action appears in lists.

**Acceptance Scenarios**:

1. **Given** I create a project, **When** I add actions, **Then** the first uncompleted action is marked as "next action"
2. **Given** I complete a project action, **When** I mark it as done, **Then** the following action automatically becomes the "next action"
3. **Given** a project has no active actions, **When** I view my projects, **Then** it is flagged as needing review

---

### User Story 6 - Weekly Review (Priority: P6)

As a user, I want to perform a guided weekly review of my system so that I maintain trust in my system and don't let anything slip.

**Why this priority**: Review is critical for GTD system longevity but requires other elements to be in place first.

**Independent Test**: Can be fully tested by launching a guided review and verifying the walkthrough of all lists.

**Acceptance Scenarios**:

1. **Given** I launch the weekly review, **When** I follow the guided process, **Then** I review: inbox (empty it), projects (check progress), waiting lists, calendar, and "someday/maybe" lists
2. **Given** I have items waiting for more than 7 days, **When** I do my review, **Then** they are highlighted for action
3. **Given** I complete my review, **When** I finish it, **Then** the date is recorded and I receive a reminder the following week

---

### User Story 7 - Calendar and Deadlines (Priority: P7)

As a user, I want to see my fixed-date commitments and set deadlines for certain actions so that I never miss an appointment or deadline.

**Why this priority**: Calendar is "sacred ground" in GTD - it completes the system but is not the core.

**Independent Test**: Can be fully tested by adding calendar events and deadlines, then verifying reminders.

**Acceptance Scenarios**:

1. **Given** I have an action with a due date, **When** I set it, **Then** it appears in my calendar view
2. **Given** a deadline approaches (24h), **When** the time comes, **Then** I receive a reminder notification
3. **Given** I have a fixed date/time event, **When** I view it, **Then** it is visually distinct from flexible actions

---

### Edge Cases

- What happens when the user is offline? The system must allow local capture and editing with automatic synchronization when connection returns
- What happens if a project is deleted with active actions? Orphan actions must be moved to inbox for reprocessing
- How to handle sync conflicts between web and iOS? Last modification wins with version history for recovery
- What happens if the inbox contains more than 100 unprocessed items? A visual alert encourages the user to process their items
- What happens if a user's session expires? The system must redirect to login while preserving any unsaved draft

## Requirements *(mandatory)*

### Functional Requirements

**User Management**
- **FR-001**: System MUST allow user registration via email with verification
- **FR-002**: System MUST support email/password authentication and Apple Sign-In
- **FR-003**: System MUST allow password reset via email
- **FR-004**: System MUST synchronize user data across all their devices
- **FR-005**: System MUST allow users to manage notification preferences
- **FR-006**: System MUST support secure session management with automatic logout after inactivity
- **FR-006b**: System MUST permanently delete all user data immediately upon account deletion request (GDPR compliance)

**Capture (Inbox)**
- **FR-007**: System MUST allow free text capture to inbox in less than 3 interactions
- **FR-008**: System MUST automatically timestamp each captured item
- **FR-009**: System MUST synchronize inbox between web and iOS in real-time (delay < 5 seconds)

**Clarification**
- **FR-010**: System MUST allow processing an item by categorizing it: actionable or non-actionable
- **FR-011**: System MUST support the 2-minute rule by identifying quick actions
- **FR-012**: System MUST allow converting an item to a project if multiple actions are needed

**Organization**
- **FR-013**: System MUST provide default contexts: @Office, @Home, @Phone, @Errands, @Computer, @Waiting
- **FR-014**: System MUST allow creation of custom contexts
- **FR-015**: System MUST allow filtering actions by context
- **FR-016**: System MUST maintain GTD lists: Next Actions, Projects, Waiting For, Someday/Maybe, Reference

**Projects**
- **FR-017**: System MUST automatically identify the next action of a project
- **FR-018**: System MUST flag projects without a defined next action
- **FR-019**: System MUST allow defining an expected outcome for each project

**Review**
- **FR-020**: System MUST offer a guided weekly review process
- **FR-021**: System MUST remind about weekly review if not done in 7 days
- **FR-022**: System MUST highlight neglected items (full inbox, blocked projects)

**Calendar**
- **FR-023**: System MUST allow adding due dates to actions
- **FR-024**: System MUST display a calendar view of commitments
- **FR-025**: System MUST send reminder notifications for deadlines

**Multi-platform**
- **FR-026**: System MUST work on modern web browsers (Chrome, Firefox, Safari, Edge)
- **FR-027**: System MUST work on iOS 15 and later versions
- **FR-028**: System MUST support offline mode with automatic synchronization

### Key Entities

- **User**: Represents a system user with credentials, preferences, notification settings, and account status
  - Statuses: `pending_verification`, `active`, `suspended`, `deleted`

- **Task**: Core unit representing any captured item that flows through the GTD workflow
  - Statuses: `inbox` (newly captured), `clarified` (processed but not yet organized), `next_action` (ready to do), `waiting_for` (delegated/blocked), `someday_maybe` (deferred), `reference` (non-actionable info), `completed`, `deleted`
  - Attributes: title, notes, context(s), due date, energy level, time estimate, parent project

- **Project**: A desired outcome requiring multiple tasks to complete
  - Statuses: `active`, `on_hold`, `completed`, `cancelled`
  - Attributes: title, outcome description, task list, review date

- **Context**: Label for filtering tasks by situation (predefined or custom)
  - Statuses: `active`, `archived`
  - Attributes: name, icon, color, is_default

- **Review**: Record of a weekly review session
  - Statuses: `in_progress`, `completed`, `skipped`
  - Attributes: start date, completion date, notes, items reviewed count

- **CalendarEvent**: Fixed date/time commitment distinct from flexible actions
  - Statuses: `scheduled`, `completed`, `cancelled`
  - Attributes: title, date/time, duration, reminder settings, recurrence

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete account creation in under 2 minutes
- **SC-002**: Users can capture a new idea in less than 5 seconds from any screen
- **SC-003**: 80% of users empty their inbox at least once per week
- **SC-004**: Average processing time per item (clarification) is under 30 seconds
- **SC-005**: 70% of active users complete their weekly review
- **SC-006**: Synchronization between devices completes in less than 5 seconds
- **SC-007**: 90% of users find the appropriate task to do in less than 10 seconds using contextual filters
- **SC-008**: 30-day user retention rate is above 60%
- **SC-009**: Users report a 40% reduction in organization-related stress (survey)
- **SC-010**: Application works correctly offline for at least 24 hours with successful sync on reconnection

## Clarifications

### Session 2025-11-28

- Q: Expected user scale and data volume? → A: Small scale (< 1,000 users, < 10,000 tasks total)
- Q: External calendar integration? → A: Internal only (built-in calendar view, no external sync)
- Q: Authentication method? → A: Email/password + Apple Sign-In
- Q: Data retention on account deletion? → A: Immediate permanent deletion of all user data

## Assumptions

- **Scale target**: Small scale deployment supporting up to 1,000 concurrent users and 10,000 total tasks
- **Calendar**: Internal calendar only; no integration with external calendars (Google, Apple, Outlook) in initial release
- Users have basic knowledge of GTD methodology or are willing to learn it through the application
- Mobile app targets iOS only initially (Android may be added later)
- Push notifications will be used for reminders on iOS
- User data storage will comply with privacy standards (GDPR)
- **Data deletion**: Immediate permanent deletion of all user data upon account deletion (no soft-delete period)
- Internet connection is required for initial registration and sync, but offline mode is supported after first sync
- Task status transitions follow GTD workflow rules and are validated by the system
