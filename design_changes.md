# Graphi — Design Upgrade Plan

Direction: **Elevated light mode** — keep the white/light palette but add depth, hierarchy, and a distinctive visual identity. Inspired by Linear, Notion, and Arc.

---

## 1. Global / Foundations

### Issues
- No design token system — colors are scattered magic values across all files
- `Inter` is referenced in `body` CSS but not loaded from any font source
- No micro-animation definitions
- Scrollbars use default OS chrome (ugly on Windows)
- `md-content code` uses a generic gray background — doesn't signal "code" distinctly

### Changes
- Add `@import` for Inter from Google Fonts (or use system stack properly)
- Canvas gets a **dot-grid background**: `radial-gradient(circle, #C8CEDE 1px, transparent 1px)` at 24px repeat on `#EEF0F6`
- Custom scrollbars: thin (5px), light gray thumb, transparent track
- Code blocks in markdown: subtle indigo tint (`rgba(79,70,229,0.07)`) with indigo text — matches the accent color system
- Define `@keyframes fadeSlideIn` (used by toasts, overlays) and `@keyframes pulse-dot` (typing indicator)
- **Accent color shift**: from pure `#2563EB` (flat blue) to **`#4F46E5`** (indigo) as the primary interactive accent. Still blue-family, just more distinctive and less "default browser blue".

---

## 2. AuthPage

### Issues
- "Graphi" is just a `<h1>` with no visual weight or brand identity
- White card on white-gray background — low contrast, forgettable entry point
- Inputs look like standard HTML inputs with no elevation
- Submit button is `bg-gray-900` — inconsistent with accent system elsewhere

### Changes
- Background: keep `#F0F2F7` but add the dot-grid so it's consistent with canvas
- Card: add a subtle top shadow (`box-shadow: 0 0 0 1px rgba(79,70,229,0.08), 0 24px 48px rgba(0,0,0,0.08)`) for depth
- **Brand mark**: Add an SVG hex/graph icon before "Graphi" — 6-sided shape with a node-and-edge motif, rendered in indigo. The wordmark uses `font-weight: 700, letter-spacing: -0.5px`.
- Tagline: "Think in branches" — short, evocative, italicized in muted gray
- Inputs: on focus, border becomes indigo `#4F46E5` with a matching `box-shadow: 0 0 0 3px rgba(79,70,229,0.12)` ring
- Submit button: indigo `#4F46E5` background (not gray-900), with a subtle hover darkening to `#4338CA`
- Mode toggle link: indigo text instead of gray

---

## 3. Sidebar

### Issues
- "Graphi" logo in the header is unstyled — same weight and color as everything else
- The toggle button uses a raw `☰` character (render quality varies)
- "New project" button uses dashed border — fine, but hover is done with inline JS event handlers (fragile, verbose)
- Project list items have no left-accent indicator for the active project
- Footer "Sign out" is tiny and invisible until hovered
- No visual distinction between the logo area and the project list area

### Changes
- **Logo area**: render the same SVG graph icon (from Auth) + "Graphi" wordmark in `font-weight: 700`. The icon is indigo.
- Toggle button: replace `☰` with a proper SVG panel-collapse icon (two horizontal bars with an arrow)
- Active project: add a 2px indigo left border accent (`border-left: 2px solid #4F46E5`) and background `#EEF0FD`
- Project list items: increase padding slightly (`8px 10px`), font size 13.5px
- "New project" button: remove dashed border approach, use a `+` icon with text, standard `border: 1.5px solid #E5E7EB` that turns indigo on hover — no inline event handlers (use `:hover` via a CSS class or `onMouseEnter` is fine, just more refined)
- Footer: slightly larger sign-out, add a thin divider above that's more visible

---

## 4. Canvas

### Issues
- Background is flat `#F0F2F5` with zero visual texture — the canvas area (the main feature!) looks empty and generic
- The Tree/Force mode toggle sits in a floating pill with minimal styling
- Empty state ("Select or create a project") is just gray text with no visual treatment

### Changes
- **Dot-grid background** (the biggest single upgrade): `background-color: #EEF0F6` + `background-image: radial-gradient(circle, #C8CEDE 1px, transparent 1px)` at 24px spacing. Creates a paper/whiteboard feel that reinforces the spatial/graph metaphor.
- Toolbar pill: elevate with `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`, increase border-radius to `12px`, add a tiny gap between buttons
- Active mode button: use indigo `#4F46E5` background instead of `#111827` (stays consistent with accent system)
- Empty state: center an icon (the same graph icon, at 40px, muted gray), title "Open a project", subtitle "Select from the sidebar to start exploring"

---

## 5. TreeCanvas Nodes

### Issues
- Nodes are flat rectangles with no shadow — they float on the canvas with no depth
- The glow effect uses a low-quality SVG blur filter that can look pixelated
- The `···` menu dot appears with opacity 0→1 but has no background on hover
- Truncation at 16 characters is aggressive — many real titles are cut at awkward points
- Node border-radius is 10px — fine, but slightly uniform

### Changes
- **Node shadow**: add `drop-shadow(0 2px 8px rgba(0,0,0,0.10))` to the SVG `<g>` filter for non-context nodes. Active/context nodes keep the blue glow.
- **Increase border-radius** to `12px` on all nodes
- Active node fill: use `#EEF0FD` (faint indigo tint) instead of `#EFF6FF`
- Active node stroke: `#4F46E5` (indigo) instead of `#2563EB`
- Font: bump node label to `13.5px`, weight `500` for selected, `400` for others
- Truncation: increase to 20 characters from 16
- `···` hover target: the rect behind the dots gets a proper `rgba(0,0,0,0.06)` background on hover
- Node height: increase from `40px` to `44px` for slightly more breathing room

---

## 6. ChatPane (Header)

### Issues
- The node title header is just a plain `<p>` at `font-size: 15px` — no visual affordance that this is the current context
- The divider between header and messages is barely visible (`#F3F4F6`)
- "Select a node" empty state is just gray text, centered

### Changes
- Header: add a subtle indigo dot/badge to the left of the node title to signal "active thread". Use `font-weight: 600`, keep `15px`.
- Header border: `#ECEEF3` (slightly more visible than `#F3F4F6`)
- Background: `#FAFBFD` instead of pure `#fff` — creates a very subtle warmth difference vs. sidebar
- Empty state: show the graph icon (muted), "No node selected" title, "Double-click a node on the canvas to open its thread" subtitle

---

## 7. MessageList

### Issues
- User bubble background is flat `#111827` — very dark, high contrast but stark
- Assistant bubble background `#F9FAFB` with `1px solid #F3F4F6` — nearly invisible border, blends with background
- Gap between messages is 12px — a bit tight for reading
- The typing cursor `▍` is rendered as a plain character with low visual interest
- No visual distinction between user avatar area and bubble (no sender label / avatar)

### Changes
- **User bubble**: shift from `#111827` to `#4F46E5` (indigo) — matches the accent system. White text stays.
- **Assistant bubble**: `background: #F3F4F8`, `border: 1px solid #EAECF3` — slightly more visible on the `#FAFBFD` pane background
- Gap between messages: increase to `16px`
- Typing indicator: replace `▍` with three animated dots (`●●●`) using CSS `pulse-dot` keyframes with staggered delays
- Message max-width: increase from `88%` to `86%` (slight reduction to keep long responses readable)
- Border-radius: user bubble `16px 16px 4px 16px`, assistant `4px 16px 16px 16px` — slightly rounder

---

## 8. ChatInput

### Issues
- Textarea background `#F9FAFB` with `1.5px solid #E5E7EB` — very understated, doesn't draw the eye
- "Grip" label and toggle buttons are tiny (12px) and feel like an afterthought
- Send button uses `#111827` — inconsistent with indigo accent system
- No visual separator between the grip controls and the send button in the row
- `placeholder` text "Message… (Enter to send)" is helpful but a bit long

### Changes
- Textarea: `background: #FFFFFF`, `border: 1.5px solid #E5E7EB`, on focus `border-color: #4F46E5` + `box-shadow: 0 0 0 3px rgba(79,70,229,0.10)`. Slightly rounder (`border-radius: 14px`).
- Placeholder: "Message…" (shorter)
- Grip label: rename display to "Context" and use a small icon (three horizontal lines of decreasing length) before the word, to visually reinforce what "grip" means
- Grip buttons: increase to `13px` font, `padding: 3px 9px`. Active state: indigo `#4F46E5` bg.
- Send button: indigo `#4F46E5` background, `border-radius: 12px`, slightly larger hit area `padding: 8px 18px`
- Send icon: replace text "Send" with text + a small arrow SVG icon (→) for visual clarity

---

## 9. ContextSummary

### Issues
- The section headers ("LINEAGE", "REFERENCED", "RECOMMENDED") are 11px uppercase — too small to scan quickly
- Chip buttons use a tiny `●` / `○` dot that's easy to miss
- The `maxHeight: 160px` cap causes the area to scroll even with just a few nodes — feels cramped
- Background `#FAFAFA` barely differs from the chat pane `#fff`

### Changes
- Section headers: increase to `11.5px`, `letter-spacing: 0.08em`, add a small colored dot before each section type (blue for Lineage, purple for Referenced, teal for Recommended)
- Chip active state: replace `●` with a filled indigo square `▪` (10px), and for inactive use a hollow `▫`. Better visual contrast.
- Active chip color: indigo `#4F46E5` text
- Background: `#F5F6FB` — slightly more contrast vs. the pane
- `maxHeight`: increase to `200px` to reduce scroll occurrences
- Header label "Context — click to toggle": change to "Context" with a small node-count badge (e.g., "3 active")

---

## 10. NodeToolOverlay

### Issues
- The overlay is identical to the sidebar project context menu — no visual differentiation
- Icons are 13px — quite small
- "Fork" doesn't visually read as the primary action
- "Transplant" is buried with the same muted style but is a complex destructive-ish action

### Changes
- **Fork** as the primary action: give it an indigo background row on hover (`#EEF0FD`) instead of generic `#F9FAFB`, and indigo text
- Increase icon size to `14px`
- Section dividers: slightly more opaque (`#ECEEF3`)
- Padding: `8px 12px` per row (from `7px 10px`) — more breathing room
- "Transplant": keep muted but add a subtle right arrow at the end of the row to signal it opens a sub-panel

---

## 11. Toast

### Issues
- Success toast: `#111827` — very dark, almost looks like an error
- No icon — text alone in a dark pill
- Appears at the bottom center which is a reasonable position, but it's very small

### Changes
- Success toast: indigo `#4F46E5` background with a white checkmark `✓` icon prefix
- Error toast: keep `#EF4444` (red), add `✕` icon prefix  
- Increase padding: `10px 18px` (from `9px 16px`)
- Font size: `13.5px` (from `14px`) with `font-weight: 500`
- Border-radius: `12px` (from `10px`)
- Add a very subtle `backdrop-filter: blur(4px)` and semi-transparent overlay to make it feel more modern

---

## Color System Summary

| Token | Old | New |
|---|---|---|
| Accent primary | `#2563EB` (blue) | `#4F46E5` (indigo) |
| Accent dark | `#1D4ED8` | `#4338CA` |
| Accent faded | `#93C5FD` | `#A5B4FC` |
| Active bg tint | `#EFF6FF` | `#EEF0FD` |
| Canvas bg | `#F0F2F5` flat | `#EEF0F6` + dot grid |
| Chat pane bg | `#FFFFFF` | `#FAFBFD` |
| Code inline bg | `rgba(0,0,0,0.06)` | `rgba(79,70,229,0.07)` |
| User bubble | `#111827` | `#4F46E5` |
| Success toast | `#111827` | `#4F46E5` |

The shift from `#2563EB` (Tailwind blue-600) to `#4F46E5` (Tailwind indigo-600) is the single most impactful token change — it gives Graphi a distinct identity away from "generic blue app" territory, while staying in the cool/trustworthy color family.
