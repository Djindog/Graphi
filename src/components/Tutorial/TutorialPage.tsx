import { useState } from 'react';
import { X } from 'lucide-react';

// ── Shared visual primitives ──────────────────────────────────────────────────

function NodeBox({ label, active = false, dim = false, small = false, danger = false, selected = false }: {
  label: string; active?: boolean; dim?: boolean; small?: boolean; danger?: boolean; selected?: boolean;
}) {
  const borderColor = danger ? '#FCA5A5' : selected ? '#2563EB' : active ? '#2563EB' : '#E5E7EB';
  const bg = danger ? '#FEF2F2' : selected ? '#EFF6FF' : active ? '#EFF6FF' : dim ? '#F9FAFB' : '#fff';
  const textColor = danger ? '#EF4444' : selected ? '#1D4ED8' : active ? '#1D4ED8' : dim ? '#9CA3AF' : '#111827';
  const strokeWidth = selected ? 4 : 1.5;
  const opacity = dim ? 0.4 : 1;
  return (
    <div style={{
      width: small ? 120 : 168, height: small ? 30 : 58,
      borderRadius: 12, border: `${strokeWidth}px solid ${borderColor}`,
      background: bg, opacity,
      boxShadow: (active || selected) ? '0 0 0 3px #DBEAFE, 0 2px 6px rgba(17,24,39,0.08)' : '0 2px 6px rgba(17,24,39,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px',
      fontSize: small ? 11 : 13, fontWeight: selected ? 700 : 500,
      color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>{label}</div>
  );
}

function VLine({ height = 24, color = '#E5E7EB' }: { height?: number; color?: string }) {
  return <div style={{ width: 2, height, background: color, margin: '0 auto' }} />;
}

function Chip({ label, active = true }: { label: string; active?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '7px 12px', borderRadius: 999,
      border: `1px solid ${active ? '#2563EB' : '#E5E7EB'}`,
      background: active ? '#EFF6FF' : '#fff',
      fontSize: 12, fontWeight: active ? 500 : 400,
      color: active ? '#1D4ED8' : '#6B7280',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: active ? '#2563EB' : 'transparent',
        border: active ? 'none' : '1.5px solid #D1D5DB',
      }} />
      {label}
    </div>
  );
}

function KeyBadge({ k }: { k: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 28, height: 26, padding: '0 7px',
      background: '#F9FAFB', border: '1px solid #E5E7EB',
      borderBottom: '2px solid #D1D5DB',
      borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#374151',
      fontFamily: 'monospace',
    }}>{k}</span>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, minWidth: 160 }}>
        {keys.map((k, i) => <KeyBadge key={i} k={k} />)}
      </div>
      <span style={{ fontSize: 13, color: '#374151' }}>{description}</span>
    </div>
  );
}

function TipBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#F0F9FF', border: '1px solid #BAE6FD',
      borderRadius: 8, padding: '10px 14px',
      fontSize: 13, color: '#0369A1', lineHeight: 1.6, ...style,
    }}>{children}</div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: '#9CA3AF',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 10, marginTop: 28,
    }}>{children}</div>
  );
}

function Row({ label, desc, danger = false, minW = 140 }: { label: string; desc: string; danger?: boolean; minW?: number }) {
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: danger ? '#EF4444' : '#111827', minWidth: minW, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#6B7280' }}>{desc}</span>
    </div>
  );
}

// ── Visuals ───────────────────────────────────────────────────────────────────

function VisualCanvasInteraction() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 380 }}>
      {[
        { action: 'Click', result: 'Select node → open its thread in chat pane', color: '#374151' },
        { action: 'Click (current node)', result: 'Toggle context highlight visibility', color: '#374151' },
        { action: 'Ctrl + Click', result: 'Add/remove node from context (no navigation)', color: '#2563EB' },
        { action: 'Double-click', result: 'Navigate + center canvas on that node', color: '#374151' },
        { action: 'Long press + drag', result: 'Reorder siblings (200ms hold to enter drag mode)', color: '#374151' },
        { action: 'Right-click drag', result: 'Pan the canvas', color: '#374151' },
        { action: 'Scroll / pinch', result: 'Zoom in and out (0.15× – 4×)', color: '#374151' },
        { action: 'Click background', result: 'Deselect current node', color: '#374151' },
      ].map(item => (
        <div key={item.action} style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'flex-start' }}>
          <span style={{ fontWeight: 600, color: item.color, minWidth: 140, flexShrink: 0 }}>{item.action}</span>
          <span style={{ color: '#6B7280' }}>{item.result}</span>
        </div>
      ))}
    </div>
  );
}

function VisualBranching() {
  return (
    <div style={{ display: 'flex', gap: 36, alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>Before</div>
        <NodeBox label="Exploring approaches" />
        <VLine height={14} />
        <NodeBox label="Approach A" small />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
        <div style={{ fontSize: 20, color: '#9CA3AF' }}>→</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>After Branch</div>
        <NodeBox label="Exploring approaches" />
        <VLine height={14} />
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <VLine height={14} />
            <NodeBox label="Approach A" small />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <VLine height={14} />
            <NodeBox label="Approach B" active small />
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualNodeTools() {
  const tools: { label: string; desc: string; danger?: boolean; muted?: boolean }[] = [
    { label: 'Branch', desc: 'Create child node' },
    { label: 'Rename', desc: 'Edit name inline' },
    { label: 'Fold / Unfold', desc: 'Collapse subtree' },
    { label: 'Remove (Keep Children)', desc: 'Delete node only', danger: true },
    { label: 'Delete Subtree', desc: 'Delete all descendants', danger: true },
    { label: 'Transplant', desc: 'Copy to another project', muted: true },
  ];
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <NodeBox label="My node" selected />
        <div style={{ fontSize: 11, color: '#9CA3AF' }}>hover → ···</div>
      </div>
      <div style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: 4, minWidth: 200,
      }}>
        {tools.map((t, i) => (
          <div key={t.label}>
            {(i === 3 || i === 5) && <div style={{ height: 1, background: '#F3F4F6', margin: '3px 0' }} />}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 9, fontSize: 12,
              color: t.danger ? '#EF4444' : t.muted ? '#9CA3AF' : '#111827',
            }}>
              <span style={{ fontWeight: 500 }}>{t.label}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{t.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualLineage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 600, marginBottom: 8, background: '#EFF6FF', padding: '3px 10px', borderRadius: 20 }}>Lineage — auto-included</div>
      <NodeBox label="Project planning" active />
      <VLine height={14} color="#2563EB" />
      <NodeBox label="Backend" active />
      <VLine height={14} color="#2563EB" />
      <NodeBox label="FastAPI design" active />
      <VLine height={14} color="#2563EB" />
      <div style={{ position: 'relative' }}>
        <NodeBox label="Current node" selected />
        <div style={{ position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 10, fontSize: 11, color: '#2563EB', whiteSpace: 'nowrap', fontWeight: 600 }}>← you are here</div>
      </div>
      <VLine height={14} />
      <NodeBox label="Other branch" dim />
    </div>
  );
}

function VisualGrip() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 400 }}>
      {/* Grip level selector (matches actual UI) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '6px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <span style={{ fontSize: 12, color: '#9CA3AF', marginRight: 2 }}>⊕ Grip</span>
        {(['off', 'low', 'mid', 'high'] as const).map(l => (
          <div key={l} style={{
            padding: '4px 9px', fontSize: 12, borderRadius: 7, fontWeight: l === 'mid' ? 500 : 400,
            background: l === 'mid' ? '#111827' : 'transparent',
            color: l === 'mid' ? '#fff' : '#9CA3AF',
          }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>As you type…</div>
          <div style={{ padding: '8px 12px', background: '#fff', border: '1.5px solid #2563EB', borderRadius: 8, fontSize: 12, color: '#111827', boxShadow: '0 0 0 3px #EFF6FF' }}>async DB queries</div>
        </div>
        <div style={{ fontSize: 18, color: '#9CA3AF' }}>→</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NodeBox label="Python async notes" active small />
            <div style={{ fontSize: 11, background: '#DCFCE7', color: '#16A34A', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>0.82 ✓</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NodeBox label="DB connection setup" active small />
            <div style={{ fontSize: 11, background: '#DCFCE7', color: '#16A34A', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>0.74 ✓</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NodeBox label="FastAPI router" dim small />
            <div style={{ fontSize: 11, background: '#F3F4F6', color: '#9CA3AF', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>0.63 ✗</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#6B7280' }}>mid (≥ 0.7) → top 2 nodes pulled into context</div>
    </div>
  );
}

function VisualChips() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360 }}>
      {/* Context panel (matches ContextSummary) */}
      <div style={{
        background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14,
        padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Context</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
          <Chip label="Project planning" active />
          <Chip label="Backend" active />
          <Chip label="Python async" active />
          <Chip label="FastAPI design" active={false} />
          {/* ✕ button */}
          <div style={{
            width: 30, height: 30, borderRadius: 999, border: '1.5px solid #E5E7EB',
            background: '#fff', color: '#9CA3AF', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, fontWeight: 600,
          }}>✕</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#6B7280', alignItems: 'center' }}>
          <Chip label="Active" active />
          <span>included · click to deactivate</span>
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#6B7280', alignItems: 'center' }}>
          <Chip label="Inactive" active={false} />
          <span>excluded · click to restore</span>
        </div>
      </div>
    </div>
  );
}

function VisualSiblingNav() {
  return (
    <div style={{ position: 'relative', width: 280, height: 180, flexShrink: 0 }}>
      <div style={{
        width: '100%', height: '100%', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', fontSize: 13, fontWeight: 600, color: '#111827' }}>Current node</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>conversation...</div>
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA', borderRadius: '0 0 10px 10px' }}>
          <div style={{ height: 28, background: '#F3F4F6', borderRadius: 6 }} />
        </div>
      </div>
      {/* Left button — prev sibling exists */}
      <div style={{
        position: 'absolute', left: -17, top: '50%', transform: 'translateY(-50%)',
        width: 34, height: 34, borderRadius: '50%', border: '1.5px solid #111827', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: 14, color: '#374151',
      }}>←</div>
      {/* Right button — no next sibling (shows +) */}
      <div style={{
        position: 'absolute', right: -17, top: '50%', transform: 'translateY(-50%)',
        width: 34, height: 34, borderRadius: '50%', border: '1.5px solid #E5E7EB', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.12)', fontSize: 14, color: '#374151',
      }}>+</div>
      <div style={{ position: 'absolute', left: -17, top: 'calc(50% + 28px)', fontSize: 10, color: '#6B7280', whiteSpace: 'nowrap' }}>prev sibling</div>
      <div style={{ position: 'absolute', right: -17, top: 'calc(50% + 28px)', fontSize: 10, color: '#6B7280', whiteSpace: 'nowrap', textAlign: 'right' }}>new sibling</div>
    </div>
  );
}

function VisualLayout() {
  return (
    <div style={{ display: 'flex', gap: 0, height: 140, border: '1.5px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ width: 60, background: '#F9FAFB', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', padding: 8, gap: 6 }}>
        <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>SIDEBAR</div>
        <div style={{ height: 14, background: '#E5E7EB', borderRadius: 4 }} />
        <div style={{ height: 14, background: '#E5E7EB', borderRadius: 4, opacity: 0.5 }} />
        <div style={{ height: 14, background: '#DBEAFE', borderRadius: 4 }} />
      </div>
      <div style={{ flex: 1, background: '#F0F2F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, position: 'relative' }}>
        <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>CANVAS (dot grid)</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 60, height: 18, background: '#fff', borderRadius: 6, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }} />
          <div style={{ width: 1.5, height: 10, background: '#E5E7EB' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 50, height: 18, background: '#EFF6FF', borderRadius: 6, border: '1.5px solid #2563EB' }} />
            <div style={{ width: 50, height: 18, background: '#fff', borderRadius: 6, border: '1px solid #E5E7EB' }} />
          </div>
        </div>
        {/* Eye + Tree/Force toolbar */}
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#2563EB' }}>👁</div>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 7, padding: '2px 5px', fontSize: 9, color: '#111827', fontWeight: 600 }}>tree</div>
          <div style={{ background: 'transparent', borderRadius: 7, padding: '2px 5px', fontSize: 9, color: '#9CA3AF' }}>force</div>
        </div>
      </div>
      <div style={{ width: 6, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'col-resize' }}>
        <div style={{ width: 2, height: 28, background: '#9CA3AF', borderRadius: 2 }} />
      </div>
      <div style={{ width: 120, background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '6px 8px', borderBottom: '1px solid #F3F4F6', fontSize: 9, fontWeight: 600, color: '#111827' }}>CHAT PANE</div>
        <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ alignSelf: 'flex-end', height: 12, width: 60, background: '#EFF6FF', borderRadius: 4 }} />
          <div style={{ alignSelf: 'flex-start', height: 12, width: 80, background: '#F3F4F6', borderRadius: 4 }} />
        </div>
        <div style={{ padding: 6, borderTop: '1px solid #F3F4F6' }}>
          <div style={{ height: 20, background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB' }} />
        </div>
      </div>
    </div>
  );
}

// ── Feature definitions ───────────────────────────────────────────────────────

interface Feature { id: string; label: string; visual: React.ReactNode; description: React.ReactNode; }

const FEATURES: Feature[] = [
  {
    id: 'canvas-interaction',
    label: 'Canvas Interactions',
    visual: <VisualCanvasInteraction />,
    description: (
      <>
        <p>Nodes respond differently depending on how you interact with them.</p>
        <SectionLabel>Click behaviors</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Row label="Click" desc="Select node and open its thread. If it's already selected, toggles context highlight visibility instead." minW={150} />
          <Row label="Ctrl + Click" desc="Add or remove a node from the active context without navigating away from the current node." minW={150} />
          <Row label="Double-click" desc="Navigate to the node and center the canvas on it." minW={150} />
          <Row label="Click background" desc="Deselect the current node (clears the chat pane)." minW={150} />
        </div>
        <SectionLabel>Drag to reorder siblings</SectionLabel>
        <p style={{ fontSize: 14 }}>Hold a node for <strong>200ms</strong>, then drag left or right to reorder it among its siblings. A ghost preview and drop-indicator lines appear during the drag. Release to confirm.</p>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 6 }}>
          <KeyBadge k="Ctrl" /><KeyBadge k="Z" />
          <span style={{ fontSize: 13, color: '#6B7280', marginLeft: 6 }}>Undo the last sibling reorder</span>
        </div>
        <SectionLabel>Node hover</SectionLabel>
        <p style={{ fontSize: 14 }}>Hovering a node expands it to show the full title and reveals the <strong>···</strong> dot menu button on the right side.</p>
        <SectionLabel>Canvas toolbar (top-right)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Row label="👁 Eye button" desc="Toggle context highlighting on the canvas" minW={130} />
          <Row label="tree / force" desc="Switch between hierarchical tree layout and physics-based force layout" minW={130} />
        </div>
        <TipBox>Hold the <strong>Ctrl</strong> key at any time to temporarily reveal context highlighting on the canvas — release to hide it again.</TipBox>
      </>
    ),
  },
  {
    id: 'branching',
    label: 'Branching',
    visual: <VisualBranching />,
    description: (
      <>
        <p>Use <strong>Branch</strong> when you want to explore a different direction from the same context. A new child node is created and the parent's conversation flows in as background context.</p>
        <SectionLabel>How to branch</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', flexShrink: 0, display: 'inline-block' }} />
            Hover a node → click <strong>···</strong> → <strong>Branch</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', flexShrink: 0, display: 'inline-block' }} />
            <KeyBadge k="Ctrl" /> + <KeyBadge k="Shift" /> + <KeyBadge k="↓" /> — keyboard shortcut
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'tools',
    label: 'Node Tools',
    visual: <VisualNodeTools />,
    description: (
      <>
        <p>Hover a node and click <strong>···</strong> to open the tool menu.</p>
        <SectionLabel>Tools</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row label="Branch" desc="Create a new child node. The new node opens automatically in the chat pane." minW={180} />
          <Row label="Rename" desc="Edit the node name inline. Confirm with Enter, cancel with Escape." minW={180} />
          <Row label="Fold / Unfold" desc="Collapse or expand the subtree below this node. Folded nodes show a blue count badge." minW={180} />
          <Row label="Remove (Keep Children)" desc="Delete this node only — its children are reparented to this node's parent." danger minW={180} />
          <Row label="Delete Subtree" desc="Permanently delete this node and all descendants. A confirmation dialog appears first." danger minW={180} />
          <Row label="Transplant" desc="Copy this node and its subtree into a different project. A submenu lets you pick the target." minW={180} />
        </div>
        <TipBox style={{ marginTop: 16 }}>Hovering over <strong>Remove</strong> or <strong>Delete Subtree</strong> highlights the affected nodes in red on the canvas before you confirm.</TipBox>
      </>
    ),
  },
  {
    id: 'lineage',
    label: 'Lineage Context',
    visual: <VisualLineage />,
    description: (
      <>
        <p>When you select a node, <strong>all ancestors back to the root</strong> are automatically included in context. The AI sees not just the current thread, but the full chain of reasoning that led here.</p>
        <p>Ancestor chips appear in the context panel at the top of the chat pane. You can deactivate any of them by clicking the chip.</p>
        <TipBox>The deeper the node, the richer the background context the AI receives — ideal for layered, iterative explorations.</TipBox>
      </>
    ),
  },
  {
    id: 'grip',
    label: 'Auto Context',
    visual: <VisualGrip />,
    description: (
      <>
        <p>As you type, Graphi automatically pulls in relevant nodes from across the project in two ways:</p>
        <SectionLabel>Referenced nodes</SectionLabel>
        <p style={{ fontSize: 14 }}>If you mention a node name in your message, that node is automatically added to context. No special syntax needed — just use the name naturally. Detection runs 500ms after you stop typing.</p>
        <SectionLabel>Grip — semantic search</SectionLabel>
        <p style={{ fontSize: 14 }}>Graphi also embeds your message with Jina AI and runs a <strong>vector similarity search</strong> across all nodes. Semantically related nodes are pulled in even if you didn't name them.</p>
        <p style={{ fontSize: 14 }}>The <strong>Grip</strong> selector in the chat input controls the similarity threshold.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { level: 'off', desc: 'No similarity search' },
            { level: 'low', desc: 'Similarity ≥ 0.5 · up to 15 nodes' },
            { level: 'mid', desc: 'Similarity ≥ 0.7 · up to 8 nodes  (default)' },
            { level: 'high', desc: 'Similarity ≥ 0.9 · up to 3 nodes' },
          ].map(g => (
            <div key={g.level} style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'flex-start' }}>
              <span style={{
                padding: '1px 7px', borderRadius: 5, fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 1,
                background: g.level === 'mid' ? '#111827' : '#F3F4F6',
                color: g.level === 'mid' ? '#fff' : '#6B7280',
              }}>{g.level}</span>
              <span style={{ color: '#6B7280' }}>{g.desc}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'chips',
    label: 'Managing Context',
    visual: <VisualChips />,
    description: (
      <>
        <p>The <strong>Context</strong> panel below the node header shows exactly which nodes the AI will reference when you send. You have full control.</p>
        <SectionLabel>Controls</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Row label="Click blue chip" desc="Deactivate — node stays visible in the panel but is excluded from the prompt." minW={130} />
          <Row label="Click grey chip" desc="Reactivate — node is included again." minW={130} />
          <Row label="✕ button" desc="Deactivate all context nodes at once." minW={130} />
          <Row label="↺ button" desc="Restore all context (replaces ✕ when everything is cleared)." minW={130} />
          <Row label="👁 in header" desc="Toggle the context panel open/closed." minW={130} />
          <Row label="Ctrl + Click node" desc="Toggle any canvas node in/out of context without navigating." minW={130} />
        </div>
        <TipBox style={{ marginTop: 12 }}>After sending, referenced and grip-recommended chips clear automatically. Lineage chips persist until you switch nodes.</TipBox>
      </>
    ),
  },
  {
    id: 'sibling-nav',
    label: 'Sibling Navigation',
    visual: <VisualSiblingNav />,
    description: (
      <>
        <p>Hover the <strong>left or right edge</strong> of the chat pane to reveal navigation buttons. These float at the vertical midpoint and respond to your mouse position.</p>
        <SectionLabel>Button behavior</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { icon: '←', desc: 'Previous sibling exists → navigate to it' },
            { icon: '→', desc: 'Next sibling exists → navigate to it' },
            { icon: '+', desc: 'No sibling in that direction → create a new sibling and open it' },
          ].map(item => (
            <div key={item.icon} style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', border: '1px solid #E5E7EB', background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}>{item.icon}</div>
              <span style={{ color: '#6B7280' }}>{item.desc}</span>
            </div>
          ))}
        </div>
        <TipBox>The buttons don't appear when hovering over the chat input area at the bottom.</TipBox>
        <SectionLabel>Keyboard shortcuts</SectionLabel>
        <div style={{ width: '100%' }}>
          <ShortcutRow keys={['Ctrl', '↑']} description="Go to parent (saves current position to stack)" />
          <ShortcutRow keys={['Ctrl', '↓']} description="Return from stack, or go to first child" />
          <ShortcutRow keys={['Ctrl', '←']} description="Go to previous sibling (or create one)" />
          <ShortcutRow keys={['Ctrl', '→']} description="Go to next sibling (or create one)" />
        </div>
        <TipBox style={{ marginTop: 12 }}><strong>Ctrl+↑ then Ctrl+↓</strong> uses an internal stack: ↑ saves your position, then ↓ returns you there. Useful for quickly checking a parent and jumping back.</TipBox>
      </>
    ),
  },
  {
    id: 'layout',
    label: 'Layout & Panels',
    visual: <VisualLayout />,
    description: (
      <>
        <p>Graphi has three panels: <strong>Sidebar / Canvas / Chat pane</strong>. All three can be resized or hidden.</p>
        <SectionLabel>Layout controls</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Row label="Drag divider" desc="Resize the canvas and chat pane. Minimum chat width is 240px." minW={150} />
          <Row label="Double-click divider" desc="Hide the canvas entirely — chat pane fills the space." minW={150} />
          <Row label="Drag left handle" desc="Restore the canvas after it's been hidden (drag right)." minW={150} />
          <Row label="Double-click left handle" desc="Instantly restore the canvas." minW={150} />
          <Row label="Sidebar arrow" desc="Collapse the sidebar to icon-only mode (48px wide)." minW={150} />
        </div>
      </>
    ),
  },
];

// ── Main component ─────────────────────────────────────────────────────────────

export function TutorialPage({ onClose, onStartInteractive }: { onClose: () => void; onStartInteractive?: () => void }) {
  const [selectedId, setSelectedId] = useState(FEATURES[0].id);
  const feature = FEATURES.find(f => f.id === selectedId) ?? FEATURES[0];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 940, height: '90vh',
        background: '#fff', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid #F3F4F6', flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>Tutorial</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onStartInteractive && (
              <button
                onClick={onStartInteractive}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: '#F97316', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'opacity 0.12s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                ▶ Start Tutorial
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB',
                background: '#fff', color: '#6B7280', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#111827'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6B7280'; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Feature list */}
          <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid #F3F4F6', overflowY: 'auto', padding: '12px 8px' }}>
            {FEATURES.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: f.id === selectedId ? 600 : 400,
                  background: f.id === selectedId ? '#EFF6FF' : 'transparent',
                  color: f.id === selectedId ? '#1D4ED8' : '#374151',
                  transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (f.id !== selectedId) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={e => { if (f.id !== selectedId) e.currentTarget.style.background = 'transparent'; }}
              >
                {f.id === selectedId && <span style={{ width: 3, height: 14, borderRadius: 2, background: '#2563EB', flexShrink: 0 }} />}
                {f.label}
              </button>
            ))}
          </div>

          {/* Feature content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
            <div style={{
              background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 12,
              padding: '32px 24px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: 28, minHeight: 160,
            }}>
              {feature.visual}
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>
              {feature.label}
            </h3>
            <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {feature.description}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 20, borderTop: '1px solid #F3F4F6' }}>
              {(() => {
                const idx = FEATURES.findIndex(f => f.id === selectedId);
                const prev = FEATURES[idx - 1];
                const next = FEATURES[idx + 1];
                return (
                  <>
                    {prev ? (
                      <button onClick={() => setSelectedId(prev.id)}
                        style={{ fontSize: 13, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
                      >← {prev.label}</button>
                    ) : <span />}
                    {next && (
                      <button onClick={() => setSelectedId(next.id)}
                        style={{ fontSize: 13, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#111827')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
                      >{next.label} →</button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
