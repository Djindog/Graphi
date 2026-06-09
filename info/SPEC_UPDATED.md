# Branching Guidance Spec — FINAL (Updated Position)

## Summary of Changes

**Position for Remedy 2 (Branch Reminder Bar):** Updated to **pill-shaped, hovering inside message list container, below context summary**.

---

## Remedy 1: Message Count Display ✓ FINAL

**Location:** Chat pane header, next to node title

**Display:**
- Default (0–14): "8 messages" — gray text
- Threshold (15+): "15+ messages" — yellow background, dark text

**Interaction:**
- Hover (15+ only): Tooltip appears "15+ messages — branch this node"
- Click (15+ only): Opens Fork menu

**Styling:**
- Default text: `rgb(107, 114, 128)` (gray-500)
- Threshold bg: `rgb(255, 251, 235)` (#FEF3C7 — yellow-100)
- Threshold text: `rgb(78, 70, 0)` (yellow-900)
- Tooltip: Dark background, white text, appears below count

---

## Remedy 2: Branch Reminder Bar ✓ FINAL

**Location:** Pill-shaped bar **inside message list container**, positioned **below context summary** (if present)

**Appearance:**
- Shape: Rounded pill (`border-radius: 9999px`)
- Background: `rgb(254, 243, 199)` (#FEF3C7 — yellow-100)
- Border: `1px solid rgb(217, 119, 6)` (#D97706 — yellow-600)
- Text: `rgb(120, 53, 15)` (yellow-900)
- Shadow: `0 2px 8px rgba(217, 119, 6, 0.15)`
- Padding: `0.75rem 1.25rem`
- Width: `fit-content`, max-width: `calc(100% - 2rem)` (centered)
- Height: ~44px (content-based)

**Content:**
```
⚠️ This thread is getting long. [×] [Don't show again]
```

**Positioning:**
- Horizontally centered: `margin: 0.75rem auto`
- Vertically: Below context summary, at top of scrollable message list
- Z-index: 10 (floats above messages, doesn't push them down)
- Scrolls with message list (not sticky)

**Interactions:**
- Close (×): Hides bar temporarily (session-only)
- Don't show again: Hides bar + sets session flag (resets on page reload)
- Animations: Slide-down entrance (300ms), fade-out exit (200ms)

**Trigger:**
- Shows when `messages.length >= 15`
- Repeats every 5 messages (15, 20, 25...) unless dismissed
- Can be dismissed permanently with "Don't show again" button

---

## Remedy 3: Topic Drift Detection ⏸️ DEFERRED

Not implementing in Phase 1. Validate Remedies 1 + 2 first.

---

## Layout Structure

```
Chat Pane
├── Header (with Remedy 1: message count)
├── Context Summary Panel (if visible)
└── Message List Container
    ├── Branch Reminder Bar (Remedy 2: pill, hovering)
    └── Scrollable Message List
        ├── Message 1
        ├── Message 2
        └── ...
└── Input Section (Grip + Textarea + Send)
```

---

## Files to Create/Modify

### Create:
- `src/components/Chat/BranchReminder.tsx`

### Modify:
- `src/stores/chatStore.ts` — Add reminder state
- `src/components/Chat/ChatPane.tsx` — Display count, import BranchReminder
- `src/index.css` — Add all styling

### Review (no changes expected):
- `src/components/Chat/NodeToolOverlay.tsx` — Fork functionality

---

## CSS Classes Reference

```css
.message-count { }           /* Default count display */
.message-count.threshold { } /* 15+ messages styling */
.branch-reminder { }         /* Pill bar container */
.reminder-icon { }           /* ⚠️ emoji */
.reminder-content { }        /* Text content area */
.reminder-text { }           /* Paragraph text */
.reminder-actions { }        /* Button group */
.close-btn { }               /* × button */
.dismiss-btn { }             /* "Don't show again" button */
```

---

## Testing Checklist — Remedy 1

- [ ] Count displays (0–14: gray, 15+: yellow)
- [ ] Color transition at exactly 15 messages
- [ ] Tooltip appears on hover (200ms delay, 15+ only)
- [ ] Tooltip text: "15+ messages — branch this node"
- [ ] Click tooltip opens Fork menu
- [ ] Tooltip doesn't appear when < 15

---

## Testing Checklist — Remedy 2

- [ ] Bar appears when messages reach 15
- [ ] Bar is pill-shaped (rounded corners)
- [ ] Bar is horizontally centered in message list
- [ ] Bar is below context summary (if visible)
- [ ] Colors match spec (yellow-100 bg, yellow-600 border)
- [ ] Icon displays: ⚠️
- [ ] Text displays: "This thread is getting long. Consider branching."
- [ ] Close button (×) hides bar temporarily
- [ ] "Don't show again" hides bar permanently (session)
- [ ] Bar floats above messages (z-index: 10)
- [ ] Slide-down animation on entrance
- [ ] Fade-out animation on close/dismiss
- [ ] Bar scrolls with message list (not sticky)
- [ ] Responsive on mobile

---

## Integration Checklist

- [ ] Both remedies appear together without layout issues
- [ ] No console errors or warnings
- [ ] Message count updates correctly as messages added
- [ ] Fork menu opens from both tooltip click and button
- [ ] Bar dismissal works independently of count display
- [ ] No overlapping text or UI elements
- [ ] Styling consistent (fonts, colors, spacing)

---

## Effort & Timeline

**Remedy 1:** ~50 minutes (display count, tooltip, click handler)  
**Remedy 2:** ~75 minutes (component, state, styling, animations)  
**Integration & Testing:** ~30 minutes  
**Total:** ~2.5–3 hours

---

## Ready to Code?

All specs are finalized. The following documents provide:

- **BRANCHING_SUMMARY.md** — Overview
- **branching_guidance_ui_spec.md** — Full UI details
- **REMEDY_2_VISUAL.md** — Pill bar visual guide
- **branching_guidance_roadmap.md** — Step-by-step tasks
- **branching_guidance_design.md** — Design rationale

Next step: Begin implementation following the roadmap.
