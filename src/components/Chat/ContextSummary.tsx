import { useState } from 'react';
import type { Node } from '../../types';


interface Props {
  ancestors: Node[];
  referencedIds: string[];
  recommendedIds: string[];
  activeIds: string[];
  nodeMap: Map<string, Node>;
  onToggle: (nodeId: string) => void;
  onClearAll: () => void;
  onReinit: () => void;
}

export function ContextSummary({ ancestors, referencedIds, recommendedIds, activeIds, nodeMap, onToggle, onClearAll, onReinit }: Props) {
  const [tooltip, setTooltip] = useState(false);
  const isActive = (id: string) => activeIds.includes(id);
  const allIds = [...new Set([...ancestors.map(n => n.id), ...referencedIds, ...recommendedIds])];
  const allCleared = allIds.length > 0 && activeIds.length === 0;

  const Chip = ({ id }: { id: string }) => {
    const node = nodeMap.get(id);
    if (!node) return null;
    const active = isActive(id);
    return (
      <button
        onClick={() => onToggle(id)}
        title={active ? 'Click to deactivate' : 'Click to reactivate'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
          maxWidth: 200, overflow: 'hidden',
          background: active ? '#EFF6FF' : '#fff',
          border: `1px solid ${active ? '#2563EB' : '#E5E7EB'}`,
          color: active ? '#1D4ED8' : '#6B7280',
          fontWeight: active ? 500 : 400,
          transition: 'all 0.12s',
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: active ? '#2563EB' : 'transparent',
          border: active ? 'none' : '1.5px solid #D1D5DB',
        }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title || 'Untitled'}
        </span>
      </button>
    );
  };

  return (
    <div style={{
      padding: '12px 16px 10px',
      background: '#fff',
      borderRadius: '0 0 14px 14px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
      borderLeft: '1px solid rgba(0,0,0,0.06)',
      borderRight: '1px solid rgba(0,0,0,0.06)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', margin: '0 0 9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Context
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
        {allIds.map(id => <Chip key={id} id={id} />)}

        {/* Clear / Reinit chip */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={allCleared ? onReinit : onClearAll}
            onMouseEnter={() => setTooltip(true)}
            onMouseLeave={() => setTooltip(false)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 999, cursor: 'pointer',
              border: allCleared ? '1.5px solid #2563EB' : '1.5px solid #E5E7EB',
              background: allCleared ? '#EFF6FF' : '#fff',
              color: allCleared ? '#2563EB' : '#9CA3AF',
              fontSize: 14, fontWeight: 600,
              transition: 'all 0.12s',
              fontFamily: 'inherit',
            }}
          >
            {allCleared ? '↺' : '✕'}
          </button>
          {tooltip && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
              background: '#111827', color: '#fff', fontSize: 12, fontWeight: 500,
              padding: '5px 10px', borderRadius: 7, whiteSpace: 'nowrap',
              pointerEvents: 'none', zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              {/* Triangle pointing up */}
              <div style={{
                position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderBottom: '5px solid #111827',
              }} />
              {allCleared ? 'Restore context' : 'Deselect all context'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
