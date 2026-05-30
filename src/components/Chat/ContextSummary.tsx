import type { Node } from '../../types';

interface Props {
  ancestors: Node[];
  referencedIds: string[];
  recommendedIds: string[];
  activeIds: string[];
  nodeMap: Map<string, Node>;
  onToggle: (nodeId: string) => void;
}

export function ContextSummary({ ancestors, referencedIds, recommendedIds, activeIds, nodeMap, onToggle }: Props) {
  const isActive = (id: string) => activeIds.includes(id);

  const allIds = [...new Set([...ancestors.map(n => n.id), ...referencedIds, ...recommendedIds])];

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
    <div style={{ borderBottom: '1px solid #F3F4F6', padding: '12px 16px 10px', background: '#FAFAFA' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', margin: '0 0 9px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Lineage · click to toggle
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {allIds.map(id => <Chip key={id} id={id} />)}
      </div>
    </div>
  );
}
