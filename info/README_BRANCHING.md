# Branching Guidance System — Full Documentation

## Quick Navigation

This folder contains complete design and implementation specs for the **Branching Guidance System** — a three-remedy approach to help users know when and how to branch conversations.

### Documents

1. **IMPLEMENTATION_START.md** ← **START HERE FOR CODING** (NEW SESSION HANDOFF)
   - Quick overview of what we're building
   - Current state of codebase
   - Critical Remedy 2 positioning detail
   - Files to modify
   - Implementation order
   - Key code snippets and gotchas
   - Testing checklist
   - 10 minute read, then follow the roadmap

2. **BRANCHING_SUMMARY.md** ← **START HERE FOR CONTEXT**
   - High-level overview of the problem, solution, and approach
   - Visual mockups of before/after
   - Implementation checklist
   - Effort estimate (2.5–3 hours)

2. **branching_guidance_design.md**
   - Detailed design rationale for all three remedies
   - Problem statement and solution approach
   - User flow walkthrough
   - Future plans for Remedy 3

3. **branching_guidance_ui_spec.md**
   - Precise UI specifications
   - HTML/CSS code snippets
   - Component file structure
   - Responsive design notes
   - Exact color codes and styling

4. **REMEDY_2_VISUAL.md** ← **FOR DESIGNERS**
   - Detailed visual specification for the pill-shaped bar
   - Exact colors, dimensions, positioning
   - Animations (slide-down entrance, fade-out exit)
   - Responsive breakdown by screen size
   - Before/after comparison
   - Visual rationale

5. **branching_guidance_roadmap.md**
   - Step-by-step implementation tasks (1.1, 1.2, etc.)
   - Code examples for each task
   - File manifest (create/modify/review)
   - Testing checklist for each remedy
   - Estimated effort per task

6. **BRANCHING_OPEN_QUESTIONS.md**
   - Clarification questions (mostly answered now)
   - Confirmation checklist before coding
   - Deferred questions for Remedy 3

---

## The Three Remedies

### Remedy 1: Message Count Display ✓ PHASE 1
Shows message count in chat pane header. Turns yellow at 15+ messages. Click to open Fork menu.

**Status:** Ready to implement  
**Effort:** ~50 minutes  
**Files:** ChatPane, chatStore, CSS

---

### Remedy 2: Branch Reminder Bar ✓ PHASE 1
Yellow notification bar at top of chat pane when messages reach 15. User can close or dismiss permanently.

**Status:** Ready to implement  
**Effort:** ~75 minutes  
**Files:** NEW BranchReminder component, chatStore, ChatPane, CSS

---

### Remedy 3: Topic Drift Detection ⏸️ DEFERRED
(Not implementing in Phase 1. Requires node summaries + drift detection. Will validate user need first.)

**Status:** Architecture designed, awaiting user feedback  
**When:** Post-launch, if users request help knowing which node to branch to

---

## Implementation Status

### Phase 1 (Ready Now)
- ✅ Remedy 1: Message count display
- ✅ Remedy 2: Branch reminder bar
- ✅ Full design & specs
- ✅ Open questions documented

### Next Steps
1. **Review & confirm** the open questions (BRANCHING_OPEN_QUESTIONS.md)
2. **Implement** Remedies 1 + 2 following branching_guidance_roadmap.md
3. **Test** both together
4. **Ship** and gather user feedback
5. **Plan Remedy 3** if needed

---

## Key Design Decisions

| What | Where | When | Why |
|---|---|---|---|
| **Message count** | Chat header | Always visible | Awareness of thread length |
| **Yellow styling** | Message count | At 15+ messages | Clear visual signal |
| **Tooltip link** | On hover (count) | 15+ only | Direct path to Fork |
| **Reminder bar** | Top of chat pane | When 15+ reached | Gentle, proactive nudge |
| **Close button** | On reminder bar | Always | User controls visibility |
| **"Don't show again"** | On reminder bar | Per session | Respects user intent |
| **Remedy 3** | Deferred | Post-launch | Validate need first; reduce scope risk |

---

## Visual Preview

### Before
```
┌──────────────────────────┐
│ Stronger Healthier Body  │
├──────────────────────────┤
│ [Message 1]              │
│ [Message 2]              │
│ ... (no visibility of length)
│ [Message 15+]            │
├──────────────────────────┤
│ Grip: [Mid] | Send       │
└──────────────────────────┘
```

### After (Remedy 1 + 2)
```
┌────────────────────────────────────┐
│ Stronger Healthier Body (15+ msgs) │  ← Remedy 1
├────────────────────────────────────┤
│ ⚠️ This thread is getting long.    │  ← Remedy 2
│                 [×] [Don't show]   │
├────────────────────────────────────┤
│ [Message 1]                        │
│ [Message 2]                        │
│ ...                                │
│ [Message 15+]                      │
├────────────────────────────────────┤
│ Grip: [Mid] | Send                 │
└────────────────────────────────────┘
```

---

## How to Read This Documentation

### If you want to...

**Understand the big picture:**
→ Read BRANCHING_SUMMARY.md (5 min)

**See detailed design:**
→ Read branching_guidance_design.md (10 min)

**Implement it:**
→ Read branching_guidance_roadmap.md (follow tasks sequentially)

**Review UI/CSS:**
→ Read branching_guidance_ui_spec.md (reference during coding)

**Confirm design choices:**
→ Read BRANCHING_OPEN_QUESTIONS.md (answer checklist)

---

## File Structure

```
info/
  README_BRANCHING.md                    ← You are here
  BRANCHING_SUMMARY.md                   ← Start here for overview
  branching_guidance_design.md           ← Full design rationale
  branching_guidance_ui_spec.md          ← UI mockups & CSS
  branching_guidance_roadmap.md          ← Step-by-step tasks
  BRANCHING_OPEN_QUESTIONS.md            ← Clarifications needed
```

---

## Success Criteria

After launch, we measure:
1. **Branching rate increases** when users see the counter/bar
2. **Low friction** — few users dismiss "don't show again"
3. **User feedback** — "The counter/bar helped me know when to branch"
4. **No blocking issues** — Layout, performance, edge cases handled

---

## Questions?

Refer to BRANCHING_OPEN_QUESTIONS.md for clarifications on:
- Colors (Q1)
- Tooltip position (Q2)
- Bar frequency (Q4)
- Dismissal behavior (Q5)
- And 5 more...

Or ask directly — we can update docs as needed.

---

## Timeline

- **Design phase:** ✅ Complete
- **Code phase:** Ready (2.5–3 hours)
- **Test phase:** Ready (1 day)
- **Launch:** Ready (within 48 hours)

Let's ship this! 🚀
