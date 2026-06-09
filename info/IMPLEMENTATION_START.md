# Branching Guidance: Implementation Start Guide

**For:** New session / developer picking up this task  
**Time to read:** 10 minutes  
**Then follow:** branching_guidance_roadmap.md (step-by-step tasks)

---

## What We're Building

**Goal:** Help users know when to branch conversations to chunk information effectively.

**Two features (Phase 1):**

### Remedy 1: Message Count Display
- Shows "15 messages" in chat header (gray until 15+, then yellow)
- Hover tooltip: "15+ messages — branch this node"
- Click tooltip → Opens Fork menu

### Remedy 2: Branch Reminder Bar
- Yellow pill-shaped bar hovering inside message list (below context summary)
- Shows: "⚠️ This thread is getting long. [×] [Don't show again]"
- Appears when messages reach 15
- User can close (×) temporarily or dismiss permanently ("Don't show again")

---

## The Spec (Locked)

**Read these in order:**
1. `info/SPEC_UPDATED.md` — Final decisions (5 min)
2. `info/REMEDY_2_VISUAL.md` — Pill bar appearance (10 min, for CSS reference)
3. `info/POSITIONING_GUIDE.md` — DOM/CSS structure for Remedy 2 (10 min, critical)

**While coding, reference:**
- `info/branching_guidance_ui_spec.md` — Color codes, CSS classes
- `info/branching_guidance_roadmap.md` — Step-by-step tasks (this is the actual "do this" list)

---

## Current State

**ChatPane structure (current):**
```
ChatPane
├── Header (node title)
├── ContextSummary (if context exists)
├── MessageList (scrollable)
└── ChatInput (textarea, grip, send button)
```

**What we're adding:**

### Remedy 1 (simple):
- Add message count `<span>` to header next to title
- Add CSS classes and tooltip handler
- Wire click to open Fork menu

### Remedy 2 (moderate):
- Create new `BranchReminder.tsx` component (pill bar)
- Add state to `chatStore` for reminder visibility/dismissal
- Insert BranchReminder **inside message list container** (this is key)
- Add CSS for pill shape, colors, animations

---

## Critical Implementation Details

### Remedy 2 Position (The Tricky Part)

**WRONG:** Bar at top of ChatPane, separate from message list
```
❌ This won't work:
ChatPane
├── Header
├── BranchReminder ← outside message container
├── MessageList
└── ChatInput
```

**CORRECT:** Bar inside message list container
```
✅ This is what we need:
ChatPane
├── Header
├── MessageListContainer (position: relative, overflow-y: auto)
│   ├── BranchReminder ← INSIDE, position: relative, z-index: 10
│   └── ScrollableMessageArea
│       ├── Message 1
│       ├── Message 2
│       └── ...
└── ChatInput
```

**Why?**
- Bar floats above messages with `z-index: 10`
- Bar is part of message list content (scrolls with messages, not sticky)
- Bar is centered horizontally with `margin: auto`
- Simple DOM structure, no absolute/fixed positioning hackiness

**See `POSITIONING_GUIDE.md` for full CSS/DOM details.**

---

## Files You'll Modify

### Create:
```
src/components/Chat/BranchReminder.tsx  (NEW)
```

### Edit:
```
src/stores/chatStore.ts
  ├── Add: branchReminderDismissed (boolean)
  ├── Add: branchReminderVisible (boolean)
  ├── Add: setBranchReminderDismissed()
  └── Add: setBranchReminderVisible()

src/components/Chat/ChatPane.tsx
  ├── Import BranchReminder component
  ├── Get messageCount from useChatStore
  ├── Add <span> for message count in header
  ├── Restructure: wrap message area in container
  ├── Render BranchReminder inside container
  └── Add click/dismissal handlers

src/index.css  (or component-scoped styles)
  ├── .message-count (gray text)
  ├── .message-count.threshold (yellow bg)
  ├── .message-count.threshold:hover::after (tooltip)
  ├── .branch-reminder (pill bar)
  ├── .branch-reminder animations (slideDown, fadeOut)
  └── All button/text styling for reminder
```

---

## Implementation Order

### Phase A: Remedy 1 (Independent, do first)
1. Task 1.1: Message count state (trivial — just use `messages.length`)
2. Task 1.2: Add count display in header
3. Task 1.3: Add CSS styling
4. Task 1.4: Wire click handler
5. Test locally

### Phase B: Remedy 2 (Depends on ChatPane structure)
1. Task 2.1: Create `BranchReminder.tsx` component
2. Task 2.2: Add reminder state to `chatStore`
3. Task 2.3: Restructure ChatPane (wrap message area in container) — **This is the hard part**
4. Task 2.4: Insert BranchReminder inside container
5. Task 2.5: Add CSS + animations
6. Test locally

### Phase C: Integration
1. Both features work together
2. No layout regressions
3. Mobile responsive
4. All animations smooth

---

## Key Code Snippets

### Remedy 1: Message Count in Header
```jsx
// In ChatPane.tsx header section
const messageCount = useChatStore((state) => state.messages.length);

<div className="chat-header">
  <h2>{currentNode.title}</h2>
  <span 
    className={`message-count ${messageCount >= 15 ? 'threshold' : ''}`}
    onClick={() => messageCount >= 15 && handleForkClick()}
    title={messageCount >= 15 ? '15+ messages — branch this node' : ''}
  >
    {messageCount >= 15 ? '15+ messages' : `${messageCount} messages`}
  </span>
</div>
```

### Remedy 2: Restructure ChatPane
```jsx
// In ChatPane.tsx, wrap message area in container
<div className="chat-pane">
  {/* Header with Remedy 1 */}
  <header className="chat-header">{...}</header>

  {/* Context Summary if visible */}
  {contextNodes.length > 0 && <ContextSummary />}

  {/* NEW: Message List Container */}
  <div className="message-list-container">
    {/* BranchReminder INSIDE this container */}
    {showBranchReminder && (
      <BranchReminder 
        onClose={handleCloseReminder}
        onDismiss={handleDismissReminder}
      />
    )}

    {/* Scrollable messages */}
    <div className="scroll-area">
      {messages.map(msg => <Message key={msg.id} {...msg} />)}
    </div>
  </div>

  {/* Chat Input */}
  <ChatInput />
</div>
```

### CSS: Container Positioning (Remedy 2)
```css
.message-list-container {
  flex: 1;
  position: relative;  /* Important! */
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.branch-reminder {
  position: relative;
  z-index: 10;
  margin: 0.75rem auto;  /* Centered */
  width: fit-content;
  max-width: calc(100% - 2rem);
  
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  background-color: rgb(254, 243, 199);
  border: 1px solid rgb(217, 119, 6);
  border-radius: 9999px;
  padding: 0.75rem 1.25rem;
  
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.15);
  animation: slideDown 0.3s ease-out;
}

.scroll-area {
  flex: 1;
  overflow-y: auto;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-10px); }
}
```

---

## Testing Checklist

### Remedy 1
- [ ] Message count displays in header
- [ ] Color is gray (0-14 messages)
- [ ] Color turns yellow at exactly 15 messages
- [ ] Tooltip appears on hover (only 15+)
- [ ] Tooltip text: "15+ messages — branch this node"
- [ ] Click tooltip opens Fork menu
- [ ] Tooltip doesn't appear when < 15

### Remedy 2
- [ ] Bar appears when messages >= 15
- [ ] Bar is pill-shaped (rounded, not rectangular)
- [ ] Bar is centered horizontally
- [ ] Bar is below context summary (if visible)
- [ ] Bar colors: yellow-100 bg, yellow-600 border
- [ ] Bar icon: ⚠️
- [ ] Bar text: "This thread is getting long. Consider branching."
- [ ] Close button (×) hides bar temporarily
- [ ] "Don't show again" hides bar permanently (session)
- [ ] Bar floats above messages (z-index 10)
- [ ] Slide-down animation smooth (300ms)
- [ ] Fade-out animation smooth (200ms)
- [ ] Bar scrolls with message list (not sticky)

### Integration
- [ ] Both features work together
- [ ] No layout regressions
- [ ] No console errors
- [ ] Mobile responsive
- [ ] All interactions work

---

## Effort Estimate

| Task | Time | Difficulty |
|------|------|------------|
| 1.1–1.4 (Remedy 1) | 50 min | Simple |
| 2.1–2.5 (Remedy 2) | 75 min | Medium (positioning is key) |
| Integration & test | 30 min | Simple |
| **Total** | **2.5–3 hours** | **Simple–Medium** |

---

## Before You Start

1. **Read SPEC_UPDATED.md** — Understand what we're building
2. **Read POSITIONING_GUIDE.md** — Understand the DOM/CSS structure
3. **Skim branching_guidance_roadmap.md** — Get the task overview
4. **Then code** — Follow tasks 1.1 → 1.2 → 1.3 → 1.4 → 2.1 → ... sequentially

---

## References While Coding

Keep these open:
- **branching_guidance_roadmap.md** — Task list (follow sequentially)
- **POSITIONING_GUIDE.md** — CSS/DOM structure (reference as needed)
- **branching_guidance_ui_spec.md** — Color codes, spacing (lookup table)
- **REMEDY_2_VISUAL.md** — Visual spec (for animations, pill shape)

---

## Gotchas / Common Mistakes

### ❌ Don't: Put BranchReminder outside message container
```jsx
// WRONG:
<ChatPane>
  <Header />
  <BranchReminder />  ← Outside, will have positioning issues
  <MessageList />
</ChatPane>
```

### ✅ Do: Put BranchReminder inside message container
```jsx
// RIGHT:
<ChatPane>
  <Header />
  <div className="message-list-container">
    <BranchReminder />  ← Inside, floats with z-index
    <MessageList />
  </div>
</ChatPane>
```

### ❌ Don't: Use position: absolute or position: fixed on bar
- Makes positioning fragile
- Doesn't integrate well with scrolling
- Hard to position relative to context summary

### ✅ Do: Use position: relative + z-index
- Bar is part of normal flow
- Scrolls naturally with messages
- Simple, clean positioning

### ❌ Don't: Add reminder state to multiple stores
- Keep it in `chatStore` only
- Single source of truth

### ✅ Do: Keep reminder state in chatStore
```typescript
interface ChatStore {
  branchReminderDismissed: boolean;
  branchReminderVisible: boolean;
  setBranchReminderDismissed: (val: boolean) => void;
  setBranchReminderVisible: (val: boolean) => void;
}
```

---

## Success Criteria

- ✅ Remedy 1 displays message count with tooltip
- ✅ Remedy 2 displays pill bar in correct position
- ✅ Both render without layout issues
- ✅ All interactions work (click, dismiss, animations)
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Ready to ship

---

## Next: Start Coding

**Follow this:** `branching_guidance_roadmap.md` tasks 1.1 → 1.2 → 1.3 → 1.4 → 2.1 → 2.2 → 2.3 → 2.4 → 2.5

**Good luck!** 🚀

---

## Questions During Implementation?

Refer to:
- **POSITIONING_GUIDE.md** — If confused about DOM/CSS
- **branching_guidance_ui_spec.md** — If need color codes or spacing
- **REMEDY_2_VISUAL.md** — If need animation details
- **branching_guidance_design.md** — If need design rationale

All answers are documented. No guessing needed.
