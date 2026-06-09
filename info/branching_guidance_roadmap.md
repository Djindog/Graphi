# Branching Guidance Implementation Roadmap

## Overview

Three-remedy system to help users know when and how to branch conversations effectively.

**Phase:** Phase 1 (Remedies 1 + 2 only)  
**Timeline:** 2–3 days for both features  
**Complexity:** Low to Medium

---

## Remedy 1: Message Count Display

### Scope
Display message count in chat pane header. Turn yellow at 15+ messages. Add interactive tooltip linking to Fork.

### Tasks

#### 1.1 Update chatStore (or derive from messages array)
**File:** `src/stores/chatStore.ts`  
**Changes:**
- Already have `messages[]` state
- Derive `messageCount` as computed: `messages.length`
- No new state needed; just read from existing

**Why:** Avoid duplication; message count is always `chatStore.messages.length`

---

#### 1.2 Create/Update Chat Header Component
**File:** `src/components/Chat/ChatPane.tsx` (or extract header to `ChatHeader.tsx`)  
**Changes:**
- Import message count from `useChatStore`
- Add `<span>` element displaying count
- Conditional class: `messageCount >= 15 ? 'threshold' : ''`

**Implementation:**
```jsx
const messageCount = useChatStore((state) => state.messages.length);

return (
  <div className="chat-header">
    <h2 className="node-title">{currentNode.title}</h2>
    <span
      className={`message-count ${messageCount >= 15 ? 'threshold' : ''}`}
      onClick={() => messageCount >= 15 && handleForkClick()}
      title={messageCount >= 15 ? '15+ messages — branch this node' : ''}
    >
      {messageCount >= 15 ? '15+ messages' : `${messageCount} messages`}
    </span>
  </div>
);
```

---

#### 1.3 Add CSS Styling
**File:** `src/index.css` or component-scoped styles  
**Changes:**
```css
.message-count {
  color: rgb(107, 114, 128); /* text-gray-500 */
  font-size: 0.875rem;
  margin-left: 0.5rem;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.message-count.threshold {
  background-color: rgb(255, 251, 235); /* #FFFBF0 */
  color: rgb(78, 70, 0); /* dark yellow */
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.message-count.threshold:hover {
  background-color: rgb(254, 243, 199); /* slightly darker yellow */
}

/* Tooltip */
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

---

#### 1.4 Wire Click Handler
**File:** `src/components/Chat/ChatPane.tsx`  
**Changes:**
- When tooltip/message-count is clicked AND `messageCount >= 15`:
  - Call `setShowNodeOverlay(true)` to show Fork menu
  - Or directly call fork handler if simpler

**Implementation:**
```jsx
const handleMessageCountClick = () => {
  if (messageCount >= 15) {
    // Option A: Open NodeToolOverlay with Fork pre-selected
    setShowNodeOverlay(true);
    
    // Option B: Or directly call fork
    // handleFork(currentNodeId);
  }
};
```

---

### Testing (Remedy 1)
- [ ] Message count displays in header
- [ ] Count updates as new messages added
- [ ] Color changes from gray to yellow at exactly 15
- [ ] Tooltip appears on hover (no flicker)
- [ ] Tooltip text correct: "15+ messages — branch this node"
- [ ] Click on count opens Fork menu
- [ ] Works in both Tree and Force modes

---

## Remedy 2: Branch Reminder Bar

### Scope
Show yellow notification bar at top of chat pane when messages reach 15+. Allow dismissal and "don't show again" option.

### Tasks

#### 2.1 Create BranchReminder Component
**File:** `src/components/Chat/BranchReminder.tsx` (NEW)  
**Changes:**
```tsx
import React from 'react';

interface BranchReminderProps {
  isVisible: boolean;
  messageCount: number;
  onClose: () => void;
  onDismiss: () => void;
}

export const BranchReminder: React.FC<BranchReminderProps> = ({
  isVisible,
  messageCount,
  onClose,
  onDismiss,
}) => {
  if (!isVisible || messageCount < 15) return null;

  return (
    <div className="branch-reminder">
      <div className="reminder-content">
        <span className="reminder-icon">⚠️</span>
        <p className="reminder-text">
          This thread is getting long. Consider starting a new branch for related but distinct topics.
        </p>
      </div>
      <div className="reminder-actions">
        <button className="close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
        <button className="dismiss-btn" onClick={onDismiss}>
          Don't show again
        </button>
      </div>
    </div>
  );
};
```

---

#### 2.2 Update chatStore with Reminder State
**File:** `src/stores/chatStore.ts`  
**Changes:**
```typescript
interface ChatStore {
  // ... existing ...
  branchReminderDismissed: boolean;
  branchReminderVisible: boolean;
  setBranchReminderDismissed: (dismissed: boolean) => void;
  setBranchReminderVisible: (visible: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  // ... existing ...
  branchReminderDismissed: false,
  branchReminderVisible: false,
  setBranchReminderDismissed: (dismissed) =>
    set({ branchReminderDismissed: dismissed }),
  setBranchReminderVisible: (visible) =>
    set({ branchReminderVisible: visible }),
}));
```

---

#### 2.3 Add Reminder Display Logic
**File:** `src/components/Chat/ChatPane.tsx`  
**Changes:**
```jsx
import { BranchReminder } from './BranchReminder';

export const ChatPane = () => {
  const {
    messages,
    branchReminderDismissed,
    branchReminderVisible,
    setBranchReminderVisible,
    setBranchReminderDismissed,
  } = useChatStore();

  const messageCount = messages.length;

  // Show reminder when:
  // - messageCount >= 15
  // - NOT permanently dismissed in this session
  // - AND we want to show it (triggered logic)
  const shouldShowReminder = messageCount >= 15 && !branchReminderDismissed;

  React.useEffect(() => {
    // Show reminder once when threshold is first hit
    if (shouldShowReminder && messageCount === 15) {
      setBranchReminderVisible(true);
    }
  }, [messageCount, shouldShowReminder, setBranchReminderVisible]);

  const handleClose = () => {
    setBranchReminderVisible(false);
    // Reappear after N more messages (optional)
  };

  const handleDismiss = () => {
    setBranchReminderVisible(false);
    setBranchReminderDismissed(true);
  };

  return (
    <div className="chat-pane">
      {/* Header */}
      {/* ... */}

      {/* Context Summary (if visible) */}
      {/* ... */}

      {/* Message List Container */}
      <div className="message-list-container">
        {/* Reminder Bar - INSIDE message list area, below context summary */}
        <BranchReminder
          isVisible={branchReminderVisible && shouldShowReminder}
          messageCount={messageCount}
          onClose={handleClose}
          onDismiss={handleDismiss}
        />

        {/* Scrollable Message List */}
        {/* ... */}
      </div>

      {/* Input */}
      {/* ... */}
    </div>
  );
};
```

**Key positioning detail:**
- `BranchReminder` must be rendered **inside** the message list container
- Renders **after** context summary (if present) but **before** the scrollable message area
- Uses `position: relative` on container and `z-index: 10` on bar to float above messages
- Bar is horizontally centered with `margin: auto`

---

#### 2.4 Add Reminder CSS
**File:** `src/index.css` or component-scoped  
**Changes:**
```css
.branch-reminder {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgb(254, 243, 199); /* #FEF3C7 */
  border-top: 2px solid rgb(217, 119, 6); /* #D97706 */
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: rgb(120, 53, 15); /* text-yellow-900 */
  gap: 1rem;
  animation: slideDown 0.3s ease-out;
}

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

.reminder-content {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.reminder-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.reminder-text {
  margin: 0;
  line-height: 1.4;
}

.reminder-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  white-space: nowrap;
}

.close-btn,
.dismiss-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.875rem;
  opacity: 0.8;
  transition: opacity 0.2s ease;
  padding: 0.25rem 0.5rem;
}

.close-btn {
  font-size: 1.5rem;
  padding: 0;
  line-height: 1;
}

.close-btn:hover,
.dismiss-btn:hover {
  opacity: 1;
}

.dismiss-btn {
  text-decoration: underline;
}
```

---

#### 2.5 Test Reminder Logic
**File:** Test file or manual testing  
**Changes:**
- Trigger: Add 15 messages to a node
- Verify: Bar appears
- Close button: Bar hides (visible = false)
- Don't show again: Bar stays hidden even after new messages
- Page reload: Bar reappears (dismissed flag resets)

---

### Testing (Remedy 2)
- [ ] Bar appears when messageCount === 15
- [ ] Bar doesn't appear if already dismissed in session
- [ ] Close button (×) hides bar without permanent dismissal
- [ ] "Don't show again" prevents re-appearance (within session)
- [ ] Bar has yellow background, border, and icon
- [ ] Text is neutral and non-judgmental
- [ ] Bar doesn't cover message content
- [ ] Responsive on mobile
- [ ] Animations smooth (slide-in)

---

## Integration Testing

### Full Flow
1. User is in a chat node with 8 messages
   - Header shows "8 messages" (gray)
   - No reminder bar

2. User sends message #15
   - Header shows "15+ messages" (yellow)
   - Hovering shows tooltip: "15+ messages — branch this node"

3. User continues typing message #16
   - Reminder bar appears at top: "This thread is getting long..."
   - Bar can be dismissed with ×

4. User sends message #17, then #18
   - Reminder still gone (user dismissed it)

5. User clicks on yellow "15+ messages" count
   - NodeToolOverlay opens with Fork option
   - User clicks Fork
   - New child node created, chat moves to it
   - New node starts at 0 messages (gray count)

---

## File Manifest

### Files to Create
- `src/components/Chat/BranchReminder.tsx` — NEW

### Files to Modify
- `src/stores/chatStore.ts` — Add reminder state
- `src/components/Chat/ChatPane.tsx` — Import/use BranchReminder, add message count display
- `src/index.css` — Add reminder + message-count styles

### Files to Review (but likely no changes)
- `src/components/Chat/NodeToolOverlay.tsx` — Verify Fork click works from tooltip

---

## Estimated Effort

| Task | Effort | Time |
|---|---|---|
| 1.1 chatStore (derive count) | Trivial | 5 min |
| 1.2 Chat header display | Simple | 20 min |
| 1.3 CSS styling | Simple | 15 min |
| 1.4 Click handler wiring | Simple | 10 min |
| **Remedy 1 subtotal** | **Simple** | **50 min** |
| 2.1 BranchReminder component | Simple | 15 min |
| 2.2 chatStore reminder state | Simple | 10 min |
| 2.3 Display logic in ChatPane | Simple | 15 min |
| 2.4 Reminder CSS | Simple | 15 min |
| 2.5 Testing logic | Simple | 20 min |
| **Remedy 2 subtotal** | **Simple** | **75 min** |
| **Integration testing** | **Medium** | **30 min** |
| **Total** | **Simple–Medium** | **~2.5–3 hours** |

---

## Next Steps

1. **Code review this roadmap** — Any questions or changes?
2. **Implement Remedy 1** — Message count + tooltip
3. **Implement Remedy 2** — Reminder bar
4. **Test both together** — Verify no layout issues, styling correct
5. **Ship to production** — Monitor user feedback
6. **Plan Remedy 3** — After validation, if needed

---

## Success Metrics (Post-Launch)

- Users branch more frequently when message count hits 15
- Reminder bar doesn't create friction (dismissal rate < 30%)
- Message count visibility increases user awareness of thread length
- Feedback: "I didn't realize my thread was getting long until I saw the counter"
