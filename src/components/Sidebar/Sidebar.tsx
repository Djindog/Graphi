import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GitFork, PanelLeftClose, PanelLeft, Plus, MoreHorizontal, Pin, Pencil, Trash2, Settings } from 'lucide-react';
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 52, background: '#fff', borderRight: '1px solid #E5E7EB', height: '100%', padding: '14px 0', gap: 10, flexShrink: 0 }}>
        <button
          onClick={onToggle}
          title="Expand"
          style={{ color: '#6B7280', width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLButtonElement).style.color = '#111827'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; }}
        >
          <PanelLeft size={17} strokeWidth={1.9} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', width: 224, background: '#fff', borderRight: '1px solid #E5E7EB', height: '100%', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GitFork size={14} strokeWidth={2.2} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#111827', letterSpacing: '-0.3px' }}>Graphi</span>
          </div>
          <button
            onClick={onToggle}
            title="Collapse"
            style={{ color: '#9CA3AF', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
          >
            <PanelLeftClose size={16} strokeWidth={1.9} />
          </button>
        </div>

        {/* New project */}
        <div style={{ padding: '0 12px 12px' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 10px', fontSize: 13, fontWeight: 500, color: '#374151', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#2563EB'; b.style.color = '#1D4ED8'; b.style.background = '#EFF6FF'; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#E5E7EB'; b.style.color = '#374151'; b.style.background = '#F9FAFB'; }}
          >
            <Plus size={15} strokeWidth={2.2} />
            New project
          </button>
        </div>

        {/* Section label */}
        <div style={{ padding: '0 10px 6px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9CA3AF', margin: '4px 6px 8px' }}>Projects</p>
        </div>

        {/* Project list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          {sortedProjects.length === 0 && (
            <p style={{ color: '#D1D5DB', fontSize: 13, textAlign: 'center', marginTop: 20 }}>No projects yet</p>
          )}
          {sortedProjects.map(p => {
            const active = activeProjectId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => { if (renamingProjectId !== p.id) onSelectProject(p); }}
                onMouseEnter={() => setHoveredProject(p.id)}
                onMouseLeave={() => setHoveredProject(null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 8px 8px 12px', borderRadius: 9, cursor: 'pointer', marginBottom: 2,
                  position: 'relative',
                  background: active ? '#EFF6FF' : hoveredProject === p.id ? '#F9FAFB' : 'transparent',
                  color: active ? '#1D4ED8' : '#374151',
                  fontSize: 14, fontWeight: active ? 500 : 400,
                  transition: 'background 0.12s, color 0.12s', gap: 6,
                }}
              >
                {active && (
                  <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: '#2563EB' }} />
                )}
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
                    style={{ flex: 1, background: '#fff', border: '1.5px solid #2563EB', borderRadius: 6, padding: '3px 7px', fontSize: 13, color: '#111827', outline: 'none', minWidth: 0, fontFamily: 'inherit' }}
                  />
                ) : (
                  <>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                      {pinnedProjects.has(p.id) && <Pin size={11} strokeWidth={2} color="#F59E0B" style={{ flexShrink: 0 }} />}
                      {p.name}
                    </span>
                    <button
                      onClick={e => openMenu(e, p.id)}
                      style={{
                        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: 7,
                        background: projectMenu?.id === p.id ? '#E5E7EB' : 'none',
                        border: 'none', cursor: 'pointer', color: '#9CA3AF',
                        opacity: hoveredProject === p.id || projectMenu?.id === p.id ? 1 : 0,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ color: '#9CA3AF', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
          >
            Sign out
          </button>
          <button
            onClick={onOpenSettings}
            title="API key settings"
            style={{ color: '#9CA3AF', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            <Settings size={15} />
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
          <MenuBtn icon={<Pin size={13} />} onClick={() => handlePin(projectMenu.id)}>
            {pinnedProjects.has(projectMenu.id) ? 'Unpin' : 'Pin'}
          </MenuBtn>
          <MenuBtn icon={<Pencil size={13} />} onClick={() => handleStartRename(projectMenu.id)}>
            Rename
          </MenuBtn>
          <div style={{ height: 1, background: '#F3F4F6', margin: '3px 0' }} />
          <MenuBtn icon={<Trash2 size={13} />} danger onClick={() => handleDeleteProject(projectMenu.id)}>
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
