# Implementation: Phase 6.1 - ClarifyWizard Enhancement

## Overview
- **Parent:** P6 UX Redesign - GTD Workflow Improvements
- **User Story:** As a user, I want a streamlined GTD experience with keyboard shortcuts, inline clarification, and unified task views so that I can work faster and stay in flow.
- **Branch:** feat/phase-6-1-clarify-wizard-enhancement
- **Started:** 2025-12-04
- **Status:** In Progress

## Specs Analysis

### Key Architectural Decisions
- **Frontend-only changes**: No backend modifications required - API already supports contexts, projects, and all required fields
- **Use existing Redux slices**: Leverage `contextsSlice` and `projectsSlice` for data fetching
- **API integration**: Use existing `tasksAPI.setContexts()` and `clarify()` with `projectId` parameter
- **Progressive enhancement**: Add features to existing ClarifyWizard without breaking current functionality

### Data Models Involved
| Model | Description | Changes |
|-------|-------------|---------|
| Task | Main task entity | No changes - API already supports contexts and project_id |
| Context | GTD context entity | No changes - existing fetchContexts/selectAllContexts |
| Project | Project entity | No changes - existing fetchProjects/selectActiveProjects |

### Dependencies
- `contextsSlice`: Already exports `fetchContexts`, `selectAllContexts`
- `projectsSlice`: Already exports `fetchProjects`, `selectActiveProjects`
- `tasksAPI.setContexts(id, contextIds)`: Already implemented
- `tasksAPI.clarify(id, { projectId })`: Already supports project_id parameter

### Existing Code Analysis

**ClarifyWizard.jsx** (629 lines):
- Location: `web/src/features/tasks/ClarifyWizard.jsx`
- Current steps: ACTIONABLE, TWO_MINUTE, DO_IT_NOW, SINGLE_OR_PROJECT, WHAT_TO_DO, NON_ACTIONABLE, ADD_DETAILS, CREATE_PROJECT
- Missing: Context selection UI, project selection (only "convert to project" exists), waitingForPerson not saved to notes

**API Already Supports**:
- `tasksAPI.clarify()` accepts `projectId` in clarificationData (line 119 in api.js)
- `tasksAPI.setContexts(id, contextIds)` exists (line 122 in api.js)

---

## Implementation Tasks

Each task = 1 commit. Sub-tasks are completed before committing.

---

### Task P6-001: Add context selection UI to ADD_DETAILS step
> **File:** `web/src/features/tasks/ClarifyWizard.jsx`
> **Test:** `web/src/tests/unit/features/ClarifyWizard.test.jsx`

#### Tests (RED phase)
```javascript
describe('ClarifyWizard - Context Selection', () => {
  it('should render context chips in ADD_DETAILS step', () => {});
  it('should allow selecting multiple contexts', () => {});
  it('should show selected contexts with visual indicator', () => {});
  it('should toggle context selection on click', () => {});
});
```

- [ ] **Test Setup**
  - [ ] Create test file if not exists
  - [ ] Setup Redux store mock with contexts state
  - [ ] Setup mock contexts data

- [ ] **Unit Tests**
  - [ ] `should render context chips when contexts are loaded`
  - [ ] `should handle empty contexts array gracefully`
  - [ ] `should toggle context selection on click`
  - [ ] `should show visual indicator for selected contexts`

- [ ] **Verify tests FAIL** (red phase)

#### Implementation (GREEN phase)
- [ ] Add `selectedContexts` to formData state (array of IDs)
- [ ] Import `useSelector` to get contexts from Redux
- [ ] Import `selectAllContexts` from contextsSlice
- [ ] Add context chips UI in ADD_DETAILS step (after Notes field)
- [ ] Implement toggle handler for context selection
- [ ] **Verify all tests PASS** (green phase)

#### Quality Check
- [ ] Run: `npm test -- --coverage web/src/features/tasks/ClarifyWizard`
- [ ] Coverage >= 80%: ___% ✅/❌

#### Commit
```bash
git add web/src/features/tasks/ClarifyWizard.jsx web/src/tests/unit/features/ClarifyWizard.test.jsx
git commit -m "[P6-001] feat(clarify): add context selection UI to ADD_DETAILS step

- Added context chips display in ClarifyWizard
- Implemented multi-select toggle for contexts
- Contexts fetched from Redux store"
```
- [ ] **Committed**

---

### Task P6-002: Fetch and display contexts in wizard
> **File:** `web/src/features/tasks/ClarifyWizard.jsx`
> **Test:** `web/src/tests/unit/features/ClarifyWizard.test.jsx`

#### Tests (RED phase)
```javascript
describe('ClarifyWizard - Context Fetching', () => {
  it('should dispatch fetchContexts on mount if contexts empty', () => {});
  it('should not re-fetch if contexts already loaded', () => {});
  it('should show loading state while fetching', () => {});
});
```

- [ ] **Unit Tests**
  - [ ] `should dispatch fetchContexts on mount if contexts empty`
  - [ ] `should not dispatch fetchContexts if already loaded`
  - [ ] `should show loading indicator while contexts loading`

- [ ] **Verify tests FAIL**

#### Implementation (GREEN phase)
- [ ] Import `fetchContexts` from contextsSlice
- [ ] Import `selectContextsLoading` from contextsSlice
- [ ] Add useEffect to fetch contexts if empty
- [ ] Show loading state for context chips
- [ ] **Verify all tests PASS**

#### Quality Check
- [ ] Coverage >= 80%: ___% ✅/❌

#### Commit
```bash
git commit -m "[P6-002] feat(clarify): fetch contexts on wizard mount

- Auto-fetch contexts if not loaded
- Show loading indicator while fetching
- Use existing contextsSlice selectors"
```
- [ ] **Committed**

---

### Task P6-003: Call setContexts API after clarify completes
> **File:** `web/src/features/tasks/ClarifyWizard.jsx`
> **Test:** `web/src/tests/unit/features/ClarifyWizard.test.jsx`

#### Tests (RED phase)
```javascript
describe('ClarifyWizard - Context API Call', () => {
  it('should call setContexts API after successful clarify', () => {});
  it('should not call setContexts if no contexts selected', () => {});
  it('should handle setContexts API error gracefully', () => {});
});
```

- [ ] **Unit Tests**
  - [ ] `should call tasksAPI.setContexts after clarify succeeds`
  - [ ] `should skip setContexts call if selectedContexts is empty`
  - [ ] `should handle setContexts error without blocking completion`

- [ ] **Verify tests FAIL**

#### Implementation (GREEN phase)
- [ ] Import `tasksAPI` directly for setContexts call
- [ ] Modify handleSubmit to call setContexts after clarify
- [ ] Only call if selectedContexts.length > 0
- [ ] Handle errors gracefully (log but don't block)
- [ ] **Verify all tests PASS**

#### Quality Check
- [ ] Coverage >= 80%: ___% ✅/❌

#### Commit
```bash
git commit -m "[P6-003] feat(clarify): call setContexts API after clarification

- Integrate tasksAPI.setContexts in handleSubmit
- Only call when contexts are selected
- Graceful error handling"
```
- [ ] **Committed**

---

### Task P6-004: Add "Add to existing project" option in destination step
> **File:** `web/src/features/tasks/ClarifyWizard.jsx`
> **Test:** `web/src/tests/unit/features/ClarifyWizard.test.jsx`

#### Tests (RED phase)
```javascript
describe('ClarifyWizard - Add to Project Option', () => {
  it('should show "Add to existing project" button in WHAT_TO_DO step', () => {});
  it('should navigate to project selection when clicked', () => {});
});
```

- [ ] **Unit Tests**
  - [ ] `should render "Add to existing project" button`
  - [ ] `should navigate to SELECT_PROJECT step on click`

- [ ] **Verify tests FAIL**

#### Implementation (GREEN phase)
- [ ] Add new wizard step constant: `SELECT_PROJECT: 'selectProject'`
- [ ] Add "Add to existing project" button in WHAT_TO_DO step
- [ ] Navigate to SELECT_PROJECT step on click
- [ ] **Verify all tests PASS**

#### Quality Check
- [ ] Coverage >= 80%: ___% ✅/❌

#### Commit
```bash
git commit -m "[P6-004] feat(clarify): add 'Add to existing project' option

- Added button in WHAT_TO_DO step
- Created SELECT_PROJECT wizard step
- Navigate to project selection on click"
```
- [ ] **Committed**

---

### Task P6-005: Create ProjectSelector component for wizard
> **File:** `web/src/components/ProjectSelector.jsx`
> **Test:** `web/src/tests/unit/components/ProjectSelector.test.jsx`

#### Tests (RED phase)
```javascript
describe('ProjectSelector', () => {
  it('should render list of active projects', () => {});
  it('should highlight selected project', () => {});
  it('should call onSelect when project clicked', () => {});
  it('should show empty state when no projects', () => {});
  it('should show loading state while fetching', () => {});
});
```

- [ ] **Test Setup**
  - [ ] Create test file `web/src/tests/unit/components/ProjectSelector.test.jsx`
  - [ ] Setup Redux store mock with projects state
  - [ ] Create mock project data

- [ ] **Unit Tests**
  - [ ] `should render list of active projects`
  - [ ] `should highlight currently selected project`
  - [ ] `should call onSelect callback when project clicked`
  - [ ] `should show "No projects" message when list empty`
  - [ ] `should show loading spinner when loading`

- [ ] **Verify tests FAIL**

#### Implementation (GREEN phase)
- [ ] Create `web/src/components/ProjectSelector.jsx` (~80 lines)
- [ ] Props: `onSelect`, `selectedProjectId`, `onCancel`
- [ ] Use `useSelector(selectActiveProjects)` to get projects
- [ ] Render project list with radio-style selection
- [ ] Include Cancel and "Add to Project" buttons
- [ ] **Verify all tests PASS**

#### Quality Check
- [ ] Run: `npm test -- --coverage web/src/components/ProjectSelector`
- [ ] Coverage >= 80%: ___% ✅/❌

#### Commit
```bash
git add web/src/components/ProjectSelector.jsx web/src/tests/unit/components/ProjectSelector.test.jsx
git commit -m "[P6-005] feat(components): create ProjectSelector component

- Added: web/src/components/ProjectSelector.jsx
- Tests: web/src/tests/unit/components/ProjectSelector.test.jsx
- Shows active projects with radio selection
- Coverage: X%"
```
- [ ] **Committed**

---

### Task P6-006: Send project_id in clarify API call
> **File:** `web/src/features/tasks/ClarifyWizard.jsx`
> **Test:** `web/src/tests/unit/features/ClarifyWizard.test.jsx`

#### Tests (RED phase)
```javascript
describe('ClarifyWizard - Project Assignment', () => {
  it('should render ProjectSelector in SELECT_PROJECT step', () => {});
  it('should include project_id in clarify API call', () => {});
  it('should set status to next_action when adding to project', () => {});
});
```

- [ ] **Unit Tests**
  - [ ] `should render ProjectSelector component in SELECT_PROJECT step`
  - [ ] `should pass projectId to clarify API when project selected`
  - [ ] `should set task status to next_action when adding to project`

- [ ] **Verify tests FAIL**

#### Implementation (GREEN phase)
- [ ] Add `selectedProjectId` to formData state
- [ ] Import ProjectSelector component
- [ ] Add SELECT_PROJECT step rendering with ProjectSelector
- [ ] Handle project selection - save to formData and go to ADD_DETAILS
- [ ] Modify handleSubmit to include projectId in clarificationData
- [ ] **Verify all tests PASS**

#### Quality Check
- [ ] Coverage >= 80%: ___% ✅/❌

#### Commit
```bash
git commit -m "[P6-006] feat(clarify): integrate ProjectSelector and send project_id

- Added SELECT_PROJECT step with ProjectSelector
- Include projectId in clarify API call
- Task becomes next_action when linked to project"
```
- [ ] **Committed**

---

### Task P6-007: Fix waitingForPerson field - append to notes before save
> **File:** `web/src/features/tasks/ClarifyWizard.jsx`
> **Test:** `web/src/tests/unit/features/ClarifyWizard.test.jsx`

#### Tests (RED phase)
```javascript
describe('ClarifyWizard - Waiting For Notes', () => {
  it('should prepend "Waiting for: {person}" to notes for WAITING_FOR outcome', () => {});
  it('should not modify notes for other outcomes', () => {});
  it('should handle empty waitingForPerson gracefully', () => {});
});
```

- [ ] **Unit Tests**
  - [ ] `should prepend waiting for person to notes`
  - [ ] `should not modify notes for non-waiting_for outcomes`
  - [ ] `should handle empty person name`

- [ ] **Verify tests FAIL**

#### Implementation (GREEN phase)
- [ ] In handleSubmit, before API call, check if outcome is WAITING_FOR
- [ ] If waitingForPerson is set, prepend to notes: `Waiting for: ${person}\n\n${notes}`
- [ ] Pass modified notes to clarify API
- [ ] **Verify all tests PASS**

#### Quality Check
- [ ] Coverage >= 80%: ___% ✅/❌

#### Commit
```bash
git commit -m "[P6-007] fix(clarify): save waiting for person to notes field

- Prepend 'Waiting for: {person}' to notes
- Only applies to WAITING_FOR outcome
- Preserves existing notes"
```
- [ ] **Committed**

---

### Task P6-008: Add keyboard navigation to wizard (Y/N, 1-4, Backspace, Tab)
> **File:** `web/src/features/tasks/ClarifyWizard.jsx`
> **Test:** `web/src/tests/unit/features/ClarifyWizard.test.jsx`

#### Tests (RED phase)
```javascript
describe('ClarifyWizard - Keyboard Navigation', () => {
  it('should handle Y key for Yes answers', () => {});
  it('should handle N key for No answers', () => {});
  it('should handle 1-4 keys for option selection', () => {});
  it('should handle Backspace for going back', () => {});
  it('should handle Tab for skip', () => {});
  it('should ignore keyboard when typing in input fields', () => {});
});
```

- [ ] **Unit Tests**
  - [ ] `should navigate to next step on Y key`
  - [ ] `should navigate to alternative step on N key`
  - [ ] `should select options 1-4 with number keys`
  - [ ] `should go back on Backspace key`
  - [ ] `should skip task on Tab key`
  - [ ] `should not trigger shortcuts when focused on input`

- [ ] **Verify tests FAIL**

#### Implementation (GREEN phase)
- [ ] Add useEffect with keydown event listener
- [ ] Check if event.target is input/textarea before handling
- [ ] Map Y/N keys to Yes/No buttons in binary choice steps
- [ ] Map 1-4 keys to option buttons in WHAT_TO_DO/NON_ACTIONABLE steps
- [ ] Map Backspace to "Back" button (previous step)
- [ ] Map Tab to onSkip callback
- [ ] Cleanup event listener on unmount
- [ ] **Verify all tests PASS**

#### Quality Check
- [ ] Coverage >= 80%: ___% ✅/❌

#### Commit
```bash
git commit -m "[P6-008] feat(clarify): add keyboard navigation to wizard

- Y/N keys for binary choices
- 1-4 keys for option selection
- Backspace to go back
- Tab to skip
- Ignores shortcuts when typing"
```
- [ ] **Committed**

---

### Task P6-009: Write unit tests for enhanced ClarifyWizard
> **File:** `web/src/tests/unit/features/ClarifyWizard.test.jsx`

This task consolidates and enhances all tests from previous tasks.

#### Tests (RED phase)
```javascript
describe('ClarifyWizard (Enhanced)', () => {
  describe('Context Selection', () => { /* from P6-001/002/003 */ });
  describe('Project Assignment', () => { /* from P6-004/005/006 */ });
  describe('Waiting For Notes', () => { /* from P6-007 */ });
  describe('Keyboard Navigation', () => { /* from P6-008 */ });
  describe('Integration', () => {
    it('should complete full clarify flow with contexts and project', () => {});
  });
});
```

- [ ] **Integration Tests**
  - [ ] Full flow: ACTIONABLE -> TWO_MINUTE -> SINGLE_OR_PROJECT -> WHAT_TO_DO -> SELECT_PROJECT -> ADD_DETAILS -> Submit
  - [ ] Verify all API calls made correctly

- [ ] **Verify all tests PASS**

#### Quality Check
- [ ] Run: `npm test -- --coverage web/src/features/tasks/ClarifyWizard`
- [ ] Coverage >= 80%: ___% ✅/❌
- [ ] All functions have test coverage

#### Commit
```bash
git commit -m "[P6-009] test(clarify): comprehensive tests for enhanced ClarifyWizard

- Integration tests for full clarify flow
- Tests for context selection, project assignment
- Tests for keyboard navigation
- Coverage: X%"
```
- [ ] **Committed**

---

## Side Effects Analysis

| Area Impacted | Type | Description | Mitigation |
|---------------|------|-------------|------------|
| ClarifyWizard.jsx | Modified | Added ~150 lines for new features | Tests ensure backward compatibility |
| ProjectSelector.jsx | New file | ~80 lines new component | Standalone, no side effects |
| Redux store | Read-only | Uses existing contexts/projects selectors | No state mutations |
| API calls | New call | setContexts after clarify | Error handling prevents blocking |

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
- [ ] API documentation updated

### Security
- [ ] No secrets hardcoded
- [ ] Input validation implemented
- [ ] XSS prevented (React handles by default)

---

## Review Notes

### Review Cycle 1
- **Date:** {YYYY-MM-DD}
- **Reviewer:** code-reviewer agent
- **Findings:**
  - [ ] {Finding 1} -> Fixed in commit {hash}

### Review Cycle 2
- **Date:** {YYYY-MM-DD}
- **Findings:**
  - [ ] {Finding} -> Fixed

---

## CI Fixes (if any)

### CI Fix Iteration 1
- **Failed Check:** {check name}
- **Error Type:** {build/test/lint/type}
- **Root Cause:** {analysis}
- **Fixes Applied:**
  - [ ] {fix 1}
- **Commit:** `fix(ci): {description}`
