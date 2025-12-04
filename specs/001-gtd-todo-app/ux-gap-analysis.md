# GTD UX Gap Analysis

## Executive Summary

The **backend API is complete** for a full GTD workflow. All necessary endpoints, entities, and relationships exist. The gaps are **exclusively in the frontend** - specifically in the ClarifyWizard component and the navigation structure.

---

## Backend Capabilities (All Complete)

### Task Entity
| Feature | Status | API Support |
|---------|--------|-------------|
| Statuses (inbox, next_action, waiting_for, someday_maybe, reference, completed, deleted) | ✅ Complete | `PATCH /tasks/{id}/clarify` |
| Energy Level (low, medium, high) | ✅ Complete | `energy_level` field |
| Time Estimate | ✅ Complete | `time_estimate` field |
| Due Date | ✅ Complete | `due_date` field |
| Notes | ✅ Complete | `notes` field |
| Project Assignment | ✅ Complete | `project_id` field in clarify |
| Context Assignment | ✅ Complete | `PUT /tasks/{id}/contexts` |

### Context Entity
| Feature | Status | API Support |
|---------|--------|-------------|
| CRUD operations | ✅ Complete | `/contexts` endpoints |
| Many-to-many with tasks | ✅ Complete | `task_contexts` table |
| Default contexts | ✅ Complete | @Office, @Home, @Phone, @Errands, @Computer, @Waiting |

### Project Entity
| Feature | Status | API Support |
|---------|--------|-------------|
| CRUD operations | ✅ Complete | `/projects` endpoints |
| Task association | ✅ Complete | `project_id` on Task |
| Outcome field | ✅ Complete | GTD-compliant |
| Status transitions | ✅ Complete | active, on_hold, completed, cancelled |
| Needing attention | ✅ Complete | `GET /projects/needing-attention` |

---

## Frontend Gaps (What's Missing)

### 1. ClarifyWizard - Missing Context Selection

**Location:** `web/src/features/tasks/ClarifyWizard.jsx`

**Problem:** The wizard collects energy level, time estimate, and due date, but **never asks for contexts**. The API endpoint `PUT /tasks/{id}/contexts` exists but is never called during clarification.

**Current Code (line 100-109):**
```javascript
await dispatch(clarifyTask({
  taskId: task.id,
  clarificationData: {
    status: targetStatus,
    notes: formData.notes,
    energyLevel: formData.energyLevel,
    timeEstimate: formData.timeEstimate,
    dueDate: formData.dueDate || null,
    // ❌ NO CONTEXT ASSIGNMENT
  },
})).unwrap();
```

**API Available (api.js line 122):**
```javascript
setContexts: (id, contextIds) => apiClient.put(`/tasks/${id}/contexts`, { context_ids: contextIds }),
```

**Fix Required:** Add context selection step in ADD_DETAILS wizard step.

---

### 2. ClarifyWizard - Missing Project Assignment

**Location:** `web/src/features/tasks/ClarifyWizard.jsx`

**Problem:** The wizard can **convert** a task to a new project, but cannot **assign** a task to an **existing project**. The API supports `project_id` in the clarify endpoint.

**Current Flow:**
- Task → "Single Action or Project?" → Create NEW project only

**Missing Flow:**
- Task → "Single Action or Project?" → Assign to EXISTING project

**API Available (api.js line 119):**
```javascript
clarify: (id, clarificationData) => {
  return apiClient.patch(`/tasks/${id}/clarify`, {
    target_status: clarificationData.status,
    // ...
    project_id: clarificationData.projectId,  // ✅ SUPPORTED but never used
  });
}
```

**Fix Required:** Add project selection option when choosing "Single Action".

---

### 3. ClarifyWizard - Waiting For Person Not Saved

**Location:** `web/src/features/tasks/ClarifyWizard.jsx`

**Problem:** The wizard has a `waitingForPerson` field (line 48) but it's **never sent to the API**. It should be appended to the task notes.

**Current Code (line 498-504):**
```javascript
{outcome === OUTCOMES.WAITING_FOR && (
  <input
    value={formData.waitingForPerson}  // Collected but never used!
    onChange={(e) => updateForm('waitingForPerson', e.target.value)}
    placeholder="Person or team name"
  />
)}
```

**Fix Required:** Append waiting person to notes: `Waiting for: ${waitingForPerson}\n${notes}`

---

### 4. No Inline Clarification from Inbox

**Location:** `web/src/pages/InboxPage.jsx`

**Problem:** Cannot clarify a specific task directly from Inbox. User must go to ClarifyPage and process tasks in queue order.

**Current Flow:**
```
Inbox Page → Click task → No action
           → Go to Clarify Page → Process tasks 1 by 1 in order
```

**Desired Flow:**
```
Inbox Page → Click task → Clarify panel appears → Process this specific task
```

**Fix Required:** Add ClarifyWizard as side panel or modal triggered from InboxPage.

---

### 5. Fragmented Task Lists (4 Separate Pages)

**Location:**
- `web/src/pages/NextActionsPage.jsx`
- `web/src/pages/WaitingForPage.jsx`
- `web/src/pages/SomedayMaybePage.jsx`
- `web/src/pages/ReferencePage.jsx`

**Problem:** Tasks are split across 4 pages. User must navigate between tabs to see full picture.

**Current:** 8 navigation items
```
[Inbox][Clarify][Next Actions][Waiting For][Someday][Reference][Contexts][Projects]
```

**Proposed:** 4 navigation items
```
[Inbox][Actions][Projects][Settings]
```

Where "Actions" combines all 4 lists with filters.

---

### 6. Context Filter Only on Next Actions

**Location:** `web/src/pages/NextActionsPage.jsx`

**Problem:** ContextFilterSidebar only exists on NextActionsPage. Other pages (Waiting, Someday, Reference) have no context filtering.

**Fix Required:** Add unified filter bar to combined Actions view.

---

## Required Changes Summary

### Backend Changes: NONE

The backend is complete. No API changes needed.

### Frontend Changes

| Component | Change | Effort |
|-----------|--------|--------|
| ClarifyWizard.jsx | Add context selection step | Medium |
| ClarifyWizard.jsx | Add existing project assignment | Medium |
| ClarifyWizard.jsx | Save waitingForPerson to notes | Small |
| InboxPage.jsx | Add inline clarification panel | Medium |
| New: ActionsPage.jsx | Unified view with all lists | Large |
| Navigation.jsx | Simplify to 4 items | Small |
| New: SettingsDropdown | Combine Contexts into settings | Small |

### Files to Create
- `web/src/pages/ActionsPage.jsx` - Unified task list view
- `web/src/components/FilterBar.jsx` - Status/Context/Project filters
- `web/src/components/CollapsibleSection.jsx` - For list sections

### Files to Modify
- `web/src/features/tasks/ClarifyWizard.jsx` - Add contexts + project selection
- `web/src/pages/InboxPage.jsx` - Add inline clarification
- `web/src/components/Navigation.jsx` - Simplify navigation
- `web/src/App.jsx` - Update routes

### Files to Remove (after migration)
- `web/src/pages/NextActionsPage.jsx` (merged into ActionsPage)
- `web/src/pages/WaitingForPage.jsx` (merged into ActionsPage)
- `web/src/pages/SomedayMaybePage.jsx` (merged into ActionsPage)
- `web/src/pages/ReferencePage.jsx` (merged into ActionsPage)

---

## Implementation Priority

### Phase 1: Fix ClarifyWizard (Critical for GTD)
1. Add context selection to ADD_DETAILS step
2. Add project assignment option
3. Save waitingForPerson to notes

### Phase 2: Inline Clarification
4. Add ClarifyWizard panel to InboxPage

### Phase 3: Unified View
5. Create ActionsPage with collapsible sections
6. Add FilterBar component
7. Update Navigation

### Phase 4: Cleanup
8. Remove old separate pages
9. Update routes
