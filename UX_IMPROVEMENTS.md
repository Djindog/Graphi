# GraphI UX/HCI Quick Wins — Quick Fixes & Small Tweaks

This file catalogs small, high-impact UX improvements that follow HCI principles. All items are **implementable in <30 min** and focus on **visibility, feedback, consistency, and discoverability**.

---

## 🎯 High Priority (Do First)

### 1. Add Tooltip to Fold/Unfold Badge
**Where**: [Canvas.tsx](src/components/Canvas/Canvas.tsx) — TreeCanvas/ForceCanvas node badge  
**Issue**: Users see a number badge on nodes with children; clicking it folds/unfolds, but this affordance is invisible  
**Fix**: Wrap badge in `<Tooltip>` with text: `{foldedNodeIds.has(nodeId) ? 'Click to expand' : 'Click to collapse'}`  
**Why**: Reduces cognitive load; users won't accidentally fold nodes without knowing they can unfold them  
**Impact**: Prevents user confusion; 2 min fix

---

### 2. Show Keyboard Shortcuts in Empty State
**Where**: [ChatPane.tsx:520-531](src/components/Chat/ChatPane.tsx#L520-L531) — "Select a node" empty state  
**Issue**: Users don't know about Ctrl+Arrow navigation shortcuts  
**Fix**: Add a second line below "Click any node": `<p style={{fontSize: 12, color: '#9CA3AF'}}>Tip: Use Ctrl+↓ to create child, Ctrl+← / → for siblings</p>`  
**Why**: Makes powerful navigation discoverable; reduces reliance on mouse  
**Impact**: Accelerates power-user workflows; 3 min fix

---

### 3. Add Tooltip to Context Node Buttons (Left/Right)
**Where**: [ChatPane.tsx:717-774](src/components/Chat/ChatPane.tsx#L717-L774) — Side navigation buttons  
**Issue**: Buttons only appear on hover; users might not notice them  
**Fix**: Already has `<Tooltip>` wrapping — just ensure it's always visible or add a brief label "← / →" in the button itself  
**Why**: Improves discoverability of alternate navigation path  
**Impact**: Low-friction improvement; already partially done

---

### 4. Explain Context Deactivation on First Use
**Where**: [ContextSummary.tsx](src/components/Chat/ContextSummary.tsx)  
**Issue**: Users can click context nodes to deactivate (fade), but this isn't obvious from UI alone  
**Fix**: Add a small badge or tooltip: `Click any node to exclude from context` (appears on first interaction)  
**Why**: Explicit feedback about hidden affordance  
**Impact**: Reduces "Where did my context go?" confusion; 5 min fix

---

### 5. Add Focus Ring to All Interactive Elements
**Where**: Global inline styles across all button/input elements  
**Issue**: Keyboard users have no visual indicator of focus; violates WCAG accessibility  
**Fix**: Add `outline: focused ? '2px solid #2563EB' : 'none'` to all `<button>` and `<input>` on focus  
**Why**: Makes app keyboard-navigable; meets accessibility baseline  
**Impact**: Enables keyboard-only users; 15 min fix (touch multiple files)

---

## 🚀 Medium Priority (Do Next)

### 6. Show "Loading…" State When Fetching Messages
**Where**: [ChatPane.tsx](src/components/Chat/ChatPane.tsx) — on `setCurrentNode()` before messages load  
**Issue**: Switching nodes is instant in UI but may take time to load messages from DB  
**Fix**: Add `loading` state when `currentNodeId` changes; show spinner in message list area  
**Why**: Prevents user from typing into an empty pane thinking it's ready  
**Impact**: Prevents accidental message loss; 5 min fix

---

### 7. Add Generating/Thinking Visual Feedback
**Where**: [MessageList.tsx](src/components/Chat/MessageList.tsx)  
**Issue**: User can see streaming tokens but first token may take a moment; unclear if anything is happening  
**Fix**: Add a subtle pulsing dot or text "Thinking…" in message list before first token appears  
**Why**: Immediate feedback loop; prevents user from re-clicking Send  
**Impact**: Reduces duplicate submissions; 5 min fix

---

### 8. Ellipsis + Tooltip for Long Node Titles in Header
**Where**: [ChatPane.tsx:546](src/components/Chat/ChatPane.tsx#L546)  
**Issue**: Long node titles overflow the header, breaking layout  
**Fix**: Add `textOverflow: 'ellipsis'` (already there), but add `<Tooltip>` with full title on hover  
**Why**: Respects space constraints while preserving discoverability  
**Impact**: Fixes layout break; 2 min fix

---

### 9. Add Keyboard Shortcut Hint to Chat Input Placeholder
**Where**: [ChatInput.tsx:59](src/components/Chat/ChatInput.tsx#L59)  
**Issue**: Placeholder is "How can I help you?" — doesn't hint at keyboard navigation  
**Fix**: Change to `"Type a message or Ctrl+↓ to create a child node"` (or use a second line below input)  
**Why**: Brings keyboard shortcuts into view at natural entry point  
**Impact**: Guides users to faster workflows; 1 min fix

---

### 10. Show Sidebar Collapse/Expand Button Always
**Where**: [Sidebar.tsx:142-150](src/components/Sidebar/Sidebar.tsx#L142-L150)  
**Issue**: When collapsed, only hamburger icon visible; might not be obvious it's a toggle  
**Fix**: Add `title="Click to expand sidebar"` attribute (already there); consider subtle background on hover  
**Why**: Makes affordance explicit  
**Impact**: Helps users find sidebar; 1 min fix

---

### 11. Add Hover Expansion Tooltip to Messages
**Where**: [MessageList.tsx](src/components/Chat/MessageList.tsx) — message container  
**Issue**: Long messages might be hard to read in small pane; no affordance to expand  
**Fix**: Add a small expand icon on message hover, or tooltip: `Hover to expand in full width` (if space exists)  
**Why**: Hints at reading UX enhancement  
**Impact**: Improves readability on narrow panes; 8 min fix

---

## 📐 Polish & Consistency (Do After)

### 12. Standardize Button Hover States
**Where**: Global — all `<button>` elements  
**Issue**: Hover states inconsistent: some change `background`, some change `color`, some change `boxShadow`  
**Fix**: Create a reusable `useButtonHover()` hook or inline style constant:
```js
const hoverStyle = {
  borderColor: '#111827',
  color: '#111827',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  transition: 'all 0.15s',
}
```
**Why**: Reduces cognitive load; consistent feedback across app  
**Impact**: Polish; 10 min fix

---

### 13. Add Role Labels to Messages (User/Assistant)
**Where**: [MessageList.tsx](src/components/Chat/MessageList.tsx) — each message row  
**Issue**: Message role (user vs assistant) is only distinguished by alignment and styling  
**Fix**: Add subtle label `<span style={{fontSize: 11, color: '#9CA3AF', fontWeight: 500}}>You</span>` above user messages and `Assistant` above assistant messages  
**Why**: Immediately clarifies who said what; especially helpful on narrow panes  
**Impact**: Improves clarity; 5 min fix

---

### 14. Show "Empty Project" State on Canvas
**Where**: [Canvas.tsx:394-401](src/components/Canvas/Canvas.tsx#L394-L401)  
**Issue**: Empty state shows message but no call-to-action  
**Fix**: Add a `+` button below text that creates the first node:
```jsx
<button onClick={() => { /* create root node */ }}
  style={{padding: '10px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8}}>
  Create first thread
</button>
```
**Why**: Guides new users to first action; reduces friction  
**Impact**: Onboarding; 8 min fix

---

### 15. Improve "Ctrl+click to toggle context" Toast
**Where**: [Canvas.tsx:285-296](src/components/Canvas/Canvas.tsx#L285-L296) — Ctrl toast  
**Issue**: Toast is transient (1.8s); users might miss it; only shows when trying to deactivate active node  
**Fix**: Show on first Ctrl+click anywhere, and make toast slightly larger with icon: `⌘ Use Ctrl+Click to toggle context`  
**Why**: Explicit teaching moment; helps users discover this feature  
**Impact**: Feature discovery; 3 min fix

---

### 16. Add "No Messages Yet" State to Chat
**Where**: [MessageList.tsx](src/components/Chat/MessageList.tsx)  
**Issue**: When a node is selected but has no messages, the message area is blank and confusing  
**Fix**: Show: `<div style={{textAlign: 'center', color: '#9CA3AF', padding: 24}}>Start chatting to begin this thread</div>`  
**Why**: Clarifies what user should do next  
**Impact**: Guides onboarding; 3 min fix

---

### 17. Make Divider/Grab Handles More Obvious
**Where**: [App.tsx:376-484](src/App.tsx#L376-L484) — divider and grab handles  
**Issue**: Dividers are thin (8px); users might not notice them  
**Fix**: On hover, expand to 12px and show visual line; add `onMouseEnter` to widen the handle slightly  
**Why**: Makes resize affordance obvious  
**Impact**: UX polish; 5 min fix

---

### 18. Add Loading Skeleton to Context Panel
**Where**: [ChatPane.tsx:670-691](src/components/Chat/ChatPane.tsx#L670-L691) — ContextSummary  
**Issue**: If context is loading/parsing, panel is blank  
**Fix**: Show skeleton loader while `loading` state is true  
**Why**: Prevents blank space confusion  
**Impact**: Polish; 5 min fix

---

## 🔧 Minor Tweaks (Nice to Have)

### 19. Reduce Canvas Grid Opacity on Small Screens
**Where**: [Canvas.tsx:222-226](src/components/Canvas/Canvas.tsx#L222-L226)  
**Issue**: Dot grid can feel busy on small monitors  
**Fix**: Add `opacity: window.innerWidth < 1200 ? 0.25 : 0.5` to grid background  
**Why**: Improves visual breathing room  
**Impact**: Visual polish; 2 min fix

---

### 20. Add Spinner Animation to CSS
**Where**: [src/index.css](src/index.css)  
**Issue**: Spinner uses `gspin` animation but not defined in global styles  
**Fix**: Ensure this exists:
```css
@keyframes gspin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```
**Why**: Prevents animation jank  
**Impact**: Polish; 1 min fix

---

### 21. Show Message Count in Browser Tab Title
**Where**: [ChatPane.tsx](src/components/Chat/ChatPane.tsx)  
**Issue**: Browser tab always shows "GraphI" — no indication of activity  
**Fix**: Add `useEffect` to update `document.title = "GraphI — " + messages.length + " messages"`  
**Why**: Helps users track conversation length across tabs  
**Impact**: Polish; 2 min fix

---

### 22. Add Copy-to-Clipboard Button on Messages
**Where**: [MessageList.tsx](src/components/Chat/MessageList.tsx) — message container  
**Issue**: Users can't easily copy assistant responses  
**Fix**: Add small copy icon on message hover; click to copy message to clipboard  
**Why**: Improves content usability  
**Impact**: Utility; 8 min fix

---

### 23. Show "Saved to DB" Checkmark After Message Insert
**Where**: [ChatPane.tsx:457-460](src/components/Chat/ChatPane.tsx#L457-L460)  
**Issue**: After sending, messages appear instantly but DB write happens asynchronously  
**Fix**: Add optional checkmark/pulse animation after `await supabase.from('messages').insert()`  
**Why**: Explicit feedback that message is persisted  
**Impact**: Trust building; 5 min fix

---

### 24. Indicate Active Filter/Context at a Glance
**Where**: [ContextSummary.tsx](src/components/Chat/ContextSummary.tsx)  
**Issue**: Users might not realize which context is active vs. deactivated  
**Fix**: Show a small badge or indicator `3/5 active` above the context nodes  
**Why**: At-a-glance summary of context state  
**Impact**: Clarity; 3 min fix

---

### 25. Add Escape Key to Close Overlays
**Where**: [Canvas.tsx](src/components/Canvas/Canvas.tsx) — NodeToolOverlay, rename input  
**Issue**: Only way to close menu/rename is to click elsewhere  
**Fix**: Add `useEffect` to listen for `Escape` key and close overlay  
**Why**: Follows web conventions; reduces mouse dependency  
**Impact**: Keyboard usability; 5 min fix

---

---

## 📋 Implementation Priority Matrix

| Priority | Effort | Impact | Item |
|----------|--------|--------|------|
| 🔴 High | 1 min | High | #2, #9, #10, #20 |
| 🔴 High | 2-3 min | High | #1, #8, #3 |
| 🟡 Medium | 5 min | Medium | #4, #6, #7, #12, #13, #17, #18 |
| 🟡 Medium | 8+ min | Medium | #11, #14, #22 |
| 🟢 Low | 1-2 min | Low | #19, #21 |
| 🟢 Low | 3-5 min | Low | #5, #15, #16, #23, #24, #25 |

---

## 🎬 Suggested Implementation Order

1. **Session 1 — Quick Wins (15 min)**
   - #2: Keyboard hints in empty state
   - #9: Placeholder update
   - #10: Sidebar button hint
   - #20: CSS animation

2. **Session 2 — Core Interactions (20 min)**
   - #1: Fold/unfold tooltip
   - #8: Title ellipsis + tooltip
   - #4: Context deactivation hint
   - #6: Loading state

3. **Session 3 — Consistency & Polish (25 min)**
   - #12: Standardize button hovers
   - #13: Message role labels
   - #3: Button visibility
   - #7: Generating feedback

4. **Session 4 — Onboarding & Edge Cases (30 min)**
   - #14: Empty project CTA
   - #16: No messages state
   - #5: Focus rings (accessibility)
   - #25: Escape key handler

---

## Notes for Future Work

- **Color Tokens**: Extract inline colors (e.g., `#2563EB`, `#E5E7EB`) into a constants file for consistency
- **Component Library**: Consider a `<Button>` wrapper component to enforce consistent styles
- **Accessibility**: After implementing focus rings, test with screen readers
- **Mobile**: Test all fixes on narrow viewports (< 768px)
- **Dark Mode**: If added, ensure these changes work in both modes

---

**Last Updated**: 2026-06-10  
**Author**: HCI/UX Review Session  
**Status**: Ready to implement
