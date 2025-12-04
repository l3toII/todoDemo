# GTD UX Improvement Proposal

## Vision: Complete the GTD Flow

The backend already supports a complete GTD workflow. This proposal focuses on **filling frontend gaps** to unlock the full potential of existing API capabilities.

---

## Current State

### What Works
- Quick task capture to Inbox
- Multi-step clarification wizard with GTD questions
- Task status transitions
- Project creation and management
- Context CRUD operations
- Energy level and time estimates

### What's Broken
1. **Contexts not used during clarification** - Feature exists in API but never called
2. **Cannot assign to existing projects** - Only "convert to project" option
3. **Clarification requires queue order** - Cannot pick specific inbox task
4. **Tasks fragmented across 4 pages** - No unified view
5. **8 navigation tabs** - Overwhelming, not GTD-focused

---

## Proposed Changes

### 1. Enhanced ClarifyWizard

#### Add Context Selection

After choosing a destination (Next Action, Waiting For, Someday, Reference), show context selection:

```
┌─────────────────────────────────────────┐
│         Add Details                     │
├─────────────────────────────────────────┤
│                                         │
│  Contexts (optional)                    │
│  ┌─────────────────────────────────┐   │
│  │ [@Office] [@Computer] [@Phone]  │   │
│  │ [@Home] [@Errands] [@Waiting]   │   │
│  │ [+ Custom context]              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Energy Level                           │
│  [Low] [Medium] [High]                  │
│                                         │
│  Time Estimate                          │
│  [5m] [15m] [30m] [1h] [2h]            │
│                                         │
│  Due Date (optional)                    │
│  [____________________]                 │
│                                         │
│  Notes                                  │
│  [____________________]                 │
│                                         │
│  [Start Over]              [Save]       │
└─────────────────────────────────────────┘
```

**Implementation:**
- Fetch contexts from Redux store (already loaded by ContextsPage)
- Allow multiple selection (many-to-many)
- Call `tasksAPI.setContexts(taskId, contextIds)` after clarify

#### Add Project Assignment

When user selects "Single Action", offer project assignment:

```
┌─────────────────────────────────────────┐
│     What should happen next?            │
├─────────────────────────────────────────┤
│                                         │
│  [⚡ Do it myself]                      │
│     Add to Next Actions                 │
│                                         │
│  [👥 Delegate it]                       │
│     Add to Waiting For                  │
│                                         │
│  [📅 Maybe later]                       │
│     Add to Someday/Maybe                │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [📁 Add to existing project...]        │
│     Select from your projects           │
│                                         │
└─────────────────────────────────────────┘
```

When "Add to existing project" is clicked:

```
┌─────────────────────────────────────────┐
│     Select Project                      │
├─────────────────────────────────────────┤
│                                         │
│  Your active projects:                  │
│                                         │
│  ○ Website Redesign                     │
│  ○ Q4 Report                            │
│  ○ Office Move                          │
│  ○ Training Program                     │
│                                         │
│  [Cancel]                [Add to Project]│
└─────────────────────────────────────────┘
```

**Implementation:**
- Fetch projects with `projectsAPI.getAll({ status: 'active' })`
- Use `project_id` parameter in clarify API call
- Task becomes next_action and linked to project

#### Fix Waiting For Person

When status is "waiting_for", prepend person name to notes:

```javascript
// In handleSubmit:
let finalNotes = formData.notes;
if (finalOutcome === OUTCOMES.WAITING_FOR && formData.waitingForPerson) {
  finalNotes = `Waiting for: ${formData.waitingForPerson}\n${finalNotes}`;
}
```

---

### 2. Inline Clarification on Inbox Page

#### Current Flow
```
[Inbox Page] → [Click Clarify tab] → [Process tasks in order]
```

#### Proposed Flow
```
[Inbox Page] → [Click any task] → [Clarify panel slides in]
```

#### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  📥 Inbox (7)                                    [➕ Quick Add]   │
├──────────────────────────────────┬───────────────────────────────┤
│                                  │                               │
│  □ Call dentist for appointment  │  ┌─────────────────────────┐ │
│  □ Review Q3 budget proposal  ←──│──│    Clarify Task         │ │
│  □ Buy birthday gift for Mom     │  │                         │ │
│  □ Research vacation options     │  │  "Review Q3 budget..."  │ │
│  □ Update team wiki              │  │                         │ │
│  □ Schedule car maintenance      │  │  Is this actionable?    │ │
│  □ Reply to John's email         │  │                         │ │
│                                  │  │  [Yes]     [No]         │ │
│                                  │  │                         │ │
│                                  │  └─────────────────────────┘ │
│                                  │                               │
└──────────────────────────────────┴───────────────────────────────┘
```

#### Mobile Layout

```
┌─────────────────────────┐
│  📥 Inbox (7)    [➕]   │
├─────────────────────────┤
│                         │
│  □ Call dentist...      │
│  □ Review Q3 budget ←───┼──[Tap]
│  □ Buy birthday gift    │
│                         │
└─────────────────────────┘
         │
         ▼ (slides up)
┌─────────────────────────┐
│  ╳  Clarify Task        │
├─────────────────────────┤
│                         │
│  "Review Q3 budget..."  │
│                         │
│  Is this actionable?    │
│                         │
│  [Yes]        [No]      │
│                         │
└─────────────────────────┘
```

**Implementation:**
- Add `selectedTask` state to InboxPage
- Render ClarifyWizard in side panel when task selected
- On complete/skip, deselect and remove from list

---

### 3. Unified Actions Page

#### Replace 4 Pages with 1

Instead of:
- NextActionsPage.jsx
- WaitingForPage.jsx
- SomedayMaybePage.jsx
- ReferencePage.jsx

Create single `ActionsPage.jsx` with collapsible sections.

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚡ Actions                                                       │
├──────────────────────────────────────────────────────────────────┤
│  Status: [All ▾]  Context: [All ▾]  Project: [All ▾]  [🔍 Search]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ▼ Next Actions (12)                                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ □ Call dentist          @Phone  🔴High  ⏱15m   📅 Today    │ │
│  │ □ Review budget         @Office @Computer     ⏱1h          │ │
│  │ □ Send invoice          @Computer             ⏱5m          │ │
│  │ ...                                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ▶ Waiting For (3)                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ (collapsed - click to expand)                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ▶ Someday/Maybe (8)                                             │
│                                                                  │
│  ▶ Reference (5)                                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Features

1. **Collapsible Sections**
   - Next Actions expanded by default
   - Others collapsed, click to expand
   - Remember state in localStorage

2. **Universal Filter Bar**
   - Status filter: All, Next Actions, Waiting For, Someday, Reference
   - Context filter: All, @Office, @Home, @Phone, etc.
   - Project filter: All, Project A, Project B, No Project
   - Search: Filter by title/notes

3. **Drag & Drop Between Sections**
   - Drag task from Next Actions to Waiting For
   - Calls `tasksAPI.clarify()` with new status

4. **Quick Actions**
   - Swipe left: Complete
   - Swipe right: Move to inbox (reclarify)
   - Long press: Edit

---

### 4. Simplified Navigation

#### Current (8 items)
```
[Inbox][Clarify][Next Actions][Waiting For][Someday][Reference][Contexts][Projects]
```

#### Proposed (4 items)
```
[📥 Inbox (n)][⚡ Actions][📁 Projects][⚙️ Settings]
```

#### Settings Dropdown
```
⚙️ Settings ▾
├── Contexts
├── Account Settings
└── Logout
```

**Implementation:**
- Remove Clarify from nav (integrated into Inbox)
- Merge 4 list pages into Actions
- Move Contexts to Settings dropdown

---

## User Flows

### Flow 1: Capture → Clarify → Execute

```
1. User on any page
2. Press Ctrl+N or click [+]
3. Type: "Call dentist about appointment"
4. Press Enter
   → Task appears in Inbox

5. Navigate to Inbox (or stay if already there)
6. Click on "Call dentist..."
   → Clarify panel slides in

7. "Is this actionable?" → [Yes]
8. "Less than 2 minutes?" → [No]
9. "Single action or project?" → [Single Action]
10. "What should happen?" → [Do it myself]
11. Add details:
    - Contexts: [@Phone]
    - Energy: Medium
    - Time: 5 min
12. Click [Save]
    → Task moves to Next Actions
    → Panel closes

13. Navigate to Actions
14. Filter by @Phone context
15. See "Call dentist" ready to do
16. Complete task with swipe or checkbox
```

### Flow 2: Assign Task to Existing Project

```
1. Task in Inbox: "Research venue options"
2. Click task → Clarify panel

3. "Is this actionable?" → [Yes]
4. "Less than 2 minutes?" → [No]
5. "Single action or project?" → [Single Action]
6. "What should happen?" → [Add to existing project...]

7. Project list appears
8. Select "Wedding Planning"
9. Add details (contexts, energy, etc.)
10. Click [Save]
    → Task linked to "Wedding Planning" project
    → Task status: next_action
```

### Flow 3: Filter and Work

```
1. Navigate to Actions
2. Click Context filter → [@Office]
3. Only @Office tasks visible across all sections
4. Click Project filter → [Q4 Report]
5. Only Q4 Report tasks with @Office context visible
6. Work through filtered list
7. Mark tasks complete as done
```

---

## Routes Mapping

| Current Route | New Route | Notes |
|---------------|-----------|-------|
| `/inbox` | `/inbox` | Add inline clarification |
| `/clarify` | (removed) | Integrated into Inbox |
| `/next-actions` | `/actions` | Unified view |
| `/waiting-for` | `/actions` | Section in unified view |
| `/someday-maybe` | `/actions` | Section in unified view |
| `/reference` | `/actions` | Section in unified view |
| `/contexts` | `/settings/contexts` | Under Settings |
| `/projects` | `/projects` | Keep as is |
| `/projects/:id` | `/projects/:id` | Keep as is |
| `/account/settings` | `/settings/account` | Under Settings |

---

## Implementation Tasks

### P6.1: ClarifyWizard Enhancement (Backend: 0 changes)

| Task | File | Effort |
|------|------|--------|
| P6.1.1 Add context selection UI | ClarifyWizard.jsx | M |
| P6.1.2 Fetch contexts in wizard | ClarifyWizard.jsx | S |
| P6.1.3 Call setContexts API after clarify | ClarifyWizard.jsx | S |
| P6.1.4 Add project selection step | ClarifyWizard.jsx | M |
| P6.1.5 Fetch active projects | ClarifyWizard.jsx | S |
| P6.1.6 Send project_id in clarify | ClarifyWizard.jsx | S |
| P6.1.7 Fix waitingForPerson to notes | ClarifyWizard.jsx | S |
| P6.1.8 Unit tests for new features | ClarifyWizard.test.jsx | M |

### P6.2: Inline Clarification (Backend: 0 changes)

| Task | File | Effort |
|------|------|--------|
| P6.2.1 Add selectedTask state | InboxPage.jsx | S |
| P6.2.2 Create ClarifyPanel component | ClarifyPanel.jsx | M |
| P6.2.3 Desktop split layout | InboxPage.jsx | M |
| P6.2.4 Mobile slide-up modal | InboxPage.jsx | M |
| P6.2.5 Handle clarify complete | InboxPage.jsx | S |
| P6.2.6 Keyboard navigation | InboxPage.jsx | S |

### P6.3: Unified Actions Page (Backend: 0 changes)

| Task | File | Effort |
|------|------|--------|
| P6.3.1 Create ActionsPage component | ActionsPage.jsx | L |
| P6.3.2 Create CollapsibleSection | CollapsibleSection.jsx | M |
| P6.3.3 Create FilterBar component | FilterBar.jsx | M |
| P6.3.4 Implement status filter | ActionsPage.jsx | S |
| P6.3.5 Implement context filter | ActionsPage.jsx | S |
| P6.3.6 Implement project filter | ActionsPage.jsx | S |
| P6.3.7 Implement search filter | ActionsPage.jsx | S |
| P6.3.8 Persist section states | ActionsPage.jsx | S |
| P6.3.9 Add drag-drop between sections | ActionsPage.jsx | L |

### P6.4: Navigation Update (Backend: 0 changes)

| Task | File | Effort |
|------|------|--------|
| P6.4.1 Update Navigation component | Navigation.jsx | M |
| P6.4.2 Create SettingsDropdown | SettingsDropdown.jsx | S |
| P6.4.3 Update App routes | App.jsx | S |
| P6.4.4 Add route redirects | App.jsx | S |
| P6.4.5 Mobile bottom navigation | Navigation.jsx | M |

### P6.5: Cleanup & Polish (Backend: 0 changes)

| Task | File | Effort |
|------|------|--------|
| P6.5.1 Remove old page files | pages/*.jsx | S |
| P6.5.2 Update all imports | Various | S |
| P6.5.3 E2E tests for new flows | e2e/*.spec.js | L |
| P6.5.4 Performance optimization | Various | M |
| P6.5.5 Accessibility review | Various | M |

---

## Success Metrics

1. **Context usage**: % of clarified tasks with at least 1 context
2. **Project linkage**: % of next_action tasks linked to projects
3. **Clarification speed**: Time from inbox to clarified
4. **Navigation clicks**: Reduced clicks to find/filter tasks
5. **Page views**: Fewer page transitions for same workflows
