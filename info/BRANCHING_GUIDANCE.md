# Branching Guidance System — Comprehensive Guide

## Overview

A three-remedy system to help users know **when** and **how** to branch conversations effectively.

### Current Status
- **Remedy 1** (Message Count Display) — ✅ **COMPLETE**
- **Remedy 2** (Branch Reminder Bar) — ✅ **COMPLETE**
- **Remedy 3** (Topic Drift Detection) — ⏸️ **DEFERRED**

### Problem
Users struggle to know when to fork threads. Long conversations become unwieldy and context harder to manage.

---

## Remedy 1: Message Count Display ✅ COMPLETE

### Purpose
Always-visible counter in the chat header that turns yellow at 15+ messages, signaling when a thread is getting long.

### Design

**Location:** Chat pane header, next to node title

**Display:**
- **0–14 messages:** Gray text, no background — `"8 messages"`
- **15+ messages:** Yellow background, dark text — `"15+ messages"`

**Styling:**
- Default text: `rgb(107, 114, 128)` (gray-500)
- Threshold background: `rgb(254, 243, 199)` (#FEF3C7 — yellow-100)
- Threshold text: `rgb(78, 70, 0)` (yellow-900)
- Font size: `0.875rem`
- Padding (threshold): `0.25rem 0.75rem`
- Border radius: `0.375rem`

**Interaction:**
- Hover (15+ only): Tooltip appears after 200ms with text "15+ messages — branch this node"
- Click (15+ only): Opens Fork menu (NodeToolOverlay)
- Cursor changes to `pointer` on hover

### Implementation

**Files Modified:**
- `src/components/Chat/ChatPane.tsx` — Display count, wire click handler
- `src/stores/chatStore.ts` — Derive `messageCount` from `messages.length`
- `src/index.css` — Add count styling + tooltip

**Code Example:**
```jsx
const messageCount = useChatStore((state) => state.messages.length);

<span
  className={`message-count ${messageCount >= 15 ? 'threshold' : ''}`}
  onClick={() => messageCount >= 15 && handleForkClick()}
  title={messageCount >= 15 ? '15+ messages — branch this node' : ''}
>
  {messageCount >= 15 ? '15+ messages' : `${messageCount} messages`}
</span>
```

**CSS:**
```css
.message-count {
  color: rgb(107, 114, 128);
  font-size: 0.875rem;
  margin-left: 0.5rem;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.message-count.threshold {
  background-color: rgb(254, 243, 199);
  color: rgb(78, 70, 0);
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
}

.message-count.threshold:hover::after {
  content: "15+ messages — branch this node";
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 50;
  bottom: -2.5rem;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}
```

### Testing Checklist
- [x] Count displays correctly (updates as messages added)
- [x] Color changes from gray to yellow at exactly 15
- [x] Tooltip appears on hover (200ms delay, 15+ only)
- [x] Tooltip text: "15+ messages — branch this node"
- [x] Click opens Fork menu
- [x] Tooltip doesn't appear when < 15

---

## Remedy 2: Branch Reminder Bar ✅ COMPLETE

### Purpose
Hovering pill-shaped notification bar that appears when a thread reaches 15 messages, reminding users to consider branching. Dismissible without friction.

### Design

**Location:** Inside message list container, positioned below context summary (if visible)

**Appearance:**
- Shape: Rounded pill (`border-radius: 9999px`)
- Background: `rgb(254, 243, 199)` (#FEF3C7 — yellow-100)
- Border: `1px solid rgb(217, 119, 6)` (#D97706 — yellow-600)
- Text color: `rgb(120, 53, 15)` (yellow-900)
- Shadow: `0 2px 8px rgba(217, 119, 6, 0.15)`
- Padding: `0.75rem 1.25rem`
- Width: `fit-content`, max-width: `calc(100% - 2rem)`
- Height: ~44px (content-based)

**Content:**
```
⚠️ This thread is getting long. Consider branching.   [×] [Don't show again]
```

**Positioning:**
- Horizontally centered: `margin: 0.75rem auto`
- Vertically: Below context summary (if visible), at top of scrollable message list
- Z-index: 10 (floats above messages, doesn't push them down)
- Scrolls with message list (not sticky)

**Interactions:**
- Close button (×): Hides bar temporarily (session-only)
- "Don't show again": Hides bar + sets session flag (resets on page reload)
- Animations: Slide-down entrance (300ms), fade-out exit (200ms)

**Trigger Logic:**
- Shows when `messages.length >= 15`
- Respects session dismissal flag
- Re-appears after page reload (unless dismissed)

### Implementation

**Files Created:**
- `src/components/Chat/BranchReminder.tsx` — NEW component

**Files Modified:**
- `src/stores/chatStore.ts` — Add reminder state
- `src/components/Chat/ChatPane.tsx` — Import BranchReminder, pass props
- `src/index.css` — Add reminder styling

**Component Code:**
```tsx
interface BranchReminderProps {
  isVisible: boolean;
  messageCount: number;
  onClose: () => void;
  onDismiss: () => void;
  threshold?: number;
  contextHeight?: number;
}

export const BranchReminder: React.FC<BranchReminderProps> = ({
  isVisible,
  messageCount,
  onClose,
  onDismiss,
  threshold = 15,
  contextHeight = 0,
}) => {
  if (!isVisible || messageCount < threshold) return null;

  const topPosition = contextHeight > 0 ? `${contextHeight + 12}px` : '0.75rem';

  return (
    <div style={{
      position: 'absolute',
      top: topPosition,
      left: '1rem',
      right: '1rem',
      zIndex: 10,
      width: 'calc(100% - 2rem)',
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgb(254, 243, 199)',
        border: '1px solid rgb(217, 119, 6)',
        borderRadius: '9999px',
        padding: '0.75rem 1.25rem',
        gap: '1rem',
        animation: 'slideDown 0.3s ease-out',
        pointerEvents: 'auto',
      }}>
        {/* Content */}
        <p style={{
          margin: 0,
          fontSize: '0.875rem',
          color: 'rgb(120, 53, 15)',
          lineHeight: '1.4',
          whiteSpace: 'nowrap',
        }}>
          This thread is getting long. Consider branching.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          <button onClick={onClose} aria-label="Close">×</button>
          <button onClick={onDismiss}>Don't show again</button>
        </div>
      </div>
    </div>
  );
};
```

**CSS:**
```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
```

### Testing Checklist
- [x] Bar appears when messages >= 15
- [x] Bar is pill-shaped (rounded corners)
- [x] Bar is horizontally centered
- [x] Bar is below context summary (if visible)
- [x] Colors match spec (yellow-100 bg, yellow-600 border)
- [x] Text displays: "This thread is getting long. Consider branching."
- [x] Close button (×) hides bar temporarily
- [x] "Don't show again" hides bar permanently (session)
- [x] Bar floats above messages (z-index: 10)
- [x] Slide-down animation on entrance
- [x] Fade-out animation on close/dismiss
- [x] Responsive on mobile
- [x] Both remedies work together without layout issues

---

## Remedy 3: Topic Drift Detection ⏸️ DEFERRED

### Purpose
Auto-detect when a user's message drifts off-topic from the node's conversation thread, then suggest appropriate branching targets or creation of a new node.

### Status
**Not implementing in Phase 1.** Validate Remedies 1 + 2 effectiveness first. Revisit after user feedback indicates need for "which node to branch to" guidance.

### Design (for future implementation)

**Concept:**
1. Generate a summary of each node's content (on first message, updated periodically)
2. Compare incoming message embedding to node summary embedding
3. If cosine similarity < 0.6 (configurable drift threshold), suggest:
   - "This seems off-topic. Move to [Node X]?" (if similar node exists)
   - "This seems off-topic. Branch to new node?" (if no similar node)
4. UI: Inline suggestion link above message input (non-blocking, dismissible)

**Architecture:**
- Add `summary` field to `nodes` table (generated by Groq)
- Add `summaryEmbedding` field (vector[768], indexed with pgvector)
- Stage 0 compares message embedding to current node's summary embedding
- Threshold: `cosine_similarity < 0.6` → drift detected
- Cost: 1 embedding call per message (already budgeted in Stage 0)
- One Groq call per node on first message (lazy initialization)

**Data Model:**
```sql
ALTER TABLE nodes ADD COLUMN summary TEXT;
ALTER TABLE nodes ADD COLUMN summary_embedding vector(768);
CREATE INDEX ON nodes USING ivfflat (summary_embedding vector_cosine_ops);
```

**Why Defer:**
- **Cost:** Node summaries require Groq calls (not free)
- **Complexity:** Drift detection + suggestion UI adds logic
- **Validation first:** Need user feedback on whether Remedies 1+2 solve the core problem
- **Low priority:** Users can branch manually; auto-suggestion is nice-to-have

### When to Revisit
- After 2+ weeks of production usage with Remedies 1+2
- If user feedback indicates they need help identifying *which* node to branch to
- If branching frequency increases but user confusion about topic-appropriate nodes remains
- If analytics show messages > 20 (suggests users aren't following Remedy 1 guidance)

---

## Chat Pane Layout

### Before (Current)
```
┌──────────────────────────────┐
│ Node Title                   │  ← Header
├──────────────────────────────┤
│ [Message 1]                  │  ← Message list
│ [Message 2]                  │
│ ...                          │
│ [Message 15+]                │
├──────────────────────────────┤
│ Grip: [Off][Low][Mid][High]  │  ← Input section
│ [Textarea]                   │
│ [Send Button]                │
└──────────────────────────────┘
```

### After (Remedy 1 + 2)
```
┌──────────────────────────────────────────┐
│ Node Title  (15+ messages)               │  ← Remedy 1: count
├──────────────────────────────────────────┤
│ [Context Summary - if visible]           │
│ ✓ Lineage, Referenced, Recommended       │
├──────────────────────────────────────────┤
│ [Message list area]                      │
│                                          │
│      ⚠️ This thread is getting long      │  ← Remedy 2: pill bar
│        [×] [Don't show again]            │     (floats above messages)
│                                          │
│ [Message 1]                              │
│ [Message 2]                              │
│ ...                                      │
│ [Message 15+]                            │
├──────────────────────────────────────────┤
│ Grip: [Off][Low][Mid][High]              │  ← Input section
│ [Textarea]                               │
│ [Send Button]                            │
└──────────────────────────────────────────┘
```

**Key Positioning:**
- Remedy 1: In chat header (always visible)
- Remedy 2: Hovering pill inside message list area, below context summary (if present)
- Bar does NOT push messages down; floats above (z-index: 10)
- Bar is horizontally centered, slightly indented from edges

---

## File Manifest

### Files Created
- ✅ `src/components/Chat/BranchReminder.tsx`

### Files Modified
- ✅ `src/stores/chatStore.ts` — Added reminder state
- ✅ `src/components/Chat/ChatPane.tsx` — Added count display, reminder render, keyboard navigation
- ✅ `src/index.css` — Added styling
- ✅ `.env.development` — Added `VITE_REMINDER_THRESHOLD=2` for dev testing

### Files Reviewed (no changes needed)
- `src/components/Chat/NodeToolOverlay.tsx` — Fork functionality

---

## Implementation Summary

### Phase 1: Remedies 1 + 2 (Complete)

**Effort:**
- Remedy 1: ~50 minutes
- Remedy 2: ~75 minutes
- Integration & Testing: ~30 minutes
- **Total: ~2.5–3 hours**

**Key Decisions:**
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Threshold | 15 messages | Natural inflection; long enough to feel chunking is needed |
| Remedy 1 position | Header, next to title | Always visible, natural scanning order |
| Remedy 1 interaction | Tooltip + click to fork | Direct action, low friction |
| Remedy 2 position | Top of message list | Doesn't cover recent messages or input |
| Remedy 2 dismissal | Close button + "don't show again" | Respects intent while helpful |
| Remedy 3 status | Deferred post-launch | Validate 1+2 first; summaries are expensive |

### Phase 2: Remedy 3 (Pending validation)

**Prerequisites:**
1. Ship Remedies 1 + 2
2. Gather user feedback for 2+ weeks
3. Validate that message count + reminder bar solve the core problem
4. Decide: proceed with Remedy 3 or iterate on 1+2

**If proceeding:**
- Add `summary` + `summaryEmbedding` to nodes table
- Generate summaries on first message per node
- Compare incoming message embedding to node summary
- Display drift suggestion link above input
- Test with real users

---

## Success Metrics (Post-Launch)

1. **Branching rate:** Do users branch more when seeing counter/bar?
2. **Adoption:** Do users interact with counter (hover, click)?
3. **Friction:** What % dismiss "don't show again"? (Low % = helpful)
4. **Feedback:** "Did the counter/bar help you know when to branch?"

---

## Developer Notes

### Testing in Dev Mode
- Environment variable: `VITE_REMINDER_THRESHOLD=2` (triggers bar at 2 messages instead of 15)
- Developer toggle in Settings → Developer tab (shows test button when enabled)
- Test button in ChatPane triggers the reminder bar immediately

### Future Enhancements
1. **Configurable threshold:** Let users set 10/15/20/25+ in settings
2. **Persistent dismissal:** Save "don't show again" to DB (not just session)
3. **Remedy 3 integration:** Incorporate topic drift suggestion into bar
4. **Analytics:** Track branching frequency and user engagement

---

## Related Documentation

- `mvp_spec.md` — Data model, tech stack, file structure
- `CONTEXT_SELECTION.md` — Context system (lineage + RAG + references)
