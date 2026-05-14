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

  const NodeChip = ({ id }: { id: string }) => {
    const node = nodeMap.get(id);
    if (!node) return null;
    const active = isActive(id);
    return (
      <button
        onClick={() => onToggle(id)}
        title={active ? 'Click to deactivate' : 'Click to reactivate'}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
          padding: '4px 6px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: 'transparent', fontSize: 13,
          color: active ? '#2563EB' : '#9CA3AF',
          opacity: active ? 1 : 0.6,
          transition: 'all 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 7, lineHeight: 1 }}>{active ? '●' : '○'}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title || 'Untitled'}
        </span>
      </button>
    );
  };

  const Section = ({ label, ids }: { label: string; ids: string[] }) => (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 4px' }}>
        {label}
      </p>
      {ids.map(id => <NodeChip key={id} id={id} />)}
    </div>
  );

  return (
    <div style={{ borderBottom: '1px solid #F3F4F6', padding: '10px 10px 6px', maxHeight: 160, overflowY: 'auto', background: '#FAFAFA' }}>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 4px' }}>
        Context — click to toggle
      </p>
      {ancestors.length > 0 && <Section label="Lineage" ids={ancestors.map(n => n.id)} />}
      {referencedIds.length > 0 && <Section label="Referenced" ids={referencedIds} />}
      {recommendedIds.length > 0 && <Section label="Recommended" ids={recommendedIds} />}
    </div>
  );
}
