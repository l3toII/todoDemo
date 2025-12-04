# Phase 6.1 Implementation - ClarifyWizard Enhancement

**Feature**: P6 UX Redesign - Phase 6.1
**Branch**: `feat/ux-redesign-p6.1`
**Date**: 2025-12-04
**Status**: Complete

## Overview

This phase enhances the ClarifyWizard component to add missing GTD features:
- Context selection UI
- Project assignment (add to existing project)
- Keyboard navigation
- Fix waitingForPerson field to append to notes

## Tasks

| Task ID | Description | Status |
|---------|-------------|--------|
| P6-001 | Add context selection UI to ADD_DETAILS step | Complete |
| P6-002 | Fetch and display contexts in wizard | Complete |
| P6-003 | Call setContexts API after clarify completes | Complete |
| P6-004 | Add "Add to existing project" option in destination step | Complete |
| P6-005 | Create ProjectSelector component | Complete |
| P6-006 | Send project_id in clarify API call | Complete |
| P6-007 | Fix waitingForPerson field - append to notes before save | Complete |
| P6-008 | Add keyboard navigation to wizard (Y/N, 1-4, Backspace, Escape) | Complete |
| P6-009 | Write unit tests for enhanced ClarifyWizard | Complete |

## Files Modified

| File | Change |
|------|--------|
| `web/src/features/tasks/ClarifyWizard.jsx` | +547 lines: contexts, project selection, keyboard nav, ADD_TO_PROJECT step |
| `web/src/components/ProjectSelector.jsx` | NEW - 62 lines: Project dropdown component |
| `web/src/tests/unit/features/tasks/ClarifyWizard.test.jsx` | +170 lines: 9 new tests for enhanced features |
| `web/src/tests/unit/components/ProjectSelector.test.jsx` | NEW - 128 lines: 9 tests |

## Implementation Details

### P6-001 to P6-003: Context Selection

Added context multi-select UI in ADD_DETAILS step:
- Uses `selectAllContexts` from contextsSlice
- Checkbox-style chips for each context
- `toggleContext` callback for selection management
- After successful clarify, calls `tasksAPI.setContexts` with selected IDs
- Graceful error handling if context setting fails

### P6-004 to P6-006: Project Assignment

Added new ADD_TO_PROJECT step and ProjectSelector component:
- New "Add to Project" button in SINGLE_OR_PROJECT step (only shown if active projects exist)
- ProjectSelector dropdown with loading/empty state handling
- Sends `projectId` in clarify API call
- Context selection also available in ADD_TO_PROJECT step

### P6-007: Fix waitingForPerson

Modified `handleSubmit` to prepend waiting for info:
```javascript
if (finalOutcome === OUTCOMES.WAITING_FOR && formData.waitingForPerson.trim()) {
  finalNotes = `Waiting for: ${formData.waitingForPerson}\n\n${formData.notes}`.trim();
}
```

### P6-008: Keyboard Navigation

Added `useEffect` hook with keyboard event listener:
- `Y` / `N` for yes/no questions (ACTIONABLE, TWO_MINUTE steps)
- `1-4` for numbered options (WHAT_TO_DO, NON_ACTIONABLE, SINGLE_OR_PROJECT)
- `Backspace` to go back (uses stepHistory state)
- `Escape` to trigger skip callback
- Input focus detection to avoid conflicts when typing

## Test Results

### Unit Tests (61 total - all passing)
- [x] Context selection renders when contexts loaded
- [x] Multiple contexts can be selected
- [x] Project selector shows active projects
- [x] "Add to Project" option shown when projects exist
- [x] project_id sent in clarify when project selected
- [x] waitingForPerson appended to notes
- [x] Keyboard Y navigates to TWO_MINUTE step
- [x] Keyboard N navigates to NON_ACTIONABLE step
- [x] Keyboard 1-3 trigger numbered options
- [x] Keyboard Backspace goes back
- [x] Keyboard Escape triggers skip

### Manual Tests
- [ ] Clarify a task and assign contexts
- [ ] Clarify a task and add to existing project
- [ ] Use keyboard only to complete clarification
- [ ] Verify contexts appear on task after save

## Commits

1. `56f9b76` - feat(wizard): add ProjectSelector component
2. `86433a0` - feat(wizard): enhance ClarifyWizard with GTD features
