# Context Selection Design - Visual Highlighting & Click-to-Deactivate

## Overview
As the user types (debounced 500ms), the system automatically displays all potential context sources as **visually highlighted nodes** on the canvas. User can click to **deactivate** individual nodes (making them excluded from context) before pressing Send. All lineage edges are also highlighted to show the path.

---

## Context Sources (In Priority Order)

1. **Lineage**: All ancestors recursively to root (always included, can be deactivated individually)
2. **Referenced Nodes**: Nodes user explicitly mentioned in their message (always included, can be deactivated individually)
3. **Recommended Nodes**: Top N results from RAG search (based on grip threshold, can be deactivated individually)

---

## Visual States

### Active Node (Included in Context)
- **Bright outline**: Vibrant blue (high opacity, high contrast)
- **Fill**: Subtle tint of blue
- **Indicator**: "+" badge or glow to show it's included
- **Click action**: Deactivate (toggle to inactive state)

### Inactive Node (Excluded from Context)
- **Outline**: Same blue color but **more opaque/faded** (lower contrast)
- **Fill**: Very subtle or transparent
- **Indicator**: "-" badge or muted appearance
- **Click action**: Reactivate (toggle to active state)

### Non-Context Nodes (Not highlighted)
- **Outline**: Default (gray, no color)
- **Fill**: Default
- **No interaction**: Cannot click to toggle

---

## Lineage Highlighting

### Lineage Edges (Parent → Child paths to root)
- **Active lineage edge**: Bright blue (same as active node outline)
- **Inactive lineage edge**: Faded blue (same as inactive node outline)
- **Non-lineage edges**: Gray (no color)

### Automatic Edge State Tracking
- If a lineage **node is active** → its **edge to parent is active** (bright)
- If a lineage **node is inactive** → its **edge to parent is inactive** (faded)
- This happens automatically (you deactivate the node, edge follows)

---

## Grip Threshold + None Option

### Grip Threshold Levels (New)
| Level | Description | RAG Recommendations |
|-------|-------------|----------------------|
| **Off/None** | No RAG search | Show 0 recommended nodes |
| **Low** | Broad context | Min score 0.5 (10-15 nodes shown) |
| **Mid** | Balanced (default) | Min score 0.7 (5-10 nodes shown) |
| **High** | Strict relevance | Min score 0.9 (2-5 nodes shown) |

**Off/None is new**: User can completely disable RAG without showing recommended nodes.

---

## Interaction Flow

### While Typing (Stage 0 + Stage 1, automatic)
```
User types message → debounced 500ms → Stage 0 runs (parallel):
  1. Reference detection (LLM finds mentioned nodes)
  2. RAG search (if grip != Off, find similar nodes)
  ↓
Canvas immediately updates (Stage 1):
  - All lineage nodes: BRIGHT BLUE outline
  - All referenced nodes: BRIGHT BLUE outline
  - All recommended nodes: BRIGHT BLUE outline
  - All lineage edges: BRIGHT BLUE
  - All other nodes: GRAY (no color)
  ↓
User can click nodes on canvas to deactivate
  ↓
Deactivated nodes: FADED BLUE outline (still blue to indicate type)
```

### On Send (Stage 2, triggered once by user)
```
User presses Send
  ↓
Only ACTIVE (bright) nodes sent to Groq
  ↓
Response streams into chat
```

---

## UI Implementation Details

### Canvas Rendering (Tree/Force Mode)
When displaying context:

**Active node visual**:
```
Node box:
  - Outline: stroke="#0066FF" (bright blue), stroke-width: 3px
  - Fill: fill="#E6F1FB" (light blue tint)
  - Shadow/glow: box-shadow: 0 0 8px rgba(0, 102, 255, 0.6)
  - Badge: "+" or checkmark in corner

Active lineage edge:
  - Stroke: stroke="#0066FF", stroke-width: 2px
  - Opacity: 1.0
  - Arrow: visible
```

**Inactive node visual**:
```
Node box:
  - Outline: stroke="#0066FF" (same blue), stroke-width: 2px
  - Fill: fill="transparent" or fill="#F1F1F1" (very faint)
  - Shadow/glow: none or very subtle
  - Badge: "-" or X in corner
  - Cursor: pointer (clickable)

Inactive lineage edge:
  - Stroke: stroke="#0066FF", stroke-width: 1px
  - Opacity: 0.3-0.4 (faded)
  - Arrow: visible but faded
```

**Non-context node visual** (unchanged):
```
Node box:
  - Outline: stroke="#CCCCCC", stroke-width: 1px
  - Fill: default
  - No badge
  - No interaction
```

---

## Interaction on Canvas

### Click Node to Deactivate/Reactivate
```
User clicks an ACTIVE (bright) context node
  → Node becomes INACTIVE (faded)
  → Color changes opacity, badge changes to "-"
  → Edge to parent (if lineage) also fades
  ↓
User clicks an INACTIVE (faded) context node
  → Node becomes ACTIVE (bright)
  → Color increases opacity, badge changes to "+"
  → Edge to parent (if lineage) also brightens
```

### No Click Deactivation for Non-Context Nodes
- Clicking a gray (non-context) node does nothing
- Only highlighted blue nodes are clickable for toggle

---

## Right Pane UI (Chat Area)

### During Context Display
```
┌─────────────────────────────────┐
│ Generating context for:         │
│ User message: "[user text]"    │
├─────────────────────────────────┤
│ CONTEXT SUMMARY:                │
│                                 │
│ Lineage (parents to root):      │
│ ✓ Root Node                     │
│ ✓ Node A                        │
│ ✓ Node B (current)              │
│                                 │
│ Referenced (you mentioned):     │
│ ✓ Node X                        │
│ ✓ Node Y                        │
│                                 │
│ Recommended (similar):          │
│ ✓ Node M (84%)                  │
│ ✓ Node N (71%)                  │
│ ✓ Node O (65%)                  │
│                                 │
│ [Click nodes on canvas to       │
│  deactivate (fade out)]         │
│                                 │
│ Grip: [Off / Low / Mid / High] │
└─────────────────────────────────┘
```

Or sidebar list:
```
CONTEXT NODES (click to toggle):

Lineage:
  [bright] Root Node
  [bright] Node A
  [bright] Node B (current)

Referenced:
  [bright] Node X
  [bright] Node Y

Recommended:
  [bright] Node M (84%)
  [bright] Node N (71%)
  [bright] Node O (65%)
```

---

## Stage 0 to Groq (Complete Flow)

### User Types Message
```
User: "How does this relate to my earlier thoughts?"
```

### Stage 0 (Background, Parallel)
```
1. detectReferences("How does this relate to my earlier thoughts?")
   → Groq analyzes against project nodes
   → Returns: ["Node_X_id", "Node_Y_id"] (or empty)

2. searchRAG("How does this relate to my earlier thoughts?")
   → Embed message (Jina)
   → Search pgvector with grip threshold
   → Returns: [Node_M (0.84), Node_N (0.71), Node_O (0.65)]

3. getLineage(currentNodeId)
   → Recursively find all parents to root
   → Returns: [Root, Node_A, Node_B (current)]
```

### On Send / Groq Call
```
System prepares context from:
  - Lineage nodes: [Root, Node_A, Node_B] (all active by default)
  - Referenced nodes: [Node_X, Node_Y] (all active by default)
  - Recommended nodes: [Node_M, Node_N, Node_O] (all active by default)

User can click to deactivate some:
  - User clicks Node_A → deactivated (not in context)
  - User clicks Node_M → deactivated (not in context)

Final context sent to Groq:
  - Lineage: [Root, Node_B]
  - Referenced: [Node_X, Node_Y]
  - Recommended: [Node_N, Node_O]

Groq receives:
  "Context from lineage:
   [Root content]
   [Node_B content]

   Referenced nodes (user mentioned):
   [Node_X content]
   [Node_Y content]

   Related/Recommended nodes:
   [Node_N content]
   [Node_O content]

   User message: How does this relate to my earlier thoughts?"
```

### Snapshot Saved
```
{
  nodeId: current_node_id,
  prompt: "How does this relate to my earlier thoughts?",
  parentNodeId: parent_of_current,
  referencedNodeIds: ["Node_X", "Node_Y"],
  recommendedNodeIds: ["Node_M", "Node_N", "Node_O"],
  activeContext: {
    lineage: ["Root", "Node_B"],
    referenced: ["Node_X", "Node_Y"],
    recommended: ["Node_N", "Node_O"]
  },
  deactivatedNodes: ["Node_A", "Node_M"],
  content: "[Groq response]",
  model: "groq-llama-instant",
  generatedAt: timestamp
}
```

---

## Visual Color Scheme

### Blue Variants (for highlighted context nodes)
```
Active (bright, include in context):
  - Outline stroke: #0066FF (bright blue)
  - Outline opacity: 1.0
  - Fill: #E6F1FB (light blue 10%)
  - Glow: box-shadow with 0.6 opacity

Inactive (faded, exclude from context):
  - Outline stroke: #0066FF (same blue)
  - Outline opacity: 0.4
  - Fill: transparent or #F5F5F5
  - Glow: none

Non-context (gray, no highlight):
  - Outline stroke: #CCCCCC (light gray)
  - Fill: default
  - Glow: none
```

### Edge Colors
```
Active lineage edge:
  - Stroke: #0066FF (bright blue)
  - Stroke-width: 2px
  - Opacity: 1.0

Inactive lineage edge:
  - Stroke: #0066FF (same blue)
  - Stroke-width: 1px
  - Opacity: 0.3

Non-lineage edge:
  - Stroke: #CCCCCC (gray)
  - Opacity: 0.5
```

---

## Grip Threshold UI

### Selector
```
Grip setting: [Off] [Low] [Mid] [High] ← Radio buttons or dropdown

Off:  0 recommended nodes shown
Low:  10-15 recommended nodes (min_score 0.5)
Mid:  5-10 recommended nodes (min_score 0.7, default)
High: 2-5 recommended nodes (min_score 0.9)
```

When grip = **Off**:
- No RAG search is performed
- No recommended nodes appear
- Only lineage + referenced nodes in context
- Much faster (no embedding call)

---

## Implementation Checklist

- [ ] Lineage tracking: getAllAncestors(nodeId) → array of parent IDs
- [ ] Reference detection: Returns referencedNodeIds from Groq
- [ ] RAG search: Returns recommendedNodeIds with scores
- [ ] Node state management: active/inactive toggle per node
- [ ] Visual styling: Active (bright) vs Inactive (faded) CSS
- [ ] Canvas highlighting: Render context nodes with blue outlines/edges
- [ ] Click handler: Toggle node active/inactive state
- [ ] Edge state: Follows node state (active/inactive)
- [ ] Sidebar/list: Show all context nodes with toggle status
- [ ] Snapshot: Record which nodes were deactivated
- [ ] Groq context: Only include active nodes in prompt

---

## Key Differences from Checkboxes/Pills

| Feature | Checkboxes/Pills | Visual Highlighting |
|---------|------------------|---------------------|
| **Discovery** | Small UI element | Large, visible on canvas |
| **Context** | Abstract list | Spatial/visual relationship |
| **Interaction** | Click checkbox | Click node itself |
| **Feedback** | Check/uncheck state | Bright/faded appearance |
| **Edges** | Not visible | Highlighted path to root |
| **Lineage** | Must manually select | Automatic + visual |
| **Exploration** | Can't see which nodes | Can see on canvas immediately |

---

## Summary

**New context selection UX**:
1. User types → Stage 0 runs automatically (debounced 500ms): reference detection + RAG in parallel
2. Canvas highlights all context nodes in **bright blue** (Stage 1, automatic)
3. Lineage edges also turn **bright blue** (path to root)
4. User optionally clicks any context node to **deactivate** (fades to low opacity)
5. Deactivated nodes are **excluded** from context
6. User presses Send **once** → Groq receives only active nodes (Stage 2)
7. Snapshot records which nodes were deactivated

**Why this is better**:
- Visual, spatial, immediately understandable
- See relationships on the graph
- Lineage path is explicit
- No need to scroll lists
- Natural interaction (click the node on canvas)
- Beautiful visual feedback