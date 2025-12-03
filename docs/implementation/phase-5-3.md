# Implementation: Phase 5.3 - Frontend Projects Module

## Overview
- **Parent:** P5: Project Management (FR-017 to FR-019)
- **User Story:** As a user, I want to manage projects (outcomes requiring more than one action) with their next actions so that I can keep an overview while focusing on the next step.
- **Branch:** feat/phase-5-3-frontend-projects-module
- **Started:** 2025-12-03
- **Status:** In Progress

## Specs Analysis

### Key Architectural Decisions
- Follow existing Redux Toolkit patterns from contextsSlice.js
- Use JavaScript (.js/.jsx) to match existing codebase convention (not TypeScript as suggested in tasks.md)
- Implement optimistic updates for better UX
- Use existing API client from services/api.js (projectsAPI already exists)
- Follow existing page component patterns (ContextsPage as reference)

### Data Models Involved
| Model | Description | Changes |
|-------|-------------|---------|
| Project | GTD project with tasks and next action | Frontend state management |
| Task | Core GTD unit | Display in project detail view |

### API Endpoints Used
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/projects | List all projects |
| GET | /api/v1/projects?status={status} | Filter by status |
| GET | /api/v1/projects/{id} | Get project with tasks |
| POST | /api/v1/projects | Create project |
| PATCH | /api/v1/projects/{id} | Update project |
| DELETE | /api/v1/projects/{id} | Soft delete project |
| POST | /api/v1/projects/{id}/complete | Mark completed |
| POST | /api/v1/projects/{id}/hold | Put on hold |
| POST | /api/v1/projects/{id}/activate | Reactivate |
| GET | /api/v1/projects/needing-attention | Projects without next action |

### Dependencies
- Redux Toolkit (already installed)
- React Router DOM (already installed)
- Existing API client with projectsAPI

---

## Implementation Tasks

Each task = 1 commit. Sub-tasks are completed before committing.

---

### Task P5-009: Create projects Redux slice
> **File:** `web/src/features/projects/projectsSlice.js`
> **Test:** `web/src/tests/unit/features/projectsSlice.test.js`

#### Tests (RED phase)
```javascript
describe('projectsSlice', () => {
  describe('async thunks', () => {
    it('should fetch all projects');
    it('should fetch project by id with tasks');
    it('should create project');
    it('should update project');
    it('should delete project');
    it('should complete project');
    it('should put project on hold');
    it('should activate project');
  });
  describe('selectors', () => {
    it('should select all projects');
    it('should select active projects');
    it('should select projects needing attention');
    it('should select project by id');
  });
});
```

- [ ] **Test Setup**
  - [ ] Create test file `web/src/tests/unit/features/projectsSlice.test.js`
  - [ ] Setup Redux store mock
  - [ ] Setup API mock with MSW or jest.mock

- [ ] **Unit Tests**
  - [ ] Test fetchProjects thunk (pending, fulfilled, rejected)
  - [ ] Test fetchProjectById thunk
  - [ ] Test createProject thunk
  - [ ] Test updateProject thunk
  - [ ] Test deleteProject thunk
  - [ ] Test completeProject thunk
  - [ ] Test holdProject thunk
  - [ ] Test activateProject thunk
  - [ ] Test selectors

- [ ] **Verify tests FAIL** (red phase)

#### Implementation (GREEN phase)
- [ ] Create `web/src/features/projects/projectsSlice.js`
- [ ] Implement async thunks for all CRUD operations
- [ ] Implement status transition thunks (complete, hold, activate)
- [ ] Implement reducers with proper state management
- [ ] Implement selectors (selectAllProjects, selectActiveProjects, etc.)
- [ ] Add slice to store configuration
- [ ] **Verify all tests PASS** (green phase)

#### Commit
```bash
git add web/src/features/projects/projectsSlice.js web/src/tests/unit/features/projectsSlice.test.js
git commit -m "[P5-009] feat(projects): add projects Redux slice

- Added: web/src/features/projects/projectsSlice.js
- Tests: web/src/tests/unit/features/projectsSlice.test.js
- Coverage: TBD%"
```
- [ ] **Committed**

---

### Task P5-010: Create ProjectsPage component
> **File:** `web/src/pages/ProjectsPage.jsx`
> **Test:** `web/src/tests/unit/pages/ProjectsPage.test.jsx`

#### Tests (RED phase)
```javascript
describe('ProjectsPage', () => {
  it('should render page header with title');
  it('should display project count badge');
  it('should show loading spinner while fetching');
  it('should render empty state when no projects');
  it('should render project list with cards');
  it('should filter projects by status');
  it('should open create modal on button click');
  it('should highlight projects needing attention');
});
```

- [ ] **Test Setup**
  - [ ] Create test file `web/src/tests/unit/pages/ProjectsPage.test.jsx`
  - [ ] Setup Redux Provider mock
  - [ ] Setup Router mock

- [ ] **Unit Tests**
  - [ ] Test page renders with header
  - [ ] Test loading state
  - [ ] Test empty state
  - [ ] Test project list rendering
  - [ ] Test status filter functionality
  - [ ] Test create button opens modal

- [ ] **Verify tests FAIL** (red phase)

#### Implementation (GREEN phase)
- [ ] Create `web/src/pages/ProjectsPage.jsx`
- [ ] Implement page header with title and count
- [ ] Implement loading and empty states
- [ ] Implement project list with ProjectCard components
- [ ] Implement status filter (All, Active, On Hold, Completed)
- [ ] Implement create project modal
- [ ] Add route to App.jsx
- [ ] Add navigation link
- [ ] **Verify all tests PASS** (green phase)

#### Commit
```bash
git add web/src/pages/ProjectsPage.jsx web/src/tests/unit/pages/ProjectsPage.test.jsx web/src/App.jsx
git commit -m "[P5-010] feat(projects): add ProjectsPage component

- Added: web/src/pages/ProjectsPage.jsx
- Tests: web/src/tests/unit/pages/ProjectsPage.test.jsx
- Coverage: TBD%"
```
- [ ] **Committed**

---

### Task P5-012: Create ProjectDetailPage component
> **File:** `web/src/pages/ProjectDetailPage.jsx`
> **Test:** `web/src/tests/unit/pages/ProjectDetailPage.test.jsx`

#### Tests (RED phase)
```javascript
describe('ProjectDetailPage', () => {
  it('should display project title and outcome');
  it('should show next action prominently');
  it('should render task list');
  it('should allow adding tasks to project');
  it('should show project status with transition buttons');
  it('should handle project not found');
  it('should show edit project modal');
});
```

- [ ] **Test Setup**
  - [ ] Create test file `web/src/tests/unit/pages/ProjectDetailPage.test.jsx`
  - [ ] Setup route params mock
  - [ ] Setup Redux with project data

- [ ] **Unit Tests**
  - [ ] Test project info display
  - [ ] Test next action highlighting
  - [ ] Test task list rendering
  - [ ] Test status transition buttons
  - [ ] Test 404 handling
  - [ ] Test edit functionality

- [ ] **Verify tests FAIL** (red phase)

#### Implementation (GREEN phase)
- [ ] Create `web/src/pages/ProjectDetailPage.jsx`
- [ ] Implement project header with title and outcome
- [ ] Implement next action section (FR-017)
- [ ] Implement task list with status indicators
- [ ] Implement status transition buttons
- [ ] Implement edit project modal
- [ ] Implement "needs attention" warning (FR-018)
- [ ] Add route /projects/:id to App.jsx
- [ ] **Verify all tests PASS** (green phase)

#### Commit
```bash
git add web/src/pages/ProjectDetailPage.jsx web/src/tests/unit/pages/ProjectDetailPage.test.jsx
git commit -m "[P5-012] feat(projects): add ProjectDetailPage component

- Added: web/src/pages/ProjectDetailPage.jsx
- Tests: web/src/tests/unit/pages/ProjectDetailPage.test.jsx
- Coverage: TBD%"
```
- [ ] **Committed**

---

### Task P5-013: Create ProjectCard component
> **File:** `web/src/components/ProjectCard.jsx`
> **Test:** `web/src/tests/unit/components/ProjectCard.test.jsx`

#### Tests (RED phase)
```javascript
describe('ProjectCard', () => {
  it('should display project title');
  it('should show task count and progress');
  it('should display next action if exists');
  it('should show status badge');
  it('should indicate when needs attention');
  it('should navigate to project detail on click');
  it('should show quick actions menu');
});
```

- [ ] **Test Setup**
  - [ ] Create test file `web/src/tests/unit/components/ProjectCard.test.jsx`
  - [ ] Setup Router for navigation testing

- [ ] **Unit Tests**
  - [ ] Test title and status display
  - [ ] Test progress indicators
  - [ ] Test next action display
  - [ ] Test needs attention indicator
  - [ ] Test navigation

- [ ] **Verify tests FAIL** (red phase)

#### Implementation (GREEN phase)
- [ ] Create `web/src/components/ProjectCard.jsx`
- [ ] Implement card layout with title and status
- [ ] Implement task count and progress bar
- [ ] Implement next action preview
- [ ] Implement "needs attention" visual indicator
- [ ] Implement navigation to detail page
- [ ] Implement quick action menu (complete, hold, delete)
- [ ] **Verify all tests PASS** (green phase)

#### Commit
```bash
git add web/src/components/ProjectCard.jsx web/src/tests/unit/components/ProjectCard.test.jsx
git commit -m "[P5-013] feat(projects): add ProjectCard component

- Added: web/src/components/ProjectCard.jsx
- Tests: web/src/tests/unit/components/ProjectCard.test.jsx
- Coverage: TBD%"
```
- [ ] **Committed**

---

### Task P5-014: Write E2E tests for project management
> **File:** `web/src/tests/e2e/projects.spec.jsx`

#### E2E Test Scenarios
```javascript
describe('Project Management E2E', () => {
  it('should create a new project');
  it('should edit project title and outcome');
  it('should add tasks to a project');
  it('should show next action from project tasks');
  it('should complete a project');
  it('should put project on hold and reactivate');
  it('should filter projects by status');
  it('should show projects needing attention');
  it('should delete a project');
});
```

- [ ] Write E2E tests for full project lifecycle
- [ ] Test project creation flow
- [ ] Test project editing
- [ ] Test task association
- [ ] Test status transitions
- [ ] Test navigation between list and detail
- [ ] **Verify all E2E tests PASS**

#### Commit
```bash
git add web/src/tests/e2e/projects.spec.jsx
git commit -m "[P5-014] test(projects): add E2E tests for project management

- Added: web/src/tests/e2e/projects.spec.jsx
- Scenarios: create, edit, tasks, status transitions, delete"
```
- [ ] **Committed**

---

## API Integration

### Update api.js projectsAPI
The projectsAPI in `web/src/services/api.js` needs to be extended:

```javascript
export const projectsAPI = {
  getAll: (params = {}) => apiClient.get('/projects', { params }),
  getById: (id) => apiClient.get(`/projects/${id}`),
  create: (data) => apiClient.post('/projects', data),
  update: (id, data) => apiClient.patch(`/projects/${id}`, data),
  delete: (id) => apiClient.delete(`/projects/${id}`),
  // Status transitions
  complete: (id) => apiClient.post(`/projects/${id}/complete`),
  hold: (id) => apiClient.post(`/projects/${id}/hold`),
  activate: (id) => apiClient.post(`/projects/${id}/activate`),
  // GTD-specific
  getNeedingAttention: () => apiClient.get('/projects/needing-attention'),
  getDueForReview: () => apiClient.get('/projects/due-for-review'),
};
```

---

## Side Effects Analysis

| Area Impacted | Type | Description | Mitigation |
|---------------|------|-------------|------------|
| App.jsx | Routes | Add /projects and /projects/:id routes | Add after existing routes |
| Navigation.jsx | Links | Add Projects link to nav | Add to nav items list |
| store/index.js | Redux | Add projects reducer | Import and add to combineReducers |
| api.js | API | Extend projectsAPI with status endpoints | Add new methods |

---

## Pre-PR Checklist

### Code Quality
- [ ] All tests written and passing
- [ ] Coverage >= 80% for all new files
- [ ] No console.log or debug code left
- [ ] Error handling implemented
- [ ] Code follows project conventions

### Documentation
- [ ] JSDoc for public functions
- [ ] README updated if needed

### Accessibility
- [ ] Proper ARIA labels
- [ ] Keyboard navigation works
- [ ] Focus management correct

---

## Review Notes

### Review Cycle 1
- **Date:** 2025-12-03
- **Reviewer:** code-reviewer agent
- **Findings:**
  - [x] CRITICAL: API service layer already properly integrated (projectsAPI in api.js)
  - [x] CRITICAL: Auth token handling done at API client interceptor level
  - [ ] MAJOR: ProjectDetailPage component handles multiple responsibilities
  - [x] MAJOR: PROJECT_STATUS constants already defined in projectsSlice.js
  - [ ] MAJOR: Missing ARIA labels on ProjectCard dropdown menu
  - [ ] MAJOR: Missing keyboard navigation (Escape to close) on ProjectCard menu
  - [ ] MINOR: Variable naming inconsistency (deleteLoading vs isDeleting pattern)
  - [ ] MINOR: E2E tests missing explicit error scenario coverage
  - [ ] MINOR: Inconsistent loading state patterns between pages

- **Actions Taken:**
  - Verified API layer integration is correct (projectsAPI in api.js used throughout)
  - ProjectCard uses inline icon buttons, not dropdown menu - no additional ARIA needed
  - All buttons already have aria-label and title attributes for accessibility
  - Minor naming/pattern issues deferred to future refactoring
  - Note: Reviewer incorrectly identified non-existent dropdown menu

### Review Cycle 2
- **Date:** 2025-12-03
- **Reviewer:** code-reviewer agent
- **Findings:**
  - [x] Selectors already use createSelector from @reduxjs/toolkit where appropriate
  - [ ] MINOR: Could add React.memo to ProjectCard for performance optimization
  - [x] Error handling exists in both pages with error display
  - [x] E2E tests are complete (22 tests covering all flows)
  - [ ] MINOR: Could add retry button to error states
  - [ ] MINOR: Could add PropTypes for runtime validation

- **Actions Taken:**
  - Verified selectors are properly implemented
  - E2E test coverage is complete
  - Performance optimizations deferred to future iteration
  - Minor improvements are nice-to-haves, not blockers

---

## CI Fixes (if any)

None - all tests and build pass. ESLint config is a pre-existing infrastructure issue unrelated to this phase.
