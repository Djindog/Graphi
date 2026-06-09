# Branching Guidance System Design

## Problem Statement
Users struggle to know when to branch to effectively chunk information. Long threads become unwieldy and make context harder to manage.

---

## Solution: Three-Remedy Approach

### Remedy 1: Message Count Display (Node Header)

**Location**: Chat pane header, right next to node title (see red arrow in design).

**Display:**
```
| Node Title (15 messages) |
```

**Styling:**
- Default (0–14 messages): Gray text, no background change
  ```
  "15 messages" — gray text (rgb(107, 114, 128))
  ```
- At threshold (15+ messages): Yellow background, darker text
  ```
  "15+ messages" — text color rgb(78, 70, 0), background rgb(255, 251, 235) [#FFFBF0]
  ```

**Tooltip (on hover, only when 15+):**
- Text: "15+ messages — branch this node"
- Click action: Opens the Fork/Branch menu (NodeToolOverlay) with Fork pre-selected
- Appears after short delay (200ms hover)

**Implementation:**
- Track message count in `chatStore` (already have `messages[]`)
- Pass to chat header component
- Conditional styling and tooltip handler

---

### Remedy 2: "Node Getting Long" Notification Bar

**Trigger:** Appears after the node reaches 15 messages AND user types a new message (optional: appears once per session or dismissible with "don't show again")

**Position:** Top of the chat pane (above message list, below header)

**Visual Style:**
- Minimal bar, unobtrusive
- Background: Soft yellow/amber (rgb(254, 243, 199) or Tailwind `bg-yellow-100`)
- Border: Subtle top border in amber (rgb(217, 119, 6) or Tailwind `border-yellow-600`)
- Text: Small, centered, neutral tone
- Close button (✕) on the right

**Wording Options:**
```
"This node has 15+ messages. Consider starting a new branch for related but distinct topics."
OR
"This thread is getting long. Would you like to branch and start a new conversation?"
```

**Behavior:**
- Appears once per 5 messages (or once per session, configurable)
- User can close (✕) — bar disappears until next trigger
- User can click "don't show again" → sets local storage flag for this session (resets on reload)
- Does NOT block interaction; user can ignore and keep typing

**Implementation:**
- New component: `BranchReminder.tsx` or `NotificationBar.tsx`
- State in `chatStore`: `showBranchReminder`, `branchReminderDismissed`
- Trigger logic: `if (messages.length >= 15 && !dismissed && messages.length % 5 === 0)`

---

### Remedy 3: Topic Drift Detection (Deferred)

**Status:** Designed but NOT implemented in Phase 1.

**Reasoning:** Summaries + drift detection add complexity and latency to Stage 0. Validate Remedies 1 + 2 effectiveness first.

**When to revisit:** After user feedback indicates they need help identifying *which* topic to branch to (not just *when* to branch).

**Placeholder architecture** (for future reference):
- Each node gets a `summary` field (generated on first message send, updated periodically)
- Stage 0 compares incoming message embedding to node summary embedding
- If drift detected (cosine similarity < 0.6), suggest "move to [Node X]" or "branch new"
- UI: Inline suggestion link above message input (non-blocking)

---

## User Flow

### Current State
```
User types message in a 15+ message node
  ↓
No visual feedback about node length
  ↓
User keeps typing, not realizing thread is getting long
  ↓
Eventually, context becomes hard to manage
```

### With Remedy 1 + 2
```
User is in a node with 8 messages
  → Chat header shows "8 messages" (gray)

User sends message #15
  → Chat header shows "15+ messages" (yellow background)
  → If user hovers: tooltip "15+ messages — branch this node"
  → Clicking tooltip opens Fork menu

User types message #16
  → BranchReminder bar appears: "This thread is getting long..."
  → User can close it, or ignore and keep typing
  → User clicks ✕ or "don't show again"

User decides to branch
  → Clicks Fork button (or tooltip link)
  → Creates child node, moves to it
  → Starts fresh conversation
```

---

## Visual Mockup

```
┌─────────────────────────────────────────┐
│ [Node: Stronger Healthier Body] (15+ msg)│  ← yellow bg on count
│                    [tooltip on hover]    │
├─────────────────────────────────────────┤
│ ⚠️ This thread is getting long...        │  ← yellow bar, top
│                               [✕] [Don't show again]
├─────────────────────────────────────────┤
│ Message list (scrollable)                │
│                                         │
│ [user] What about cardio?               │
│ [assistant] Here's a plan...            │
│ ...                                     │
├─────────────────────────────────────────┤
│ Grip: [Off][Low][Mid][High]             │
│ [Textarea: "How can I help?"]            │
│ [Send Button] ↑                         │
└─────────────────────────────────────────┘
```

---

## Implementation Checklist

### Remedy 1: Message Counter
- [ ] Update chat pane header to display message count
- [ ] Add conditional styling (gray → yellow at 15+)
- [ ] Add tooltip that appears on hover (200ms delay)
- [ ] Tooltip click opens Fork menu

### Remedy 2: Branch Reminder Bar
- [ ] Create `BranchReminder.tsx` component
- [ ] Add state to `chatStore`: `showBranchReminder`, `reminderDismissed`
- [ ] Implement trigger logic (15+ messages, show once per session or per 5 messages)
- [ ] Style bar with yellow background, border, close button
- [ ] Test dismissal and "don't show again" behavior

### Testing
- [ ] Visual: Message counter changes color at 15
- [ ] Visual: Tooltip appears on hover after threshold
- [ ] Tooltip click opens Fork menu
- [ ] Bar appears at correct threshold
- [ ] Bar can be dismissed with ✕
- [ ] "Don't show again" persists within session
- [ ] Bar re-appears after sending more messages (if not dismissed)

---

## Future (Remedy 3)

When ready to implement topic drift detection:
1. Add `nodesSummary` table or field to `nodes`
2. Generate summary on first message send in a node
3. Compare incoming message to summary in Stage 0
4. Display "Move to [Node X]?" or "Branch new?" suggestion
5. Link handler: move or branch based on user choice

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Threshold | 15 messages | Avoids too-early suggestion; reasonable thread length before UX degrades |
| Trigger timing | After 15 messages reached | Natural inflection point; user has written enough to recognize pattern |
| Bar position | Top (above message list) | Doesn't cover recent text or input area |
| Dismissal | Close button + "don't show again" | User controls frequency; respects deliberate continuation |
| Tooltip action | Opens Fork menu | Direct path to branching; low friction |
| Remedy 3 | Deferred | Validate Remedies 1 + 2 first; summaries are high-cost |
