import { useState, useRef, useEffect } from 'react';
import { useDagStore } from '../../stores/dagStore';
import { useChatStore } from '../../stores/chatStore';
import { NewProjectModal } from '../NewProjectModal';
import type { Node, Project } from '../../types';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  node: Node;
  position: { x: number; y: number };
  rootNodeId: string | null;
  projects: Project[];
  onClose: () => void;
  onBranch: (newNode: Node) => void;
  onDangerHover: (ids: string[]) => void;
  onRenameRequest: (node: Node) => void;
  onProjectCreated: (project: Project) => void;
}

const ForkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);

const RenameIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CutIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

const PruneIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const TransplantIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

export function NodeToolOverlay({ node, position, rootNodeId, projects, onClose, onBranch, onDangerHover, onRenameRequest, onProjectCreated }: Props) {
  const { addNode, deleteNode, getDescendants, getAllAncestors, nodes } = useDagStore();
  const setCurrentNode = useChatStore(s => s.setCurrentNode);
  const currentNodeId = useChatStore(s => s.currentNodeId);
  const [transplantOpen, setTransplantOpen] = useState(false);
  const [newProjectModal, setNewProjectModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose();
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [onClose]);

  const isRoot = node.id === rootNodeId;

  const branch = async () => {
    const ancestors = getAllAncestors(node.id).map(n => n.id);
    if (ancestors.includes(node.id)) return;
    const newNode = await addNode(null, node.id, node.projectId);
    onBranch(newNode);
    await setCurrentNode(newNode.id);
    onClose();
  };

  const cut = async () => {
    if (isRoot) return;
    const children = nodes.filter(n => n.parentId === node.id);
    for (const child of children) {
      await supabase.from('nodes').update({ parentId: node.parentId }).eq('id', child.id);
      useDagStore.setState(s => ({
        nodes: s.nodes.map(n => n.id === child.id ? { ...n, parentId: node.parentId } : n),
      }));
    }
    if (currentNodeId === node.id && node.parentId) await setCurrentNode(node.parentId);
    await deleteNode(node.id);
    onClose();
  };

  const prune = async () => {
    if (isRoot) return;
    if (!confirm(`Delete "${node.title || 'this node'}" and all descendants?`)) return;
    const descendants = getDescendants(node.id);
    for (const d of descendants) await deleteNode(d.id);
    if (currentNodeId === node.id && node.parentId) await setCurrentNode(node.parentId);
    await deleteNode(node.id);
    onClose();
  };

  const transplant = async (targetProjectId: string, rootNodeId?: string) => {
    const allNodes = [node, ...getDescendants(node.id)];
    const idMap = new Map<string, string>();
    allNodes.forEach(n => idMap.set(n.id, uuidv4()));
    const now = new Date().toISOString();
    for (const n of allNodes) {
      const isRoot = n.id === node.id;
      await supabase.from('nodes').insert({
        id: idMap.get(n.id)!,
        projectId: targetProjectId,
        title: n.title,
        content: n.content,
        parentId: isRoot ? (rootNodeId ?? null) : (idMap.get(n.parentId!) ?? null),
        order: n.order,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
    setTransplantOpen(false);
    onClose();
  };

  const transplantToNew = async (name: string, _description: string) => {
    const trimmed = name.trim() || 'Untitled';
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const projectId = uuidv4();
    const now = new Date().toISOString();
    const { error } = await supabase.from('projects').insert({
      id: projectId, name: trimmed, userId: user.id, rootNodeId: null, createdAt: now,
    });
    if (error) throw error;
    const allNodes = [node, ...getDescendants(node.id)];
    const idMap = new Map<string, string>();
    allNodes.forEach(n => idMap.set(n.id, uuidv4()));
    const newRootId = idMap.get(node.id)!;
    for (const n of allNodes) {
      const isRootNode = n.id === node.id;
      await supabase.from('nodes').insert({
        id: idMap.get(n.id)!,
        projectId,
        title: n.title,
        content: n.content,
        parentId: isRootNode ? null : (idMap.get(n.parentId!) ?? null),
        order: n.order,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
    await supabase.from('projects').update({ rootNodeId: newRootId }).eq('id', projectId);
    onProjectCreated({ id: projectId, name: trimmed, userId: user.id, rootNodeId: newRootId, createdAt: now });
    setNewProjectModal(false);
    setTransplantOpen(false);
    onClose();
  };

  const clampedX = Math.min(position.x, window.innerWidth - 168);
  const clampedY = Math.min(position.y, window.innerHeight - 260);

  return (
    <>
    <div
      ref={ref}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', left: clampedX, top: clampedY, zIndex: 1000,
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        padding: 4, minWidth: 148,
      }}
    >
      {transplantOpen ? (
        <div>
          <p style={{ color: '#9CA3AF', fontSize: 12, padding: '4px 8px 6px', margin: 0 }}>Copy to project:</p>
          {projects.filter(p => p.id !== node.projectId).map(p => (
            <Btn key={p.id} onClick={() => transplant(p.id)}>{p.name}</Btn>
          ))}
          <div style={{ height: 1, background: '#F3F4F6', margin: '3px 0' }} />
          <Btn onClick={() => setNewProjectModal(true)} muted>New project</Btn>
          <Btn onClick={() => setTransplantOpen(false)} muted>Cancel</Btn>
        </div>
      ) : (
        <>
          <Btn icon={<ForkIcon />} onClick={branch}>Branch</Btn>
          <Btn icon={<RenameIcon />} onClick={() => onRenameRequest(node)}>Rename</Btn>
          <div style={{ height: 1, background: '#F3F4F6', margin: '3px 0' }} />
          <Btn icon={<CutIcon />} onClick={cut} disabled={isRoot} danger
            onMouseEnter={() => onDangerHover([node.id])}
            onMouseLeave={() => onDangerHover([])}
          >Remove (Keep Children)</Btn>
          <Btn icon={<PruneIcon />} onClick={prune} disabled={isRoot} danger
            onMouseEnter={() => onDangerHover([node.id, ...getDescendants(node.id).map(n => n.id)])}
            onMouseLeave={() => onDangerHover([])}
          >Delete Subtree</Btn>
          <div style={{ height: 1, background: '#F3F4F6', margin: '3px 0' }} />
          <Btn icon={<TransplantIcon />} onClick={() => setTransplantOpen(true)} muted>Transplant</Btn>
        </>
      )}
    </div>

    {newProjectModal && (
      <NewProjectModal
        onConfirm={transplantToNew}
        onClose={() => setNewProjectModal(false)}
      />
    )}
    </>
  );
}

function Btn({ icon, onClick, children, disabled, danger, muted, onMouseEnter, onMouseLeave }: {
  icon?: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  muted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 7, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: 'transparent', opacity: disabled ? 0.3 : 1,
        color: danger ? '#EF4444' : muted ? '#9CA3AF' : '#111827',
        transition: 'background 0.1s',
        textAlign: 'left',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = danger ? '#FEF2F2' : '#F9FAFB'; onMouseEnter?.(); }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; onMouseLeave?.(); }}
    >
      {icon && <span style={{ flexShrink: 0, opacity: 0.7 }}>{icon}</span>}
      {children}
    </button>
  );
}
