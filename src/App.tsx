import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { useDagStore } from './stores/dagStore';
import { useChatStore } from './stores/chatStore';
import { makeGroqClient } from './lib/groq';
import { AuthPage } from './components/Auth/AuthPage';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Canvas } from './components/Canvas/Canvas';
import { ChatPane } from './components/Chat/ChatPane';
import { ToastContainer } from './components/Toast';
import { ApiKeyModal } from './components/ApiKeyModal';
import { TutorialPage } from './components/Tutorial/TutorialPage';
import type { ToastMessage } from './components/Toast';
import type { Project } from './types';
import type Groq from 'groq-sdk';

type GroqClient = InstanceType<typeof Groq>;

const MIN_CHAT_WIDTH = 240;
const MAX_CHAT_WIDTH = 720;
const DEFAULT_CHAT_WIDTH = 500;
const CANVAS_SNAP_THRESHOLD = 300;
const TOOLTIP_DELAY_MS = 400;

function getSidebarWidth(collapsed: boolean) {
  return collapsed ? 48 : 220;
}

function clampChatWidth(w: number, sidebarCollapsed: boolean) {
  const max = Math.min(MAX_CHAT_WIDTH, Math.floor((window.innerWidth - getSidebarWidth(sidebarCollapsed)) / 2));
  return Math.max(MIN_CHAT_WIDTH, Math.min(max, w));
}

async function loadGroqKey(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('groq_api_key')
    .eq('id', userId)
    .single();
  return (data as { groq_api_key: string | null } | null)?.groq_api_key ?? null;
}

async function saveGroqKey(userId: string, key: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, groq_api_key: key }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [groqClient, setGroqClient] = useState<GroqClient | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showSettingsKeyModal, setShowSettingsKeyModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentGroqKey, setCurrentGroqKey] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [chatPaneWidth, setChatPaneWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [chatPaneHidden, setChatPaneHidden] = useState(false);
  // null = flex:1 (normal), 0 = hidden, N = explicit px (during grab-drag)
  const [canvasWidth, setCanvasWidth] = useState<number | null>(null);
  const [dividerHovered, setDividerHovered] = useState(false);
  const [grabHovered, setGrabHovered] = useState(false);
  const [chatPaneGrabHovered, setChatPaneGrabHovered] = useState(false);
  const [dividerTooltip, setDividerTooltip] = useState(false);
  const [grabTooltip, setGrabTooltip] = useState(false);
  const [chatPaneGrabTooltip, setChatPaneGrabTooltip] = useState(false);
  const dividerTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grabTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatPaneGrabTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragState = useRef<{ startX: number; startWidth: number; maxW: number; hideType?: 'canvas' | 'chatpane' } | null>(null);

  const { setFromSupabase, subscribeToProjectNodes, undo } = useDagStore();
  const storeNodes = useDagStore(s => s.nodes);
  const setCurrentNode = useChatStore(s => s.setCurrentNode);

  useEffect(() => {
    if (canvasWidth === null) {
      setChatPaneWidth(w => clampChatWidth(w, sidebarCollapsed));
    }
  }, [sidebarCollapsed, canvasWidth]);

  // Ctrl+Z for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'success') => {
    const id = uuidv4();
    setToasts(t => [...t, { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const initUserSession = useCallback(async (u: User) => {
    const key = await loadGroqKey(u.id);
    if (key) {
      setGroqClient(makeGroqClient(key));
      setCurrentGroqKey(key);
    } else {
      setShowKeyModal(true);
    }
    loadAllProjects(u.id);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) initUserSession(u);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        initUserSession(u);
      } else {
        setProjects([]);
        setActiveProject(null);
        setGroqClient(null);
        setCurrentGroqKey('');
      }
    });
    return () => subscription.unsubscribe();
  }, [initUserSession]);

  const loadAllProjects = async (userId: string) => {
    const { data, error } = await supabase
      .from('projects').select('*').eq('userId', userId).order('createdAt', { ascending: false });
    if (error) { console.error(error); return; }
    if (data) setProjects(data as Project[]);
  };

  const handleSaveKey = async (key: string) => {
    if (!user) return;
    await saveGroqKey(user.id, key);
    setGroqClient(makeGroqClient(key));
    setCurrentGroqKey(key);
    setShowKeyModal(false);
    setShowSettingsKeyModal(false);
  };

  const handleSelectProject = async (project: Project) => {
    setActiveProject(project);
    const { data } = await supabase
      .from('nodes').select('*').eq('projectId', project.id).order('createdAt', { ascending: true });
    if (data) {
      setFromSupabase(data);
      subscribeToProjectNodes(project.id);
      if (project.rootNodeId) await setCurrentNode(project.rootNodeId);
    }
  };

  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [project, ...prev.filter(p => p.id !== project.id)]);
    handleSelectProject(project);
    addToast(`"${project.name}" created`);
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProject?.id === projectId) setActiveProject(null);
  };

  const handleProjectRenamed = (projectId: string, name: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name } : p));
    if (activeProject?.id === projectId) setActiveProject(prev => prev ? { ...prev, name } : prev);
  };

  const revealCanvas = useCallback(() => {
    setCanvasWidth(null);
    setChatPaneWidth(prev => clampChatWidth(prev, sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Divider drag: drag left/right to resize, snaps to hidden at threshold
  const onDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const sidebarW = getSidebarWidth(sidebarCollapsed);
    const available = window.innerWidth - sidebarW - 8;
    dragState.current = { startX: e.clientX, startWidth: chatPaneWidth, maxW: available };
    let finalChatW = chatPaneWidth;
    let hideCanvas = false;
    let hideChatPane = false;

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const delta = dragState.current.startX - ev.clientX;
      let newChatW = dragState.current.startWidth + delta;

      if (newChatW < dragState.current.startWidth) {
        // Dragging right: shrink ChatPane, expand Canvas
        const shrinkAmount = dragState.current.startWidth - newChatW;
        if (shrinkAmount > CANVAS_SNAP_THRESHOLD) {
          hideChatPane = true;
          setCanvasWidth(dragState.current.maxW);
          setChatPaneHidden(true);
        } else {
          hideChatPane = false;
          finalChatW = Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, newChatW));
          setCanvasWidth(dragState.current.maxW - finalChatW);
          setChatPaneWidth(finalChatW);
          setChatPaneHidden(false);
        }
      } else {
        // Dragging left: shrink Canvas, expand ChatPane (capped at MAX_CHAT_WIDTH)
        finalChatW = Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, newChatW));
        const implicitCanvasW = dragState.current.maxW - finalChatW;
        if (delta > CANVAS_SNAP_THRESHOLD) {
          hideCanvas = true;
          setCanvasWidth(0);
        } else {
          hideCanvas = false;
          setCanvasWidth(implicitCanvasW);
          setChatPaneWidth(finalChatW);
        }
        setChatPaneHidden(false);
      }
    };

    const onUp = () => {
      if (hideChatPane) {
        setCanvasWidth(null);
        setChatPaneHidden(true);
      } else if (hideCanvas) {
        setCanvasWidth(0);
      } else {
        setCanvasWidth(null);
      }
      dragState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Grab handle drag: drag right reveals canvas
  const onGrabHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const sidebarW = getSidebarWidth(sidebarCollapsed);
    const available = window.innerWidth - sidebarW - 8;
    const startX = e.clientX;
    let lastDragDist = 0;

    const onMove = (ev: MouseEvent) => {
      const dragDist = Math.max(0, ev.clientX - startX);
      lastDragDist = dragDist;

      if (dragDist < CANVAS_SNAP_THRESHOLD) {
        setCanvasWidth(0);
      } else {
        setCanvasWidth(dragDist);
        setChatPaneWidth(Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, available - dragDist)));
      }
    };

    const onUp = () => {
      if (lastDragDist < CANVAS_SNAP_THRESHOLD) {
        setCanvasWidth(0);
      } else {
        setCanvasWidth(null);
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const onDividerEnter = () => {
    setDividerHovered(true);
    dividerTooltipTimer.current = setTimeout(() => setDividerTooltip(true), TOOLTIP_DELAY_MS);
  };
  const onDividerLeave = () => {
    setDividerHovered(false);
    setDividerTooltip(false);
    if (dividerTooltipTimer.current) clearTimeout(dividerTooltipTimer.current);
  };
  const onGrabEnter = () => {
    setGrabHovered(true);
    grabTooltipTimer.current = setTimeout(() => setGrabTooltip(true), TOOLTIP_DELAY_MS);
  };
  const onGrabLeave = () => {
    setGrabHovered(false);
    setGrabTooltip(false);
    if (grabTooltipTimer.current) clearTimeout(grabTooltipTimer.current);
  };

  const onChatPaneGrabHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const sidebarW = getSidebarWidth(sidebarCollapsed);
    const available = window.innerWidth - sidebarW - 8;
    const startX = e.clientX;
    let lastDragDist = 0;

    const onMove = (ev: MouseEvent) => {
      const dragDist = Math.max(0, startX - ev.clientX);
      lastDragDist = dragDist;

      if (dragDist < CANVAS_SNAP_THRESHOLD) {
        setChatPaneHidden(true);
      } else {
        setChatPaneHidden(false);
        setChatPaneWidth(Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, available - dragDist)));
      }
    };

    const onUp = () => {
      if (lastDragDist < CANVAS_SNAP_THRESHOLD) {
        setChatPaneHidden(true);
      } else {
        setChatPaneHidden(false);
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const onChatPaneGrabEnter = () => {
    setChatPaneGrabHovered(true);
    chatPaneGrabTooltipTimer.current = setTimeout(() => setChatPaneGrabTooltip(true), TOOLTIP_DELAY_MS);
  };
  const onChatPaneGrabLeave = () => {
    setChatPaneGrabHovered(false);
    setChatPaneGrabTooltip(false);
    if (chatPaneGrabTooltipTimer.current) clearTimeout(chatPaneGrabTooltipTimer.current);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F6F8] text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const projectNodes = activeProject ? storeNodes.filter(n => n.projectId === activeProject.id) : [];
  const canvasHidden = canvasWidth === 0;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        activeProjectId={activeProject?.id ?? null}
        projects={projects}
        onSelectProject={handleSelectProject}
        onProjectCreated={handleProjectCreated}
        onProjectDeleted={handleProjectDeleted}
        onProjectRenamed={handleProjectRenamed}
        onError={msg => addToast(msg, 'error')}
        onOpenSettings={() => setShowSettingsKeyModal(true)}
        onOpenTutorial={() => setShowTutorial(true)}
      />

      {/* Left grab handle — only when canvas hidden */}
      {canvasHidden && (
        <div
          onMouseDown={onGrabHandleMouseDown}
          onMouseEnter={onGrabEnter}
          onMouseLeave={onGrabLeave}
          onDoubleClick={() => { revealCanvas(); setGrabTooltip(false); if (grabTooltipTimer.current) clearTimeout(grabTooltipTimer.current); }}
          style={{ width: 8, flexShrink: 0, cursor: 'col-resize', position: 'relative', zIndex: 10, display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}
        >
          <div style={{ width: grabHovered ? 3 : 1, background: grabHovered ? '#9CA3AF' : '#E5E7EB', transition: 'width 0.12s ease, background 0.12s ease', borderRadius: 2 }} />
          {grabTooltip && (
            <div style={{
              position: 'absolute', top: '50%', left: 'calc(100% + 10px)', transform: 'translateY(-50%)',
              background: '#111827', color: '#fff', fontSize: 12, fontWeight: 500,
              padding: '7px 11px', borderRadius: 7, whiteSpace: 'nowrap',
              pointerEvents: 'none', zIndex: 200, lineHeight: 1.6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              {/* Triangle pointing left toward handle */}
              <div style={{
                position: 'absolute', top: '50%', left: -4, transform: 'translateY(-50%)',
                width: 0, height: 0,
                borderTop: '4px solid transparent', borderBottom: '4px solid transparent',
                borderRight: '5px solid #111827',
              }} />
              Drag to resize<br />Double-click to show canvas
            </div>
          )}
        </div>
      )}

      {/* Canvas wrapper — hidden via display:none when canvasWidth === 0 */}
      <div style={{
        flex: canvasWidth === null ? 1 : undefined,
        width: canvasWidth !== null && canvasWidth > 0 ? canvasWidth : undefined,
        flexShrink: 0,
        overflow: 'hidden',
        display: canvasHidden ? 'none' : 'block',
        position: 'relative',
      }}>
        <Canvas
          nodes={projectNodes}
          rootNodeId={activeProject?.rootNodeId ?? null}
          projects={projects}
          onProjectCreated={handleProjectCreated}
        />
      </div>

      {/* Divider — only when both canvas and chatpane are visible */}
      {!canvasHidden && !chatPaneHidden && (
        <div
          onMouseDown={onDividerMouseDown}
          onMouseEnter={onDividerEnter}
          onMouseLeave={onDividerLeave}
          onDoubleClick={() => { setCanvasWidth(0); setDividerTooltip(false); if (dividerTooltipTimer.current) clearTimeout(dividerTooltipTimer.current); }}
          style={{ width: 8, flexShrink: 0, cursor: 'col-resize', position: 'relative', zIndex: 10, display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}
        >
          <div style={{ width: dividerHovered ? 3 : 1, background: dividerHovered ? '#9CA3AF' : '#E5E7EB', transition: 'width 0.12s ease, background 0.12s ease', borderRadius: 2 }} />
          {dividerTooltip && (
            <div style={{
              position: 'absolute', top: '50%', right: 'calc(100% + 10px)', transform: 'translateY(-50%)',
              background: '#111827', color: '#fff', fontSize: 12, fontWeight: 500,
              padding: '7px 11px', borderRadius: 7, whiteSpace: 'nowrap',
              pointerEvents: 'none', zIndex: 200, lineHeight: 1.6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              {/* Triangle pointing right toward divider */}
              <div style={{
                position: 'absolute', top: '50%', right: -4, transform: 'translateY(-50%)',
                width: 0, height: 0,
                borderTop: '4px solid transparent', borderBottom: '4px solid transparent',
                borderLeft: '5px solid #111827',
              }} />
              Drag to resize<br />Double-click to hide canvas
            </div>
          )}
        </div>
      )}

      {/* Right grab handle — only when chatPane hidden */}
      {chatPaneHidden && (
        <div
          onMouseDown={onChatPaneGrabHandleMouseDown}
          onMouseEnter={onChatPaneGrabEnter}
          onMouseLeave={onChatPaneGrabLeave}
          onDoubleClick={() => { setChatPaneHidden(false); setChatPaneWidth(650); setChatPaneGrabTooltip(false); if (chatPaneGrabTooltipTimer.current) clearTimeout(chatPaneGrabTooltipTimer.current); }}
          style={{ width: 8, flexShrink: 0, cursor: 'col-resize', position: 'relative', zIndex: 10, display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}
        >
          <div style={{ width: chatPaneGrabHovered ? 3 : 1, background: chatPaneGrabHovered ? '#9CA3AF' : '#E5E7EB', transition: 'width 0.12s ease, background 0.12s ease', borderRadius: 2 }} />
          {chatPaneGrabTooltip && (
            <div style={{
              position: 'absolute', top: '50%', right: 'calc(100% + 10px)', transform: 'translateY(-50%)',
              background: '#111827', color: '#fff', fontSize: 12, fontWeight: 500,
              padding: '7px 11px', borderRadius: 7, whiteSpace: 'nowrap',
              pointerEvents: 'none', zIndex: 200, lineHeight: 1.6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              {/* Triangle pointing right toward handle */}
              <div style={{
                position: 'absolute', top: '50%', right: -4, transform: 'translateY(-50%)',
                width: 0, height: 0,
                borderTop: '4px solid transparent', borderBottom: '4px solid transparent',
                borderLeft: '5px solid #111827',
              }} />
              Drag to resize<br />Double-click to show chat pane
            </div>
          )}
        </div>
      )}

      <div style={{
        display: chatPaneHidden ? 'none' : 'block',
        ...(canvasHidden ? { flex: 1 } : { width: chatPaneWidth, flexShrink: 0 }),
        overflow: 'hidden'
      }}>
        <ChatPane
          width={chatPaneWidth}
          canvasHidden={canvasHidden}
          groqClient={groqClient}
        />
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {showKeyModal && (
        <ApiKeyModal onSave={handleSaveKey} />
      )}

      {showTutorial && <TutorialPage onClose={() => setShowTutorial(false)} />}

      {showSettingsKeyModal && (
        <ApiKeyModal
          onSave={handleSaveKey}
          onClose={() => setShowSettingsKeyModal(false)}
          existingKey={currentGroqKey}
        />
      )}
    </div>
  );
}
