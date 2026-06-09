// Graphi Polish Lab — TreeCanvas (refined nodes, dot-grid backdrop, detailed-card bold option, motion)
const { useState: usePCState, useRef: usePCRef } = React;

const PNODE_W = 168, PNODE_H = 58, PH_SLOT = 210, PV_ROW = 150;

function pLayoutTree(nodes) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const children = new Map();
  nodes.forEach(n => { if (n.parentId) { if (!children.has(n.parentId)) children.set(n.parentId, []); children.get(n.parentId).push(n.id); } });
  const root = nodes.find(n => !n.parentId || !byId.has(n.parentId));
  const pos = new Map(), depthOf = new Map();
  let slot = 0;
  function walk(id, depth) {
    depthOf.set(id, depth);
    const kids = children.get(id) || [];
    if (!kids.length) { const x = slot * PH_SLOT; slot++; pos.set(id, x); return x; }
    const xs = kids.map(k => walk(k, depth + 1));
    const x = (Math.min(...xs) + Math.max(...xs)) / 2; pos.set(id, x); return x;
  }
  if (root) walk(root.id, 0);
  return nodes.map(n => ({ ...n, x: pos.get(n.id) || 0, y: (depthOf.get(n.id) || 0) * PV_ROW }));
}

function pEdgePath(s, t) {
  const sx = s.x + PNODE_W / 2, sy = s.y + PNODE_H;
  const tx = t.x + PNODE_W / 2, ty = t.y;
  const midY = sy + (ty - sy) * 0.5;
  return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`;
}

function PolishCanvas({ laid, edges, activeNodeId, contextActive, contextDeactivated, lineage, dangerIds, foldedCounts, msgCounts, graphMode, onSetMode, onNodeClick, onNodeDouble, onNodeMenu, onNewProject }) {
  const T = window.GTheme;
  const P = window.usePolish();
  const acc = P.accent;
  const [hovered, setHovered] = usePCState(null);
  const [pan, setPan] = usePCState({ x: 0, y: 0 });
  const drag = usePCRef(null);
  const wrapRef = usePCRef(null);
  const userPanned = usePCRef(false);

  // Auto-frame the active node when selection changes (until the user drags).
  React.useLayoutEffect(() => {
    if (!laid.length || !wrapRef.current) return;
    const node = laid.find(n => n.id === activeNodeId) || laid[0];
    const minX = Math.min(...laid.map(n => n.x));
    const w = (Math.max(...laid.map(n => n.x)) + PNODE_W) - minX;
    const originX = -minX;
    const rect = wrapRef.current.getBoundingClientRect();
    setPan({
      x: w / 2 - (node.x + originX) - PNODE_W / 2,
      y: Math.max(0, rect.height * 0.34 - 64 - node.y - PNODE_H / 2),
    });
    userPanned.current = false;
  }, [activeNodeId, laid.length]);

  const inContext = contextActive.size > 0 || contextDeactivated.size > 0;
  const detailed = P.nodeStyle === 'detailed';
  const motion = P.motion;

  function nodeStyle(id) {
    if (dangerIds.has(id)) return { stroke: T.danger300, sw: 1.5, fill: T.danger50, op: 1, glow: false, tc: T.danger600, sh: window.elevationShadow(P.elevation, 'node') };
    if (id === activeNodeId) return { stroke: acc.base, sw: 2, fill: acc.soft, op: 1, glow: true, tc: acc.strong, sh: window.elevationShadow(P.elevation, 'node') };
    if (contextActive.has(id)) return { stroke: acc.base, sw: 1.5, fill: acc.soft, op: 1, glow: true, tc: acc.strong, sh: window.elevationShadow(P.elevation, 'node') };
    if (contextDeactivated.has(id)) return { stroke: T.blue300, sw: 1, fill: T.surfaceSoft, op: 0.5, glow: false, tc: T.blue300, sh: 'none' };
    if (inContext) return { stroke: T.border, sw: 1, fill: T.surface, op: 0.4, glow: false, tc: T.ink400, sh: 'none' };
    return { stroke: T.border, sw: 1, fill: T.surface, op: 1, glow: false, tc: T.ink900, sh: window.elevationShadow(P.elevation, 'node') };
  }
  function edgeStyle(sId, tId) {
    const tier = id => id === activeNodeId ? 2 : (lineage.includes(id) && contextActive.has(id)) ? 2 : (lineage.includes(id) && contextDeactivated.has(id)) ? 1 : 0;
    const m = Math.min(tier(sId), tier(tId));
    if (m === 0) return { stroke: T.ink300, sw: 1.5, op: 0.6 };
    if (m === 1) return { stroke: T.blue300, sw: 1.5, op: 0.45 };
    return { stroke: acc.base, sw: 2, op: 1 };
  }

  if (!laid.length) {
    return (
      <div style={{ flex: 1, position: 'relative', background: T.canvasBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {backdrop(P, T)}
        <window.EmptyState icon="git-fork" title="Start your first thread" body="Every project begins as one node. Type below to grow the tree." minimal={!P.emptyStates} accent={acc} />
      </div>
    );
  }

  const minX = Math.min(...laid.map(n => n.x));
  const maxX = Math.max(...laid.map(n => n.x)) + PNODE_W;
  const w = maxX - minX, originX = -minX;
  const maxY = Math.max(...laid.map(n => n.y)) + PNODE_H + 40;

  function onBgDown(e) { if (e.target.closest('.gnode') || e.target.closest('.gtoolbar')) return; userPanned.current = true; drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y }; }
  function onMove(e) { if (!drag.current) return; setPan({ x: drag.current.px + (e.clientX - drag.current.sx), y: drag.current.py + (e.clientY - drag.current.sy) }); }
  function onUp() { drag.current = null; }

  return (
    <div ref={wrapRef} onMouseDown={onBgDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      style={{ flex: 1, position: 'relative', overflow: 'hidden', background: T.canvasBg, cursor: drag.current ? 'grabbing' : 'default' }}>
      {backdrop(P, T)}

      <div className="gtoolbar" style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 3, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 11, padding: 3, boxShadow: window.elevationShadow(P.elevation, 'toolbar') }}>
        {[['tree', 'git-fork'], ['force', 'share-2']].map(([m, ic]) => (
          <button key={m} onClick={() => onSetMode(m)} title={m}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13, borderRadius: 8, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
              background: graphMode === m ? T.ink900 : 'transparent', color: graphMode === m ? '#fff' : T.ink500, fontWeight: graphMode === m ? 500 : 400, transition: 'all 0.15s' }}>
            <GIcon name={ic} size={14} stroke={2} color={graphMode === m ? '#fff' : T.ink500} />{m}
          </button>
        ))}
      </div>

      <div style={{ position: 'absolute', left: '50%', top: 64, transform: `translate(${pan.x - w / 2}px, ${pan.y}px)` }}>
        <svg width={w} height={maxY} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <filter id="pglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {edges.map(([sId, tId], i) => {
            const s = laid.find(n => n.id === sId), t = laid.find(n => n.id === tId);
            if (!s || !t) return null;
            const es = edgeStyle(sId, tId);
            return <path key={i} d={pEdgePath({ ...s, x: s.x + originX }, { ...t, x: t.x + originX })} fill="none" stroke={es.stroke} strokeWidth={es.sw} opacity={es.op} style={{ transition: 'stroke 0.2s, opacity 0.2s' }} />;
          })}
        </svg>

        {laid.map((n, idx) => {
          const ns = nodeStyle(n.id), isCur = n.id === activeNodeId, isHov = hovered === n.id;
          const left = n.x + originX, fold = foldedCounts.get(n.id), mc = msgCounts.get(n.id) || 0;
          return (
            <div key={n.id} className="gnode"
              onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}
              onClick={e => { e.stopPropagation(); onNodeClick(n); }}
              onDoubleClick={e => { e.stopPropagation(); onNodeDouble(n); }}
              style={{ position: 'absolute', left, top: n.y, width: PNODE_W, height: detailed ? 'auto' : PNODE_H, minHeight: PNODE_H, opacity: ns.op, cursor: 'pointer',
                transition: 'opacity 0.18s, transform 0.2s cubic-bezier(0.34,1.2,0.64,1)',
                transform: motion && isHov && !isCur ? 'translateY(-4px) scale(1.025)' : 'none' }}>
              {ns.glow && <div style={{ position: 'absolute', inset: -1, borderRadius: 12, border: `6px solid ${acc.base}`, opacity: 0.16, filter: 'url(#pglow)', pointerEvents: 'none' }} />}
              <div style={{ position: 'relative', minHeight: PNODE_H, display: 'flex', flexDirection: detailed ? 'column' : 'row', alignItems: detailed ? 'stretch' : 'center', justifyContent: 'center', padding: detailed ? '11px 13px' : '0 14px', gap: detailed ? 7 : 0,
                background: ns.fill, border: `${ns.sw}px solid ${ns.stroke}`, borderRadius: 12, boxSizing: 'border-box', boxShadow: (isHov && !isCur) ? window.elevationShadow('lifted', 'node') : ns.sh,
                color: ns.tc, fontSize: 13.5, fontWeight: isCur ? 600 : 500, fontFamily: T.font, lineHeight: 1.35, transition: 'box-shadow 0.18s, border-color 0.18s, background 0.18s' }}>
                {detailed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isCur ? acc.base : T.ink400 }}>
                    <GIcon name={n.parentId ? 'git-branch' : 'circle-dot'} size={12} stroke={2} color={isCur ? acc.base : T.ink400} />
                    {n.parentId ? 'Branch' : 'Root'}
                  </div>
                )}
                <div style={{ textAlign: detailed ? 'left' : 'center', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.title || 'Untitled'}</div>
                {detailed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: T.ink400, fontWeight: 400 }}>
                    <GIcon name="message-square" size={12} stroke={2} color={T.ink400} />{mc} {mc === 1 ? 'message' : 'messages'}
                  </div>
                )}
              </div>
              {isHov && (
                <button onClick={e => { e.stopPropagation(); onNodeMenu(n, e.currentTarget.getBoundingClientRect()); }}
                  style={{ position: 'absolute', right: 5, top: 5, height: 26, width: 26, borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, color: T.ink500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(17,24,39,0.1)' }}>
                  <GIcon name="more-horizontal" size={14} />
                </button>
              )}
              {fold !== undefined && (
                <div style={{ position: 'absolute', right: -8, bottom: -8, minWidth: 24, height: 24, padding: '0 7px', borderRadius: 12, background: acc.base, color: '#fff', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(17,24,39,0.18)' }}>{fold}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function backdrop(P, T) {
  if (P.backdrop === 'plain') return null;
  if (P.backdrop === 'lines') {
    return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`, backgroundSize: '32px 32px', opacity: 0.5 }} />;
  }
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(${T.ink300} 1.1px, transparent 1.1px)`, backgroundSize: '22px 22px', opacity: 0.5 }} />;
}

window.PolishCanvas = PolishCanvas;
window.pLayoutTree = pLayoutTree;
