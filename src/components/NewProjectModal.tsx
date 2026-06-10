import { useState, useEffect, useRef } from 'react';

interface Props {
  onConfirm: (name: string, description: string) => Promise<void>;
  onClose: () => void;
}

export function NewProjectModal({ onConfirm, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const submit = async () => {
    if (creating) return;
    setCreating(true);
    try { await onConfirm(name, description); }
    finally { setCreating(false); }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      data-tutorial="new-project-modal"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onKeyDown={onKeyDown}
        style={{
          background: '#fff', borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          padding: '28px 28px 24px',
          width: 460, maxWidth: 'calc(100vw - 32px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#111827', letterSpacing: '-0.3px' }}>New project</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; }}
          >✕</button>
        </div>

        {/* Name */}
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
          Project name
        </label>
        <input
          ref={nameRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }}
          placeholder="Name your project…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 10,
            padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none',
            marginBottom: 16, transition: 'border-color 0.15s',
          }}
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#2563EB'; }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#E5E7EB'; }}
        />

        {/* Description */}
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
          Description <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
          placeholder="What are you working on?"
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 10,
            padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none',
            resize: 'none', lineHeight: 1.5, marginBottom: 22,
            fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#2563EB'; }}
          onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#E5E7EB'; }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', fontSize: 14, borderRadius: 10, border: '1px solid #E5E7EB',
              background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
          >Cancel</button>
          <button
            onClick={submit}
            disabled={creating}
            style={{
              padding: '9px 20px', fontSize: 14, borderRadius: 10, border: 'none',
              background: '#111827', color: '#fff', cursor: creating ? 'default' : 'pointer',
              fontWeight: 500, opacity: creating ? 0.6 : 1, transition: 'opacity 0.1s',
            }}
          >{creating ? '…' : 'Create project'}</button>
        </div>
      </div>
    </div>
  );
}
