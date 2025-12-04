# GTD Application - Feature Plan

## Overview

Web-first GTD application with keyboard-centric navigation. Focus on efficiency and minimal friction.

---

## Global Keyboard Shortcuts

| Shortcut | Action | Available From |
|----------|--------|----------------|
| `Ctrl+N` | Open Quick Capture modal | Everywhere |
| `Esc` | Close any modal/panel | Everywhere |
| `Ctrl+Enter` | Submit current form | Any form |
| `?` | Show keyboard shortcuts help | Everywhere |
| `g i` | Go to Inbox | Everywhere |
| `g a` | Go to Actions | Everywhere |
| `g p` | Go to Projects | Everywhere |

---

## Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│  GTD Todo                          [Ctrl+N]      [⚙️ ▾]     │
├─────────────────────────────────────────────────────────────┤
│  [📥 Inbox (n)]    [⚡ Actions]    [📁 Projects]            │
└─────────────────────────────────────────────────────────────┘
```

### Tabs

| Tab | Route | Description |
|-----|-------|-------------|
| **Inbox** | `/inbox` | Capture + inline clarification |
| **Actions** | `/actions` | All actionable tasks (unified view) |
| **Projects** | `/projects` | Multi-step outcomes |

### Settings Dropdown (⚙️)

```
┌──────────────────┐
│ Contexts         │ → /settings/contexts
│ Account          │ → /settings/account
│ Keyboard Shortcuts │ → modal
│ ────────────────── │
│ Logout           │
└──────────────────┘
```

---

## Main Views

### 1. Inbox View (`/inbox`)

**Purpose:** Capture everything, clarify anything

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📥 Inbox (7)                                    [Ctrl+N Quick Add]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────┬────────────────────────────────┐   │
│  │                                │                                │   │
│  │  TASK LIST                     │  CLARIFY PANEL                 │   │
│  │  ───────────                   │  ─────────────                 │   │
│  │                                │                                │   │
│  │  Click task to clarify →       │  ← Shows wizard for            │   │
│  │                                │    selected task               │   │
│  │  [↑/↓] Navigate               │                                │   │
│  │  [Enter] Select               │  [Esc] Close panel             │   │
│  │  [x] Delete                   │  [Enter] Confirm step          │   │
│  │  [c] Complete                 │                                │   │
│  │                                │                                │   │
│  └────────────────────────────────┴────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Split view: task list (left) + clarify panel (right)
- Click any task to clarify it (no queue order)
- Quick capture input at top
- Keyboard navigation within list

**Keyboard Shortcuts (Inbox-specific):**
| Shortcut | Action |
|----------|--------|
| `↑` / `↓` | Navigate task list |
| `Enter` | Open clarify panel for selected task |
| `x` | Delete selected task |
| `c` | Complete selected task |
| `Esc` | Close clarify panel / deselect |

---

### 2. Actions View (`/actions`)

**Purpose:** See and work on all clarified tasks

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚡ Actions                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ [All ▾] [Context ▾] [Project ▾] [Energy ▾]          [🔍 Search]   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ▼ Next Actions (12)                                           [1]     │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │  ☐ Call dentist             @Phone   🟡 Medium   ⏱15m   📅Today  │ │
│  │  ☐ Review budget            @Office  🔴 High     ⏱1h    📁Q4     │ │
│  │  ☐ Send invoice             @Computer 🟢 Low     ⏱5m             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ▶ Waiting For (3)                                             [2]     │
│  ▶ Someday/Maybe (8)                                           [3]     │
│  ▶ Reference (5)                                               [4]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Collapsible sections for each status
- Universal filter bar (status, context, project, energy, search)
- Section numbers [1-4] for quick keyboard access
- Drag & drop between sections

**Keyboard Shortcuts (Actions-specific):**
| Shortcut | Action |
|----------|--------|
| `1` | Focus/toggle Next Actions section |
| `2` | Focus/toggle Waiting For section |
| `3` | Focus/toggle Someday/Maybe section |
| `4` | Focus/toggle Reference section |
| `↑` / `↓` | Navigate within section |
| `c` | Complete selected task |
| `e` | Edit selected task |
| `m` | Move to different section (opens picker) |
| `/` | Focus search filter |
| `f` | Open filter dropdown |

---

### 3. Projects View (`/projects`)

**Purpose:** Manage multi-step outcomes

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📁 Projects                                              [+ New]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ [All ▾]  [Active]  [On Hold]  [Completed]         [🔍 Search]     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  📁 Website Redesign                              ● Active       │   │
│  │     3 tasks • Next: "Review mockups"              Due: Dec 15    │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  📁 Q4 Report                                     ● Active       │   │
│  │     5 tasks • Next: "Gather metrics"              Due: Dec 31    │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  📁 Office Move                                   ⚠ No next action│  │
│  │     12 tasks • Needs attention!                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Status filter (active, on hold, completed)
- Warning for projects without next action
- Shows first next action for each project
- Click to expand and see all tasks

**Keyboard Shortcuts (Projects-specific):**
| Shortcut | Action |
|----------|--------|
| `n` | New project |
| `↑` / `↓` | Navigate project list |
| `Enter` | Expand/view project |
| `e` | Edit selected project |
| `h` | Put on hold |
| `a` | Activate |

---

## Modals

### Quick Capture Modal (`Ctrl+N`)

```
┌─────────────────────────────────────────────────────────────┐
│  ╳                    Quick Capture                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ What's on your mind?                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ☐ Add another after saving                                │
│                                                             │
│                      [Cancel]  [Add to Inbox]              │
│                        Esc      Ctrl+Enter                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Opens from anywhere with `Ctrl+N`
- Auto-focus on input
- `Ctrl+Enter` to save and close (or add another if checked)
- `Esc` to cancel and close
- Task goes directly to Inbox

---

### Keyboard Shortcuts Help Modal (`?`)

```
┌─────────────────────────────────────────────────────────────┐
│  ╳                 Keyboard Shortcuts                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GLOBAL                        NAVIGATION                   │
│  ──────                        ──────────                   │
│  Ctrl+N   Quick capture        g i   Go to Inbox            │
│  Esc      Close modal          g a   Go to Actions          │
│  ?        This help            g p   Go to Projects         │
│                                                             │
│  TASK LIST                     ACTIONS                      │
│  ─────────                     ───────                      │
│  ↑/↓      Navigate             c     Complete task          │
│  Enter    Select/Open          x     Delete task            │
│  /        Search               e     Edit task              │
│                                m     Move to section        │
│                                                             │
│                           [Got it!]                         │
│                              Esc                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Clarify Panel (in Inbox)

### Step 1: Actionable?

```
┌────────────────────────────────────────┐
│         Clarify Task                   │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ "Review Q3 budget proposal"      │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Is this actionable?                   │
│                                        │
│  ┌─────────────┐  ┌─────────────┐     │
│  │   Yes [Y]   │  │   No [N]    │     │
│  └─────────────┘  └─────────────┘     │
│                                        │
│                         [Skip →]       │
│                           Tab          │
└────────────────────────────────────────┘
```

### Step 2a: Two Minutes? (if actionable)

```
┌────────────────────────────────────────┐
│         Clarify Task                   │
├────────────────────────────────────────┤
│                                        │
│  Will it take less than 2 minutes?     │
│                                        │
│  ┌─────────────┐  ┌─────────────┐     │
│  │  Yes [Y]    │  │   No [N]    │     │
│  │  Do it now! │  │  Defer it   │     │
│  └─────────────┘  └─────────────┘     │
│                                        │
│  [← Back]                              │
│    Backspace                           │
└────────────────────────────────────────┘
```

### Step 3: Destination

```
┌────────────────────────────────────────┐
│         Clarify Task                   │
├────────────────────────────────────────┤
│                                        │
│  What should happen?                   │
│                                        │
│  [1] ⚡ Next Action - Do it myself     │
│  [2] 👥 Waiting For - Delegate it      │
│  [3] 📅 Someday/Maybe - Maybe later    │
│  [4] 📁 Add to Project...              │
│                                        │
│  [← Back]                              │
└────────────────────────────────────────┘
```

### Step 4: Add Details

```
┌────────────────────────────────────────┐
│         Add Details                    │
├────────────────────────────────────────┤
│                                        │
│  Contexts                              │
│  ┌──────────────────────────────────┐  │
│  │ [@Office] [@Computer] [@Phone]   │  │
│  │ [@Home] [@Errands] [+ Add]       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Energy      [Low] [Medium] [High]     │
│                                        │
│  Time        [5m] [15m] [30m] [1h] [2h]│
│                                        │
│  Due Date    [________________] 📅     │
│                                        │
│  Project     [None ▾]                  │
│                                        │
│  Notes                                 │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [← Back]              [Save] Ctrl+Enter│
└────────────────────────────────────────┘
```

---

## Feature Checklist

### Phase 6.1: ClarifyWizard Enhancement
- [ ] Add context selection to Add Details step
- [ ] Add project assignment option
- [ ] Add "Add to existing project" flow
- [ ] Fix waitingForPerson → save to notes
- [ ] Add keyboard navigation (Y/N, 1-4, Backspace)

### Phase 6.2: Inline Clarification
- [ ] Split view layout for Inbox
- [ ] Selected task state management
- [ ] Panel open/close with keyboard
- [ ] Keyboard navigation in task list

### Phase 6.3: Unified Actions Page
- [ ] Create ActionsPage with 4 collapsible sections
- [ ] Implement FilterBar component
- [ ] Section collapse/expand with keyboard
- [ ] Status/context/project/energy filters
- [ ] Drag & drop between sections

### Phase 6.4: Navigation & Shortcuts
- [ ] Update Navigation to 3 tabs + settings
- [ ] Implement global `Ctrl+N` handler
- [ ] Implement global `Esc` handler
- [ ] Implement `g i`, `g a`, `g p` navigation
- [ ] Implement `?` help modal
- [ ] Per-page keyboard shortcuts

### Phase 6.5: Polish
- [ ] Focus management (trap focus in modals)
- [ ] ARIA labels for accessibility
- [ ] Keyboard shortcut hints in UI
- [ ] localStorage for section collapse states

---

## Technical Implementation

### Keyboard Handler Hook

```javascript
// hooks/useGlobalShortcuts.js
useEffect(() => {
  const handler = (e) => {
    // Ignore if typing in input/textarea
    if (e.target.matches('input, textarea')) return;

    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      openQuickCapture();
    }
    if (e.key === 'Escape') {
      closeAnyModal();
    }
    if (e.key === '?') {
      openShortcutsHelp();
    }
    // g + i/a/p for navigation
    if (e.key === 'g') {
      waitForNextKey((next) => {
        if (next === 'i') navigate('/inbox');
        if (next === 'a') navigate('/actions');
        if (next === 'p') navigate('/projects');
      });
    }
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

### Modal Context

```javascript
// contexts/ModalContext.js
const ModalContext = createContext({
  quickCaptureOpen: false,
  shortcutsHelpOpen: false,
  openQuickCapture: () => {},
  closeQuickCapture: () => {},
  openShortcutsHelp: () => {},
  closeShortcutsHelp: () => {},
});
```

---

## Routes Summary

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Redirect | → `/inbox` |
| `/inbox` | InboxPage | Capture + clarify |
| `/actions` | ActionsPage | Unified task view |
| `/projects` | ProjectsPage | Project list |
| `/projects/:id` | ProjectDetailPage | Single project |
| `/settings/contexts` | ContextsPage | Manage contexts |
| `/settings/account` | AccountSettingsPage | User settings |
