# Graphi

## What It Is

A branching chat app. The canvas is a tree of **nodes**, where each node is a chat thread. Forking a node creates a child thread to explore a sub-topic without polluting the parent conversation. The tree is the mind-map; the LLM is the thinking partner.

---

## Core Interaction Flow

1. **Select a node** on the canvas → opens its chat history in the right pane
2. **Type a message** → Stage 0 runs in the background:
   - LLM scans the message and detects which nodes are explicitly referenced
   - RAG searches for semantically similar nodes (if grip ≠ off)
3. **Canvas highlights** all context nodes in bright blue (lineage + referenced + RAG)
4. **Optionally click** any blue node to deactivate it (fades out, excluded from context)
5. **Press Send** → Groq generates with only the active context nodes injected as prefix
6. Response streams in; a snapshot is auto-saved

---

## Node Operations

| Action | Behavior |
|---|---|
| **Fork** | Create a child node; parentId set automatically |
| **Cut** | Delete this node; re-link its children to its grandparent |
| **Prune** | Delete this node and all descendants |
| **Rename** | Click `···` → Rename; node title becomes an inline input |
| **Transplant** | Deep-copy this subtree to another project |

---

## Context System

Three sources contribute context for each message:

- **Lineage** — all ancestor nodes up to the root
- **Referenced** — nodes the LLM detected were explicitly mentioned
- **Recommended** — nodes found via RAG (vector similarity)

All three are merged, deduplicated, and shown as blue on the canvas. User can deactivate any of them before sending.

**Grip level** controls RAG behavior:

| Level | RAG | Min Similarity |
|---|---|---|
| off | no | — |
| low | yes | 0.5 |
| mid | yes | 0.7 |
| high | yes | 0.9 |

---

## Data Model

```
Node      id, projectId, title, content, parentId, embedding, version
Message   id, nodeId, role (user|assistant), content, createdAt
Snapshot  nodeId, content, prompt, parentNodeId,
          referencedNodeIds[], recommendedNodeIds[],
          activeContext[], deactivatedNodes[], model, generatedAt
```

Nodes have a single parent (tree structure). Snapshots are auto-committed on every generation — not browsable in the UI.

---

## Canvas Modes

**Tree** (default) — D3.js hierarchical layout, orthogonal edges, zoom/pan  
**Force** — D3.js physics simulation, free-floating circles, drag to reposition

Toggle in the top-right of the canvas. Both modes share the same node/context state.

---

## Visual State

| State | Appearance |
|---|---|
| Selected node | Blue fill, thick blue stroke, glow |
| Active context node | Blue fill, blue stroke, glow |
| Deactivated context node | Faded blue stroke, 45% opacity |
| Danger (hover cut/prune) | Light red fill, red stroke |
| Default | White fill, gray stroke |

Edges mirror node state: bright blue (active lineage) → faded blue (deactivated lineage) → gray (no relation).

---

## UI Elements

### Layout

Three fixed panes, left to right:

```
[ Sidebar 220px ] [ Canvas flex-1 ] [ Chat 360px ]
```

Sidebar can collapse to 48px (icon-only). Chat pane is resizable by dragging the border. Canvas fills the remaining space.

---

### Sidebar

- **Header**: "Graphi" wordmark + close (✕) button to collapse
- **New project button**: dashed border, turns blue on hover. Clicking replaces it with an inline text input + Enter (↵) confirm button. Escape cancels.
- **Project list**: Each row shows the project name. Hovering reveals a `···` button that opens a floating context menu (Pin / Rename / Delete). Active project is blue-tinted. Pinned projects float to the top with an amber dot.
- **Footer**: Sign out link

---

### Canvas

- **Mode toggle** (top-right): "tree" and "force" pill buttons. Active mode is black, inactive is gray.
- **Tree mode**: D3 hierarchical layout. Nodes are rounded rectangles (160×40px default). Hovering expands the node width to show the full title, with a smooth 140ms animation. The text swaps from truncated to full at the end of the animation (no snap).
- **Force mode**: D3 physics simulation. Nodes are small circles (radius 11px). Hovering shows a floating `···` button near the circle.
- **Node `···` menu**: Appears on hover (tree: inside node; force: floating button). Clicking opens `NodeToolOverlay`.
- **Context highlighting**: When a node is selected, its lineage, referenced, and recommended nodes turn blue on the canvas. Everything else dims to 35% opacity. User clicks any blue node to toggle it off (fades to 45% opacity with faded blue stroke).
- **Danger preview**: Hovering "Remove" or "Delete Subtree" in the overlay turns affected nodes light red (#FEF2F2, red stroke) before any action is taken.
- **Inline rename**: After clicking Rename, the node disappears and a `position: fixed` HTML input appears precisely over it, styled to match (blue border, blue text, same size). Enter commits, Escape cancels, clicking outside commits.

---

### Node Tool Overlay (`···` menu)

Floating card (fixed position, clamped to viewport edges). Two states:

**Default:**
- **Branch** — creates a child node, navigates to it
- **Rename** — triggers inline rename
- *(divider)*
- **Remove (Keep Children)** — red text, red hover background; on hover turns the node red on canvas
- **Delete Subtree** — red text; on hover turns the node + all descendants red on canvas
- *(divider)*
- **Transplant** — opens project picker sub-view

**Transplant sub-view:**
- Lists all other projects
- Clicking a project deep-copies the subtree there

Disabled actions (root node: Remove and Delete) are grayed out at 30% opacity, cursor not-allowed.

---

### Chat Pane

- **Node header**: Current node's title, truncated with ellipsis. Read-only.
- **Context summary panel**: Appears below the header when context nodes exist. Collapsible sections — Lineage / Referenced / Recommended. Each node shown as a clickable chip with a filled/empty dot indicating active state. Active = blue text + filled dot. Inactive = gray text + empty dot + 60% opacity. Max height 160px, scrollable.
- **Message list**: Scrollable. User messages right-aligned, assistant messages left-aligned (standard chat layout). Streaming response updates in real time via RAF batching (~60fps).
- **Swipe container**: Wraps the message list. Pulling down reveals a "New node" preview card rising from the bottom (Framer Motion). Swiping left/right navigates between sibling nodes. The message area scales and fades slightly during swipe gestures.
- **Chat input**: Textarea (3 rows, gray background, blue border on focus). Below it:
  - Left: Grip selector — "Grip" label + four pill buttons (off / low / mid / high). Active grip is black-filled.
  - Right: Stop button (32px circle, border, appears only during generation) + Send button (32px circle, black when enabled, gray when disabled, shows spinner during generation).

---

### Send / Stop Buttons

| State | Send button | Stop button |
|---|---|---|
| Idle, no text | Gray circle, arrow icon, disabled | Hidden |
| Idle, has text | Black circle, arrow icon, clickable | Hidden |
| Generating | Gray circle, spinning arc icon, non-clickable | White circle with square icon, visible |

Pressing Stop aborts the Groq stream mid-response. The partial response stays in the message list.

---

### Interaction Notes

- **Single click on node**: In context mode → toggle that node active/inactive. Not in context mode → select node (change active node).
- **Double click on node**: Always navigates to that node (sets it as the active chat thread).
- **Click active node** (no context): Activates context mode for that node (shows lineage).
- **Click canvas background**: Commits any pending inline rename.
- **`···` on node = node menu. `···` on project = project menu.** Same pattern, different scope.
- **Grip is per-session** (Zustand, not persisted). Resets to default on reload.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| State | Zustand (dagStore, chatStore, gripStore, graphStore) |
| Canvas | D3.js |
| Database | Supabase (PostgreSQL + pgvector + RLS) |
| Inference | Groq (llama-3.1-8b-instant) |
| Embeddings | Jina |

---

## Key Files

```
src/
  App.tsx                        — layout, pane resizing
  stores/
    dagStore.ts                  — nodes, tree ops, Supabase sync
    chatStore.ts                 — messages, context, generation state
    gripStore.ts                 — RAG threshold
    graphStore.ts                — tree/force toggle
  components/
    Canvas/
      Canvas.tsx                 — orchestrates canvas; owns overlay, rename, danger state
      TreeCanvas.tsx             — D3 tree rendering + styling
      ForceCanvas.tsx            — D3 force rendering + styling
      NodeToolOverlay.tsx        — ··· menu (fork/cut/prune/rename/transplant)
    Chat/
      ChatPane.tsx               — message thread, send logic, Groq streaming
      ChatInput.tsx              — textarea, grip selector, send/stop buttons
      SwipeContainer.tsx         — swipeable message list
    Sidebar/
      Sidebar.tsx                — project list, user settings
  lib/
    groq.ts                      — Groq client, reference detection, title generation
    jina.ts                      — embedding calls
    supabase.ts                  — Supabase client
```

---

## Environment Variables

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GROQ_API_KEY
VITE_JINA_API_KEY
```
