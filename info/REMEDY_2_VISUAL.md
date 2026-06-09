# Remedy 2: Branch Reminder Bar — Visual Specification

## Final Design: Pill-Shaped Bar (Hovering)

### Visual Appearance

```
┌────────────────────────────────────────────────────────┐
│  Stronger Healthier Body  (15+ messages)              │  ← Remedy 1
├────────────────────────────────────────────────────────┤
│ ✓ Lineage (Root, Parent)                              │
│ ✓ Referenced (Node X)                                 │
│ ✓ Recommended (Node M 84%, Node N 71%)                │  ← Context Summary
├────────────────────────────────────────────────────────┤
│ Message list area (scrollable)                        │
│                                                       │
│                 ⚠️ This thread is getting              │  ← Remedy 2
│              long. Consider branching.                │     (pill-shaped bar)
│                  [×]  [Don't show again]             │
│                                                       │
│ [User Message 1]                                      │
│ [Assistant Message 1]                                 │
│ ...                                                   │
│ [User Message 15+]                                    │
│ [Assistant Message 15+]                               │
├────────────────────────────────────────────────────────┤
│ Grip: [Off] [Low] [Mid] [High]                        │
│ [Textarea placeholder: "How can I help?"]            │
│ [Send Button] ↑                                       │
└────────────────────────────────────────────────────────┘
```

### Pill Shape Specification

**Shape:** Rounded rectangle with `border-radius: 9999px` (fully rounded)

**Dimensions:**
- Height: ~44px (content-based, ~0.75rem padding top/bottom + 1.125rem icon + text)
- Width: `fit-content` with `max-width: calc(100% - 2rem)` (leave 1rem margin on each side)
- Padding: `0.75rem 1.25rem` (vertical | horizontal)

**Colors:**
- Background: `rgb(254, 243, 199)` (#FEF3C7 — Tailwind `bg-yellow-100`)
- Border: `1px solid rgb(217, 119, 6)` (#D97706 — Tailwind `border-yellow-600`)
- Text: `rgb(120, 53, 15)` (Tailwind `text-yellow-900`)
- Shadow: Subtle drop shadow `0 2px 8px rgba(217, 119, 6, 0.15)`

**Positioning:**
- `margin: 0.75rem auto` (centered horizontally, 12px spacing above/below)
- `position: relative` on bar itself
- `z-index: 10` (floats above message list)
- Bar is **inside** the message list container, not absolute/fixed
- Bar scrolls with messages (not sticky to viewport)

### Content Layout

```
┌─────────────────────────────────────────────┐
│ ⚠️ This thread is getting long. [×] [Dismiss]│  ← Pill
└─────────────────────────────────────────────┘

Breakdown:
  ┌─────────────────────────────────────────────┐
  │ ⚠️ │ This thread is getting long. │ [×] [Dismiss] │
  └─────────────────────────────────────────────┘
  Icon   Text (flex: 1)                Actions (flex-shrink: 0)
```

**Icon:** `⚠️` (warning emoji, 1.125rem font-size)
**Text:** "This thread is getting long. Consider branching." (0.875rem, line-height: 1.4)
**Actions:**
- Close button: `×` (1.25rem font-size, minimal padding)
- Gap: 0.75rem between buttons
- Dismiss button: "Don't show again" (text button, underline on hover)

### Interactive States

**Default (idle):**
- Bar visible, fully opaque
- Text: `rgb(120, 53, 15)` (dark yellow)
- Buttons: 80% opacity

**On hover (any button):**
- Button opacity: 100%
- Close button: No additional state (just opacity change)
- Dismiss button: Underline appears on hover

**On click:**
- Close (×): Bar immediately fades out (opacity animation 200ms)
- Dismiss: Bar fades out + flag set (won't re-appear this session)

### Animations

**Entrance (when threshold hit):**
```css
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
animation: slideDown 0.3s ease-out;
```

**Exit (on close/dismiss):**
```css
@keyframes fadeOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
animation: fadeOut 0.2s ease-in;
```

### Responsive Design

**Desktop (> 768px):**
- Full pill layout as described
- All text on one line
- `max-width: calc(100% - 2rem)`

**Tablet (480px–768px):**
- Pill remains same shape, may wrap text if needed
- Buttons stack vertically if space is tight (unlikely)
- `max-width: calc(100% - 1rem)`

**Mobile (< 480px):**
- Pill may compress slightly
- Text may wrap to 2 lines
- Close button (×) stays accessible
- Font-size: 0.75rem (from 0.875rem)

### Example HTML

```jsx
<div className="branch-reminder">
  <div className="reminder-content">
    <span className="reminder-icon">⚠️</span>
    <p className="reminder-text">
      This thread is getting long. Consider branching.
    </p>
  </div>
  <div className="reminder-actions">
    <button className="close-btn" onClick={onClose}>×</button>
    <button className="dismiss-btn" onClick={onDismiss}>
      Don't show again
    </button>
  </div>
</div>
```

### Comparison: Before vs After

#### Before (No Remedy 2)
- User sends message #15, no feedback
- User keeps typing, unaware thread is long
- User eventually realizes thread is unwieldy, hard to manage

#### After (With Remedy 2)
- User sends message #15
- Pill bar slides down smoothly, centered at top of message list
- User sees: "⚠️ This thread is getting long. Consider branching."
- User can:
  - Click ×: Bar hides, continues conversation
  - Click "Don't show again": Bar hides permanently (this session)
  - Ignore: Bar stays visible, doesn't block interaction
  - Act: Click Fork button (already visible in pane) to branch

### Testing Checklist

- [ ] Pill shape rendered correctly (rounded, not rectangular)
- [ ] Centered horizontally within message list area
- [ ] Positioned below context summary (if present)
- [ ] Colors match spec (yellow-100 background, yellow-600 border)
- [ ] Icon displays: ⚠️
- [ ] Text displays: "This thread is getting long. Consider branching."
- [ ] Buttons work: × (close) and "Don't show again" (dismiss)
- [ ] Slide-down animation on entrance (0.3s)
- [ ] Fade-out animation on close/dismiss (0.2s)
- [ ] Close button hides bar temporarily (no state persistence)
- [ ] "Don't show again" hides bar permanently (session)
- [ ] Bar floats above messages (z-index: 10), doesn't push them
- [ ] Responsive on mobile (text may wrap, buttons accessible)
- [ ] No overlap with context summary
- [ ] Scrolls with message list (not sticky to viewport)

---

## Rationale

**Why pill shape?**
- More visually distinct than a bar (stands out as an alert/notification)
- Rounded edges feel softer, less aggressive than rectangular bars
- Consistent with modern notification UX patterns
- Hovering over message list (not fixed) keeps UX flexible

**Why below context summary?**
- Context summary shows active/inactive nodes
- User might be managing context, then sees the branch suggestion
- Natural visual flow: context → suggestion → messages

**Why centered horizontally?**
- Draws attention naturally
- Doesn't compete with message text for reading
- Symmetrical, balanced appearance

**Why fade animations?**
- Smooth entrance/exit feels polished
- Not jarring or sudden
- Reinforces that notification is optional/dismissible
