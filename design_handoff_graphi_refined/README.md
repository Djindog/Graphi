# Handoff: Graphi — Refined App (v2 visual spec)

## Overview
This package specifies the **refined visual baseline** for the next version of **Graphi**, a branching chat app where an entire conversation is organized as a **tree** — every node is its own chat thread, and forking a node spawns a child thread to explore a sub-topic. The three-pane app (Sidebar │ Canvas/mind-map │ Chat) keeps its structure and behavior; this is a **polish pass**, not a redesign: tighter spacing, clearer typographic hierarchy, softer/consistent elevation, crafted empty states, and a single signature micro-interaction (node hover-lift).

The goal: implement this look in the real Graphi codebase (React + TypeScript + Vite), reusing existing state/data/RAG logic and replacing only the presentation layer.

## About the Design Files
The files in `reference_prototype/` are **design references created in HTML/React-via-Babel** — a runnable prototype that demonstrates the intended look and behavior. **They are not production code to copy verbatim.** They use inline styles, fake data, a CDN React+Babel runtime, and a `window.GTheme` token object purely so the mock runs in a browser.

Your task is to **recreate this design in the existing Graphi codebase**, using its established stack and conventions (real components, the existing zustand stores, the existing Supabase/Groq/Jina data layer, and whatever styling system the repo uses — Tailwind v4 is already present via `@import "tailwindcss"`). Lift the **exact values** (colors, spacing, radii, shadows, timings) from this spec and from `colors_and_type.css`; re-implement the **structure** idiomatically.

To run the reference: serve the `reference_prototype/` folder over HTTP (e.g. `npx serve reference_prototype`) and open `Polish Lab.html`. Sign in with anything. A floating "Tweaks" panel exposes design variants — **for this handoff, the locked baseline is the panel's default state** (see Locked Decisions). The non-default tweak options are exploration only and are **out of scope**.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows, and interactions are final. Recreate the UI pixel-accurately using the codebase's component patterns. Where the prototype and this README disagree, **this README wins**.

---

## Locked Decisions (the "refined baseline")
These are the only settings to implement. Ignore the other Tweak options.

| Aspect | Decision |
|---|---|
| **Accent** | Graphi blue — `#2563EB` (strong `#1D4ED8`, soft `#EFF6FF`) |
| **Elevation** | **Soft** shadow ladder (see Design Tokens → Shadows) |
| **Density** | Comfortable |
| **Node hover motion** | **On** — hovering a non-active node lifts it (`translateY(-4px) scale(1.025)`) with a raised shadow |
| **Canvas backdrop** | Dot grid |
| **Node style** | Refined (compact title box) — *not* the "detailed" card variant |
| **Chat layout** | Bubbles (user bubble + bubble-less assistant) — *not* the document/centered layout |
| **Sidebar** | Standard (single panel) — *not* the icon rail |
| **Crafted empty states** | On |

---

## Screens / Views

The app is a single full-viewport, three-pane layout. There is also an auth screen and several overlays (modals, menus, toasts).

### Global layout
- Full viewport, no page scroll. `display: flex; height: 100vh; overflow: hidden`.
- Left→right: **Sidebar** (fixed `224px`, collapsible) → **Canvas** (flex-grow) → **Divider** (`9px` hit area) → **Chat pane** (`440px` default, drag-resizable, min `300px`, max = half the space right of the sidebar).
- Base font stack: `-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif`. Inter is the cross-platform fallback (load from Google Fonts if not on macOS). Antialiased.

---

### 1. Auth screen
- **Purpose:** sign in / sign up before entering the app.
- **Layout:** full-viewport, centered card on `--app-bg` (`#F5F6F8`) with a faint dot-grid overlay (`radial-gradient(#D1D5DB 1.1px, transparent 1.1px)`, `background-size: 22px 22px`, `opacity: 0.4`).
- **Card:** `360px` wide, white, `1px #E5E7EB` border, `border-radius: 18px`, `padding: 34px`, shadow `0 12px 40px rgba(17,24,39,0.10), 0 2px 8px rgba(17,24,39,0.05)`.
- **Header row:** a `38×38` rounded-`11px` blue (`#2563EB`) square holding a white `git-fork` Lucide icon (20px, stroke 2.2), beside the wordmark **Graphi** (21px / 600 / `-0.4px` tracking, `#111827`) with a 13px `#9CA3AF` subtitle ("Sign in to continue" / "Create your account").
- **Fields:** email + password. Each: full-width, white, `1.5px #E5E7EB` border, `border-radius: 12px`, `padding: 12px 14px`, 14px text. **Focus:** border → `#2563EB`, plus a `0 0 0 3px #EFF6FF` ring.
- **Submit button:** full-width, `#111827` fill, white text 14px/500, `border-radius: 12px`, `padding: 12px`.
- **Toggle line:** centered 13.5px `#9CA3AF`, with a `#2563EB`/500 inline button to switch login↔signup.
- Submitting (any input) enters the app.

---

### 2. Sidebar (standard)
- **Purpose:** brand, new-project affordance, project list, account footer.
- **Container:** `224px` wide, white, `1px #E5E7EB` right border, full height, column flex.
- **Header (`padding: 16px 14px 14px`):** a `24×24` rounded-`7px` blue square with white `git-fork` (14px), the wordmark **Graphi** (16px/600/`-0.3px`), and a right-aligned collapse button (`panel-left-close` icon, 16px) that is a `28×28` rounded-`8px` ghost button — hover fills `#F9FAFB`, icon `#374151`.
- **New project button (`padding: 0 12px 12px`):** full-width, `#F9FAFB` fill, `1px #E5E7EB` border, `border-radius: 10px`, `padding: 9px 10px`, centered `plus` icon (15px) + "New project" 13px/500 `#374151`. **Hover:** border `#2563EB`, text `#1D4ED8`, fill `#EFF6FF`.
- **Section label:** "Projects" — 11px/600 uppercase, `0.06em` tracking, `#9CA3AF`, margin `4px 6px 8px`.
- **Project rows (`padding: 0 10px`):** each row `border-radius: 9px`, `padding: 8px 8px 8px 12px`, 14px text, `margin-bottom: 2px`, flex space-between.
  - **Default:** text `#374151`.
  - **Hover:** background `#F9FAFB`.
  - **Active:** background `#EFF6FF`, text `#1D4ED8`/500, **plus a `3px` rounded accent bar** pinned to the row's left edge (`top/bottom: 8px`, color `#2563EB`).
  - **Pinned projects** sort to the top and show a `pin` icon (11px, `#F59E0B`) before the name.
  - **Overflow button** (`more-horizontal`, 15px) appears on row hover only (opacity 0→1), `24×24` rounded-`7px`; opens the project menu.
- **Footer (`padding: 12px 14px`, top hairline `#F3F4F6`):** a `26×26` circular `#111827` avatar with the user initial (white 11px/600), the email (13px `#374151`, truncated), and a right-aligned settings ghost button (`settings`, 15px).
- **Collapsed state:** `52px` rail with just an expand button (`panel-left`, 17px) at top.

---

### 3. Canvas (tree / mind-map) — the hero surface
- **Purpose:** visualize and navigate the conversation tree; each node is a thread.
- **Background:** `#F0F2F5` with a **dot grid** overlay: `radial-gradient(#D1D5DB 1.1px, transparent 1.1px)`, `background-size: 22px 22px`, `opacity: 0.5`, non-interactive.
- **Pan:** dragging the background translates the node/edge layer. On selection change, the canvas **auto-frames the active node** (centers it horizontally, ~34% from the top) until the user manually pans.
- **Layout algorithm:** tidy top-down tree. Node box `168px` wide × `58px` min height. Horizontal slot per leaf `210px`; vertical row height `150px`. Parent x = midpoint of children's x. (See `pLayoutTree` in `polish/PolishCanvas.jsx`.)
- **Edges:** cubic Bézier from parent bottom-center to child top-center: `M sx,sy C sx,midY tx,midY tx,ty`. Styling by lineage tier:
  - Off-path: `#D1D5DB`, `1.5px`, opacity `0.6`.
  - Deactivated lineage: `#93C5FD`, `1.5px`, opacity `0.45`.
  - Active path: `#2563EB`, `2px`, opacity `1`. Transitions `stroke 0.2s, opacity 0.2s`.

- **Node (refined):** `border-radius: 12px`, `1px` border, centered title (13.5px, weight 500; active 600), 2-line clamp, `padding: 0 14px`. Soft shadow at rest (see tokens). States:
  - **Default:** white fill, `#E5E7EB` border, `#111827` text.
  - **Active (current thread):** fill `#EFF6FF`, `2px #2563EB` border, `#1D4ED8` text, **plus a blue glow** — an absolutely-positioned inset element with `6px solid #2563EB`, `opacity 0.16`, run through an SVG Gaussian-blur filter (`stdDeviation 3.5`).
  - **In active context (toggled on):** like active but `1.5px` border, no 600 weight.
  - **Deactivated context:** `#93C5FD` border, `#F9FAFB` fill, opacity `0.5`.
  - **Dimmed (context mode, not involved):** opacity `0.4`.
  - **Danger (pre-delete hover from menu):** fill `#FEF2F2`, `1.5px #FCA5A5` border, `#EF4444` text. The hovered node **and all its descendants** light up red.
  - **Hover (non-active):** lift `translateY(-4px) scale(1.025)`, transition `transform 0.2s cubic-bezier(0.34,1.2,0.64,1)`, and shadow jumps to the **lifted** ladder value. (This is the one signature micro-interaction.)
  - **Overflow button** on hover: `26×26` rounded-`7px`, white, `1px #E5E7EB`, `more-horizontal` 14px, top-right.
  - **Fold badge:** when a node's subtree is folded, a pill at bottom-right (`min-width 24px`, `height 24px`, `border-radius 12px`, `#2563EB` fill, white 11.5px/600) shows the hidden descendant count.
- **Toolbar (top-right, `16px` inset):** white, `1px #E5E7EB`, `border-radius: 11px`, `padding: 3px`, soft toolbar shadow. Two segmented buttons **Tree** (`git-fork` icon) / **Force** (`share-2` icon); selected = `#111827` fill + white, `border-radius: 8px`, `padding: 6px 12px`, 13px. (Force layout is a placeholder view — out of scope to build the physics; keep the toggle.)
- **Empty (no nodes):** centered crafted empty state — `git-fork` icon, "Start your first thread", body "Every project begins as one node. Type below to grow the tree."

#### Canvas interactions
- **Single-click a node:** if not current → select it (loads its thread in chat). If it *is* current → enter **context mode** (highlights the lineage; chips appear in the chat tray).
- **In context mode, click other nodes** to toggle them in/out of context. Click the current node again to exit context mode.
- **Double-click a node:** jump straight to it (exits context mode).
- **Node overflow menu** (see Node Menu below).

---

### 4. Chat pane (bubbles layout)
- **Purpose:** the conversation for the selected node, with lineage-context controls and the composer.
- **Container:** `440px` default width (drag-resizable via the divider), white, `1px #E5E7EB` left border, column flex.
- **Header (`padding: 15px 16px 14px`, bottom hairline `#F3F4F6`):** a `30×30` rounded-`9px` `#EFF6FF` square with a `git-branch` (child) or `circle-dot` (root) Lucide icon in `#2563EB`; beside it the node title (15px/600/`-0.2px`, truncated) over a 12px `#9CA3AF` subtitle ("Branch thread" / "Root thread").
- **Context tray** (only when context chips exist; `padding: 12px 16px 10px`, `#FAFAFA` bg, bottom hairline): label "Lineage · click to toggle" (11px/600 uppercase, `0.06em`, `#9CA3AF`), then wrapping **pill chips** (`gap: 7px`):
  - **On:** `#EFF6FF` fill, `1px #2563EB` border, `#1D4ED8` text/500, a solid `#2563EB` 7px dot.
  - **Off:** white fill, `1px #E5E7EB` border, `#6B7280` text, a hollow dot (`1.5px #D1D5DB` ring).
  - Pill `padding: 7px 12px`, `border-radius: 999px`, 13px, `max-width: 200px` (truncate).
- **Messages (`padding: 18px 16px`, vertical gap `14px`):**
  - **User:** right-aligned bubble, fill `#F3F4F6`, `#111827` text, `border-radius: 16px`, `padding: 10px 15px`, 15px / line-height 1.6, `max-width: 82%`.
  - **Assistant:** **no bubble** — plain `#111827` text flush-left, 15px / line-height 1.68, `max-width: 94%`. (Render markdown here in production: headings, lists, inline `code` with `rgba(0,0,0,0.06)` bg, KaTeX for math.)
  - **Generating:** a blinking `▍` caret (opacity ~0.4) until tokens stream in.
  - **Empty:** crafted empty state — `message-square-plus` icon, "Type to start this thread", body about branching.
- **Composer (`padding: 14px 16px`, top hairline):** a single rounded container (`1.5px #E5E7EB` border, `border-radius: 14px`, white, soft shadow). **Focus** (textarea inside): border `#2563EB` + `0 0 0 3px #EFF6FF` ring on the container.
  - **Textarea:** transparent, borderless, 15px, placeholder "How can I help you?", `padding: 10px 14px 4px`, auto-ish (2 rows). Enter submits; Shift+Enter newlines.
  - **Bottom bar:** left = **Grip** control: a `crosshair` icon (13px) + "Grip" label (12px `#9CA3AF`), then four segmented buttons `off / low / mid / high`; selected = `#111827` fill + white, `border-radius: 7px`, `padding: 4px 9px`, 12px. Right = **Send** button: `34×34` circle, `arrow-up` icon (17px); enabled fill `#111827`/white, disabled fill `#E5E7EB`/`#9CA3AF`. While generating, show a **Stop** button (`34×34` circle, white, `1.5px #E5E7EB`, filled rounded square icon) and a spinner (`0.75s` linear rotate) in the send slot.
- **No node selected:** crafted empty state — `mouse-pointer-click` icon, "Select a node", body "Click any node on the canvas to open its thread."

---

### 5. Divider (pane resizer)
- `9px` hit area between canvas and chat; cursor `col-resize`.
- Visual: a centered `1px #E5E7EB` line that thickens to `3px` and turns `#2563EB` on hover (transition `0.12s`). Drag adjusts chat width within `[300px, (viewport - sidebar)/2]`.

---

### 6. Overlays

**Node menu** (per-node `···`): fixed popover near the node. White, `1px #E5E7EB`, `border-radius: 12px`, soft **menu** shadow, `padding: 4px`, `min-width ~168px`. Items 13px, `padding: 7px 10px`, `border-radius: 7px`, left Lucide icon (13px, 0.7 opacity):
- `Branch` (`git-fork`) · `Rename` (`pencil`) · `Fold`/`Unfold` (`minimize-2`/`maximize-2`)
- divider
- `Remove (Keep Children)` (`scissors`) — danger · `Delete Subtree` (`trash-2`) — danger. Danger items: `#EF4444` text, hover fill `#FEF2F2`, and they trigger the red pre-delete highlight on the canvas.
- divider
- `Transplant` (`chevron-right`) — muted `#9CA3AF`.
- Root node disables Fold/Cut/Prune (opacity 0.3, `not-allowed`).

**Project menu** (sidebar row `···`): same popover styling. `Pin`/`Unpin` (`pin`) · `Rename` (`pencil`) · divider · `Delete` (`trash-2`, danger).

**New project modal:** centered over `rgba(0,0,0,0.35)` scrim (no blur). White card `460px`, `border-radius: 16px`, modal shadow `0 24px 60px rgba(0,0,0,0.18)`, `padding: 28px 28px 24px`. Title "New project" (18px/600) + close `✕`. Fields: "Project name" (`Name your project…`) and "Description (optional)" (`What are you working on?`) — `#F9FAFB` inputs, `1.5px` border, `border-radius: 10px`, focus border `#2563EB`. Footer right-aligned: "Cancel" (white, `1px` border) + "Create project" (`#111827`, white).

**Toasts:** bottom-center, stacked, `gap: 8px`. Pill `padding: 9px 16px`, `border-radius: 10px`, 14px/500, white text, toast shadow. Success = `#111827` fill; error = `#EF4444` fill. Enter animation: fade + `translateY(8px)→0` over `0.3s`. Auto-dismiss ~2.6s. Copy examples: `"Quantum notes" created`, `Subtree deleted`, `Project deleted`.

---

## Interactions & Behavior (summary)
- **Transitions:** color/border/background shifts `120ms`; node hover-lift `0.2s` with springy `cubic-bezier(0.34,1.2,0.64,1)`; edges/opacity `0.2s`; toast `0.3s`.
- **Hover:** surfaces lighten to `#F9FAFB`; muted icons darken `#9CA3AF→#374151`; bordered affordances shift border toward `#2563EB`/`#111827`.
- **Focus:** `1.5px #2563EB` border + `0 0 0 3px #EFF6FF` ring (auth fields, composer container).
- **Disabled:** opacity `0.3–0.5`, `not-allowed`; primary buttons drop to `#E5E7EB`/`#9CA3AF`.
- **Streaming reply:** append an empty assistant message, stream tokens in, show `▍` caret while empty. On the node's **first** user message, auto-title the node from that message (truncate ~28 chars + `…`).
- **No emoji.** Icons are **Lucide** line icons (2px stroke, `currentColor`); a few literal Unicode marks (`✕ + ▍`) are acceptable.

## State Management
Reuse Graphi's existing stores; the presentation needs these concepts (names from the prototype):
- `projects[]`, `pinned: Set`, `activeProjectId`.
- `nodesByProject[projectId] → Node[]` where `Node = { id, parentId, title }`. `title` is null until the first message auto-titles it.
- `messagesByNode[nodeId] → Message[]` where `Message = { id, role: 'user'|'assistant', content }`.
- `currentNodeId`; derived **lineage** = ancestors(current) + current.
- **Context mode:** `contextActive: Set`, `contextDeactivated: Set` (both empty = not in context mode).
- `folded: Set<nodeId>` → hides descendants, shows count badge.
- `gripLevel: 'off'|'low'|'mid'|'high'` (RAG strictness; existing concept).
- `graphMode: 'tree'|'force'`.
- UI: `sidebarCollapsed`, `chatWidth`, open menu/modal/toast state.
- Derived helpers: `ancestorsOf(id)`, `descendantsOf(id)`, tidy-tree layout, fold-hidden set. See `polish/PolishApp.jsx` and `polish/PolishCanvas.jsx` for reference implementations.

## Design Tokens
All tokens live in `reference_prototype/colors_and_type.css` as CSS custom properties (and mirrored as JS in `ui_kits/app/theme.js`). Key values:

**Colors**
- Surfaces: app `#F5F6F8`, canvas `#F0F2F5`, surface `#FFFFFF`, soft `#F9FAFB`, faint `#FAFAFA`.
- Ink ramp: `#111827 / #374151 / #6B7280 / #9CA3AF / #D1D5DB`.
- Borders: `#E5E7EB` (default), `#F3F4F6` (hairline).
- Blue accent: `700 #1D4ED8`, `600 #2563EB`, `300 #93C5FD`, `100 #DBEAFE`, `50 #EFF6FF`.
- Danger: `600 #EF4444`, `300 #FCA5A5`, `50 #FEF2F2`. Amber pin: `#F59E0B`. Primary action = ink `#111827`.

**Type** — system-sans (Inter fallback); mono `SFMono-Regular, Consolas, Menlo`. Scale (px): 11 (uppercase labels) · 12 · 13 · 13.5–14 (body) · 15 (chat/messages) · 16 (wordmark) · 18 (modal title) · 21–24 (auth). Weights 400/500/600. Headings carry `-0.2 to -0.5px` tracking.

**Spacing** — 4px base grid (4/8/12/16/20/24/28). Comfortable density: row padding `8px 12px`, pane gutters `16px`, message gap `14px`.

**Radii** — 6 (chips) · 7–8 (menu items, small buttons) · 9 (rows) · 10 (inputs, new-project) · 11 (toolbar) · 12 (nodes, menus, composer-ish) · 14 (composer, user bubble=16) · 16 (modal, user bubble) · 18 (auth card) · 999 (send/stop circles, fold badge, context pills).

**Shadows — "soft" ladder (the locked elevation):**
- resting card: `0 1px 2px rgba(17,24,39,0.04)`
- node at rest: `0 2px 6px rgba(17,24,39,0.08), 0 1px 2px rgba(17,24,39,0.04)`
- **node on hover (lifted):** `0 6px 16px rgba(17,24,39,0.12), 0 2px 4px rgba(17,24,39,0.06)`
- menu/popover: `0 10px 28px rgba(17,24,39,0.12), 0 2px 6px rgba(17,24,39,0.06)`
- toolbar: `0 1px 4px rgba(17,24,39,0.06)`
- modal: `0 24px 60px rgba(0,0,0,0.18)` · toast: `0 4px 16px rgba(0,0,0,0.12)`

**Motion** — ease `cubic-bezier(0.4,0,0.2,1)`; hover spring `cubic-bezier(0.34,1.2,0.64,1)`; durations 120ms (color), 200ms (hover transform), 300ms (toast), spinner 0.75s linear.

## Assets
- **Icons:** [Lucide](https://lucide.dev) line icons. The repo should depend on `lucide-react` (or equivalent) rather than the CDN used by the prototype. Icons used: `git-fork, git-branch, circle-dot, pencil, scissors, trash-2, minimize-2, maximize-2, arrow-up, settings, pin, plus, more-horizontal, panel-left, panel-left-close, share-2, crosshair, message-square, message-square-plus, mouse-pointer-click, folder-plus, chevron-right`.
- **Logo:** none — Graphi's mark is the **wordmark** plus the blue `git-fork` square shown on the sidebar/auth. No raster logo exists.
- **Fonts:** none bundled; system stack + Inter fallback (Google Fonts).

## Files in this package
```
design_handoff_graphi_refined/
├─ README.md                      ← this spec (self-sufficient)
└─ reference_prototype/           ← runnable reference (serve over HTTP, open "Polish Lab.html")
   ├─ Polish Lab.html
   ├─ colors_and_type.css         ← design tokens (CSS variables)
   ├─ polish/
   │  ├─ PolishApp.jsx            ← state orchestration + auth + tweak wiring
   │  ├─ PolishSidebar.jsx
   │  ├─ PolishCanvas.jsx         ← tidy-tree layout, node states, glow, hover-lift
   │  ├─ PolishChat.jsx           ← context tray, messages, composer/Grip
   │  ├─ polish-core.jsx          ← tokens helpers, EmptyState
   │  └─ tweaks-panel.jsx         ← exploration panel (not part of the product)
   └─ ui_kits/app/
      ├─ theme.js                 ← GTheme tokens + GIcon (Lucide) helper
      ├─ data.js                  ← fake sample tree/messages
      ├─ NodeMenu.jsx
      └─ Modals.jsx               ← AuthPage(unused here), NewProjectModal, Toasts
```

> **Scope reminder:** implement only the **locked baseline**. The Tweaks panel's non-default options (detailed nodes, document chat, icon rail, lines/plain backdrop, flat/lifted base elevation, compact density) are design exploration and are **not** part of this handoff.
