# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude.md - DAG MVP Quick Reference

## What This Is
A branching chat application. The entire product is a single sequential conversation that the user organizes into a tree — mirroring the branching nature of thought. **Nodes are chat threads** (collections of messages), not notes or documents. Forking creates a child node to explore a sub-thread without polluting the parent conversation. The tree is the mind-map; the LLM is the thinking partner.

When composing a message, the system automatically detects relevant nodes (by reference and semantic similarity) and highlights them on the canvas. User curates context visually before generating.

---

## 3-Stage Workflow

### Stage 0 (Background, Parallel)
User types → LLM finds referenced nodes + RAG finds similar nodes (if grip != off)

### Stage 1 (Visual, automatic after Stage 0)
Canvas shows all context nodes in bright blue + edges highlighted → User optionally clicks nodes to deactivate (fade to low opacity)

### Stage 2 (Generate — triggered by Send)
User presses Send **once**. Groq generates with only active nodes in context → Auto-commit snapshot

---

## Data Model

```
nodes {
  id, projectId, title, content, parentId (single parent),
  embedding (vector[768]), version, createdAt
}

messages {
  id, nodeId, role ('user'|'assistant'), content, createdAt
  -- persisted to Supabase, per-node independent history
}

snapshots {
  nodeId, content, prompt, parentNodeId, referencedNodeIds [],
  recommendedNodeIds [], activeContext [], deactivatedNodes [],
  model, generatedAt
  -- auto-committed after generation; not browsable in UI for MVP
}
```

---

## Canvas States

**Active Context Node**: Bright blue outline (#0066FF), 3px stroke, glow
**Inactive Context Node**: Faded blue outline (#0066FF), 0.4 opacity
**Non-Context Node**: Gray outline (#CCCCCC)

Same for edges: bright blue (active lineage) → faded blue (inactive) → gray (non-lineage)

---

## Zustand Stores

```
dagStore: nodes[], addNode(), updateNodeContent(), deleteNode(), getAllAncestors()
chatStore: messages[], currentInput, referencedNodeIds[], recommendedNodeIds[], 
           activeContextNodeIds[], isGenerating, toggleNodeActive()
gripStore: gripLevel ('off'|'low'|'mid'|'high'), getMinScore()
graphStore: graphMode ('tree'|'force'), setGraphMode()
```

---

## Layout

**Sidebar** (left, togglable, narrow — like ChatGPT): project list + user settings. **Canvas** (center): tree or force visualization. **Chat** (right): message thread for the active node.

## Graph Modes

**Tree** (D3.js): Hierarchical, orthogonal edges with rounded corners, click to select, zoom/pan
**Force** (Cytoscape): Physics simulation, tiny circles, tooltip on hover, drag to move, click to select

Toggle button switches instantly. A single node (no children) renders as one box / one circle. Root node is not visually distinguished from other nodes.

---

## Node Operations

- **Fork**: Create child (parent = clicked node, automatic)
- **Cut**: Delete node, re-link children to grandparent (blocked on root)
- **Prune**: Delete node + all descendants (blocked on root)
- **Rename**: Change title
- **Transplant**: Deep copy subtree to another project

---

## Reference Detection (Stage 0)

**LLM sees**: Node IDs + titles/summaries + user's message
**LLM does NOT see**: Full content, lineage, timestamps, history
**Output**: List of node IDs user explicitly mentioned

Why limited context? Keep tokens low (~700 per call), cheap (~0.001 cents)

---

## Grip Threshold

| Level | RAG | Min Score |
|-------|-----|-----------|
| Off | No | N/A |
| Low | Yes | 0.5 |
| Mid | Yes | 0.7 |
| High | Yes | 0.9 |

---

## Context Display (Stage 1)

Canvas shows:
- Lineage (ancestors to root): bright blue
- Referenced (LLM detected): bright blue
- Recommended (RAG found): bright blue
- Lineage edges: bright blue
- Everything else: gray

User clicks any blue node → fades (excluded from context)

---

## Environment

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GROQ_API_KEY=
VITE_JINA_API_KEY=
```

---

## Tech Stack

React 18 + TypeScript | Vite | Zustand | Supabase (PostgreSQL + pgvector + RLS) | D3.js (tree) | Cytoscape (force) | Groq (inference) | Jina (embeddings) | Tailwind

---

## Success Checklist

- ✅ Fork sets parent automatically
- ✅ Stage 0: reference detection + RAG (parallel)
- ✅ Stage 1: bright blue context nodes + edges on canvas
- ✅ Click node to deactivate (fade)
- ✅ Stage 2: Groq gets only active nodes
- ✅ Auto-commit snapshot
- ✅ Tree + Force modes toggle
- ✅ All CRUD ops work
- ✅ RLS enforces ownership
- ✅ Realtime sync

---

## Files You Need

- **MVP_SPEC.md** - Full spec, code examples
- **CONTEXT_SELECTION.md** - Visual design details

---

## Quick Answers

**Q: What does reference detection see?**  
A: Node IDs + titles + user's message. Not full content.

**Q: Why parallel Stage 0?**  
A: Reference detection (LLM) + RAG search (vector) happen together.

**Q: No checkboxes for context?**  
A: Correct. Click nodes on canvas to deactivate.

**Q: How is parent set?**  
A: Fork action sets parentId automatically. No detection.

**Q: What's in a snapshot?**  
A: Response, prompt, parentNodeId, referenced/recommended nodeIds, active/deactivated lists.

**Q: Grip threshold filters what?**  
A: Only RAG results (recommended nodes). Not references.

---

## Key Design Decisions

1. **Single parent per node** (tree structure, natural with fork UX)
2. **Explicit parents** (fork action, no detection)
3. **Visual context selection** (bright/faded on canvas, not checkboxes)
4. **Parallel Stage 0** (reference + RAG together)
5. **Auto-commit** (snapshot saves on generation complete)
6. **Graceful errors** (if any stage fails, continue with what succeeded)

---

Ready to code. Start with MVP_SPEC.md for full details, refer back here for quick lookups.
