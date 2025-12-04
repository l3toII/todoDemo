# UX Update - GTD Application

## Summary

This document tracks the UX improvement initiative for the GTD Todo application.

## Key Documents

1. **Gap Analysis**: `specs/001-gtd-todo-app/ux-gap-analysis.md`
   - Backend capabilities (complete)
   - Frontend gaps (6 items identified)
   - Required changes summary

2. **Improvement Proposal**: `specs/001-gtd-todo-app/ux-improvement-proposal.md`
   - Enhanced ClarifyWizard
   - Inline clarification
   - Unified Actions page
   - Simplified navigation

3. **Visual Mockups**: `specs/001-gtd-todo-app/ux-visual-mockups.md`
   - ASCII wireframes for all screens
   - Desktop and mobile views
   - Interaction states

## Key Finding

**The backend API is complete**. All GTD features (contexts, projects, status transitions, energy levels, time estimates) are fully implemented. The gaps are exclusively in the frontend.

## Frontend Gaps Summary

| Gap | Current State | Fix |
|-----|---------------|-----|
| Context selection | Not in ClarifyWizard | Add step to ADD_DETAILS |
| Project assignment | Only "convert to project" | Add "assign to existing project" |
| Waiting for person | Field not sent to API | Append to notes |
| Inline clarification | Must use separate page | Add panel to InboxPage |
| Fragmented lists | 4 separate pages | Create unified ActionsPage |
| Navigation | 8 tabs | Reduce to 4 tabs |

## Implementation Phases

- **P6.1**: ClarifyWizard Enhancement (no backend changes)
- **P6.2**: Inline Clarification (no backend changes)
- **P6.3**: Unified Actions Page (no backend changes)
- **P6.4**: Navigation Update (no backend changes)
- **P6.5**: Cleanup & Polish

## Status

**Phase**: Planning complete, ready for implementation
**Backend changes required**: None
