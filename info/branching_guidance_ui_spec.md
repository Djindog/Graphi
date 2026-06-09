# Branching Guidance UI Specification

## Layout Changes

### Chat Pane Header (Remedy 1)

**Current:**
```
┌─────────────────────────────────┐
│ Stronger Healthier Body         │  ← Node title only
└─────────────────────────────────┘
```

**Updated:**
```
┌──────────────────────────────────────────┐
│ Stronger Healthier Body  (8 messages)    │  ← Add message count
│ ---- OR (at 15+) ----                   │
│ Stronger Healthier Body  (15+ messages) │  ← Yellow bg on count
└──────────────────────────────────────────┘
```

**HTML Structure (approximate):**
```jsx
<div className="chat-header">
  <h2 className="node-title">{currentNode.title}</h2>
  <span className={`message-count ${messageCount >= 15 ? 'threshold' : ''}`}>
    {messageCount >= 15 ? '15+ messages' : `${messageCount} messages`}
  </span>
</div>
```

**CSS (Tailwind + inline):**
```css
/* Default state (0–14 messages) */
.message-count {
  color: rgb(107, 114, 128); /* text-gray-500 */
  font-size: 0.875rem;
  margin-left: 0.5rem;
}

/* Threshold state (15+) */
.message-count.threshold {
  background-color: rgb(255, 251, 235); /* #FFFBF0 - light yellow */
  color: rgb(78, 70, 0); /* dark yellow-900 */
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 500;
}

/* Tooltip (on hover, 15+ only) */
.message-count.threshold:hover::after {
  content: "15+ messages — branch this node";
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer: cursor;
  z-index: 50;
  bottom: -2.5rem;
  left: 50%;
  transform: translateX(-50%);
}
```

**Interaction:**
- Hover duration: 200ms before tooltip shows
- Tooltip click: Calls `handleForkClick()` (opens `NodeToolOverlay` with Fork highlighted)
- Cursor on threshold count: Changes to `pointer`

---

### Branch Reminder Bar (Remedy 2)

**Position:** Hovering pill-shaped bar at the top of the message list, **below the context summary panel** (if visible)

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ [Node Header]                                      │
├────────────────────────────────────────────────────┤
│ [Context Summary - if visible]                     │
│ ✓ Lineage: Root, Parent Node                      │
│ ✓ Referenced: Node X, Node Y                       │
│ ✓ Recommended: Node M (84%), Node N (71%)         │
├────────────────────────────────────────────────────┤
│      ⚠️ This thread is getting long              │  ← Remedy 2
│    [×] [Don't show again]     (pill-shaped)       │
├────────────────────────────────────────────────────┤
│ [Message List - scrollable]                        │
│                                                   │
│ [User msg]  What about cardio?                   │
│ [Asst msg]  Here's a focused cardio plan...      │
│ ...                                              │
├────────────────────────────────────────────────────┤
│ Grip: [Off][Low][Mid][High]                       │
│ Textarea + Send button                            │
└────────────────────────────────────────────────────┘
```

**Notes:**
- If context summary is visible: bar appears below it
- If context summary is hidden: bar appears at top of message list
- Pill-shaped: rounded corners (border-radius: 9999px or `rounded-full`)
- Horizontal centering within message list area
- Slightly indented from edges (padding around message list)
- Hovering above message list (not pushing messages down)
- When scrolling messages, bar may scroll up/stay fixed (TBD)

**HTML Structure:**
```jsx
{showBranchReminder && (
  <div className="branch-reminder">
    <div className="reminder-content">
      <span className="reminder-icon">⚠️</span>
      <p>This thread is getting long. Consider starting a new branch for related but distinct topics.</p>
    </div>
    <div className="reminder-actions">
      <button className="close-btn" onClick={closeBranchReminder}>×</button>
      <button className="dismiss-btn" onClick={dismissBranchReminder}>Don't show again</button>
    </div>
  </div>
)}
```

**CSS:**
```css
.branch-reminder {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgb(254, 243, 199); /* #FEF3C7 - bg-yellow-100 */
  border: 1px solid rgb(217, 119, 6); /* #D97706 - border-yellow-600 */
  border-radius: 9999px; /* pill-shaped */
  padding: 0.75rem 1.25rem;
  font-size: 0.875rem;
  color: rgb(120, 53, 15); /* text-yellow-900 */
  gap: 1rem;
  margin: 0.75rem auto; /* center horizontally, add spacing */
  width: fit-content;
  max-width: calc(100% - 2rem); /* leave padding on sides */
  position: relative;
  z-index: 10; /* hover above message list */
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.15); /* subtle shadow */
}

.reminder-icon {
  margin-right: 0.25rem;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.reminder-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reminder-text {
  margin: 0;
  line-height: 1.4;
  white-space: nowrap;
}

.reminder-actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
  white-space: nowrap;
}

.close-btn,
.dismiss-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.close-btn:hover,
.dismiss-btn:hover {
  opacity: 1;
}

.dismiss-btn:hover {
  text-decoration: underline;
}

.close-btn {
  font-size: 1.25rem;
  padding: 0 0.25rem;
  line-height: 1;
}
```

**Behavior:**
```
Appear condition:
  - if (messages.length >= 15 && !reminderDismissed && isVisible)

Show timing:
  - Show once per session (or once per 5 new messages if user didn't dismiss)
  
Close button (×):
  - Hides bar temporarily (until next trigger)
  
Don't show again:
  - Sets reminder flag: chatStore.setReminderDismissed(true)
  - Persists in browser session (not DB)
  - Resets on page reload

User ignores and continues typing:
  - Bar stays visible (doesn't auto-dismiss)
  - User can keep working
  - Close it when ready
```

---

## Chat Pane Overall Layout

**Before (current):**
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

**After (with Remedy 1 + 2):**
```
┌──────────────────────────────────────────┐
│ Node Title  (15+ messages)               │  ← Remedy 1 (in header)
├──────────────────────────────────────────┤
│ [Context Summary - if visible]           │
│ ✓ Lineage, Referenced, Recommended       │
├──────────────────────────────────────────┤
│ [Message list area]                      │
│                                          │
│      ⚠️ This thread is getting long      │  ← Remedy 2 (pill, centered)
│        [×] [Don't show again]            │     (hovers above messages)
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

**Key positioning:**
- Remedy 1: In chat header (always visible)
- Remedy 2: Hovering pill inside message list area, below context summary (if present)
- Bar does NOT push messages down; floats above them (z-index: 10)
- Bar is horizontally centered, slightly indented from edges

---

## Component Files to Modify/Create

### Existing Components to Modify

1. **`src/components/Chat/ChatPane.tsx`**
   - Import new `BranchReminder` component
   - Pass `messageCount` to chat header
   - Render `BranchReminder` conditionally

2. **`src/components/Chat/ChatInput.tsx` (or Chat Header sub-component)**
   - Add message count display with conditional styling
   - Add tooltip on hover
   - Implement tooltip click handler

### New Component to Create

3. **`src/components/Chat/BranchReminder.tsx`** (NEW)
   - Displays yellow bar notification
   - Handles close and dismiss-forever logic
   - Props: `isVisible`, `messageCount`, `onClose`, `onDismiss`

---

## State Management (Zustand)

### Add to `chatStore.ts`

```typescript
interface ChatStore {
  // ... existing state ...
  
  // Remedy 2: Branch reminder state
  branchReminderDismissed: boolean;
  setBranchReminderDismissed: (dismissed: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  // ... existing ...
  branchReminderDismissed: false,
  setBranchReminderDismissed: (dismissed) =>
    set({ branchReminderDismissed: dismissed }),
}));
```

---

## Tooltip Implementation Detail

The tooltip should:
1. Appear **only** when message count is 15+
2. Appear on **hover** with 200ms delay
3. Show text: **"15+ messages — branch this node"**
4. Be **clickable**: Calls `handleForkClick()` to open Fork menu
5. Style: Dark background (black/gray), white text, small font (12px)

**Implementation option A (CSS tooltip):**
```jsx
<span
  className={`message-count ${messageCount >= 15 ? 'threshold' : ''}`}
  title="15+ messages — branch this node"
  onClick={() => messageCount >= 15 && handleForkClick()}
>
  {messageCount >= 15 ? '15+ messages' : `${messageCount} messages`}
</span>
```

**Implementation option B (React tooltip library):**
```jsx
import { Tooltip } from 'react-tooltip'; // or Popper, Radix, etc.

<Tooltip content="15+ messages — branch this node" disabled={messageCount < 15}>
  <span className={`message-count ${messageCount >= 15 ? 'threshold' : ''}`}>
    {messageCount >= 15 ? '15+ messages' : `${messageCount} messages`}
  </span>
</Tooltip>
```

**Recommendation:** Use native HTML `title` + CSS `:hover::after` pseudo-element for simplicity (no extra dependencies). The click handler in JavaScript makes it interactive.

---

## Testing Checklist

- [ ] Message count displays correctly (updates as messages are added)
- [ ] Color turns yellow at exactly 15 messages
- [ ] Tooltip appears on hover (200ms delay) only when 15+
- [ ] Tooltip text reads: "15+ messages — branch this node"
- [ ] Clicking tooltip opens NodeToolOverlay with Fork option
- [ ] Branch reminder bar appears at 15+ messages
- [ ] Close button (×) hides bar without dismissing permanently
- [ ] "Don't show again" hides bar and prevents re-appearance
- [ ] Bar reappears after page reload (if not dismissed)
- [ ] Bar doesn't cover message content or input
- [ ] All styling matches design (yellow background, border, text color)
- [ ] Bar is dismissible and doesn't block interaction
- [ ] Works on mobile (responsive layout)

---

## Future Enhancements

1. **Configurable threshold:** Allow users to set 10/15/20/25+ messages in settings
2. **Notification persistence:** Save "don't show again" preference to DB (not just session)
3. **Remedy 3 integration:** When ready, integrate topic drift detection into the bar text
4. **Analytics:** Track how often users branch after seeing the bar (validate effectiveness)
