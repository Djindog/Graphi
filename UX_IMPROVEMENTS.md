# GraphI UX/HCI Quick Wins — Quick Fixes & Small Tweaks

This file catalogs small, high-impact UX improvements that follow HCI principles. All items are **implementable in <30 min** and focus on **visibility, feedback, consistency, and discoverability**.

---

## 🎯 High Priority (Do First)



---


---

### 3. Add Tooltip to Context Node Buttons (Left/Right)
**Where**: [ChatPane.tsx:717-774](src/components/Chat/ChatPane.tsx#L717-L774) — Side navigation buttons  
**Issue**: Buttons have 2 options - new sibling or next sibling, but with the same white color it is difficult to distinguish
**Fix**: for 'branch new node' and 'create new sibling', give a slight tint for the background of the button. 

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
**Fix**: Add text "Thinking…" in message list before first token appears  
**Why**: Immediate feedback loop; prevents user from re-clicking Send  
**Impact**: Reduces duplicate submissions; 5 min fix

---

### 10. Show Sidebar Collapse/Expand Button Always
**Where**: [Sidebar.tsx:142-150](src/components/Sidebar/Sidebar.tsx#L142-L150)  
**Issue**: The sidebnar collapse/expand button doesn't have tooltips consistent with the overall ui
**Fix**: use tooltip.tsx horizonaly (triangle to the side) on the collapse and expand button
**Why**: Makes affordance explicit  

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

### 16. Editing messsages is wonky
**Where**: [MessageList.tsx](src/components/Chat/MessageList.tsx)  
**Issue**: Currently, when pressing the edit hover button, the edit input box is a different dimension from the normal message container.
**Fix**: The button should be at the very corner of the message box, like how the unfold/fold badge is located at the corner of the node in the canvas. The edit input box should also be the same shape as the original message container. 
**Why**: Consistent UI

---

### 17. Make Divider/Grab Handles More Obvious
**Where**: [App.tsx:376-484](src/App.tsx#L376-L484) — divider and grab handles  
**Issue**: Dividers are thin (8px); users might not notice them  
**Fix**: On hover, expand to 12px and show visual line; add `onMouseEnter` to widen the handle slightly  
**Why**: Makes resize affordance obvious  
**Impact**: UX polish; 5 min fix


## 🔧 Minor Tweaks Nice to Have

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

### 22. Add Copy-to-Clipboard Button on Messages
**Where**: [MessageList.tsx](src/components/Chat/MessageList.tsx) — message container  
**Issue**: Users can't easily copy assistant responses  
**Fix**: Add small copy icon on message hover; click to copy message to clipboard  
**Why**: Improves content usability  
**Impact**: Utility; 8 min fix
---

### 24. Indicate Active Filter/Context at a Glance
**Where**: [ContextSummary.tsx](src/components/Chat/ContextSummary.tsx)  
**Issue**: Users might not realize which context is active vs. deactivated  
**Fix**: Show indicator `3/5 active` above the context nodes, right next to the text CONTEXT 
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
