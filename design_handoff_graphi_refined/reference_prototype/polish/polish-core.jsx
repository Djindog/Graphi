// Graphi Polish Lab — shared core: polish context, helpers, empty states.
// Base values = the *refined* baseline (always applied). Tweaks layer options on top.

window.PolishCtx = React.createContext(null);
window.usePolish = () => React.useContext(window.PolishCtx);

// Accent palette resolution: tweak stores a 3-color [strong, base, soft] array.
window.resolveAccent = function (palette) {
  if (Array.isArray(palette) && palette.length >= 3) {
    return { strong: palette[0], base: palette[1], soft: palette[2] };
  }
  const T = window.GTheme;
  return { strong: T.blue700, base: T.blue600, soft: T.blue50 };
};

// Density → spacing scale multiplier and row heights.
window.densityTokens = function (density) {
  if (density === 'compact') return { unit: 4, rowPadY: 6, rowPadX: 10, paneGut: 12, msgGap: 10, chipPadY: 6, chipPadX: 11 };
  return { unit: 4, rowPadY: 8, rowPadX: 12, paneGut: 16, msgGap: 14, chipPadY: 8, chipPadX: 12 };
};

// Elevation → shadow ladder. Base = "soft".
window.elevationShadow = function (level, kind) {
  const ladders = {
    flat: { resting: 'none', node: '0 1px 2px rgba(17,24,39,0.05)', menu: '0 4px 14px rgba(17,24,39,0.10)', toolbar: '0 0 0 1px rgba(17,24,39,0.04)' },
    soft: { resting: '0 1px 2px rgba(17,24,39,0.04)', node: '0 2px 6px rgba(17,24,39,0.08), 0 1px 2px rgba(17,24,39,0.04)', menu: '0 10px 28px rgba(17,24,39,0.12), 0 2px 6px rgba(17,24,39,0.06)', toolbar: '0 1px 4px rgba(17,24,39,0.06)' },
    lifted: { resting: '0 2px 6px rgba(17,24,39,0.08)', node: '0 6px 16px rgba(17,24,39,0.12), 0 2px 4px rgba(17,24,39,0.06)', menu: '0 16px 40px rgba(17,24,39,0.16), 0 4px 10px rgba(17,24,39,0.08)', toolbar: '0 2px 8px rgba(17,24,39,0.10)' },
  };
  return (ladders[level] || ladders.soft)[kind];
};

// ---- Crafted empty states -------------------------------------------------
window.EmptyState = function EmptyState({ icon, title, body, minimal, accent }) {
  const T = window.GTheme;
  if (minimal) {
    return <p style={{ color: T.ink300, fontSize: 15, textAlign: 'center' }}>{title}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', padding: 24, maxWidth: 300, animation: 'gfade 0.4s ease' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent ? accent.base : T.ink400, boxShadow: '0 1px 2px rgba(17,24,39,0.04)' }}>
        <GIcon name={icon} size={22} stroke={1.75} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: T.ink900, margin: 0, letterSpacing: '-0.2px' }}>{title}</p>
        {body && <p style={{ fontSize: 13.5, color: T.ink500, margin: 0, lineHeight: 1.5 }}>{body}</p>}
      </div>
    </div>
  );
};
