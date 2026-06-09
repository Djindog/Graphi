// Graphi Polish Lab — App orchestration + Tweaks wiring + polished auth
const { useState, useRef, useCallback } = React;

function puid() { return 'x' + Math.random().toString(36).slice(2, 9); }

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": ["#1D4ED8", "#2563EB", "#EFF6FF"],
  "backdrop": "dots",
  "elevation": "soft",
  "density": "comfortable",
  "motion": true,
  "emptyStates": true,
  "nodeStyle": "refined",
  "chatLayout": "bubbles",
  "sidebar": "standard"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  ['#1D4ED8', '#2563EB', '#EFF6FF'], // Graphi blue (base)
  ['#4338CA', '#4F46E5', '#EEF2FF'], // Indigo
  ['#0F766E', '#0D9488', '#EFFAF8'], // Teal
  ['#334155', '#475569', '#F1F5F9'], // Graphite
];

function PolishAuth({ onAuth, P }) {
  const T = window.GTheme; const acc = P.accent;
  const [mode, setMode] = useState('login');
  const [f, setF] = useState(0);
  const field = i => ({ width: '100%', boxSizing: 'border-box', background: T.surface, border: `1.5px solid ${f === i ? acc.base : T.border}`, color: T.ink900, borderRadius: 12, padding: '12px 14px', fontSize: 14, outline: 'none', boxShadow: f === i ? `0 0 0 3px ${acc.soft}` : 'none', fontFamily: T.font, transition: 'all 0.15s' });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: T.appBg, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${T.ink300} 1.1px, transparent 1.1px)`, backgroundSize: '22px 22px', opacity: 0.4 }} />
      <div style={{ position: 'relative', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: 34, width: 360, boxShadow: '0 12px 40px rgba(17,24,39,0.10), 0 2px 8px rgba(17,24,39,0.05)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 26 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: acc.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GIcon name="git-fork" size={20} stroke={2.2} color="#fff" /></div>
          <div>
            <h1 style={{ color: T.ink900, fontSize: 21, fontWeight: 600, letterSpacing: '-0.4px', margin: 0 }}>Graphi</h1>
            <p style={{ color: T.ink400, fontSize: 13, margin: '1px 0 0' }}>{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</p>
          </div>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAuth(); }} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <input type="email" placeholder="Email" onFocus={() => setF(1)} onBlur={() => setF(0)} style={field(1)} />
          <input type="password" placeholder="Password" onFocus={() => setF(2)} onBlur={() => setF(0)} style={field(2)} />
          <button type="submit" style={{ background: T.ink900, color: '#fff', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', marginTop: 4 }}>{mode === 'login' ? 'Sign in' : 'Sign up'}</button>
        </form>
        <p style={{ textAlign: 'center', color: T.ink400, fontSize: 13.5, marginTop: 18, marginBottom: 0 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ color: acc.base, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{mode === 'login' ? 'Sign up' : 'Sign in'}</button>
        </p>
      </div>
    </div>
  );
}

function App() {
  const T = window.GTheme;
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const P = { ...t, accent: window.resolveAccent(t.accent) };

  const [authed, setAuthed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState(window.GSampleProjects);
  const [pinned, setPinned] = useState(new Set());
  const [activeProjectId, setActiveProjectId] = useState('p1');
  const [nodesByProject, setNodesByProject] = useState({ ...window.GSampleNodes });
  const [messagesByNode, setMessagesByNode] = useState({ ...window.GSampleMessages });
  const [currentNodeId, setCurrentNodeId] = useState('n2');
  const [folded, setFolded] = useState(new Set());
  const [graphMode, setGraphMode] = useState('tree');
  const [gripLevel, setGripLevel] = useState('mid');
  const [contextActive, setContextActive] = useState(new Set());
  const [contextDeactivated, setContextDeactivated] = useState(new Set());
  const [projectMenu, setProjectMenu] = useState(null);
  const [projectMenuRect, setProjectMenuRect] = useState(null);
  const [nodeMenu, setNodeMenu] = useState(null);
  const [dangerIds, setDangerIds] = useState(new Set());
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(440);
  const [dividerHover, setDividerHover] = useState(false);
  const dragRef = useRef(null);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const genRef = useRef(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((text, type = 'success') => {
    const id = puid();
    setToasts(s => [...s, { id, text, type }]);
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), 2600);
  }, []);

  const nodes = activeProjectId ? (nodesByProject[activeProjectId] || []) : [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const currentNode = byId.get(currentNodeId) || null;

  function ancestorsOf(id) { const out = []; let cur = byId.get(id); while (cur && cur.parentId) { const p = byId.get(cur.parentId); if (!p) break; out.unshift(p); cur = p; } return out; }
  function descendantsOf(id) { const kids = nodes.filter(n => n.parentId === id); return kids.flatMap(k => [k, ...descendantsOf(k.id)]); }
  const lineage = currentNodeId ? ancestorsOf(currentNodeId).map(n => n.id).concat(currentNodeId) : [];

  const hidden = new Set();
  folded.forEach(fid => descendantsOf(fid).forEach(n => hidden.add(n.id)));
  const visibleNodes = nodes.filter(n => !hidden.has(n.id));
  const foldedCounts = new Map();
  folded.forEach(fid => { if (byId.has(fid)) foldedCounts.set(fid, descendantsOf(fid).length); });
  const msgCounts = new Map(nodes.map(n => [n.id, (messagesByNode[n.id] || []).length]));
  const laid = visibleNodes.length ? window.pLayoutTree(visibleNodes) : [];
  const edges = visibleNodes.filter(n => n.parentId && byId.has(n.parentId) && !hidden.has(n.parentId)).map(n => [n.parentId, n.id]);

  function clearContext() { setContextActive(new Set()); setContextDeactivated(new Set()); }
  function selectProject(p) {
    setActiveProjectId(p.id);
    if (!nodesByProject[p.id]) { const root = { id: puid(), parentId: null, title: p.name }; setNodesByProject(s => ({ ...s, [p.id]: [root] })); setCurrentNodeId(root.id); }
    else { const root = (nodesByProject[p.id] || []).find(n => !n.parentId); setCurrentNodeId(root ? root.id : null); }
    clearContext();
  }
  function handleNodeClick(node) {
    const inCtx = contextActive.size > 0 || contextDeactivated.size > 0;
    if (inCtx) {
      if (node.id === currentNodeId) { clearContext(); return; }
      setContextActive(a => { const n = new Set(a); n.has(node.id) ? n.delete(node.id) : n.add(node.id); return n; });
      setContextDeactivated(dd => { const n = new Set(dd); n.has(node.id) ? n.delete(node.id) : n.add(node.id); return n; });
    } else {
      if (node.id === currentNodeId) { setContextActive(new Set(lineage)); setContextDeactivated(new Set()); }
      else setCurrentNodeId(node.id);
    }
  }
  function handleNodeDouble(node) { clearContext(); setCurrentNodeId(node.id); }
  function toggleContext(id) {
    const wasDeact = contextDeactivated.has(id);
    setContextDeactivated(dd => { const n = new Set(dd); wasDeact ? n.delete(id) : n.add(id); return n; });
    setContextActive(a => { const n = new Set(a); wasDeact ? n.add(id) : n.delete(id); return n; });
  }
  function nodeAction(action) {
    const node = nodeMenu.node; setNodeMenu(null); setDangerIds(new Set());
    if (action === 'branch') { const child = { id: puid(), parentId: node.id, title: null }; setNodesByProject(s => ({ ...s, [activeProjectId]: [...nodes, child] })); setCurrentNodeId(child.id); clearContext(); }
    else if (action === 'fold') setFolded(f => new Set(f).add(node.id));
    else if (action === 'unfold') setFolded(f => { const n = new Set(f); n.delete(node.id); return n; });
    else if (action === 'cut') { const kids = nodes.filter(n => n.parentId === node.id); setNodesByProject(s => ({ ...s, [activeProjectId]: nodes.filter(n => n.id !== node.id).map(n => kids.find(k => k.id === n.id) ? { ...n, parentId: node.parentId } : n) })); if (currentNodeId === node.id) setCurrentNodeId(node.parentId); addToast('Node removed'); }
    else if (action === 'prune') { const drop = new Set([node.id, ...descendantsOf(node.id).map(n => n.id)]); setNodesByProject(s => ({ ...s, [activeProjectId]: nodes.filter(n => !drop.has(n.id)) })); if (drop.has(currentNodeId)) setCurrentNodeId(node.parentId); addToast('Subtree deleted'); }
    else if (action === 'rename') { const name = prompt('Rename node', node.title || ''); if (name != null) setNodesByProject(s => ({ ...s, [activeProjectId]: nodes.map(n => n.id === node.id ? { ...n, title: name } : n) })); }
    else if (action === 'transplant') addToast('Transplant — pick a destination project');
  }
  function send() {
    if (!input.trim() || generating || !currentNodeId) return;
    const text = input.trim(); setInput('');
    const isFirst = !(messagesByNode[currentNodeId] || []).some(m => m.role === 'user');
    const aId = puid(); const nodeId = currentNodeId;
    setMessagesByNode(s => ({ ...s, [nodeId]: [...(s[nodeId] || []), { id: puid(), role: 'user', content: text }, { id: aId, role: 'assistant', content: '' }] }));
    clearContext(); setGenerating(true);
    const reply = window.GFakeReply; let i = 0;
    genRef.current = setInterval(() => {
      i += 3; const slice = reply.slice(0, i);
      setMessagesByNode(s => ({ ...s, [nodeId]: (s[nodeId] || []).map(m => m.id === aId ? { ...m, content: slice } : m) }));
      if (i >= reply.length) { clearInterval(genRef.current); genRef.current = null; setGenerating(false);
        if (isFirst) { const title = text.length > 30 ? text.slice(0, 28) + '…' : text; setNodesByProject(s => ({ ...s, [activeProjectId]: (s[activeProjectId] || []).map(n => n.id === nodeId ? { ...n, title } : n) })); } }
    }, 16);
  }
  function stop() { if (genRef.current) { clearInterval(genRef.current); genRef.current = null; } setGenerating(false); }
  function onDividerDown(e) {
    e.preventDefault();
    const maxW = Math.floor((window.innerWidth - 224) / 2);
    dragRef.current = { startX: e.clientX, startW: chatWidth, maxW };
    const move = ev => { if (!dragRef.current) return; const dx = dragRef.current.startX - ev.clientX; setChatWidth(Math.max(300, Math.min(dragRef.current.maxW, dragRef.current.startW + dx))); };
    const up = () => { dragRef.current = null; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }

  const ctxAll = new Set([...contextActive, ...contextDeactivated]);
  const contextItems = ctxAll.size ? ancestorsOf(currentNodeId).filter(n => ctxAll.has(n.id)) : [];

  const panel = (
    <window.TweaksPanel>
      <TweakSection label="Foundation" />
      <TweakColor label="Accent" value={t.accent} options={ACCENT_OPTIONS} onChange={v => setTweak('accent', v)} />
      <TweakRadio label="Density" value={t.density} options={['comfortable', 'compact']} onChange={v => setTweak('density', v)} />
      <TweakRadio label="Elevation" value={t.elevation} options={['flat', 'soft', 'lifted']} onChange={v => setTweak('elevation', v)} />
      <TweakToggle label="Node hover motion" value={t.motion} onChange={v => setTweak('motion', v)} />
      <TweakToggle label="Crafted empty states" value={t.emptyStates} onChange={v => setTweak('emptyStates', v)} />
      <TweakSection label="Canvas" />
      <TweakRadio label="Backdrop" value={t.backdrop} options={['plain', 'dots', 'lines']} onChange={v => setTweak('backdrop', v)} />
      <TweakRadio label="Node style" value={t.nodeStyle} options={['refined', 'detailed']} onChange={v => setTweak('nodeStyle', v)} />
      <TweakSection label="Bolder moves" />
      <TweakRadio label="Chat layout" value={t.chatLayout} options={['bubbles', 'document']} onChange={v => setTweak('chatLayout', v)} />
      <TweakRadio label="Sidebar" value={t.sidebar} options={['standard', 'rail']} onChange={v => setTweak('sidebar', v)} />
    </window.TweaksPanel>
  );

  if (!authed) return (
    <window.PolishCtx.Provider value={P}>
      <PolishAuth onAuth={() => setAuthed(true)} P={P} />
      {panel}
    </window.PolishCtx.Provider>
  );

  return (
    <window.PolishCtx.Provider value={P}>
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: T.font }} onClick={() => setProjectMenu(null)}>
        <window.PolishSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)}
          projects={projects} activeProjectId={activeProjectId} pinned={pinned} onSelect={selectProject}
          onNewProject={() => setNewProjectOpen(true)} projectMenu={projectMenu}
          onMenu={(id, el) => { setProjectMenu(p => p === id ? null : id); setProjectMenuRect(el.getBoundingClientRect()); }} />

        {!activeProjectId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.canvasBg }}>
            <window.EmptyState icon="folder-plus" title="Select or create a project" body="Each project is its own tree of thought." minimal={!P.emptyStates} accent={P.accent} />
          </div>
        ) : graphMode === 'tree' ? (
          <window.PolishCanvas laid={laid} edges={edges} activeNodeId={currentNodeId}
            contextActive={contextActive} contextDeactivated={contextDeactivated} lineage={lineage} dangerIds={dangerIds}
            foldedCounts={foldedCounts} msgCounts={msgCounts} graphMode={graphMode} onSetMode={setGraphMode}
            onNodeClick={handleNodeClick} onNodeDouble={handleNodeDouble} onNodeMenu={(node, rect) => setNodeMenu({ node, rect })} />
        ) : (
          <div style={{ flex: 1, position: 'relative', background: T.canvasBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="gtoolbar" style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 3, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 11, padding: 3, boxShadow: window.elevationShadow(P.elevation, 'toolbar') }}>
              {[['tree', 'git-fork'], ['force', 'share-2']].map(([m, ic]) => <button key={m} onClick={() => setGraphMode(m)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer', textTransform: 'capitalize', background: graphMode === m ? T.ink900 : 'transparent', color: graphMode === m ? '#fff' : T.ink500, fontWeight: graphMode === m ? 500 : 400 }}><GIcon name={ic} size={14} stroke={2} color={graphMode === m ? '#fff' : T.ink500} />{m}</button>)}
            </div>
            <window.EmptyState icon="share-2" title="Force layout" body="Same nodes, physics-based positions. (Tree mode is the fully-built view.)" minimal={!P.emptyStates} accent={P.accent} />
          </div>
        )}

        {activeProjectId && (
          <div onMouseDown={onDividerDown} onMouseEnter={() => setDividerHover(true)} onMouseLeave={() => setDividerHover(false)}
            style={{ width: 9, flexShrink: 0, cursor: 'col-resize', display: 'flex', alignItems: 'stretch', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ width: dividerHover ? 3 : 1, background: dividerHover ? P.accent.base : T.border, transition: 'width 0.12s, background 0.12s', borderRadius: 2 }} />
          </div>
        )}

        {activeProjectId && (
          <window.PolishChat width={chatWidth} node={currentNode} messages={messagesByNode[currentNodeId] || []} generating={generating}
            input={input} onInput={setInput} onSend={send} onStop={stop} gripLevel={gripLevel} onGrip={setGripLevel}
            contextItems={contextItems} contextActive={contextActive} onToggleContext={toggleContext} />
        )}

        {nodeMenu && <window.NodeMenu rect={nodeMenu.rect} isRoot={!nodeMenu.node.parentId} isFolded={folded.has(nodeMenu.node.id)}
          onAction={nodeAction} onClose={() => { setNodeMenu(null); setDangerIds(new Set()); }}
          onDangerHover={on => setDangerIds(on ? new Set([nodeMenu.node.id, ...descendantsOf(nodeMenu.node.id).map(n => n.id)]) : new Set())} />}

        {projectMenu && projectMenuRect && (
          <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', left: (P.sidebar === 'rail' ? 48 : 0) + 224 + 8, top: projectMenuRect.top, zIndex: 2000, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 11, boxShadow: window.elevationShadow(P.elevation, 'menu'), padding: 5, minWidth: 152 }}>
            <PMenuItem icon="pin" label={pinned.has(projectMenu) ? 'Unpin' : 'Pin'} onClick={() => { setPinned(p => { const n = new Set(p); n.has(projectMenu) ? n.delete(projectMenu) : n.add(projectMenu); return n; }); setProjectMenu(null); }} />
            <PMenuItem icon="pencil" label="Rename" onClick={() => { const id = projectMenu; setProjectMenu(null); const name = prompt('Rename project', projects.find(p => p.id === id)?.name || ''); if (name) setProjects(ps => ps.map(p => p.id === id ? { ...p, name } : p)); }} />
            <div style={{ height: 1, background: T.borderFaint, margin: '4px 0' }} />
            <PMenuItem icon="trash-2" label="Delete" danger onClick={() => { const id = projectMenu; setProjectMenu(null); setProjects(ps => ps.filter(p => p.id !== id)); if (activeProjectId === id) { setActiveProjectId(null); setCurrentNodeId(null); } addToast('Project deleted'); }} />
          </div>
        )}

        {newProjectOpen && <window.NewProjectModal onClose={() => setNewProjectOpen(false)} onConfirm={name => {
          const pid = puid(); const root = { id: puid(), parentId: null, title: name };
          setProjects(ps => [{ id: pid, name, rootNodeId: root.id }, ...ps]);
          setNodesByProject(s => ({ ...s, [pid]: [root] }));
          setActiveProjectId(pid); setCurrentNodeId(root.id); clearContext();
          setNewProjectOpen(false); addToast('"' + name + '" created');
        }} />}

        <window.Toasts toasts={toasts} />
      </div>
      {panel}
    </window.PolishCtx.Provider>
  );
}

function PMenuItem({ icon, label, danger, onClick }) {
  const T = window.GTheme;
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: danger ? T.danger600 : T.ink900, textAlign: 'left' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? T.danger50 : T.surfaceSoft} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <span style={{ flexShrink: 0, opacity: 0.75, display: 'inline-flex' }}><GIcon name={icon} size={14} /></span>{label}
    </button>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
