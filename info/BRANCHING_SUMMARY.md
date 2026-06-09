# Branching Guidance System — Summary

## Problem
Users struggle to know **when** to branch to effectively chunk conversations. Long threads become unwieldy.

## Solution: Two-Remedy Phase 1 (Validate before Remedy 3)

### Remedy 1: Message Count Display
**Where:** Chat pane header, next to node title  
**Trigger:** Always visible  
**Behavior:**
- Shows "8 messages" (gray) until threshold
- Shows "15+ messages" (yellow background) at threshold
- Tooltip on hover: "15+ messages — branch this node" (clickable → opens Fork)

**Files:**
- `src/components/Chat/ChatPane.tsx` — add count display
- `src/stores/chatStore.ts` — derive from messages.length
- `src/index.css` — add styling for count + tooltip

---

### Remedy 2: Branch Reminder Bar
**Where:** Hovering pill-shaped bar inside message list, below context summary (if visible)  
**Trigger:** When messages reach 15  
**Behavior:**
- Yellow pill appears: "⚠️ This thread is getting long. [×] [Don't show again]"
- Horizontally centered, floats above message list (doesn't push messages down)
- User can close (×) — hides temporarily
- User can dismiss permanently ("Don't show again") — hides for session
- If user ignores it, bar stays visible and doesn't block interaction

**Files:**
- `src/components/Chat/BranchReminder.tsx` — NEW component
- `src/stores/chatStore.ts` — add reminder state
- `src/components/Chat/ChatPane.tsx` — import + render BranchReminder
- `src/index.css` — add styling for bar

---

## Why Phase Out Remedy 3?

**Remedy 3 (Topic Drift Detection)** requires:
- Node summaries (extra Groq call per message = cost + latency)
- Topic drift detection (extra embedding call per message)
- Move/branch suggestion logic (complex)

**Better approach:**
1. Ship Remedy 1 + 2 (low-cost, high-value)
2. Validate with real users: "Do you want help knowing *which* node to branch *to*?"
3. If yes → implement Remedy 3 with summaries
4. If no → stop here and iterate on other features

---

## Visual Overview

```
BEFORE (current)
┌──────────────────────────────┐
│ Stronger Healthier Body      │  ← No visibility of thread length
├──────────────────────────────┤
│ [Messages...]                │
├──────────────────────────────┤
│ Grip: [Mid] | Textarea       │
└──────────────────────────────┘

AFTER (Remedy 1 + 2)
┌────────────────────────────────────────┐
│ Stronger Healthier Body (15+ msgs)    │  ← Remedy 1: message count
├────────────────────────────────────────┤
│ [Context Summary - if visible]         │
│ ✓ Lineage, Referenced, Recommended   │
├────────────────────────────────────────┤
│ [Message list area]                    │
│        ⚠️ This thread is getting long  │  ← Remedy 2: pill bar
│           [×] [Don't show again]       │     (floats above messages)
│                                        │
│ [Messages...]                          │
├────────────────────────────────────────┤
│ Grip: [Mid] | Textarea                │
└────────────────────────────────────────┘
```

---

## Implementation Checklist

### Remedy 1
- [ ] Display message count in chat header
- [ ] Add conditional yellow styling at 15+
- [ ] Add hover tooltip
- [ ] Wire tooltip click to open Fork menu
- [ ] Test count updates, color change, tooltip, click

### Remedy 2
- [ ] Create `BranchReminder.tsx` component
- [ ] Add reminder state to `chatStore`
- [ ] Show bar when messages >= 15
- [ ] Implement close button (temporary hide)
- [ ] Implement "don't show again" (session-persist)
- [ ] Style with yellow background, icon, text, buttons
- [ ] Test display, dismissal, re-appearance

### Integration
- [ ] Both features work together without layout issues
- [ ] Styling is consistent (colors, fonts, spacing)
- [ ] Mobile responsive
- [ ] No console errors

---

## Effort & Timeline

**Total effort:** ~2.5–3 hours (Simple implementation)
- Remedy 1: ~50 minutes
- Remedy 2: ~75 minutes
- Integration + testing: ~30 minutes

**Timeline:** Can ship in 1–2 days

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Threshold | 15 messages | Natural inflection point; long enough to feel like chunking is needed |
| Remedy 1 position | Header, next to title | Always visible, natural scanning order |
| Remedy 1 hover | Tooltip + click to fork | Direct action; low friction |
| Remedy 2 position | Top of chat pane | Doesn't cover recent messages or input |
| Remedy 2 dismissal | Close button + "don't show again" | Respects user intent while remaining helpful |
| Remedy 3 status | Deferred post-launch | Validate Remedy 1 + 2 first; summaries are expensive |

---

## Success Metrics

After launch, measure:
1. **Branching rate:** Do users branch more when they see the counter/bar?
2. **Adoption:** Do users interact with the counter (hover, click)?
3. **Friction:** What % dismiss "don't show again"? (Low = good, user found it helpful)
4. **User feedback:** "Did the counter/bar help you know when to branch?"

---

## Detailed Design Docs

For implementation, see:
- **branching_guidance_design.md** — Full design rationale
- **branching_guidance_ui_spec.md** — UI mockups, HTML structure, CSS
- **branching_guidance_roadmap.md** — Step-by-step implementation tasks

---

## Related Docs

- **README.md** — Project overview
- **mvp_spec.md** — Data model, tech stack, file structure
- **CONTEXT_SELECTION.md** — Current context system (lineage + RAG + references)
