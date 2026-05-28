import { useState, useEffect, useRef } from 'react';

interface Props {
  onSave: (key: string) => Promise<void>;
  onClose?: () => void; // optional — omit when it's the blocking onboarding screen
  existingKey?: string;
}

export function ApiKeyModal({ onSave, onClose, existingKey }: Props) {
  const [key, setKey] = useState(existingKey ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith('gsk_')) {
      setError('Groq API keys start with "gsk_"');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setSaving(false);
    }
  };

  const isUpdate = !!existingKey;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          padding: '28px 28px 24px',
          width: 440, maxWidth: 'calc(100vw - 32px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
              {isUpdate ? 'Update Groq API key' : 'Add your Groq API key'}
            </p>
            {!isUpdate && (
              <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
                Required to generate responses. Your key is stored in your account.
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: '2px 4px', marginLeft: 12 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
            >✕</button>
          )}
        </div>

        <div style={{ marginTop: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
            API key
          </label>
          <input
            ref={inputRef}
            type="password"
            value={key}
            onChange={e => { setKey(e.target.value); setError(null); }}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape' && onClose) onClose(); }}
            placeholder="gsk_..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#F9FAFB', border: `1.5px solid ${error ? '#FCA5A5' : '#E5E7EB'}`,
              borderRadius: 10, padding: '10px 12px', fontSize: 14,
              color: '#111827', outline: 'none', fontFamily: 'monospace',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { if (!error) (e.target as HTMLInputElement).style.borderColor = '#2563EB'; }}
            onBlur={e => { if (!error) (e.target as HTMLInputElement).style.borderColor = '#E5E7EB'; }}
          />
          {error && (
            <p style={{ fontSize: 12, color: '#EF4444', marginTop: 6, marginBottom: 0 }}>{error}</p>
          )}
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8, marginBottom: 0 }}>
            Get a free key at{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer"
              style={{ color: '#2563EB', textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
            >console.groq.com/keys</a>
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '9px 18px', fontSize: 14, borderRadius: 10, border: '1px solid #E5E7EB',
                background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
            >Cancel</button>
          )}
          <button
            onClick={submit}
            disabled={saving || !key.trim()}
            style={{
              padding: '9px 20px', fontSize: 14, borderRadius: 10, border: 'none',
              background: '#111827', color: '#fff',
              cursor: saving || !key.trim() ? 'default' : 'pointer',
              fontWeight: 500, opacity: saving || !key.trim() ? 0.5 : 1,
              transition: 'opacity 0.1s',
            }}
          >{saving ? '…' : isUpdate ? 'Save' : 'Save & continue'}</button>
        </div>
      </div>
    </div>
  );
}
