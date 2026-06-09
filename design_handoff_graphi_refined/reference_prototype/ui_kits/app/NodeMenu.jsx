// Graphi UI Kit — NodeToolOverlay (per-node menu)
function NodeMenu({ rect, isRoot, isFolded, onAction, onClose, onDangerHover }) {
  const T = window.GTheme;
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const x = Math.min(rect.right + 12, window.innerWidth - 180);
  const y = Math.min(rect.top, window.innerHeight - 280);

  const Btn = ({ icon, label, danger, muted, disabled, action, hoverDanger }) => (
    <button disabled={disabled}
      onClick={() => !disabled && onAction(action)}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? T.danger50 : T.surfaceSoft; if (hoverDanger) onDangerHover(true); }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (hoverDanger) onDangerHover(false); }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 7, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer', background: 'transparent', opacity: disabled ? 0.3 : 1,
        color: danger ? T.danger600 : muted ? T.ink400 : T.ink900, textAlign: 'left' }}>
      {icon && <span style={{ flexShrink: 0, opacity: 0.7, display: 'inline-flex' }}><GIcon name={icon} size={13} /></span>}
      {label}
    </button>
  );
  const Div = () => <div style={{ height: 1, background: T.borderFaint, margin: '3px 0' }} />;

  return (
    <div ref={ref} onClick={e => e.stopPropagation()}
      style={{ position: 'fixed', left: x, top: y, zIndex: 1000, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: T.shadowMenu, padding: 4, minWidth: 168 }}>
      <Btn icon="git-fork" label="Branch" action="branch" />
      <Btn icon="pencil" label="Rename" action="rename" />
      {isFolded ? <Btn icon="maximize-2" label="Unfold" action="unfold" /> : <Btn icon="minimize-2" label="Fold" action="fold" disabled={isRoot} />}
      <Div />
      <Btn icon="scissors" label="Remove (Keep Children)" danger disabled={isRoot} action="cut" hoverDanger />
      <Btn icon="trash-2" label="Delete Subtree" danger disabled={isRoot} action="prune" hoverDanger />
      <Div />
      <Btn icon="chevron-right" label="Transplant" muted action="transplant" />
    </div>
  );
}

window.NodeMenu = NodeMenu;
