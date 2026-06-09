import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import logoSvg from '../../assets/logo.svg';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPw, setFocusPw] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (focused: boolean): React.CSSProperties => ({
    width: '100%',
    background: '#F9FAFB',
    border: `1.5px solid ${focused ? '#2563EB' : '#E5E7EB'}`,
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 14,
    color: '#111827',
    outline: 'none',
    boxShadow: focused ? '0 0 0 3px #EFF6FF' : 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', background: '#F5F6F8', position: 'relative',
    }}>
      {/* Dot grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(#D1D5DB 1.1px, transparent 1.1px)',
        backgroundSize: '22px 22px', opacity: 0.4,
      }} />

      <div style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 18,
        padding: 34, width: 360, position: 'relative', zIndex: 1,
        boxShadow: '0 12px 40px rgba(17,24,39,0.10), 0 2px 8px rgba(17,24,39,0.05)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <img src={logoSvg} alt="Graphi" style={{ width: 56, height: 56, flexShrink: 0 }} />
            <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.4px', color: '#111827' }}>Graphi</span>
          </div>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocusEmail(true)}
            onBlur={() => setFocusEmail(false)}
            style={fieldStyle(focusEmail)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocusPw(true)}
            onBlur={() => setFocusPw(false)}
            style={fieldStyle(focusPw)}
            required
          />
          {error && (
            <p style={{ fontSize: 13, color: '#EF4444', background: '#FEF2F2', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#111827', color: '#fff', border: 'none', borderRadius: 12,
              padding: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer',
              marginTop: 4, opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {loading ? '…' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13.5, marginTop: 20, marginBottom: 0 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            style={{
              color: '#2563EB', fontWeight: 500, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, fontSize: 13.5, fontFamily: 'inherit',
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
