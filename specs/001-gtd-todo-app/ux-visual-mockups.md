# GTD UX Visual Mockups

Visual specifications for the UX improvements. All wireframes are ASCII-based for easy reference during implementation.

---

## Navigation Comparison

### Before (8 tabs)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  GTD Todo                                                            [User ▾]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Inbox] [Clarify] [Next Actions] [Waiting For] [Someday] [Reference] [Contexts] [Projects]
└─────────────────────────────────────────────────────────────────────────────────┘
```

### After (4 tabs)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  GTD Todo                                                            [⚙️ ▾]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [📥 Inbox (3)]  [⚡ Actions]  [📁 Projects]                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

Settings dropdown when clicked:
┌────────────────┐
│ Contexts       │
│ Account        │
│ ────────────── │
│ Logout         │
└────────────────┘
```

---

## 1. Inbox Page with Inline Clarification

### Desktop (Split View)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  GTD Todo                                                            [⚙️ ▾]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [📥 Inbox (7)]  [⚡ Actions]  [📁 Projects]                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  📥 Inbox                                                    [➕ Quick Add]     │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌──────────────────────────────────────┬────────────────────────────────────┐ │
│  │                                      │                                    │ │
│  │  ☐ Call dentist for appointment      │  ┌──────────────────────────────┐ │ │
│  │     added 2 hours ago                │  │                              │ │ │
│  │                                      │  │     Clarify Task             │ │ │
│  │  ☐ Review Q3 budget proposal   ◀─────│  │                              │ │ │
│  │     added 1 day ago          SELECTED│  │  ┌────────────────────────┐  │ │ │
│  │                                      │  │  │ Review Q3 budget       │  │ │ │
│  │  ☐ Buy birthday gift for Mom         │  │  │ proposal               │  │ │ │
│  │     added 2 days ago                 │  │  └────────────────────────┘  │ │ │
│  │                                      │  │                              │ │ │
│  │  ☐ Research vacation destinations    │  │  ┌────────────────────────┐  │ │ │
│  │     added 3 days ago                 │  │  │    Is this actionable? │  │ │ │
│  │                                      │  │  │                        │  │ │ │
│  │  ☐ Update team wiki                  │  │  │  Can you take action   │  │ │ │
│  │     added 4 days ago                 │  │  │  on this?              │  │ │ │
│  │                                      │  │  │                        │  │ │ │
│  │  ☐ Schedule car maintenance          │  │  │  [✓ Yes]    [✗ No]     │  │ │ │
│  │     added 5 days ago                 │  │  └────────────────────────┘  │ │ │
│  │                                      │  │                              │ │ │
│  │  ☐ Reply to John's email             │  │              [Skip ▶]        │ │ │
│  │     added 6 days ago                 │  │                              │ │ │
│  │                                      │  └──────────────────────────────┘ │ │
│  │                                      │                                    │ │
│  └──────────────────────────────────────┴────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### No Task Selected State
```
┌──────────────────────────────────────┬────────────────────────────────────┐
│                                      │                                    │
│  ☐ Call dentist for appointment      │  ┌──────────────────────────────┐ │
│     added 2 hours ago                │  │                              │ │
│                                      │  │      Select a task           │ │
│  ☐ Review Q3 budget proposal         │  │      to clarify              │ │
│     added 1 day ago                  │  │                              │ │
│                                      │  │      ────────────────        │ │
│  ☐ Buy birthday gift for Mom         │  │                              │ │
│     added 2 days ago                 │  │      Click on any task       │ │
│                                      │  │      in your inbox to        │ │
│                                      │  │      start the GTD           │ │
│                                      │  │      clarification           │ │
│                                      │  │      process.                │ │
│                                      │  │                              │ │
│                                      │  └──────────────────────────────┘ │
│                                      │                                    │
└──────────────────────────────────────┴────────────────────────────────────┘
```

### Mobile (Full Screen Modal)
```
┌─────────────────────────┐
│  📥 Inbox (7)    [➕]   │
├─────────────────────────┤
│                         │
│  ☐ Call dentist...      │
│     2 hours ago         │
│                         │
│  ☐ Review Q3 budget     │ ← Tap
│     1 day ago           │
│                         │
│  ☐ Buy birthday gift    │
│     2 days ago          │
│                         │
├─────────────────────────┤
│ 📥    ⚡    📁    ⚙️    │
└─────────────────────────┘
         │
         ▼ slides up
┌─────────────────────────┐
│  ╳        Clarify       │
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │ Review Q3 budget  │  │
│  │ proposal          │  │
│  └───────────────────┘  │
│                         │
│  Is this actionable?    │
│                         │
│  Can you take action    │
│  on this, or is it      │
│  just information?      │
│                         │
│  ┌─────────┐ ┌─────────┐│
│  │  ✓ Yes  │ │  ✗ No   ││
│  └─────────┘ └─────────┘│
│                         │
│         [Skip ▶]        │
│                         │
└─────────────────────────┘
```

---

## 2. ClarifyWizard: Add Details Step (Enhanced)

### With Context Selection
```
┌───────────────────────────────────────┐
│         ⬤⬤⬤●○  Add Details           │
├───────────────────────────────────────┤
│                                       │
│  Contexts (optional)                  │
│  ┌─────────────────────────────────┐  │
│  │ [✓@Office] [@Computer] [@Phone] │  │
│  │ [@Home] [@Errands] [@Waiting]   │  │
│  └─────────────────────────────────┘  │
│                                       │
│  Energy Level                         │
│  ┌─────────┐┌─────────┐┌─────────┐   │
│  │   Low   ││ Medium  ││  High   │   │
│  │   😴    ││   😐    ││   🔥    │   │
│  └─────────┘└─────────┘└─────────┘   │
│                                       │
│  Time Estimate                        │
│  ┌───────────────────────────────┐   │
│  │ [5m] [15m] [30m] [1h] [2h+]   │   │
│  └───────────────────────────────┘   │
│                                       │
│  Due Date                             │
│  ┌───────────────────────────────┐   │
│  │ ____________________________  │   │
│  │       📅  Select date         │   │
│  └───────────────────────────────┘   │
│                                       │
│  Notes                                │
│  ┌───────────────────────────────┐   │
│  │                               │   │
│  │                               │   │
│  └───────────────────────────────┘   │
│                                       │
│  ┌──────────────┐ ┌──────────────┐   │
│  │  Start Over  │ │     Save     │   │
│  └──────────────┘ └──────────────┘   │
│                                       │
└───────────────────────────────────────┘
```

### Context Selection States
```
Default contexts (from API):

┌────────────────────────────────────────┐
│  [@Office]  [@Home]  [@Phone]          │
│  [@Errands] [@Computer] [@Waiting]     │
│                                        │
│  Custom contexts:                      │
│  [@GymTime] [@LowEnergy]               │
│                                        │
│  [+ Add new context]                   │
└────────────────────────────────────────┘

Selected state:
┌────────────────────────────────────────┐
│  [✓@Office]  [@Home]  [✓@Phone]        │
│  [@Errands] [✓@Computer] [@Waiting]    │
└────────────────────────────────────────┘
```

---

## 3. ClarifyWizard: Project Assignment Step

### What Should Happen Next (Enhanced)
```
┌───────────────────────────────────────┐
│      What should happen next?         │
├───────────────────────────────────────┤
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  ⚡ Do it myself                │  │
│  │     Add to Next Actions         │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  👥 Delegate it                 │  │
│  │     Add to Waiting For          │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  📅 Maybe later                 │  │
│  │     Add to Someday/Maybe        │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ─────────── OR ───────────           │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  📁 Add to existing project...  │  │
│  │     Link to one of your         │  │
│  │     active projects             │  │
│  └─────────────────────────────────┘  │
│                                       │
└───────────────────────────────────────┘
```

### Project Selection Modal
```
┌───────────────────────────────────────┐
│      Select Project                   │
├───────────────────────────────────────┤
│                                       │
│  Your active projects:                │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  ○  Website Redesign            │  │
│  │      3 tasks • due Dec 15       │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  ●  Q4 Report                   │  │
│  │      5 tasks • due Dec 31       │  │ ← SELECTED
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  ○  Office Move                 │  │
│  │      12 tasks • no due date     │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  ○  Training Program            │  │
│  │      8 tasks • due Jan 15       │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌────────────┐ ┌─────────────────┐   │
│  │   Cancel   │ │ Add to Project  │   │
│  └────────────┘ └─────────────────┘   │
│                                       │
└───────────────────────────────────────┘
```

---

## 4. Unified Actions Page

### Desktop View
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  GTD Todo                                                            [⚙️ ▾]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [📥 Inbox (3)]  [⚡ Actions]  [📁 Projects]                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ⚡ Actions                                                                      │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ Status: [All ▾]   Context: [All ▾]   Project: [All ▾]   [🔍 Search...] │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ▼ Next Actions (12)                                            [+ Add] │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                         │   │
│  │  ☐ Call dentist for appointment                                        │   │
│  │    [@Phone]  🟡 Medium  ⏱ 15m  📅 Today                                │   │
│  │                                                                         │   │
│  │  ☐ Review Q3 budget proposal                                           │   │
│  │    [@Office] [@Computer]  🔴 High  ⏱ 1h  📁 Q4 Report                  │   │
│  │                                                                         │   │
│  │  ☐ Send invoice to client                                              │   │
│  │    [@Computer]  🟢 Low  ⏱ 5m                                           │   │
│  │                                                                         │   │
│  │  ☐ Prepare presentation slides                                         │   │
│  │    [@Computer]  🔴 High  ⏱ 2h  📁 Website Redesign  📅 Dec 12         │   │
│  │                                                                         │   │
│  │  [Show 8 more...]                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ▶ Waiting For (3)                                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ▶ Someday/Maybe (8)                                                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ▶ Reference (5)                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Expanded Waiting For Section
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ▼ Waiting For (3)                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ☐ Budget approval from finance team                                   │
│    Waiting for: Sarah (finance)  •  🟡 5 days  •  📁 Q4 Report         │
│                                        ↑ amber = 3-7 days              │
│                                                                         │
│  ☐ Contract review by legal                                            │
│    Waiting for: Legal dept  •  🟢 2 days  •  📅 Dec 20                 │
│                                  ↑ green = <3 days                     │
│                                                                         │
│  ☐ Design mockups from agency                                          │
│    Waiting for: Creative Agency  •  🔴 15 days  •  📁 Website Redesign │
│                                       ↑ red = >7 days                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### With Filter Applied
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Status: [All ▾]   Context: [@Office ▾]   Project: [All ▾]   [🔍]       │
│                            ↑ FILTERED                                   │
└─────────────────────────────────────────────────────────────────────────┘

Results show only tasks with @Office context:

┌─────────────────────────────────────────────────────────────────────────┐
│ ▼ Next Actions (4 of 12)                                     [+ Add]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ☐ Review Q3 budget proposal                                           │
│    [@Office] [@Computer]  🔴 High  ⏱ 1h  📁 Q4 Report                  │
│                                                                         │
│  ☐ Meet with HR about new hire                                         │
│    [@Office]  🟡 Medium  ⏱ 30m  📅 Tomorrow                            │
│                                                                         │
│  ☐ Organize desk and file papers                                       │
│    [@Office]  🟢 Low  ⏱ 15m                                            │
│                                                                         │
│  ☐ Print conference materials                                          │
│    [@Office]  🟢 Low  ⏱ 10m  📅 Dec 14                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mobile View
```
┌─────────────────────────┐
│  ⚡ Actions             │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │ [All ▾] [@Office ▾] │ │
│ │ [Project ▾] [🔍]    │ │
│ └─────────────────────┘ │
│                         │
│ ▼ Next Actions (12)     │
│ ┌─────────────────────┐ │
│ │ ☐ Call dentist      │ │
│ │   @Phone 🟡 ⏱15m    │ │
│ ├─────────────────────┤ │
│ │ ☐ Review budget     │ │
│ │   @Office 🔴 ⏱1h    │ │
│ ├─────────────────────┤ │
│ │ ☐ Send invoice      │ │
│ │   @Computer 🟢 ⏱5m  │ │
│ └─────────────────────┘ │
│                         │
│ ▶ Waiting For (3)       │
│                         │
│ ▶ Someday/Maybe (8)     │
│                         │
│ ▶ Reference (5)         │
│                         │
├─────────────────────────┤
│ 📥    ⚡    📁    ⚙️    │
└─────────────────────────┘
```

---

## 5. Task Interactions

### Swipe Actions (Mobile)
```
Swipe Left = Complete
┌─────────────────────────┐
│ ☐ Call dentist   ──────────▶  ✓ Done!
│   @Phone 🟡 ⏱15m         │
└─────────────────────────┘

Swipe Right = Send to Inbox (reclarify)
┌─────────────────────────┐
│ ◀──────────  ☐ Call dentist
│              @Phone 🟡 ⏱15m   │
└─────────────────────────┘
     ↓
Task moves back to Inbox for re-clarification
```

### Drag & Drop (Desktop)
```
Drag task between sections:

▼ Next Actions (12)
├─────────────────────────────────────────┐
│ ☐ Review budget ◄─── Dragging...        │
│   @Office 🔴 ⏱1h                        │
└─────────────────────────────────────────┘
              │
              ▼ Drop here
▼ Waiting For (3)
├─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │        Drop to move here            │ │
│ │        Status → waiting_for         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Complete Animation
```
Before:
┌─────────────────────────────────────┐
│ ☐ Call dentist for appointment      │
│   @Phone 🟡 ⏱15m                    │
└─────────────────────────────────────┘

Click checkbox:
┌─────────────────────────────────────┐
│ ✓ Call dentist for appointment      │  ← Green checkmark
│   @Phone 🟡 ⏱15m                    │  ← Strikethrough
└─────────────────────────────────────┘

After 300ms fade:
(task removed from list)

Toast notification:
┌──────────────────────────────┐
│ ✓ Task completed    [Undo]   │
└──────────────────────────────┘
```

---

## 6. Settings Pages

### Settings Dropdown
```
Click [⚙️ ▾]:

┌────────────────────┐
│ 📋 Contexts        │ → /settings/contexts
│ 👤 Account         │ → /settings/account
│ ────────────────── │
│ 🚪 Logout          │ → /login
└────────────────────┘
```

### Contexts Settings Page
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  GTD Todo                                                            [⚙️ ▾]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [📥 Inbox (3)]  [⚡ Actions]  [📁 Projects]                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ⚙️ Settings › Contexts                                                         │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  Default Contexts (read-only)                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ @Office    🔵                                                           │   │
│  │ @Home      🟢                                                           │   │
│  │ @Phone     🟡                                                           │   │
│  │ @Errands   🟠                                                           │   │
│  │ @Computer  🟣                                                           │   │
│  │ @Waiting   ⚪                                                           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Custom Contexts                                                    [+ Add]    │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ @GymTime   🔴     [Edit] [Delete]                                       │   │
│  │ @LowEnergy ⚫     [Edit] [Delete]                                       │   │
│  │ @Weekend   🟤     [Edit] [Delete]                                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Empty States

### Empty Inbox
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📥 Inbox                                                    [➕ Quick Add]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                              ┌─────────────────┐                               │
│                              │                 │                               │
│                              │    📥 → ✓       │                               │
│                              │                 │                               │
│                              └─────────────────┘                               │
│                                                                                 │
│                              Inbox Zero!                                        │
│                                                                                 │
│                    All your tasks have been clarified.                          │
│                    Time to get things done!                                     │
│                                                                                 │
│                         [Go to Actions →]                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Empty Next Actions
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ▼ Next Actions (0)                                                    [+ Add]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│                              ┌─────────────────┐                               │
│                              │                 │                               │
│                              │    ⚡ ✓         │                               │
│                              │                 │                               │
│                              └─────────────────┘                               │
│                                                                                 │
│                           No next actions                                       │
│                                                                                 │
│              Clarify tasks from your Inbox to create                            │
│              actionable next steps.                                             │
│                                                                                 │
│                         [Go to Inbox →]                                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Responsive Breakpoints

### Desktop (≥1024px)
- Split view for Inbox + Clarify panel
- Full filter bar with all options visible
- Sidebar navigation

### Tablet (768px - 1023px)
- Stacked Inbox, modal for Clarify
- Condensed filter bar (dropdowns)
- Top navigation

### Mobile (<768px)
- Single column layout
- Bottom navigation bar
- Full-screen modals for clarification
- Horizontal scrolling filter chips
- Swipe gestures for task actions

---

## Color Reference

| Element | Color | Hex |
|---------|-------|-----|
| Primary (buttons, links) | Blue | #3B82F6 |
| Success (complete) | Green | #10B981 |
| Warning (waiting) | Amber | #F59E0B |
| Danger (delete) | Red | #EF4444 |
| Energy High | Red | #EF4444 |
| Energy Medium | Amber | #F59E0B |
| Energy Low | Green | #10B981 |
| Context badge bg | Gray | #F3F4F6 |
| Section header bg | Gray | #F9FAFB |
| Border | Gray | #E5E7EB |
