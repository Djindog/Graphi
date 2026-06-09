# ChatPane Structure Changes

## Overview
The ChatPane component has been significantly restructured. `ChatPaneWithControls.tsx` has been merged into `ChatPane.tsx`, and the layout has been reorganized to support canvas/chat pane hide/show functionality with improved resizing behavior.

## Major Changes

### 1. **File Consolidation**
- **DELETED**: `src/components/Chat/ChatPaneWithControls.tsx`
- **MODIFIED**: `src/components/Chat/ChatPane.tsx` - now the top-level component with all navigation controls

### 2. **Component Structure**

#### ChatPane (Top Level)
- Receives props: `width`, `canvasHidden`, `groqClient`
- Manages header, message list, and input areas
- Contains all navigation button logic

**Key props:**
```typescript
interface ChatPaneProps {
  width: number;
  canvasHidden: boolean;
  groqClient: GroqClient | null;
}
```

#### Layout Hierarchy
```
ChatPane (top-level container)
├── Header (full width)
├── Content Wrapper (centered content area)
│   └── InnerChatPane (width: 100%, maxWidth: 720px, position: relative)
│       ├── Messages List (overflow area)
│       ├── Context Card (if visible)
│       ├── Input Area
│       └── Side Navigation Buttons
└── (Grab handles managed by parent App.tsx)
```

### 3. **Navigation Buttons**

Moved from ChatPaneWithControls into ChatPane. Two buttons appear in the left and right "columns" of InnerChatPane:

**Properties:**
- **Position**: Absolutely positioned at `left: 8px` and `right: 8px`
- **Vertical**: Fixed at `top: 50%` with `transform: 'translateY(-50%)'` for vertical centering
- **Hitbox**: Full height of InnerChatPane
- **Visibility**: Shown on hover over side areas
- **Tooltip**: "Move to next/previous sibling node"

```javascript
// Left button (previous)
<div style={{
  position: 'absolute',
  left: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  cursor: 'pointer',
  // ...
}}>
  <ArrowLeft size={18} />
</div>

// Right button (next)
<div style={{
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  cursor: 'pointer',
  // ...
}}>
  <ArrowRight size={18} />
</div>
```

### 4. **Hide/Show Functionality**

#### Canvas Hide (Divider Drag Left)
- Drag divider **left** by >300px (CANVAS_SNAP_THRESHOLD)
- Divider visibility: only shows when both Canvas and ChatPane are visible
- Double-click divider: hides Canvas (not ChatPane)
- Grab handle appears on left when Canvas is hidden
- Double-click left grab handle: reveals Canvas at previous width

#### ChatPane Hide (Divider Drag Right)
- Drag divider **right** by >300px
- Double-click divider: hides Canvas (not ChatPane)
- Grab handle appears on right when ChatPane is hidden
- Double-click right grab handle: reveals ChatPane at 650px width

#### Snap Threshold Behavior
- Threshold: `CANVAS_SNAP_THRESHOLD = 300px`
- During drag: visual feedback updates in real-time
- At threshold: pane hides and stays hidden
- Below threshold: pane shows normally
- On release: final state is locked in

### 5. **Width Handling**

**When Canvas is visible:**
```javascript
style={{
  width: chatPaneWidth,
  flexShrink: 0,
  overflow: 'hidden'
}}
```

**When Canvas is hidden:**
```javascript
style={{
  flex: 1,
  overflow: 'hidden'
}}
```

This ensures ChatPane fills remaining space when Canvas is hidden.

### 6. **InnerChatPane Structure**

```javascript
<div
  ref={innerChatPaneRef}
  style={{
    width: '100%',
    maxWidth: 720,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: 16,
    paddingRight: 16,
    position: 'relative',
    overflowY: 'auto'
  }}
>
  {/* Messages, context card, input, buttons */}
</div>
```

**Key properties:**
- `width: 100%` - respects parent width
- `maxWidth: 720px` - constrains message content
- `position: relative` - allows absolute positioning of side buttons
- `overflowY: auto` - scrolls internally, not parent

### 7. **App.tsx Integration**

**ChatPane Wrapper:**
```javascript
<div style={{
  display: chatPaneHidden ? 'none' : 'block',
  ...(canvasHidden ? { flex: 1 } : { width: chatPaneWidth, flexShrink: 0 }),
  overflow: 'hidden'
}}>
  <ChatPane
    width={chatPaneWidth}
    canvasHidden={canvasHidden}
    groqClient={groqClient}
  />
</div>
```

**New State Variables:**
- `chatPaneHidden`: boolean - whether ChatPane is hidden
- `chatPaneGrabHovered`: boolean - for grab handle hover state
- `chatPaneGrabTooltip`: boolean - for grab handle tooltip

**Divider Logic:**
- Drag **left**: shrinks Canvas, expands ChatPane (capped at MAX_CHAT_WIDTH)
  - Threshold: delta > 300px hides Canvas
- Drag **right**: shrinks ChatPane, expands Canvas
  - Threshold: shrinkAmount > 300px hides ChatPane
- Both directions apply threshold "stickily" - once crossed, stays locked until release

### 8. **Keyboard Shortcuts** (if applicable)
- Ctrl+Z: undo (existing)
- Navigation buttons: move to next/previous node

## Migration Guide for Teammates

### If you're working on ChatPane features:

1. **Import from ChatPane.tsx** (not ChatPaneWithControls):
   ```javascript
   import { ChatPane } from './components/Chat/ChatPane';
   ```

2. **Props have changed**:
   - `width` prop is now required (number)
   - `canvasHidden` prop is now required (boolean)
   - `groqClient` prop is now required (GroqClient | null)

3. **Navigation buttons**:
   - No longer in a separate component
   - Built into ChatPane with fixed positioning
   - Positioned at `left: 8px` and `right: 8px` of InnerChatPane

4. **Styling**:
   - All inline styles (no separate CSS files)
   - InnerChatPane has fixed max-width of 720px
   - Messages are centered within that constraint

### If you're working on App layout:

1. **Divider now handles both directions**:
   - Left drag = hide Canvas
   - Right drag = hide ChatPane
   - Grab handles appear on the hidden side

2. **State management**:
   - `chatPaneWidth` - explicit width when visible
   - `chatPaneHidden` - visibility toggle
   - `canvasWidth` - canvas width (0 = hidden, null = flex)

3. **Conditional rendering**:
   - ChatPane wrapper uses conditional flex/width based on Canvas state
   - Divider only shows when both are visible
   - Grab handles appear when respective pane is hidden

## Testing Checklist

- [ ] Drag divider left - Canvas shrinks, ChatPane expands (capped at 720px)
- [ ] Drag divider left >300px - Canvas hides, grab handle appears
- [ ] Drag divider right - ChatPane shrinks, Canvas expands
- [ ] Drag divider right >300px - ChatPane hides, grab handle appears
- [ ] Double-click divider - Canvas hides (ChatPane remains visible)
- [ ] Double-click left grab handle - Canvas revealed at previous width
- [ ] Double-click right grab handle - ChatPane revealed at 650px width
- [ ] Navigation buttons appear on hover in side columns
- [ ] Keyboard shortcuts still work (Ctrl+Z, etc.)
- [ ] Messages centered with max-width 720px
- [ ] White space fills correctly when Canvas is hidden

## Files Changed

- `src/App.tsx` - Layout, divider logic, grab handles
- `src/components/Chat/ChatPane.tsx` - Merged structure, navigation buttons
- `src/components/Chat/ChatPaneWithControls.tsx` - **DELETED**
- `src/lib/groq.ts` - Type updates for null handling

## Notes

- All styling uses inline styles (React style objects)
- No CSS classes added (Tailwind styles remain on outer elements)
- Position calculations are all percentage-based for responsiveness
- Threshold behavior is "sticky" - once crossed, stays locked until mouse release
