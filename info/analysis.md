# Graphi — HCI / UX / Design Analysis

## Overview

Graphi is a branching chat application where the entire product is a single sequential conversation organized into a tree. The core interaction loop is: type a message → context nodes light up on canvas → user curates visually → send. Three-pane layout: Sidebar (projects) | Canvas (tree/force) | Chat (thread).

---

## 1. Learnability — The Biggest Problem

### 1.1 The core mechanic is invisible
**Problem**: The defining feature — that blue nodes on the canvas represent the context window — is never explained. A new user sees blue nodes appear, doesn't know what they mean, and can't connect the canvas to what the AI receives. The 3-stage pipeline (type → curate → send) has zero onboarding.

**Solutions**:
- A one-time tooltip/walkthroughoverlay on first use explaining the 3 stages
- Inline ghost text in the chat input: "Nodes highlighted on the canvas = context sent to AI"
- A dismissible banner in the chat pane on first node selection

### 1.2 Grip level is unlabeled jargon
**Problem**: "Grip off/low/mid/high" is meaningless to a new user. There is no explanation of what grip does (controls RAG retrieval depth), what "off" means (no semantic search), or what the tradeoff is.

**Solutions**:
- Tooltip on hover over the Grip label explaining: "Controls how many related nodes are pulled into context from across your project"
- Rename to something more descriptive: "Recall: None / Broad / Focused / Precise" or show an icon that grows with level
- A small info icon (ⓘ) that pops an explanation

### 1.3 Swipe gestures are fully undiscoverable
**Problem**: Vertical overscroll to create a new child node, horizontal swipe to navigate siblings — these are powerful but there is no affordance, hint, or tooltip. A user will never find them by accident.

**Solutions**:
- A subtle animated arrow at the bottom of the chat scroll area when at the bottom ("↓ Swipe to branch")
- First-use tip shown once after first message is sent
- Keyboard shortcut hint in the input bar footer

### 1.4 The `···` dot-menu is the only way to access node operations
**Problem**: The context menu (branch, rename, fold, cut, prune, transplant) appears only via the `···` button that shows on hover. Right-click is not supported. On a new or empty project, there is no visual cue that nodes are interactive beyond clicking.

**Solutions**:
- Support right-click to open the same context menu
- Add a faint "right-click or ···" hint on first hover of a node

---

## 2. Feedback & System Status

### 2.1 Stage 0 (context detection) runs silently
**Problem**: When the user types, reference detection and RAG run in the background with no visible progress indicator. The canvas update can lag 500ms+ with no feedback that anything is happening. The user doesn't know if the system is thinking or stuck.

**Solutions**:
- A subtle pulsing ring or spinner on the input border during Stage 0
- A small "Analyzing…" microtext near the Grip controls while Stage 0 is in progress

### 2.2 No acknowledgment when context is deactivated
**Problem**: Clicking a blue node to deactivate it fades it out on canvas. In the chat pane ContextSummary, the node dims. But there's no micro-confirmation — the interaction is silent and can feel accidental.

**Solutions**:
- Micro-animation on the dot indicator in ContextSummary when a node is toggled (pulse or color flip)
- Show a transient count badge: "3 of 5 context nodes active" near the context panel header

### 2.3 Snapshot save is completely invisible
**Problem**: After every generation, a snapshot is auto-saved to Supabase. The user has no idea this happened, what was saved, or that snapshots exist.

**Solutions**:
- A subtle "Saved" microtext or checkmark that fades in/out after save completes
- This also sets expectations for future snapshot-browsing features

### 2.4 Title auto-generation is invisible
**Problem**: After the first message, the node title is silently changed. The user may see the title change in the canvas sidebar but there's no explanation of why or when.

**Solutions**:
- Animate the title change in the node (brief highlight or fade transition)
- Not strictly necessary, but reduces confusion for first-time users

---

## 3. Navigation & Spatial Orientation

### 3.1 No indication of current position in the tree
**Problem**: The canvas shows all nodes, but there's no permanent visual cue connecting the active chat pane to the selected node's position in the tree. If the user zooms/pans and loses track of the selected node, they have to hunt.

**Solutions**:
- A "Center on selected node" button in the canvas toolbar
- Auto-center the canvas on the active node when selection changes

### 3.2 Switching between tree and force modes loses spatial memory
**Problem**: Switching modes (tree ↔ force) rebuilds the entire layout. In force mode, nodes drift via physics and positions are not preserved in any meaningful pattern. Users can't build a mental map.

**Solutions**:
- In force mode, persist node positions across renders (already partially done with `simNodesRef`)
- Consider a third "manual" layout mode where users can pin node positions

### 3.3 The breadcrumb / lineage path is not shown anywhere outside of canvas
**Problem**: In the chat pane, the header shows the current node title only. There is no breadcrumb indicating the path from root to current node (e.g., "Project Root > Design > UI Exploration").

**Solutions**:
- A collapsible breadcrumb trail above the chat header
- Hovering over the node title in the chat pane header shows ancestors in a tooltip

### 3.4 No way to see what project you're in when the sidebar is collapsed
**Problem**: When the sidebar is collapsed (48px), there is no project name shown anywhere in the UI. The user only sees Canvas + Chat.

**Solutions**:
- Show the active project name in the Canvas toolbar area when sidebar is collapsed
- Or show it as a small label above the canvas tree/force toggle

---

## 4. Context Management (ContextSummary Panel)

### 4.1 Context panel appears suddenly and pushes content down
**Problem**: The ContextSummary panel appears between the node header and message list. When it appears, the message list is pushed down abruptly — no animation. This is especially jarring during fast typing (Stage 0 fires 500ms after keypress).

**Solutions**:
- Animate the panel in with a smooth height transition (`max-height` CSS transition)
- Consider making it a slide-in from above rather than pushing content

### 4.2 Lineage nodes are always in context — but this isn't obvious
**Problem**: All ancestors are included in context by default. A user who deactivates a lineage node doesn't realize it was auto-included in the first place, or why. No explanation of what "Lineage" means vs "Referenced" vs "Recommended".

**Solutions**:
- Add small (ⓘ) tooltips on each section label in ContextSummary
- "Lineage: parent nodes back to root" / "Referenced: nodes you mentioned by name" / "Recommended: semantically similar nodes"

### 4.3 The toggle affordance is ambiguous
**Problem**: Clicking a node chip in ContextSummary toggles it on/off. The filled `●` / hollow `○` dot is small (7px) and the hover state is just a background tint. The mechanism isn't obviously a toggle to new users.

**Solutions**:
- Make the indicator larger and more iconographic (checkbox, eye icon)
- Show explicit tooltip "Click to exclude from context" / "Click to include"

### 4.4 No way to add a non-ancestor/non-referenced node to context manually
**Problem**: Context can only include lineage + detected references + RAG recommendations. If a user wants to manually include a specific node, they can't — they would have to type a message that mentions the node by name.

**Solutions**:
- A "pin to context" option in the node's `···` menu that forces it into the active context for the next send
- A search/autocomplete in the ContextSummary panel to manually add nodes

---

## 5. Chat Pane UX

### 5.1 The chat pane is node-scoped but looks identical across nodes
**Problem**: When the user switches nodes, the message history changes (each node has its own thread), but there's no visual transition or clear indication that the context has shifted. The chat just replaces its messages, which can be disorienting.

**Solutions**:
- A brief fade or slide transition on the message list when switching nodes
- A small "Switched to: [Node Title]" system message at the top of the new thread

### 5.2 Empty state for new nodes is too minimal
**Problem**: "Type to start this thread…" is centered gray text. For a new node (just branched), the user has no context on where they are or what the prior thread was.

**Solutions**:
- Show the parent node's last message or summary in the empty state: "Branched from: [parent title] — [last message excerpt]"
- Include a "View parent thread" link in the empty state

### 5.3 The send button spinner doesn't stop while streaming
**Problem**: The send button shows a spinner during generation. But the Stop button is a separate circle that appears only during generation. Having two separate controls (spinner-send that does nothing + a separate stop button) is confusing — the stop button is not immediately obvious as "click here to cancel."

**Solutions**:
- Make the send button itself transform into a stop button during generation (single control, dual state) — common pattern in modern chat UIs
- Or enlarge the stop button and give it a clear label on first appearance

### 5.4 The textarea has a fixed row height
**Problem**: `rows={3}` is always 3 rows tall, even for short one-line inputs. This wastes vertical space and doesn't grow with content.

**Solutions**:
- Auto-resize the textarea to fit its content, up to a max height (e.g., 6 rows)

### 5.5 No copy button on assistant messages
**Problem**: There is no way to copy an assistant message other than manually selecting text. This is a basic affordance expected in any chat UI.

**Solutions**:
- Show a small copy icon on hover over assistant message bubbles

---

## 6. Node Operations (NodeToolOverlay)

### 6.1 Destructive operations are only one click away with no undo
**Problem**: "Delete Subtree" (prune) shows a `confirm()` dialog. "Remove (Keep Children)" (cut) does not confirm at all — it executes immediately. Both are irreversible with no undo.

**Solutions**:
- Add a confirm step to the "cut" operation (currently missing)
- Add a brief undo toast: "Node deleted — Undo" (5 seconds) that can reverse the operation
- The `confirm()` browser dialog is visually jarring and inconsistent with the app's design; replace with a custom in-context confirmation within the overlay

### 6.2 "Remove (Keep Children)" is confusing terminology
**Problem**: "Remove (Keep Children)" is the operation name but it's the kind of label that requires thinking. Users expect "delete" to mean total removal. This operation is more like "splice out."

**Solutions**:
- Rename to "Splice out" or "Remove node only" with a brief sub-label explaining children are re-parented
- Move the explanation to a hover tooltip rather than cramming it into the button label

### 6.3 The overlay appears at a fixed position that can get cut off
**Problem**: The overlay is clamped to screen bounds (`Math.min(position.x, window.innerWidth - 168)`), but the Y-axis clamp uses a fixed height of 260px (`window.innerHeight - 260`). If the overlay has more items than expected, it can overflow at the bottom.

**Solutions**:
- Measure the actual rendered height of the overlay and use that for clamping
- Or use a max-height with scroll on the content area

### 6.4 The transplant submenu has no destination preview
**Problem**: When transplanting to an existing project, the user sees a flat list of project names. There's no indication of the target project's structure or root node.

**Solutions**:
- Show the project's node count in parentheses: "My Research (12 nodes)"
- Allow selecting a target parent node within the destination project

---

## 7. Sidebar

### 7.1 Pin is in-memory only — lost on refresh
**Problem**: Pinned projects are stored in `useState` — they are lost on page refresh. This is a fake feature that gives false expectations.

**Solutions**:
- Persist pins to `localStorage` as a quick fix
- Or persist to the `profiles` table in Supabase for true persistence

### 7.2 Collapsed sidebar loses all affordances
**Problem**: When the sidebar is collapsed to 48px, only the hamburger `☰` icon is shown. There's no way to create a new project, no project switcher, no user info. The user is completely locked out of project management without reopening.

**Solutions**:
- Show icon-only versions of top actions (+ icon for new project) in the collapsed state
- Consider a hover-expand sidebar (like VS Code) instead of toggle

### 7.3 Project list has no search
**Problem**: With many projects, there is no way to search or filter. Users must scroll.

**Solutions**:
- A small search input that appears at the top of the project list when there are more than 8–10 projects
- Or a keyboard shortcut (e.g., Cmd+K) to open a project/node search

### 7.4 The `confirm()` dialog for project deletion is visually inconsistent
**Problem**: Project deletion uses `confirm()` (browser native dialog). This breaks the visual language of the rest of the app, which uses modals and custom UI.

**Solutions**:
- Replace with a custom confirmation inline in the project menu (e.g., "Are you sure? Delete" turns red on hover before executing)
- Or use the existing modal pattern (smaller variant for destructive confirms)

---

## 8. Visual Design

### 8.1 The `#111827` / `#F9FAFB` palette is neutral but lacks personality
**Problem**: The app is entirely monochrome (dark text, white/gray backgrounds, blue for state). It functions well but has no visual identity or delight. For a "thinking partner" tool, warmth matters.

**Solutions**:
- Introduce a subtle accent: a faint warm tint on the canvas background, or a distinctive brand color beyond the generic Tailwind blue
- Micro-animations (node creation, branch formation) add personality without changing the palette

### 8.2 The canvas background (#F0F2F5) and node backgrounds (#fff) lack visual depth
**Problem**: The tree floats on a flat gray background. There's no sense of depth, grid, or spatial grounding.

**Solutions**:
- Add a subtle dot-grid or cross-grid pattern to the canvas background (common in node-based editors like Figma, Miro, n8n)
- A very faint radial gradient or vignette can make the canvas feel less empty

### 8.3 Force mode nodes are very small (radius 11)
**Problem**: 11px radius circles with 10px font labels are very hard to read and click precisely. The force mode is effectively less usable than tree mode.

**Solutions**:
- Increase node radius to 14–16px minimum
- Use a slightly larger font (11–12px) in force labels
- Or use rectangular nodes in force mode (same as tree) for visual consistency

### 8.4 No dark mode
**Problem**: The app is hardcoded to white/light backgrounds. There is no dark mode support.

**Solutions**:
- CSS custom properties or Tailwind `dark:` variant for a future dark theme
- Not urgent, but worth noting as an expectation gap

---

## 9. Accessibility

### 9.1 Canvas interactions are mouse/trackpad only
**Problem**: The D3 SVG canvas has no keyboard navigation beyond the swipe arrow-key gestures. Users cannot tab through nodes, cannot use keyboard to open the context menu, cannot navigate the tree without a pointing device.

**Solutions**:
- `tabindex` and `aria-label` on node groups
- Arrow keys to move selection between nodes (parent/child/sibling)
- Enter/Space to open the context menu on selected node

### 9.2 Color is the only indicator of context state
**Problem**: Active context nodes are blue, deactivated are faded blue, non-context are gray. For users with color vision deficiencies, these states may be indistinguishable.

**Solutions**:
- Add a secondary indicator: dashed border for deactivated nodes, solid for active
- Or use stroke patterns as a secondary signal

### 9.3 Focus states on interactive elements are mostly invisible
**Problem**: Buttons and inputs rely on JavaScript `onFocus`/`onBlur` handlers to change border colors. Standard browser focus rings (`:focus-visible`) are suppressed via `outline: 'none'`. Tab navigation has no clear visual indicator.

**Solutions**:
- Restore `outline` on focus-visible or add a custom `box-shadow` on `:focus-visible`
- Audit all interactive elements for focus visibility

---

## 10. Performance & Responsiveness

### 10.1 D3 tree is rebuilt entirely on every state change
**Problem**: The TreeCanvas `useEffect` runs `svg.selectAll('*').remove()` and rebuilds the entire SVG tree whenever any node, style, or context state changes. For large trees this causes perceptible redraws.

**Solutions**:
- Separate the layout pass (structure/position) from the style pass (colors/opacity) — already done partially in ForceCanvas with two effects
- Apply the same two-effect pattern to TreeCanvas: rebuild only on structural changes, restyle on visual changes

### 10.2 Canvas does not resize with window
**Problem**: The D3 canvas captures `containerRef.clientWidth/Height` once on mount. Resizing the browser window does not re-layout the tree.

**Solutions**:
- Add a `ResizeObserver` on the container div to trigger a re-layout when dimensions change

### 10.3 No loading state when switching projects
**Problem**: Selecting a project triggers a Supabase fetch. During this fetch, the canvas goes blank (or shows the old project's nodes). There's no loading indicator.

**Solutions**:
- Show a spinner or skeleton in the canvas area during project load
- Optimistically keep the old nodes visible while fetching

---

## Summary Priority Matrix

| Priority | Issue | Effort |
|----------|-------|--------|
| 🔴 High | Core mechanic is undiscoverable (1.1) | Low |
| 🔴 High | Grip level is unexplained (1.2) | Low |
| 🔴 High | Stage 0 has no progress feedback (2.1) | Low |
| 🔴 High | No undo for destructive node ops (6.1) | High |
| 🟡 Med | Context panel animates in abruptly (4.1) | Low |
| 🟡 Med | Node switch has no transition (5.1) | Low |
| 🟡 Med | Send/stop button confusion (5.3) | Low |
| 🟡 Med | Textarea fixed height (5.4) | Low |
| 🟡 Med | No copy button on messages (5.5) | Low |
| 🟡 Med | Pin state lost on refresh (7.1) | Low |
| 🟡 Med | Canvas dot grid (8.2) | Low |
| 🟡 Med | D3 full rebuild on every change (10.1) | High |
| 🟢 Low | Swipe gestures undiscoverable (1.3) | Med |
| 🟢 Low | Breadcrumb trail (3.3) | Med |
| 🟢 Low | Force mode node size (8.3) | Low |
| 🟢 Low | Keyboard accessibility (9.1) | High |
