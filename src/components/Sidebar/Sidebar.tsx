import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase';
import { useDagStore } from '../../stores/dagStore';
import { NewProjectModal } from '../NewProjectModal';
import type { Project } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeProjectId: string | null;
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onProjectCreated: (project: Project) => void;
  onProjectDeleted: (projectId: string) => void;
  onProjectRenamed: (projectId: string, name: string) => void;
  onError: (msg: string) => void;
  onOpenSettings: () => void;
}

const PinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
);

const RenameIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export function Sidebar({
  collapsed, onToggle, activeProjectId, projects,
  onSelectProject, onProjectCreated, onProjectDeleted, onProjectRenamed, onError, onOpenSettings,
}: SidebarProps) {
  const [showModal, setShowModal] = useState(false);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [projectMenu, setProjectMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [pinnedProjects, setPinnedProjects] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const addNode = useDagStore(s => s.addNode);

  useEffect(() => {
    if (!projectMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        setProjectMenu(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [projectMenu]);

  const createProject = async (name: string, _description: string) => {
    const trimmed = name.trim() || 'Untitled';
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { onError('Not signed in'); return; }
    const projectId = uuidv4();
    const now = new Date().toISOString();
    const { error: projError } = await supabase.from('projects').insert({
      id: projectId, name: trimmed, userId: user.id, rootNodeId: null, createdAt: now,
    });
    if (projError) { onError(`Failed to create project: ${projError.message}`); return; }
    const rootNode = await addNode(null, null, projectId);
    await supabase.from('projects').update({ rootNodeId: rootNode.id }).eq('id', projectId);
    setShowModal(false);
    onProjectCreated({ id: projectId, name: trimmed, userId: user.id, rootNodeId: rootNode.id, createdAt: now });
  };

  const handleDeleteProject = async (projectId: string) => {
    setProjectMenu(null);
    if (!confirm('Delete this project and all its nodes?')) return;
    try {
      // Collect node IDs first
      const { data: projectNodes } = await supabase
        .from('nodes').select('id').eq('projectId', projectId);
      const nodeIds = (projectNodes ?? []).map((n: { id: string }) => n.id);

      // Null out rootNodeId to drop FK reference before deleting nodes
      await supabase.from('projects').update({ rootNodeId: null }).eq('id', projectId);

      if (nodeIds.length > 0) {
        await supabase.from('messages').delete().in('nodeId', nodeIds);
        await supabase.from('snapshots').delete().in('nodeId', nodeIds);
        await supabase.from('nodes').delete().eq('projectId', projectId);
      }

      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      onProjectDeleted(projectId);
    } catch {
      onError('Failed to delete project');
    }
  };

  const handleStartRename = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setRenameVal(project?.name ?? '');
    setRenamingProjectId(projectId);
    setProjectMenu(null);
  };

  const commitRename = async (projectId: string) => {
    const name = renameVal.trim();
    if (!name) { setRenamingProjectId(null); return; }
    const { error } = await supabase.from('projects').update({ name }).eq('id', projectId);
    if (error) { onError('Failed to rename project'); return; }
    onProjectRenamed(projectId, name);
    setRenamingProjectId(null);
  };

  const handlePin = (projectId: string) => {
    setPinnedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
      return next;
    });
    setProjectMenu(null);
  };

  const openMenu = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (projectMenu?.id === projectId) {
      setProjectMenu(null);
      return;
    }
    const sidebarRight = collapsed ? 48 : 220;
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setProjectMenu({ id: projectId, x: sidebarRight + 12, y: rect.top });
  };

  const sortedProjects = [
    ...projects.filter(p => pinnedProjects.has(p.id)),
    ...projects.filter(p => !pinnedProjects.has(p.id)),
  ];

  if (collapsed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 48, background: '#fff', borderRight: '1px solid #E5E7EB', height: '100%', padding: '12px 0', gap: 8 }}>
        <button onClick={onToggle} style={{ color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer' }}>
          ☰
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', width: 220, background: '#fff', borderRight: '1px solid #E5E7EB', height: '100%', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', letterSpacing: '-0.3px' }}>Graphi</span>
          <button onClick={onToggle} style={{ color: '#9CA3AF', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>✕</button>
        </div>

        {/* New project */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 13, color: '#6B7280', background: 'none', border: '1.5px dashed #D1D5DB', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#D1D5DB'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            New project
          </button>
        </div>

        {/* Project list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {sortedProjects.length === 0 && (
            <p style={{ color: '#D1D5DB', fontSize: 13, textAlign: 'center', marginTop: 24 }}>No projects yet</p>
          )}
          {sortedProjects.map(p => (
            <div
              key={p.id}
              onClick={() => { if (renamingProjectId !== p.id) onSelectProject(p); }}
              onMouseEnter={() => setHoveredProject(p.id)}
              onMouseLeave={() => setHoveredProject(null)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 8px 7px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: activeProjectId === p.id ? '#EFF6FF' : hoveredProject === p.id ? '#F9FAFB' : 'transparent',
                color: activeProjectId === p.id ? '#1D4ED8' : '#374151',
                fontSize: 14,
                fontWeight: activeProjectId === p.id ? 500 : 400,
                transition: 'background 0.1s',
                gap: 4,
              }}
            >
              {renamingProjectId === p.id ? (
                <input
                  autoFocus
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(p.id);
                    if (e.key === 'Escape') setRenamingProjectId(null);
                  }}
                  onBlur={() => commitRename(p.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ flex: 1, background: '#fff', border: '1.5px solid #2563EB', borderRadius: 6, padding: '3px 7px', fontSize: 13, color: '#111827', outline: 'none', minWidth: 0 }}
                />
              ) : (
                <>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {pinnedProjects.has(p.id) && (
                      <span style={{ color: '#F59E0B', fontSize: 10, flexShrink: 0 }}>●</span>
                    )}
                    {p.name}
                  </span>
                  <button
                    onClick={e => openMenu(e, p.id)}
                    style={{
                      flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22, borderRadius: 5,
                      background: projectMenu?.id === p.id ? '#F3F4F6' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: '#9CA3AF',
                      fontSize: 14, letterSpacing: '1px',
                      opacity: hoveredProject === p.id || projectMenu?.id === p.id ? 1 : 0,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = projectMenu?.id === p.id ? '#F3F4F6' : 'none'; }}
                  >
                    ···
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ color: '#9CA3AF', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
          >
            Sign out
          </button>
          <button
            onClick={onOpenSettings}
            title="API key settings"
            style={{ color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Project context menu overlay */}
      {projectMenu && (
        <div
          ref={menuRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: projectMenu.x,
            top: projectMenu.y,
            zIndex: 2000,
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
            padding: 4,
            minWidth: 148,
          }}
        >
          <MenuBtn icon={<PinIcon />} onClick={() => handlePin(projectMenu.id)}>
            {pinnedProjects.has(projectMenu.id) ? 'Unpin' : 'Pin'}
          </MenuBtn>
          <MenuBtn icon={<RenameIcon />} onClick={() => handleStartRename(projectMenu.id)}>
            Rename
          </MenuBtn>
          <div style={{ height: 1, background: '#F3F4F6', margin: '3px 0' }} />
          <MenuBtn icon={<DeleteIcon />} danger onClick={() => handleDeleteProject(projectMenu.id)}>
            Delete
          </MenuBtn>
        </div>
      )}

      {showModal && (
        <NewProjectModal
          onConfirm={createProject}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function MenuBtn({ icon, children, danger, onClick }: {
  icon: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 10px',
        fontSize: 13, borderRadius: 7, border: 'none', cursor: 'pointer',
        background: 'transparent',
        color: danger ? '#EF4444' : '#111827',
        transition: 'background 0.1s',
        textAlign: 'left',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = danger ? '#FEF2F2' : '#F9FAFB'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      <span style={{ flexShrink: 0, opacity: 0.7 }}>{icon}</span>
      {children}
    </button>
  );
}
