// Graphi Polish Lab — Sidebar (refined; "rail" bold option = always-visible icon rail)
const { useState: usePSState } = React;

function PolishSidebar({ collapsed, onToggle, projects, activeProjectId, pinned, onSelect, onNewProject, onMenu, projectMenu }) {
  const T = window.GTheme;
  const P = window.usePolish();
  const acc = P.accent;
  const d = window.densityTokens(P.density);
  const [hovered, setHovered] = usePSState(null);
  const rail = P.sidebar === 'rail';

  if (collapsed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 52, background: T.surface, borderRight: `1px solid ${T.border}`, height: '100%', padding: '14px 0', gap: 10, flexShrink: 0 }}>
        <button onClick={onToggle} title="Expand" style={{ color: T.ink500, width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = T.surfaceSoft; e.currentTarget.style.color = T.ink900; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.ink500; }}>
          <GIcon name="panel-left" size={17} stroke={1.9} />
        </button>
      </div>
    );
  }

  const sorted = [...projects.filter(p => pinned.has(p.id)), ...projects.filter(p => !pinned.has(p.id))];

  const Rail = () => (
    <div style={{ width: 48, background: T.surfaceSoft, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 8, flexShrink: 0 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: acc.base, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 6 }}>
        <GIcon name="git-fork" size={16} stroke={2} color="#fff" />
      </div>
      <button title="New project" onClick={onNewProject} style={{ width: 32, height: 32, borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', color: T.ink500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = acc.base; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.ink500; }}>
        <GIcon name="plus" size={18} stroke={2} />
      </button>
      <div style={{ flex: 1 }} />
      <button title="Settings" style={{ width: 32, height: 32, borderRadius: 9, background: 'none', border: 'none', cursor: 'pointer', color: T.ink400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={e => e.currentTarget.style.color = T.ink700} onMouseLeave={e => e.currentTarget.style.color = T.ink400}>
        <GIcon name="settings" size={16} />
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100%', flexShrink: 0 }}>
      {rail && <Rail />}
      <div style={{ display: 'flex', flexDirection: 'column', width: 224, background: T.surface, borderRight: `1px solid ${T.border}`, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {!rail && <div style={{ width: 24, height: 24, borderRadius: 7, background: acc.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GIcon name="git-fork" size={14} stroke={2.2} color="#fff" /></div>}
            <span style={{ fontSize: 16, fontWeight: 600, color: T.ink900, letterSpacing: '-0.3px' }}>Graphi</span>
          </div>
          <button onClick={onToggle} title="Collapse" style={{ color: T.ink400, width: 28, height: 28, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = T.surfaceSoft; e.currentTarget.style.color = T.ink700; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.ink400; }}>
            <GIcon name="panel-left-close" size={16} stroke={1.9} />
          </button>
        </div>

        {!rail && (
          <div style={{ padding: '0 12px 12px' }}>
            <button onClick={onNewProject}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 10px', fontSize: 13, fontWeight: 500, color: T.ink700, background: T.surfaceSoft, border: `1px solid ${T.border}`, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = acc.base; e.currentTarget.style.color = acc.strong; e.currentTarget.style.background = acc.soft; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.ink700; e.currentTarget.style.background = T.surfaceSoft; }}>
              <GIcon name="plus" size={15} stroke={2.2} /> New project
            </button>
          </div>
        )}

        <div style={{ padding: '0 10px 6px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.ink400, margin: '4px 6px 8px' }}>Projects</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          {sorted.length === 0 && <p style={{ color: T.ink300, fontSize: 13, textAlign: 'center', marginTop: 20 }}>No projects yet</p>}
          {sorted.map(p => {
            const active = activeProjectId === p.id;
            return (
              <div key={p.id} onClick={() => onSelect(p)} onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${d.rowPadY}px 8px ${d.rowPadY}px ${d.rowPadX}px`, borderRadius: 9, cursor: 'pointer', marginBottom: 2, position: 'relative',
                  background: active ? acc.soft : hovered === p.id ? T.surfaceSoft : 'transparent',
                  color: active ? acc.strong : T.ink700, fontSize: 14, fontWeight: active ? 500 : 400, transition: 'background 0.12s, color 0.12s', gap: 6 }}>
                {active && <span style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: acc.base }} />}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {pinned.has(p.id) && <GIcon name="pin" size={11} stroke={2} color={T.amber500} />}
                  {p.name}
                </span>
                <button onClick={e => { e.stopPropagation(); onMenu(p.id, e.currentTarget); }}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, background: projectMenu === p.id ? T.border : 'none', border: 'none', cursor: 'pointer', color: T.ink400,
                    opacity: hovered === p.id || projectMenu === p.id ? 1 : 0, transition: 'opacity 0.15s' }}>
                  <GIcon name="more-horizontal" size={15} />
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: `1px solid ${T.borderFaint}`, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: T.ink900, color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>A</div>
            <span style={{ fontSize: 13, color: T.ink700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>you@graphi.app</span>
          </div>
          <button title="Settings" style={{ color: T.ink400, width: 28, height: 28, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = T.ink700; e.currentTarget.style.background = T.surfaceSoft; }} onMouseLeave={e => { e.currentTarget.style.color = T.ink400; e.currentTarget.style.background = 'none'; }}>
            <GIcon name="settings" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

window.PolishSidebar = PolishSidebar;
