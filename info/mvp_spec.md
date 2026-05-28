# Graphi MVP Spec

Living document. Updated continuously to reflect actual codebase and decisions. A new developer should understand the full project by reading this.

---

## What This Is

A branching chat application. Nodes are **chat threads** (collections of messages), not notes or documents. See CLAUDE.md for full product ideology.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Frontend | React 18 + TypeScript |
| Build tool | Vite (with @tailwindcss/vite plugin) |
| State | Zustand |
| Database + Auth | Supabase (Postgres + pgvector + RLS + Realtime) |
| Tree canvas | D3.js |
| Force canvas | Cytoscape.js |
| LLM | Groq (llama-3.1-8b-instant) |
| Embeddings | Jina (jina-embeddings-v2-base-en, 768-dim) |
| Styling | Tailwind CSS + inline styles |

---

## Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=
VITE_GROQ_API_KEY=
VITE_JINA_API_KEY=
```

Note: Supabase uses the **publishable key** (same as anon key). The PostgreSQL connection string is NOT used here.

---

## Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE projects (
  id uuid PRIMARY KEY,
  name text,
  "userId" uuid REFERENCES auth.users(id),
  "rootNodeId" uuid,
  "createdAt" timestamp DEFAULT now()
);

CREATE TABLE nodes (
  id uuid PRIMARY KEY,
  "projectId" uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text,
  content text,
  "parentId" uuid REFERENCES nodes(id) ON DELETE SET NULL,
  embedding vector(768),
  version int DEFAULT 1,
  "createdAt" timestamp DEFAULT now(),
  "updatedAt" timestamp DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY,
  "nodeId" uuid REFERENCES nodes(id) ON DELETE CASCADE,
  role text CHECK (role IN ('user', 'assistant')),
  content text,
  "createdAt" timestamp DEFAULT now()
);

CREATE TABLE snapshots (
  id uuid PRIMARY KEY,
  "nodeId" uuid REFERENCES nodes(id),
  version int,
  content text,
  prompt text,
  "parentNodeId" uuid,
  "referencedNodeIds" uuid[],
  "recommendedNodeIds" uuid[],
  "activeContext" uuid[],
  "deactivatedNodes" uuid[],
  model text DEFAULT 'llama-3.1-8b-instant',
  "generatedAt" timestamp DEFAULT now()
);

CREATE INDEX ON nodes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_projects" ON projects FOR ALL USING ("userId" = auth.uid());
CREATE POLICY "own_nodes" ON nodes FOR ALL USING (
  "projectId" IN (SELECT id FROM projects WHERE "userId" = auth.uid())
);
CREATE POLICY "own_messages" ON messages FOR ALL USING (
  "nodeId" IN (SELECT id FROM nodes WHERE "projectId" IN (SELECT id FROM projects WHERE "userId" = auth.uid()))
);
CREATE POLICY "own_snapshots" ON snapshots FOR ALL USING (
  "nodeId" IN (SELECT id FROM nodes WHERE "projectId" IN (SELECT id FROM projects WHERE "userId" = auth.uid()))
);

-- pgvector search function
CREATE OR REPLACE FUNCTION search_nodes(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  project_id uuid
)
RETURNS TABLE(id uuid, title text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT id, title, 1 - (embedding <=> query_embedding) AS similarity
  FROM nodes
  WHERE "projectId" = project_id
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

**Important**: Column names are camelCase in double quotes (e.g. `"userId"`, `"projectId"`). This is intentional — the JS client sends camelCase keys and Postgres stores them quoted.

---

## Data Model

- **Tree, not DAG structurally**: Each node has exactly one `parentId`.
- **Root node**: Auto-created when a project is created. `rootNodeId` on the project is updated after the root node insert.
- **Forked nodes**: Start with `title: null`. Title is set by Groq after the first Send.
- **Node display**: Title only (no content preview) in both canvas modes.

---

## Auth

Supabase email/password only. No OAuth for MVP.  
**Disable "Confirm email"** in Supabase Auth settings during development to avoid rate limits.

---

## File Structure

```
src/
  lib/
    supabase.ts       — Supabase client
    groq.ts           — groqClient, detectReferences(), generateTitle()
    jina.ts           — embedText()
  types/
    index.ts          — Project, Node, Message, Snapshot, GripLevel, GraphMode
  stores/
    dagStore.ts       — nodes[], CRUD, getAllAncestors(), getDescendants()
    chatStore.ts      — messages, context IDs, toggleNodeActive(), initContext()
    gripStore.ts      — gripLevel, getMinScore(), shouldPerformRAG()
    graphStore.ts     — graphMode ('tree'|'force')
  components/
    Auth/AuthPage.tsx
    Sidebar/Sidebar.tsx
    Canvas/
      Canvas.tsx          — mode toggle, overlay wiring
      TreeCanvas.tsx      — D3 tree with context highlighting
      ForceCanvas.tsx     — Cytoscape force with context highlighting
      NodeToolOverlay.tsx — Fork/Cut/Prune/Rename/Transplant
    Chat/
      ChatPane.tsx         — Stage 0/1/2 orchestration
      MessageList.tsx
      ChatInput.tsx        — textarea + grip selector + send button
      ContextSummary.tsx   — toggleable context node list
    Toast.tsx
  App.tsx
  main.tsx
  index.css
```

---

## Layout

- **Sidebar** (left, 220px, collapsible to 48px): project list + sign out. Projects state lives in `App.tsx` and is passed down.
- **Canvas** (center, flex-1): tree or force visualization. Background `#F0F2F5`.
- **Chat** (right, 320px): message thread + context summary + input.

All three panels use inline `style` props (not Tailwind classes) for layout-critical sizing, to avoid purge/hydration issues.

---

## Zustand Stores

### `dagStore`
```typescript
nodes: Node[]
addNode(title, parentId, projectId): Promise<Node>
updateNodeContent(id, content): void
renameNode(id, title): void
deleteNode(id): void
getNodesByProject(projectId): Node[]
getAllAncestors(nodeId): Node[]   // walks parentId chain to root
getDescendants(nodeId): Node[]   // BFS of all children
setFromSupabase(nodes): void
subscribeToProjectNodes(projectId): () => void
```

### `chatStore`
```typescript
currentNodeId: string | null
messages: Message[]
currentInput: string
referencedNodeIds: string[]
recommendedNodeIds: string[]
activeContextNodeIds: string[]
deactivatedNodeIds: string[]
isGenerating: boolean

setCurrentNode(nodeId): Promise<void>   // loads messages from Supabase
addMessage(msg): void
setCurrentInput(text): void
initContext(lineageIds): void           // adds lineage to active context
setReferenced(ids): void                // merges into active context
setRecommended(ids): void               // merges into active context
toggleNodeActive(nodeId): void
setIsGenerating(bool): void
clearContext(): void
```

### `gripStore`
```typescript
gripLevel: 'off' | 'low' | 'mid' | 'high'  // default: 'mid'
setGripLevel(level): void
getMinScore(): null | 0.5 | 0.7 | 0.9
shouldPerformRAG(): boolean
```

### `graphStore`
```typescript
graphMode: 'tree' | 'force'   // default: 'tree'
setGraphMode(mode): void
```

---

## 3-Stage Workflow

### Stage 0 — Background Detection (while typing, debounced 500ms)

Triggered in `ChatPane.runStage0()`. Two parallel calls:

1. **Reference detection**: `lib/groq.ts → detectReferences()`. Sends node titles + user message to Groq. Returns node IDs explicitly mentioned. ~700 tokens, ~0.001 cents.

2. **RAG search** (skipped if `gripLevel === 'off'`): `lib/jina.ts → embedText()` → `supabase.rpc('search_nodes', ...)`. Returns similar nodes above threshold.

| gripLevel | Min Score | Max results |
|---|---|---|
| off | — | 0 |
| low | 0.5 | 15 |
| mid | 0.7 | 8 |
| high | 0.9 | 3 |

### Stage 1 — Canvas Highlighting (automatic after Stage 0)

Context union = lineage + referenced + recommended → all rendered bright blue.  
User clicks any context node on canvas to deactivate (fade to low opacity). Click again to reactivate.

**Node visual states:**

| State | Stroke | Fill | Opacity |
|---|---|---|---|
| Selected (active chat node) | `#2563EB` 3px | `#EFF6FF` | 1.0 |
| Active context | `#2563EB` 2.5px | `#EFF6FF` | 1.0 |
| Deactivated context | `#93C5FD` 1.5px | `#F9FAFB` | 0.45 |
| Non-context | `#D1D5DB` 1.5px | `#FFFFFF` | 1.0 |

**Edge visual states:**

| State | Stroke | Opacity |
|---|---|---|
| To selected or active context node | `#2563EB` 2px | 1.0 |
| To deactivated node | `#93C5FD` 1px | 0.4 |
| Non-context | `#D1D5DB` 1px | 0.7 |

### Stage 2 — Generation (on Send)

User presses Send once. `ChatPane.handleSend()`:

1. Builds context prompt from active nodes (lineage / referenced / recommended).
2. Streams from Groq `llama-3.1-8b-instant`.
3. On completion:
   - Persists user + assistant messages to `messages` table.
   - If first message in node: calls `lib/groq.ts → generateTitle()` to set node title via Groq.
   - Auto-commits snapshot to `snapshots` table.
   - Updates `nodes.content` with latest response.
4. Resets context highlighting.

---

## Title Generation

**Location**: `src/lib/groq.ts → generateTitle(userMessage, assistantResponse)`

Called after the first generation in a node. Sends the user message + first 300 chars of the assistant response to Groq and asks for a 3–6 word title. Falls back to truncated user message on error.

Previously: title was just `userMessage.slice(0, 50)`. Now it's LLM-generated.

---

## Canvas Visualization

### Tree Mode (D3.js)
- Orthogonal edges with rounded corners (bezier path with 90° turns)
- Node size: 160×40px, 10px border radius
- Click non-context node → opens tool overlay + sets active chat node
- Click context node → toggles active/deactivated

### Force Mode (Cytoscape.js)
- Small circles (22px), cose layout
- Same click behavior as tree mode
- Labels below nodes, 10px font

### Node Tool Overlay
Floating white card near clicked node. Actions:

| Action | Behavior |
|---|---|
| Fork | Create child node (parentId = clicked node) |
| Rename | Inline edit |
| Cut | Delete node, re-link children to grandparent. Blocked on root. |
| Prune | Delete node + all descendants. Blocked on root. Requires confirm(). |
| Transplant | Deep-copy subtree (new UUIDs) to another project |

---

## Toast Notifications

`src/components/Toast.tsx` — managed in `App.tsx` state. Shows on project creation success and errors. Auto-dismisses after 2.5s with fade animation.

---

## Realtime Sync

`dagStore.subscribeToProjectNodes(projectId)` sets up a Supabase Realtime channel on the `nodes` table filtered by project. Handles INSERT/UPDATE/DELETE.

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Column naming | camelCase with double quotes | Spec defined it this way; JS client sends camelCase |
| Layout sizing | Inline styles for structural layout | Avoids Tailwind purge issues on flex/height |
| Light mode | White/gray palette | UX preference |
| Title generation | Groq after first response | More meaningful than truncation |
| Projects state | Lifted to App.tsx | Canvas needs full project list for Transplant |
| Stage 0 trigger | Debounced 500ms | Low latency with Groq; no button press needed |
| Send count | Once | Stages 0+1 automatic; Send = generate |
| Snapshots UI | DB only, not browsable | Version history deferred |
