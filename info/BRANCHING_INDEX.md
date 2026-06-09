# Branching Guidance System — Complete Documentation Index

## Quick Links (By Role)

### 👤 Product Manager / Designer
Start here:
1. **BRANCHING_SUMMARY.md** — Problem, solution, 2-phase approach (5 min read)
2. **REMEDY_2_VISUAL.md** — Pill bar visual spec with mockups (10 min read)
3. **POSITIONING_GUIDE.md** — Where the pill bar sits (5 min read)

### 💻 Developer / Engineer
Start here:
1. **SPEC_UPDATED.md** — Complete final spec (5 min read)
2. **branching_guidance_roadmap.md** — Step-by-step implementation tasks (reference while coding)
3. **POSITIONING_GUIDE.md** — Exact CSS/DOM structure (critical for Remedy 2)
4. **branching_guidance_ui_spec.md** — CSS details and component structure

### 🎨 Designer / Visual Review
Start here:
1. **REMEDY_2_VISUAL.md** — Full visual specification of the pill
2. **POSITIONING_GUIDE.md** — Layout and spacing
3. **branching_guidance_ui_spec.md** — Colors, typography, responsive

---

## Document Overview

### Phase 1 Specs (Ready to Code)

| Doc | Length | Purpose | Audience |
|-----|--------|---------|----------|
| **BRANCHING_SUMMARY.md** | 3 min | Executive summary of 2-remedy approach | Everyone |
| **SPEC_UPDATED.md** | 5 min | Final spec with all decisions locked | Everyone |
| **branching_guidance_design.md** | 10 min | Design rationale and philosophy | Designers, PMs |
| **branching_guidance_ui_spec.md** | 15 min | HTML/CSS/component details | Developers |
| **REMEDY_2_VISUAL.md** | 15 min | Pill bar visual guide with animations | Designers, Developers |
| **POSITIONING_GUIDE.md** | 10 min | Exact DOM/CSS positioning for Remedy 2 | Developers |
| **branching_guidance_roadmap.md** | 20 min | Step-by-step implementation tasks | Developers |

### Reference Docs

| Doc | Purpose |
|-----|---------|
| **BRANCHING_OPEN_QUESTIONS.md** | Q&A about design (mostly answered) |
| **README_BRANCHING.md** | Navigation hub (this index is better) |

---

## What We're Building

### Remedy 1: Message Count Display ✅
**Status:** Fully specified  
**Location:** Chat header  
**What:** Shows "15+ messages" in yellow when thread gets long  
**Click action:** Opens Fork menu  
**Effort:** ~50 min

### Remedy 2: Branch Reminder Bar ✅
**Status:** Fully specified  
**Location:** Pill-shaped bar hovering inside message list (below context summary)  
**What:** Yellow notification "⚠️ This thread is getting long. [×] [Don't show again]"  
**Interactions:** Close (×) hides temporarily; "Don't show again" hides permanently (session)  
**Effort:** ~75 min

### Remedy 3: Topic Drift Detection ⏸️
**Status:** Deferred post-launch  
**When:** After validating Remedy 1 + 2 with real users  
**Why:** Requires node summaries (expensive); validate need first  

---

## Key Decisions Locked In

| Decision | Choice | Why |
|----------|--------|-----|
| Threshold | 15 messages | Natural inflection point for chunking |
| Remedy 1 position | Chat header (next to title) | Always visible |
| Remedy 1 interaction | Hover tooltip → Click to Fork | Direct action |
| Remedy 2 position | Inside message list container, below context summary | Integrated, not intrusive |
| Remedy 2 shape | Pill (rounded `border-radius: 9999px`) | Modern, soft, stands out |
| Remedy 2 dismissal | Close button (temp) + "Don't show again" (session) | Respects user intent |
| Remedy 2 repeat | Every 5 messages unless dismissed | Gentle nudge without spam |
| Animations | Slide-down entrance (300ms), fade-out exit (200ms) | Polished, non-jarring |
| Colors | Yellow-100 bg, yellow-600 border, yellow-900 text | Consistent with Tailwind, warm warning tone |

---

## Implementation Checklist

### Remedy 1 Tasks
- [ ] Task 1.1: Message count in chat header
- [ ] Task 1.2: Conditional yellow styling at 15+
- [ ] Task 1.3: Hover tooltip (15+ only)
- [ ] Task 1.4: Click handler opens Fork menu
- [ ] **Test 1:** Count displays, color changes, tooltip works, click opens menu

### Remedy 2 Tasks
- [ ] Task 2.1: Create BranchReminder.tsx component
- [ ] Task 2.2: Add reminder state to chatStore
- [ ] Task 2.3: Display logic in ChatPane (inside message list container)
- [ ] Task 2.4: Reminder CSS (pill shape, colors, animations)
- [ ] Task 2.5: Test reminder display, dismissal, re-appearance logic
- [ ] **Test 2:** Bar appears, looks correct, close/dismiss works, animations smooth

### Integration
- [ ] Both remedies render without layout issues
- [ ] No console errors or warnings
- [ ] Mobile responsive
- [ ] All animations smooth
- [ ] All interactions work as designed

---

## Code Structure (Files to Create/Modify)

### Create:
```
src/components/Chat/
  └── BranchReminder.tsx (NEW)
```

### Modify:
```
src/
  ├── stores/
  │   └── chatStore.ts (add reminder state)
  ├── components/
  │   └── Chat/
  │       └── ChatPane.tsx (display count, import BranchReminder)
  └── index.css (add all CSS)
```

---

## Visual Summary

```
BEFORE:
┌──────────────────────────┐
│ Node Title               │
├──────────────────────────┤
│ [Messages...]            │
└──────────────────────────┘

AFTER (Remedy 1 + 2):
┌────────────────────────────────┐
│ Node Title (15+ messages)      │  ← Remedy 1
├────────────────────────────────┤
│ [Context Summary if visible]   │
├────────────────────────────────┤
│ [Message list area]            │
│                                │
│     ⚠️ This thread is getting  │  ← Remedy 2
│        long.                   │     (pill bar)
│     [×] [Don't show again]     │
│                                │
│ [Messages...]                  │
└────────────────────────────────┘
```

---

## Timeline

- **Design:** ✅ Complete (you're reading it)
- **Code:** Ready (2.5–3 hours)
- **Test:** Ready (1 day)
- **Ship:** Ready (within 48 hours of starting code)

---

## Questions Before We Code?

All major questions are documented in **BRANCHING_OPEN_QUESTIONS.md**, mostly answered. If you have new questions or need clarification on any spec, let me know and I'll update the docs.

---

## How to Use This Documentation

### While Coding
**Developers:** Keep these open:
1. **branching_guidance_roadmap.md** (task list)
2. **POSITIONING_GUIDE.md** (CSS/DOM structure)
3. **branching_guidance_ui_spec.md** (color/styling details)

### During Code Review
**Reviewers:** Check against:
1. **SPEC_UPDATED.md** (did code match spec?)
2. **branching_guidance_ui_spec.md** (styling correct?)
3. **Testing checklist** in this doc

### Before Merge
**QA:** Verify:
- [ ] All items in "Integration Checklist" above
- [ ] No layout regressions
- [ ] Works on mobile/tablet
- [ ] No console errors

---

## Post-Launch

### Monitor & Measure
- Do users branch more when they see the counter/bar?
- Do users interact with the counter (hover, click)?
- How many dismiss "don't show again"? (Low % = good)
- User feedback: "Did the bar help?"

### If Remedies 1 + 2 Work Well
→ Plan Remedy 3 (topic drift detection with summaries)

### If Issues Found
→ Iterate quickly (both are simple to modify)

---

## Next Steps

1. **Read SPEC_UPDATED.md** — Lock in all decisions
2. **Review POSITIONING_GUIDE.md** — Understand DOM/CSS
3. **Start coding** — Follow branching_guidance_roadmap.md
4. **Reference while building** — branching_guidance_ui_spec.md for details
5. **Test** — Use checklists above
6. **Ship** — Monitor user feedback

Ready? Let's build! 🚀
