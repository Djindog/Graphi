// Graphi UI Kit — Auth, NewProjectModal, Toasts
const { useState: useMState, useRef: useMRef, useEffect: useMEffect } = React;

function AuthPage({ onAuth }) {
  const T = window.GTheme;
  const [mode, setMode] = useMState('login');
  const [email, setEmail] = useMState('');
  const [pw, setPw] = useMState('');
  const field = focus => ({ background: T.surfaceSoft, border: `1px solid ${focus ? T.blue600 : T.border}`, color: T.ink900, borderRadius: 12, padding: '12px 16px', fontSize: 14, outline: 'none', boxShadow: focus ? `0 0 0 3px ${T.blue100}` : 'none', fontFamily: T.font, transition: 'all 0.15s' });
  const [f1, setF1] = useMState(false), [f2, setF2] = useMState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', background: T.appBg }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32, width: 340, boxShadow: T.shadowCard, boxSizing: 'border-box' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: T.ink900, fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px', margin: 0 }}>Graphi</h1>
          <p style={{ color: T.ink400, fontSize: 14, marginTop: 4, margin: '4px 0 0' }}>{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); onAuth(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setF1(true)} onBlur={() => setF1(false)} style={field(f1)} required />
          <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} onFocus={() => setF2(true)} onBlur={() => setF2(false)} style={field(f2)} required />
          <button type="submit" style={{ background: T.ink900, color: '#fff', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', marginTop: 4 }}>{mode === 'login' ? 'Sign in' : 'Sign up'}</button>
        </form>
        <p style={{ textAlign: 'center', color: T.ink400, fontSize: 14, marginTop: 20 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ color: T.ink500, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{mode === 'login' ? 'Sign up' : 'Sign in'}</button>
        </p>
      </div>
    </div>
  );
}

function NewProjectModal({ onConfirm, onClose }) {
  const T = window.GTheme;
  const [name, setName] = useMState('');
  const [desc, setDesc] = useMState('');
  const inp = useMRef(null);
  useMEffect(() => { inp.current?.focus(); }, []);
  const field = { width: '100%', boxSizing: 'border-box', background: T.surfaceSoft, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, color: T.ink900, outline: 'none', fontFamily: T.font };
  return (
    <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, boxShadow: T.shadowModal, padding: '28px 28px 24px', width: 460, maxWidth: 'calc(100vw - 32px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: T.ink900, letterSpacing: '-0.3px' }}>New project</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.ink400, fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>✕</button>
        </div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: T.ink700, marginBottom: 6 }}>Project name</label>
        <input ref={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Name your project…" onKeyDown={e => { if (e.key === 'Enter') onConfirm(name || 'Untitled'); }}
          style={{ ...field, marginBottom: 16 }} onFocus={e => e.target.style.borderColor = T.blue600} onBlur={e => e.target.style.borderColor = T.border} />
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: T.ink700, marginBottom: 6 }}>Description <span style={{ fontWeight: 400, color: T.ink400 }}>(optional)</span></label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What are you working on?" rows={3}
          style={{ ...field, resize: 'none', lineHeight: 1.5, marginBottom: 22 }} onFocus={e => e.target.style.borderColor = T.blue600} onBlur={e => e.target.style.borderColor = T.border} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', fontSize: 14, borderRadius: 10, border: `1px solid ${T.border}`, background: '#fff', color: T.ink700, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <button onClick={() => onConfirm(name || 'Untitled')} style={{ padding: '9px 20px', fontSize: 14, borderRadius: 10, border: 'none', background: T.ink900, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Create project</button>
        </div>
      </div>
    </div>
  );
}

function Toasts({ toasts }) {
  const T = window.GTheme;
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ padding: '9px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500, boxShadow: T.shadowToast, background: t.type === 'error' ? T.danger600 : T.ink900, color: '#fff', whiteSpace: 'nowrap', animation: 'gtoast 0.3s ease' }}>{t.text}</div>
      ))}
    </div>
  );
}

Object.assign(window, { AuthPage, NewProjectModal, Toasts });
