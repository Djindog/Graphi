# Branching Guidance — Open Questions & Clarifications

## Before We Code

Below are clarifications on design details. Please review and confirm so we implement precisely as you envision.

---

## Remedy 1: Message Count

### Q1: Exact Styling — What Hex Colors?
**Current spec:**
- Default (0–14 messages): `text-gray-500` (gray text)
- Threshold (15+): Yellow background + dark text

**Need to confirm:**
- Default text color: `rgb(107, 114, 128)` ✓ (gray-500)
- Threshold background: `rgb(255, 251, 235)` [#FFFBF0] — light cream/yellow?
- Threshold text: `rgb(78, 70, 0)` — dark mustard?
- Should colors match Tailwind palette exactly, or are these custom?

**Suggestion:** Use Tailwind `bg-yellow-100` + `text-yellow-900` for consistency.

### Q2: Tooltip Styling — Where Should It Appear?
**Current spec:** Dark background, white text, appears below the count on hover

**Options:**
- **A (current):** Below the count, centered (looks like small label)
- **B:** Above the count (might cover header)
- **C:** To the right of the count (horizontal space required)
- **D:** No tooltip, just highlight the count with different color (simpler)

**Recommendation:** Stick with **A (below, centered)**. Clearest and doesn't interfere with header.

### Q3: Should Clicking the Count Do Anything When < 15?
**Current spec:** Click only works at 15+

**Options:**
- **A (current):** Non-interactive when < 15 (cursor default, no click action)
- **B:** Always clickable, shows Fork menu even at low message counts

**Recommendation:** Stick with **A**. Keeps it simple; tooltip only appears at threshold.

---

## Remedy 2: Branch Reminder Bar

### Q4: Reminder Appearance Frequency — Show Again?
**Current spec:**
- Appears when messages >= 15
- User can close (×) or dismiss permanently ("Don't show again")
- If just closed, can it re-appear?

**Options:**
- **A:** Bar appears once, then user must close/dismiss (doesn't re-appear)
- **B:** Bar appears when user sends message #16, again at #20, etc. (repeating at intervals)
- **C:** Bar appears once per session; after dismiss, never shows again that session

**Recommendation:** **B** — Show after every 5 new messages (15, 20, 25, etc.) UNLESS user clicked "don't show again". This keeps nudging without being annoying.

**Implementation logic:**
```
if (messages.length >= 15 && 
    messages.length % 5 === 0 && 
    !branchReminderDismissed) {
  show bar
}
```

---

### Q5: Bar Dismissal Behavior — Clear on Success?
**Current spec:** Close button hides, "don't show again" hides + persists

**Question:** When user clicks Fork and successfully branches, should the reminder bar automatically close?

**Options:**
- **A (auto-close):** After fork completes, bar hides automatically
- **B (manual):** User must manually close or dismiss bar; it persists until they do
- **C (context-dependent):** Bar closes when user navigates away from the node

**Recommendation:** **A** — After fork, the user moves to a new node with 0 messages (doesn't trigger bar anyway). Auto-close feels natural.

---

### Q6: Bar Text — Wording Exact?
**Current spec:**
"This thread is getting long. Consider starting a new branch for related but distinct topics."

**Alternatives:**
- "This thread is getting long. Consider branching for a focused sub-topic."
- "Lots of messages here. Would you like to start a new branch?"
- "This node is getting long. Branch to explore a specific aspect."

**Recommendation:** Keep current. Clear, neutral, actionable, doesn't assume fault.

---

### Q7: Bar Actions — Additional Buttons?
**Current spec:** Close (×) button + "Don't show again" link

**Options:**
- **A (current):** Just close + don't show again
- **B:** Add "Branch Now" button that directly triggers Fork
- **C:** Add link to context (e.g., "Learn more about branching")

**Recommendation:** **A** is good. Keep minimal. If user wants to branch, they have:
1. Click Remedy 1 (message count)
2. Use existing Fork button
3. Both options are clear enough without a button in the bar itself

---

## Integration Questions

### Q8: State Persistence — Session or DB?
**Current spec:** `branchReminderDismissed` is session-only (localStorage, resets on reload)

**Options:**
- **A (current):** Session only (localStorage)
- **B:** Persistent (Supabase — saves to DB, survives reload/new device)

**Recommendation:** **A** for now (simpler, less DB calls). If users request persistent settings later, add it then.

---

### Q9: Order of Elements in Chat Pane — Confirmed?
**Updated spec:**
```
1. Node Header (with message count)
2. Context Summary (if visible)
3. Message List Container
   ├─ Branch Reminder Bar (hovering pill, inside container)
   └─ Scrollable Message List
4. Grip Selector + Input
```

**Position confirmed:** Pill-shaped bar hovering at top of message list, below context summary ✓

---

### Q10: Mobile Responsiveness — Any Special Handling?
**Current spec:** Both Remedy 1 + 2 should work on mobile (responsive Tailwind)

**Question:** On narrow screens (< 400px), should:
- Message count wrap to next line in header? (probably not, keep single line)
- Reminder bar stack vertically? (× above, "don't show again" below?)
- Or always stay horizontal with smaller padding/fonts?

**Recommendation:** Keep horizontal, reduce padding/font-size on mobile. Use media queries if needed.

---

## Remedy 3 (Deferred) — Clarification for Future

When you're ready to implement Remedy 3, we'll need to clarify:

### Q11: Node Summary — What Depth?
"Summarize the current node until the current question"

**Questions:**
- Does this mean: Summarize all messages in the node up to the user's latest message? ✓
- Or: Just the most recent N messages (sliding window)?
- Or: Whole node summary + context of current message?

### Q12: Summary Frequency — Generate When?
- After every message? (expensive)
- Only on-demand (when checking for drift)? (lighter)
- Once per node, updated periodically? (simple)

### Q13: Drift Threshold — What Similarity Score?
- Cosine similarity < 0.6 = drift?
- < 0.5 = drift?
- Other metric?

We'll nail these down before coding Remedy 3.

---

## Confirmation Checklist

Please confirm (or suggest changes to):

- [ ] **Q1**: Color palette for count styling
- [ ] **Q2**: Tooltip position (below count)
- [ ] **Q3**: Count non-interactive until 15
- [ ] **Q4**: Bar repeats every 5 messages (15, 20, 25...)
- [ ] **Q5**: Bar auto-closes after fork success
- [ ] **Q6**: Bar wording is neutral + clear
- [ ] **Q7**: Bar has no extra action buttons
- [ ] **Q8**: Dismissal state is session-only (localStorage)
- [ ] **Q9**: Element order (header → bar → messages → input)
- [ ] **Q10**: Mobile uses responsive design (no special handling needed)

---

## Next Steps

1. **Review and confirm above answers**
2. **I'll start implementation** with:
   - Remedy 1 (message count + tooltip)
   - Remedy 2 (reminder bar)
3. **Testing** to ensure both work seamlessly
4. **Final review** before merge

Ready when you are! 🚀
