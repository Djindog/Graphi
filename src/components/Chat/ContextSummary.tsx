import { useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { Tooltip } from '../Tooltip';
import { NodeTopics } from './NodeTopics';
import type { Node, Message } from '../../types';
import type Groq from 'groq-sdk';

interface ChipProps {
  id: string;
  nodeMap: Map<string, Node>;
  activeIds: string[];
  lockedActiveIds: string[];
  lockedDeactivatedIds: string[];
  onToggle: (id: string) => void;
  onToggleLock: (id: string) => void;
}

function Chip({ id, nodeMap, activeIds, lockedActiveIds, lockedDeactivatedIds, onToggle, onToggleLock }: ChipProps) {
  const [hovered, setHovered] = useState(false);
  const node = nodeMap.get(id);
  if (!node) return null;

  const active = activeIds.includes(id);
  const isLockedActive = lockedActiveIds.includes(id);
  const isLockedDeactivated = lockedDeactivatedIds.includes(id);
  const isLocked = isLockedActive || isLockedDeactivated;
  const showLock = hovered || isLocked;

  const tooltipContent = isLocked
    ? 'Locked'
    : active
    ? 'Exclude from context'
    : 'Include in context';

  return (
    <Tooltip placement="top" content={tooltipContent}>
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => { if (!isLocked) onToggle(id); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', borderRadius: 999, fontSize: 13,
          maxWidth: 220, overflow: 'hidden',
          background: active ? '#EFF6FF' : '#fff',
          border: `1px solid ${isLocked ? (isLockedActive ? '#2563EB' : '#D1D5DB') : (active ? '#2563EB' : '#E5E7EB')}`,
          color: active ? '#1D4ED8' : '#6B7280',
          fontWeight: active ? 500 : 400,
          transition: 'all 0.12s',
          fontFamily: 'inherit',
          flexShrink: 0,
          cursor: isLocked ? 'default' : 'pointer',
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
        {showLock && (
          <span
            onClick={(e) => { e.stopPropagation(); onToggleLock(id); }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 14, height: 14, flexShrink: 0, cursor: 'pointer',
              color: isLockedActive ? '#2563EB' : (isLockedDeactivated ? '#9CA3AF' : '#D1D5DB'),
              borderRadius: 3,
              transition: 'color 0.12s',
            }}
          >
            <Lock size={11} strokeWidth={2.5} />
          </span>
        )}
      </button>
    </Tooltip>
  );
}

interface Props {
  ancestors: Node[];
  referencedIds: string[];
  recommendedIds: string[];
  activeIds: string[];
  lockedActiveIds: string[];
  lockedDeactivatedIds: string[];
  nodeMap: Map<string, Node>;
  onToggle: (nodeId: string) => void;
  onToggleLock: (nodeId: string) => void;
  onLockAll: (allIds: string[]) => void;
  onUnlockAll: () => void;
  onClearAll: () => void;
  onReinit: () => void;
  currentNode: Node | null;
  messages: Message[];
  groqClient: InstanceType<typeof Groq> | null;
  showChips?: boolean;
}

export function ContextSummary({
  ancestors, referencedIds, recommendedIds, activeIds,
  lockedActiveIds, lockedDeactivatedIds,
  nodeMap, onToggle, onToggleLock, onLockAll, onUnlockAll,
  onClearAll, onReinit,
  currentNode, messages, groqClient, showChips = true,
}: Props) {
  const ancestorIds = [...ancestors].reverse().map(n => n.id);
  const allIds = [...new Set([
    ...ancestorIds, ...referencedIds, ...recommendedIds,
    ...activeIds, ...lockedActiveIds, ...lockedDeactivatedIds,
  ])];
  const allCleared = allIds.length > 0 && activeIds.filter(id => !lockedActiveIds.includes(id)).length === 0;
  const anyLocked = lockedActiveIds.length > 0 || lockedDeactivatedIds.length > 0;

  return (
    <div data-tutorial="context-bar" style={{
      background: '#fff',
      borderRadius: '0 0 14px 14px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
      borderLeft: '1px solid rgba(0,0,0,0.06)',
      borderRight: '1px solid rgba(0,0,0,0.06)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Context chips — hidden in partial state */}
      {showChips && (
        <div style={{ padding: '12px 16px 10px', background: '#fff' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', margin: '0 0 9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Context <span style={{ fontSize: 10, fontWeight: 500, color: '#D1D5DB' }}>({activeIds.length}/{allIds.length})</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
            {allIds.map(id => (
              <Chip
                key={id}
                id={id}
                nodeMap={nodeMap}
                activeIds={activeIds}
                lockedActiveIds={lockedActiveIds}
                lockedDeactivatedIds={lockedDeactivatedIds}
                onToggle={onToggle}
                onToggleLock={onToggleLock}
              />
            ))}

            {/* Clear / Reinit chip */}
            <Tooltip placement="top" maxWidth={160} content={allCleared ? 'Restore context' : 'Deselect all context'}>
              <button
                onClick={allCleared ? onReinit : onClearAll}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 999, cursor: 'pointer',
                  border: allCleared ? '1.5px solid #2563EB' : '1.5px solid #E5E7EB',
                  background: allCleared ? '#EFF6FF' : '#fff',
                  color: allCleared ? '#2563EB' : '#9CA3AF',
                  fontSize: 14, fontWeight: 600,
                  transition: 'all 0.12s',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                {allCleared ? '↺' : '✕'}
              </button>
            </Tooltip>

            {/* Lock all / Unlock all */}
            <Tooltip placement="top" content={anyLocked ? 'Unlock all' : 'Lock all context'}>
              <button
                onClick={anyLocked ? onUnlockAll : () => onLockAll(allIds)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 999, cursor: 'pointer',
                  border: anyLocked ? '1.5px solid #2563EB' : '1.5px solid #E5E7EB',
                  background: anyLocked ? '#EFF6FF' : '#fff',
                  color: anyLocked ? '#2563EB' : '#9CA3AF',
                  transition: 'all 0.12s',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                {anyLocked ? <LockOpen size={14} strokeWidth={2.5} /> : <Lock size={14} strokeWidth={2.5} />}
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Node Topics Section */}
      <div style={{ padding: '10px 16px', background: '#FAFAFA' }}>
        <NodeTopics
          node={currentNode}
          messages={messages}
          groqClient={groqClient}
        />
      </div>
    </div>
  );
}
